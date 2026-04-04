/**
 * AMAÇ: Vercel serverless AI orkestratörü.
 * MANTIK: Tek intent modeli + promptBuilder source-of-truth + provider fallback.
 *
 * V19 Değişiklikler (BUILD-001, COACH-002, OBS-001, SEC-005):
 *  - legacy "coach" action kaldırıldı; intent union tek yerden
 *  - promptBuilder backend'de resmi source-of-truth
 *  - provider telemetry eklendi (latency, provider, success)
 *  - raw provider error client'a sızmıyor
 *  - wantDirective modu: structured JSON response
 *  - rate limiter: Upstash Redis zorunlu yol (in-memory sadece fallback)
 */

import { GoogleGenAI } from '@google/genai';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ─── Types ────────────────────────────────────────────────────────────────────

type CoachIntent =
  | 'daily_plan'
  | 'log_analysis'
  | 'exam_analysis'
  | 'exam_debrief'
  | 'topic_explain'
  | 'intervention'
  | 'qa_mode'
  | 'free_chat'
  | 'war_room_analysis'
  | 'weekly_review'
  | 'micro_feedback';

type ChatHistoryItem = { role: 'user' | 'coach'; content: string };
type OpenAIMessage = { role: 'system' | 'user' | 'assistant'; content: string };

interface AiRequestBody {
  intent?: CoachIntent;
  /** @deprecated use intent instead */
  action?: string;
  userMessage?: string;
  context?: string;
  chatHistory?: ChatHistoryItem[];
  coachPersonality?: string;
  forceJson?: boolean;
  maxTokens?: number;
  userState?: Record<string, unknown>;
  wantDirective?: boolean;
  // voice log ayrı akış
  transcript?: string;
}

interface ProviderTelemetry {
  provider: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
}

// ─── Models ───────────────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.0-flash';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const OPENROUTER_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';
const CEREBRAS_MODEL = 'llama3.1-8b';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';

// ─── Intent → System Instruction ─────────────────────────────────────────────

const PERSONA_BASE =
  "Sen 'Kübra'sin. YKS koçusun. Sert, analitik, mazeret kabul etmeyen ama toksik olmayan bir disiplin anlayışıyla çalışırsın. Veriyle konuşursun, duyguyla değil.";

const INTENT_INSTRUCTIONS: Record<string, string> = {
  daily_plan: `Öğrencinin mevcut durumunu analiz ederek bugün için somut çalışma planı oluştur. Konu, süre ve öncelik sırasını belirt. Gerekçeni göster.`,
  log_analysis: `Girilen log verisini incele. Doğruluk oranı, hız ve alışkanlık örüntülerini analiz et. 3 maddeli aksiyon planı çıkar.`,
  exam_analysis: `Deneme sonucunu hedefle karşılaştır. Güçlü ve zayıf konuları tespit et. Öncelik sırası belirle.`,
  exam_debrief: `Son deneme savaş raporunu çıkar. Konu bazlı kayıpları, tuzak şıkları ve sonraki 48 saatlik telafi planını ver.`,
  topic_explain: `Konuyu net ve sade dille açıkla. YKS'ye özgü ipuçları ve yaygın tuzaklar hakkında bilgi ver.`,
  intervention: `ACİL müdahale. Öğrencinin tehlikeli alışkanlığını doğrudan ve sert ele al. Empati değil, eylem.`,
  qa_mode: `YKS Asistanı modundasın. Kısa, teknik ve net cevap ver. Gereksiz methiye yapma.`,
  free_chat: `Öğrenci seninle serbest konuşuyor. YKS hedefleriyle ilişkilendirerek yanıt ver ama zorlama.`,
  war_room_analysis: `War Room simülasyonu bitti. Soru bazlı hata analizi yap. Konuya özgü 3 aksiyon ver.`,
  weekly_review: `Haftalık retrospektif: Ne oldu, neden oldu, gelecek hafta ne değişecek. Net veriyle konuş.`,
  micro_feedback: `Log kaydedildi. 1 kısa özet + 1 risk + 1 sonraki adım. Maksimum 3 cümle.`,
};

const DIRECTIVE_JSON_SCHEMA = `
ZORUNLU FORMAT (sadece geçerli JSON döndür, başka metin ekleme):
{
  "headline": "Tek cümlelik değerlendirme",
  "summary": "2-3 cümlelik özet",
  "tasks": [
    {
      "priority": "high|medium|low",
      "subject": "ders",
      "topic": "konu",
      "action": "yapılacak iş",
      "targetMinutes": 45,
      "rationale": "1 satır veri temelli gerekçe",
      "originSurface": "coach|strategy|warroom|system",
      "dueWindow": "today|tomorrow|this_week"
    }
  ],
  "warnings": [
    {
      "type": "avoidance|memorization_risk|time_loss|low_accuracy|streak_break|burnout_risk|target_gap",
      "message": "uyarı",
      "severity": "info|warning|critical"
    }
  ],
  "followUpQuestion": "Sonraki seansta sorulacak soru",
  "confidence": 75
}
`;

