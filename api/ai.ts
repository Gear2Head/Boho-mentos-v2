/**
 * AMAÇ: Vercel serverless AI orkestratörü.
 * MANTIK: Tek intent modeli + promptBuilder source-of-truth + provider fallback.
 *
 * TODO-001: JSON Hallucination Guard — sanitizeJsonResponse + bracket-balance parser
 * TODO-003: x-ratelimit-remaining header
 * TODO-010: Vision (imageBase64) support for Gemini
 */

import { GoogleGenAI } from '@google/genai';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import {
  buildSystemInstruction,
  buildStructuredSystemInstruction,
} from '../src/services/promptBuilder';

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
  | 'micro_feedback'
  | 'inverse_coaching'
  | 'flashcard_generation'
  | 'forgetting_curve_reminder'
  | 'daily_quest';

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
  transcript?: string;
  // TODO-010: Vision multimodal
  imageBase64?: string;
  imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

interface ProviderTelemetry {
  provider: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  parseAttempts?: number;
}

// ─── Models ───────────────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.0-flash';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const OPENROUTER_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';
const CEREBRAS_MODEL = 'llama3.1-8b';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';

// ─── TODO-001: JSON Sanitizer ─────────────────────────────────────────────────

function sanitizeJsonResponse(raw: string): string {
  const s = raw.trim();

  // Find first { or [ — skip any markdown prefix entirely
  const firstObj = s.indexOf('{');
  const firstArr = s.indexOf('[');
  if (firstObj === -1 && firstArr === -1) return s;

  let startChar: number;
  if (firstObj === -1) startChar = firstArr;
  else if (firstArr === -1) startChar = firstObj;
  else startChar = Math.min(firstObj, firstArr);

  const openChar = s[startChar];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;
  let endIdx = -1;

  for (let i = startChar; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  const extracted = endIdx === -1 ? s.substring(startChar) : s.substring(startChar, endIdx + 1);
  // Remove trailing commas before } or ] (common LLM error)
  return extracted.replace(/,(\s*[}\]])/g, '$1');
}

function tryParseJson(raw: string): unknown | null {
  try { return JSON.parse(sanitizeJsonResponse(raw)); } catch { return null; }
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
  chatHistory: ChatHistoryItem[],
  imageBase64?: string,
  imageMediaType?: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const contents = chatHistory.map((msg) => ({
    role: msg.role === 'coach' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  // TODO-010: Attach image inline data if provided
  const userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];
  if (imageBase64 && imageMediaType) {
    userParts.push({ inlineData: { mimeType: imageMediaType, data: imageBase64 } });
  }

  contents.push({ role: 'user', parts: userParts as { text: string }[] });

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
  let intent: CoachIntent = 'free_chat';
  if (body.intent) intent = body.intent;
  else if (body.action === 'qa_mode') intent = 'qa_mode';

  const userMessage = String(body.userMessage ?? '').trim();
  if (!userMessage) return { text: 'Mesaj boş olamaz.' };

  const context = String(body.context ?? '');
  const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory.slice(-6) : [];
  const maxTokens = Math.max(200, Math.min(3000, Number(body.maxTokens) || 1200));
  const wantDirective = body.wantDirective === true;
  const needsJson = wantDirective || body.forceJson === true;
  const hasImage = Boolean(body.imageBase64 && body.imageMediaType);

  const contextObj = (body.userState as Record<string, unknown>) || {};

  const systemInstruction = wantDirective
    ? buildStructuredSystemInstruction(intent, contextObj, body.coachPersonality)
    : buildSystemInstruction(intent, contextObj, body.coachPersonality);

  const fullPrompt = [
    `Bağlam:\n${context}`,
    `Mesaj:\n${userMessage}`,
    body.forceJson && !wantDirective ? '\nKURAL: SADECE GEÇERLİ JSON DÖNDÜR.' : '',
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

  // TODO-010: Vision-only providers if image present
  const providers = hasImage
    ? [
        {
          name: 'Gemini',
          keys: getKeys('GEMINI_API_KEY', 4),
          call: (key: string) =>
            callGemini(key, fullPrompt, systemInstruction, chatHistory, body.imageBase64, body.imageMediaType),
        },
      ]
    : [
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
      let parseAttempts = 0;
      try {
        const text = await provider.call(key);
        if (!text || text.trim().length === 0) continue;

        if (needsJson) {
          parseAttempts++;
          if (tryParseJson(text) === null) {
            console.warn(`[AI] ${provider.name} malformed JSON (attempt ${parseAttempts}) — next key/provider`);
            telemetry.push({ provider: provider.name, latencyMs: Date.now() - t0, success: false, errorCode: 'JSON_PARSE_FAIL', parseAttempts });
            continue;
          }
        }

        telemetry.push({ 
          provider: provider.name, 
          latencyMs: Date.now() - t0, 
          success: true,
          parseAttempts
        });
        
        console.info(`[AI] ${provider.name} OK ${Date.now() - t0}ms intent=${intent}`);
        return { text: text.trim(), providerUsed: provider.name, telemetry };
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error(`[AI] ${provider.name} FAIL: ${errMsg.slice(0, 120)}`);
        telemetry.push({
          provider: provider.name,
          latencyMs: Date.now() - t0,
          success: false,
          errorCode: errMsg.slice(0, 60),
          parseAttempts
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

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

if (!redis) {
  console.warn('[AI] Upstash Redis env eksik — in-memory rate limit aktif (serverless cold-start sıfırlanır).');
}

const persistentRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_MAX, `${RATE_WINDOW_MS} ms`),
      prefix: 'ai_rl',
    })
  : null;

// In-memory fallback
const memBucket = new Map<string, { count: number; windowStart: number }>();

function memRateLimit(ip: string): { ok: boolean; retryAfterMs?: number; remaining: number } {
  const now = Date.now();
  const cur = memBucket.get(ip);
  if (!cur || now - cur.windowStart > RATE_WINDOW_MS) {
    memBucket.set(ip, { count: 1, windowStart: now });
    return { ok: true, remaining: RATE_MAX - 1 };
  }
  if (cur.count >= RATE_MAX) {
    return { ok: false, retryAfterMs: RATE_WINDOW_MS - (now - cur.windowStart), remaining: 0 };
  }
  cur.count += 1;
  return { ok: true, remaining: RATE_MAX - cur.count };
}

async function checkRateLimit(ip: string): Promise<{ ok: boolean; retryAfterMs?: number; remaining: number }> {
  try {
    if (persistentRateLimit) {
      const res = await persistentRateLimit.limit(ip);
      if (!res.success) {
        const ms = typeof res.reset === 'number' ? Math.max(res.reset - Date.now(), 0) : 1000;
        return { ok: false, retryAfterMs: ms, remaining: 0 };
      }
      return { ok: true, remaining: res.remaining ?? RATE_MAX };
    }
  } catch (err) {
    console.error('[AI] Rate limiter Redis error:', err);
    return memRateLimit(ip);
  }
  return memRateLimit(ip);
}

function getClientIp(req: { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  let fwd = req.headers?.['x-forwarded-for'];
  if (Array.isArray(fwd)) fwd = fwd[0];
  fwd = (fwd as string | undefined) ?? '';
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
  try {
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

    // TODO-003: Expose remaining limit to client
    res.setHeader('x-ratelimit-remaining', String(rl.remaining));

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