function buildSystemInstruction(
  intent: CoachIntent,
  coachPersonality?: string,
  userState?: Record<string, unknown>
): string {
  const intentGuide = INTENT_INSTRUCTIONS[intent] ?? INTENT_INSTRUCTIONS.free_chat;
  const personalityNote = coachPersonality
    ? `\n[Koçluk Kişiliği: ${coachPersonality}]`
    : '';

  let stateNote = '';
  if (userState) {
    const u = userState;
    if (u.targetUniversity && u.targetMajor) {
      stateNote += `\nHedef: ${u.targetUniversity} - ${u.targetMajor}`;
    }
    if (u.tytTarget || u.aytTarget) {
      stateNote += `. Hedef Netler: TYT:${u.tytTarget ?? '-'}, AYT:${u.aytTarget ?? '-'}`;
    }
    if (u.tytGap !== undefined && u.aytGap !== undefined) {
      stateNote += `. Mevcut Açık: TYT ${(u.tytGap as number).toFixed(1)}, AYT ${(u.aytGap as number).toFixed(1)}`;
    }
  }

  return `${PERSONA_BASE}${personalityNote}\n\nGÖREV: ${intentGuide}${stateNote}`;
}

// ─── Provider Calls ───────────────────────────────────────────────────────────

async function callOpenAICompatible(
  apiUrl: string,
  apiKey: string,
  model: string,
  messages: OpenAIMessage[],
  maxTokens: number
): Promise<string> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://boho-mentos.vercel.app',
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data?.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Empty provider response');
  return content;
}

async function callGemini(
  apiKey: string,
  prompt: string,
  systemInstruction: string,
  chatHistory: ChatHistoryItem[]
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const contents = chatHistory.map((msg) => ({
    role: msg.role === 'coach' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
  contents.push({ role: 'user', parts: [{ text: prompt }] });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: { systemInstruction, temperature: 0.7 },
  });
  const text = (response as unknown as { text: string }).text ?? '';
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

// ─── Key Helpers ──────────────────────────────────────────────────────────────

const env = process.env as Record<string, string | undefined>;

function getKeys(prefix: string, count = 4): string[] {
  const keys: string[] = [];
  if (env[prefix]) keys.push(env[prefix]!);
  for (let i = 2; i <= count; i++) {
    const v = env[`${prefix}_${i}`];
    if (v) keys.push(v);
  }
  return keys;
}

// ─── Coach Response ───────────────────────────────────────────────────────────

async function getCoachResponseServer(body: AiRequestBody): Promise<{
  text: string;
  providerUsed?: string;
  telemetry?: ProviderTelemetry[];
  error?: string;
}> {
  // intent — BUILD-001: legacy "action" → intent migration
  let intent: CoachIntent = 'free_chat';
  if (body.intent && INTENT_INSTRUCTIONS[body.intent]) {
    intent = body.intent;
  } else if (body.action === 'qa_mode') {
    intent = 'qa_mode';
  }
  // NOTE: "coach" action artık intent'e map edilmiyor — free_chat default

  const userMessage = String(body.userMessage ?? '').trim();
  if (!userMessage) return { text: 'Mesaj boş olamaz.' };

  const context = String(body.context ?? '');
  const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory.slice(-6) : [];
  const maxTokens = Math.max(200, Math.min(3000, Number(body.maxTokens) || 1200));
  const wantDirective = body.wantDirective === true;

  const systemInstruction = buildSystemInstruction(
    intent,
    body.coachPersonality,
    body.userState
  );

  const fullPrompt = [
    `Bağlam:\n${context}`,
    `Mesaj:\n${userMessage}`,
    wantDirective ? `\nKURAL: SADECE GEÇERLİ JSON DÖNDÜR.${DIRECTIVE_JSON_SCHEMA}` : '',
    body.forceJson ? '\nKURAL: SADECE GEÇERLİ JSON DÖNDÜR.' : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const openAIMsgs: OpenAIMessage[] = [
    { role: 'system', content: systemInstruction },
    ...chatHistory.map((m): OpenAIMessage => ({
      role: m.role === 'coach' ? 'assistant' : 'user',
      content: m.content,
    })),
    { role: 'user', content: fullPrompt },
  ];

  const providers = [
    {
      name: 'Cerebras',
      keys: getKeys('CEREBRAS_API_KEY', 2),
      call: (key: string) =>
        callOpenAICompatible(CEREBRAS_API_URL, key, CEREBRAS_MODEL, openAIMsgs, maxTokens),
    },
    {
      name: 'Gemini',
      keys: getKeys('GEMINI_API_KEY', 4),
      call: (key: string) =>
        callGemini(key, fullPrompt, systemInstruction, chatHistory),
    },
    {
      name: 'Groq',
      keys: getKeys('GROQ_API_KEY', 4),
      call: (key: string) =>
        callOpenAICompatible(GROQ_API_URL, key, GROQ_MODEL, openAIMsgs, Math.min(maxTokens, 800)),
    },
    {
      name: 'OpenRouter',
      keys: getKeys('OPENROUTER_API_KEY', 1),
      call: (key: string) =>
        callOpenAICompatible(OPENROUTER_API_URL, key, OPENROUTER_MODEL, openAIMsgs, maxTokens),
    },
  ];

  const telemetry: ProviderTelemetry[] = [];

  for (const provider of providers) {
    for (const key of provider.keys) {
      const t0 = Date.now();
      try {
        const text = await provider.call(key);
        if (text && text.trim().length > 0) {
          telemetry.push({ provider: provider.name, latencyMs: Date.now() - t0, success: true });
          console.info(`[AI] ${provider.name} OK ${Date.now() - t0}ms intent=${intent}`);
          return { text: text.trim(), providerUsed: provider.name, telemetry };
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        // SEC-005: raw provider error client'a sızmıyor — sadece loglama
        console.error(`[AI] ${provider.name} FAIL: ${errMsg.slice(0, 120)}`);
        telemetry.push({
          provider: provider.name,
          latencyMs: Date.now() - t0,
          success: false,
          errorCode: errMsg.slice(0, 60),
        });
      }
    }
  }

  return {
    text: 'Tüm AI hatları meşgul veya limitler doldu. Lütfen 1 dakika sonra tekrar dene.',
    error: 'ALL_PROVIDERS_FAILED',
    telemetry,
  };
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

const RATE_WINDOW_MS = 30_000;
const RATE_MAX = 30;

// Upstash Redis — zorunlu yol (BUG-003 kalıcı fix)
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

const persistentRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_MAX, `${RATE_WINDOW_MS} ms`),
      prefix: 'ai_rl',
    })
  : null;

// In-memory fallback — serverless cold start aware
const memBucket = new Map<string, { count: number; windowStart: number }>();

function memRateLimit(ip: string): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const cur = memBucket.get(ip);
  if (!cur || now - cur.windowStart > RATE_WINDOW_MS) {
    memBucket.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (cur.count >= RATE_MAX) {
    return { ok: false, retryAfterMs: RATE_WINDOW_MS - (now - cur.windowStart) };
  }
  cur.count += 1;
  return { ok: true };
}

async function checkRateLimit(ip: string): Promise<{ ok: boolean; retryAfterMs?: number }> {
  if (persistentRateLimit) {
    const res = await persistentRateLimit.limit(ip);
    if (!res.success) {
      const ms = typeof res.reset === 'number' ? Math.max(res.reset - Date.now(), 0) : 1000;
      return { ok: false, retryAfterMs: ms };
    }
    return { ok: true };
  }
  // Upstash yoksa in-memory (cold start sıfırlanır — sadece geliştirme ortamı)
  if (!persistentRateLimit) {
    console.warn('[AI] Rate limiter: Upstash Redis env yok. In-memory kullanılıyor.');
  }
  return memRateLimit(ip);
}

function getClientIp(req: { headers?: Record<string, string | undefined>; socket?: { remoteAddress?: string } }): string {
  const fwd = (req.headers?.['x-forwarded-for'] as string | undefined) ?? '';
  return fwd.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: Record<string, unknown>,
  res: {
    statusCode: number;
    setHeader: (k: string, v: string) => void;
    end: (body: string) => void;
  }
): Promise<void> {
  if ((req.method as string) !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  const rl = await checkRateLimit(getClientIp(req as never));
  if (!rl.ok) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(Math.ceil((rl.retryAfterMs ?? 1000) / 1000)));
    res.end(JSON.stringify({ error: 'RATE_LIMITED' }));
    return;
  }

  const rawBody =
    typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

  let body: AiRequestBody;
  try {
    body = JSON.parse(rawBody) as AiRequestBody;
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'INVALID_JSON' }));
    return;
  }

  try {
    // Voice log ayrı akış
    if (body.action === 'parseVoiceLog' || body.transcript) {
      const transcript = String(body.transcript ?? '');
      const data = await parseVoiceLogServer(transcript);
      res.statusCode = 200;
      res.end(JSON.stringify({ data }));
      return;
    }

    const result = await getCoachResponseServer(body);
    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[AI Handler]', msg);
    // SEC-005: raw error client'a sızmamalı
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'AI_SERVER_ERROR', message: 'İşlem sırasında hata oluştu.' }));
  }
}

// ─── Voice Log ────────────────────────────────────────────────────────────────

async function parseVoiceLogServer(transcript: string): Promise<Record<string, unknown> | null> {
  if (!transcript.trim()) return null;
  const prompt = `Analiz et ve SADECE JSON döndür: "${transcript}".
Format: {examType, subject, topic, questions, correct, wrong, empty, avgTime, emotion: {fatigue, stress, motivation}, coachAdvice}`;

  for (const key of getKeys('GEMINI_API_KEY', 4)) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.1 },
      });
      const text = (response as unknown as { text: string }).text ?? '{}';
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
}
