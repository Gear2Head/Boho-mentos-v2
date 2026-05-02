/**
 * BOHO MENTOS v2 - MASTER COACH AI ORCHESTRATOR
 * Groq-only provider with multi-key rotation and typed failures.
 *
 * V20 (COACH-QUALITY-001):
 * - STRUCTURED_JSON_INSTRUCTION: Detailed task schema with required subject/topic/rationale
 * - INTENT_INSTRUCTIONS: Rich, context-aware per-intent guidance
 * - buildPrompt: Directive tasks MUST reference real student data; generic tasks banned
 * - temperature: 0.7 for directive intents to improve variety
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { CoachApiRequest, CoachIntent, CoachProviderId } from '../src/types/coach';
import { shouldForceJson } from '../src/services/coachContract';

export const config = {
  runtime: 'edge',
};

type ChatHistoryItem = { role: 'user' | 'coach' | 'system'; content: string };
type GroqRole = 'system' | 'user' | 'assistant';
type GroqContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;
type GroqMessage = { role: GroqRole; content: GroqContent };

type AiRequestBody = Partial<Omit<CoachApiRequest, 'chatHistory' | 'imageMediaType' | 'userState'>> & {
  chatHistory?: ChatHistoryItem[];
  userState?: Record<string, unknown>;
  imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  transcript?: string;
  action?: string;
};

class ProviderError extends Error {
  status: number;
  code: string;
  debug?: unknown;

  constructor(status: number, code: string, message: string, debug?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.debug = debug;
  }
}

// ─── Persona Core ─────────────────────────────────────────────────────────────

const PERSONALITY_CORE = `Sen Kübra'sın — Türkiye'nin en gelişmiş, veriye dayalı YKS mentörü.

FELSEFE: Mazeretlerin istatistiksel değeri yoktur. Boş motivasyon ve "yaparsın" edebiyatı YASAKTIR.
DİL: Soğuk, cerrahi, analitik. Gerektiğinde sarkastik dürüstlük.
KURAL #1: "Genel" görevler KESİNLİKLE YASAK. Her görev bir konuya, soru sayısına ve süreye bağlı olmalı.
  ❌ KÖTÜ: "Konuyu gözden geçir ve soru çöz"
  ✅ İYİ: "TYT Matematik - Türev: 25 soru (Hedef: %75 doğruluk, 35 dakika) [GAP: -12.3 net]"
KURAL #2: Görevler BAĞLAMSAL olmalı. Öğrencinin ELO, deneme netleri, zayıf konu verileri KULLANILMALI.
KURAL #3: Hiçbir görevin title'ı önceki görevle aynı olamaz. Tekrar eden görevler YASAK.
GÖRSEL: Tablo, kıyaslama, rapor sorularında Markdown TABLO kullan. TYT ve AYT verilerini aynı satırda karıştırma.
Chatbot DEĞİLSİN. Ham JSON asla kullanıcıya gösterilmez; JSON yalnızca parse edilebilir blok olarak üretilir.`;

const CLAUDE_STYLE_GUIDANCE = `
[CLAUDE-BENZERI DAVRANIS]
- Varsayilan ton sakin, dusunceli ve net olsun.
- Serbest sohbette once kullanicinin niyetini anla, sonra kisa gerekceyle cevap ver.
- Operasyonel intentlerde dogal metin + olculebilir aksiyon ayrimini koru.
- Kaynak onerisinde sadece onayli katalog kaynaklarina dayan; kaynak yoksa bunu acikca soyle.
- Gereksiz sertlik, bos motivasyon ve ham JSON gosterimi yasak.`;

const PERSONALITY_MODES: Record<string, string> = {
  enforcer: 'ENFORCER: Net ve kararlı. Görevler somut, ölçülebilir.',
  hardcore: 'HARDCORE: Bahanelere sıfır tolerans. Acı gerçeği söyle, empati yok.',
  analyst: 'ANALYST: Rakamlar konuşur. Kanıt, trend, korelasyon kullan.',
  oracle: 'ORACLE: Tahmin ve projeksiyon yap. Belirsizliği sayısal olarak ifade et.',
};

// ─── Intent Instructions ───────────────────────────────────────────────────────

const INTENT_INSTRUCTIONS: Record<string, string> = {
  daily_plan: `ÖĞRENCİNİN BAĞLAMINI KULLAN (ELO, son denemeler, zayıf konular, haftalık çalışma hızı).
Bugün için 3-5 SOMUT görev üret. Her görev: hangi ders, hangi konu, kaç soru, kaç dakika, neden (%gap veya %risk).
Tablo formatı: | Ders | Konu | Soru | Süre | Öncelik | Gerekçe |
"Çalış" veya "Gözden geçir" deme; ölçülebilir eylem ver.
[[OPEN:log_study]]`,

  exam_debrief: `Son deneme savaş raporu. BAĞLAMDAN gelen gerçek ders netlerini KULLAN.
Format:
1. Net Özeti TABLO: Ders | Mevcut Net | Hedef Net | Fark | Risk
2. En riskli 2 ders ve neden (yanlış tipi, süre sorunu, konu boşluğu)
3. Korunacak 1 güçlü alan
4. 48 saatlik telafi planı (spesifik konular, soru sayıları)
Generic "30 soru çöz" YASAK — hangi konudan, hangi hedefle belirt.`,

  exam_analysis: `Deneme netlerini hedef ile TABLO ile karşılaştır. Ders bazlı fark (gap) hesapla.
Güçlü/zayıf konuları tespit et. Eksik alanlara öncelik sırası ver.
Bir sonraki adım olarak spesifik 3 görev üret — konu ve soru sayısı içermeli.`,

  log_analysis: `Log verisini analiz et: doğruluk oranı, hız, yorgunluk, alışkanlık örüntüsü.
Format: [Veri TABLO] → [Tek Kritik Anomali] → [Acil Eylem].
Acil eylem: bugün yatmadan yapılacak tek şey, konusu ve soru sayısıyla belirt.`,

  micro_feedback: `KESİN FORMAT — 3 cümle, fazlası yasak:
1. [VERİ]: {soru sayısı} soru, %{acc} doğruluk, {hız}dk/soru — müfredat ortalamasına göre durum.
2. [ANOMALİ]: Bu seansın tek kritik metodolojik hatası veya risk sinyali.
3. [EMİR]: Bugün yatmadan {konu} konusundan {N} soru çöz.`,

  war_room_analysis: `War Room simülasyonu bitti. Gerçek soru verilerini kullan:
TABLO: Konu | D | Y | Hata Tipi | Risk
Hatalı soruların ortak paydası nedir? Hangi konu/tip tuzak?
3 somut aksiyon: spesifik konu, soru sayısı ve hedef doğruluk.`,

  weekly_review: `Haftalık retrospektif — verilerden konuş, tahmin değil gözlem:
TABLO: Ders | Toplam Soru | Başarı % | ELO Değişimi
Ne oldu (veri) → Neden oldu (örüntü) → Gelecek hafta 3 somut karar.`,

  free_chat: `Öğrenci seninle serbest konuşuyor. Mevcut durum özetini TABLO ile en başta sun:
| Metrik | Değer | Hedef | Durum |
Sonra YKS hedefleriyle ilişkilendirerek cevap ver. Mesajın sonunda 1 somut eylem öner.`,

  topic_explain: `Konuyu sade ve net açıkla. Önemli formüller/kavramlar TABLO ile kıyasla.
YKS'ye özgü ipuçları ve yaygın tuzaklar ver. Sokratik sorularla anlama derin.`,

  intervention: `ACİL MÜDAHALE. Durum vs Olması Gereken TABLO. Empati değil, eylem.
Mevcut performans neden tehlikeli? 1 kritik değişim kararı ve uygulama planı.`,

  inverse_coaching: `Öğrenci rolünü oynuyorsun. Kullanıcı konuyu anlat, sen meraklı ama kavramsal boşlukları yakalayan öğrenci gibi sor.
Anlatım bitince: 3 maddeli güçlü/zayıf özet ve 1 gerçek tespit ettiğin hata.`,

  flashcard_generation: `Konuşma geçmişinden veya verilen konudan 5 adet çalışma kartı üret. SADECE JSON dizi:
[{"front":"...","back":"...","difficulty":"easy|medium|hard","subject":"..."}]`,

  forgetting_curve_reminder: `Ebbinghaus eğrisine göre tekrar zamanı gelen konular TABLO (Konu | Son Çalışma | Gün | Tekrar Görevi).
Her konu için 10 dakikalık mini tekrar görevi ver; somut ol.`,

  daily_quest: `Öğrencinin gün verilerine bakarak 3 YÜKSEK ÖNCELİKLİ görev üret. Structured JSON directive formatında.
Her görev: spesifik konu, kaç soru, hangi kaynak, 60-120 dk. Generic görev YASAK.`,

  vision_archive_parse: `Vizyon notlarını analiz et. Mevcut disiplin vs Vizyon uyumu TABLO ile kıyasla.
3 maddelik stratejik düzeltme önerisi: ölçülebilir ve bağlamsal.`,

  generate_weekly_strategy: `Son 7 günlük veri (loglar, denemeler, ELO) ile haftalık yol haritası çıkar. TABLO ile sun.
3 ana konu (neden bu?), 2 kritik risk (sayısal kanıt), 1 büyük hedef.`,

  quiz_generation: `YKS tipinde analitik sorular üret. Çeldiriciler kullan. SADECE JSON liste döndür.`,

  qa_mode: `YKS Asistanı modu. Kısa, teknik, net cevap. Gereksiz motivasyon yasak.`,

  socratic_force: `SOCRATIC: Direkt cevap verme. Önce yönlendirici soru sor, adım adım düşündür.`,

  forgetting_curve_reminder_2: '',
};

// ─── Directive Schema (v20 — strict, contextual) ──────────────────────────────

const STRUCTURED_JSON_INSTRUCTION = `
ZORUNLU DİREKTİF JSON ŞEMASI — Markdown kod bloğu KULLANMA, sadece ham JSON:
{
  "headline": "Kısa ve etkili başlık (max 60 karakter)",
  "summary": "1-2 cümle özet. Mevcut NET veya ELO değerinden bahset.",
  "tasks": [
    {
      "id": "task_<timestamp>_0",
      "title": "SPESIFIK başlık: Ders - Konu - Hedef (Örn: 'TYT Mat Türev: 25 soru, %75 doğruluk')",
      "priority": "high|medium|low",
      "subject": "Tam ders adı (Örn: Matematik, Fizik, Türkçe)",
      "topic": "Spesifik konu (Örn: Türev, Momentum, Paragraf)",
      "action": "Ne yapılacak (Örn: 'Ders kitabı örnek 3.4-3.8 çöz, yanlışları not et')",
      "targetMinutes": 45,
      "targetQuestions": 25,
      "dueWindow": "today|tomorrow|this_week",
      "rationale": "Neden bu görev? Öğrencinin verisine dayalı gerekçe (Örn: 'Son 3 denemede Fizik neti -8.2, momentum hataları kritik')",
      "successCriteria": "Başarı kriteri (Örn: '25 sorudan 19+ doğru, yanlış kalıpları not defterine')",
      "originSurface": "coach"
    }
  ],
  "warnings": [
    { "type": "avoidance|burnout|plateau|time_risk", "message": "Spesifik uyarı metni", "severity": "critical|high|medium" }
  ],
  "followUpQuestion": "Öğrenciyi düşündürecek 1 soru",
  "confidence": 85,
  "detectedLogs": []
}

KRİTİK KURALLAR:
1. Her task.title FARKLI ve SPESIFIK olmalı — "Konuyu gözden geçir" YASAK
2. task.subject ve task.topic DOLU olmalı — boş bırakma
3. task.rationale öğrencinin mevcut verilerine referans vermeli (ELO, net, gap, zayıf konu)
4. Görev sayısı: 2-5 arası. 5'ten fazla görev verme
5. Eğer mesajda çalışma logu (Örn: "2 saat kimya çalıştım, 50 soru") tespit edersen:
   "detectedLogs": [{"subject":"Kimya","topic":"...","questions":50,"duration":120}]`;

// ─── Model Config ──────────────────────────────────────────────────────────────
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const DEFAULT_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile';
const DEFAULT_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const DEFAULT_OPENROUTER_TEXT_MODEL = process.env.OPENROUTER_TEXT_MODEL || 'anthropic/claude-3.5-sonnet';
const DEFAULT_OPENROUTER_VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || DEFAULT_OPENROUTER_TEXT_MODEL;
const PREFERRED_PROVIDER = (process.env.AI_PROVIDER || process.env.AI_TEXT_PROVIDER || 'groq').toLowerCase() as CoachProviderId;

// Intents that benefit from higher temperature for variety
const HIGH_QUALITY_INTENTS = new Set([
  'daily_plan', 'exam_debrief', 'weekly_review', 'intervention', 'war_room_analysis', 'daily_quest'
]);

const TABLE_OUTPUT_INSTRUCTION =
  'Tablo, kıyas, rapor, deneme veya net analizi sorularında Markdown tablo kullan. TYT ve AYT metriklerini aynı satırda karıştırma; her sınav türünü ayrı değerlendir.';

let geminiKeyCursor = 0;
let groqKeyCursor = 0;
let openRouterKeyCursor = 0;

function safeParseDirective(raw: string): any {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

async function lookupUser(idToken: string): Promise<any> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new ProviderError(503, 'FIREBASE_WEB_API_KEY_MISSING', 'Firebase web API key is missing');

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.users?.[0];
}

function jsonResponse(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function getGeminiKeys(): string[] {
  const numbered = Object.entries(process.env)
    .map(([name, value]) => {
      const match = name.match(/^GEMINI_API_KEY_(\d+)$/);
      return match && value?.trim() ? { index: Number(match[1]), value: value.trim() } : null;
    })
    .filter((entry): entry is { index: number; value: string } => Boolean(entry))
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.value);

  const legacy = process.env.GEMINI_API_KEY?.trim();
  if (legacy && !numbered.includes(legacy)) numbered.push(legacy);
  return numbered;
}

function getGroqKeys(): string[] {
  const numbered = Object.entries(process.env)
    .map(([name, value]) => {
      const match = name.match(/^GROQ_API_KEY_(\d+)$/);
      return match && value?.trim() ? { index: Number(match[1]), value: value.trim() } : null;
    })
    .filter((entry): entry is { index: number; value: string } => Boolean(entry))
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.value);

  const legacy = process.env.GROQ_API_KEY?.trim();
  if (legacy && !numbered.includes(legacy)) numbered.push(legacy);
  return numbered;
}

function getOpenRouterKeys(): string[] {
  const numbered = Object.entries(process.env)
    .map(([name, value]) => {
      const match = name.match(/^OPENROUTER_API_KEY_(\d+)$/);
      return match && value?.trim() ? { index: Number(match[1]), value: value.trim() } : null;
    })
    .filter((entry): entry is { index: number; value: string } => Boolean(entry))
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.value);

  const legacy = process.env.OPENROUTER_API_KEY?.trim();
  if (legacy && !numbered.includes(legacy)) numbered.push(legacy);
  return numbered;
}

// ─── Prompt Builder (v20) ─────────────────────────────────────────────────────

function buildPrompt(body: AiRequestBody): string {
  const intent = body.intent || 'free_chat';
  const userStateObj = (body.userState || {}) as any;
  const isCriticalAvoidance = userStateObj.avoidanceLevel >= 3;
  const shouldEscalate = userStateObj.eloScore < 800 || userStateObj.frustrationIndex > 70 || isCriticalAvoidance;
  const personalityMode = shouldEscalate
    ? (isCriticalAvoidance ? 'oracle' : 'hardcore')
    : (body.coachPersonality || 'enforcer');

  const history = (body.chatHistory || [])
    .slice(-6)
    .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
    .join('\n');

  // Build a data-rich userState summary to ground directive tasks
  const us = userStateObj;
  const dataContext = [
    us.name ? `Öğrenci: ${us.name} | Alan: ${us.track || '?'}` : '',
    us.tytTarget ? `TYT Hedef: ${us.tytTarget} | Mevcut: ${us.lastTytNet ?? '?'} | Fark: ${us.tytTarget - (us.lastTytNet ?? 0) > 0 ? `-${(us.tytTarget - (us.lastTytNet ?? 0)).toFixed(1)}` : `+${Math.abs(us.tytTarget - (us.lastTytNet ?? 0)).toFixed(1)}`}` : '',
    us.aytTarget ? `AYT Hedef: ${us.aytTarget} | Mevcut: ${us.lastAytNet ?? '?'} | Fark: ${us.aytTarget - (us.lastAytNet ?? 0) > 0 ? `-${(us.aytTarget - (us.lastAytNet ?? 0)).toFixed(1)}` : `+${Math.abs(us.aytTarget - (us.lastAytNet ?? 0)).toFixed(1)}`}` : '',
    us.eloScore ? `ELO: ${us.eloScore} | Seri: ${us.streakDays ?? 0} gün | Trend: ${us.netTrend ?? '?'}` : '',
    us.targetUniversity ? `Hedef: ${us.targetUniversity}${us.targetMajor ? ' / ' + us.targetMajor : ''}` : '',
    us.lastLogs?.length ? `Son Loglar: ${(us.lastLogs as string[]).join(' | ')}` : '',
    us.lastExams?.length ? `Son Denemeler: ${(us.lastExams as string[]).join(' | ')}` : '',
    us.daysToExam ? `Sınava Kalan: ${us.daysToExam} gün` : '',
    us.lastDirectiveStatus ? `Son Plan Durumu: ${us.lastDirectiveStatus}` : '',
    Array.isArray(us.memoryControls) && us.memoryControls.length
      ? `Kontrollu Hafiza: ${us.memoryControls.filter((m: any) => m.visibility !== 'hidden').map((m: any) => `${m.label}: ${m.value}`).join(' | ')}`
      : '',
    Array.isArray(us.approvedResourceTopics) && us.approvedResourceTopics.length
      ? `ONAYLI KAYNAK KATALOGU: ${us.approvedResourceTopics.join(', ')}. Bu liste disinda kaynak veya link uydurma.`
      : 'ONAYLI KAYNAK KATALOGU: uygun kaynak yoksa kaynak yok de; link uydurma.',
  ].filter(Boolean).join('\n');

  const intentGuide = INTENT_INSTRUCTIONS[intent] || 'Kullanıcıya bağlama uygun, kısa ve uygulanabilir yanıt ver.';

  return [
    PERSONALITY_CORE,
    CLAUDE_STYLE_GUIDANCE,
    TABLE_OUTPUT_INSTRUCTION,
    PERSONALITY_MODES[personalityMode] || '',
    `GÖREV: ${intentGuide}`,
    dataContext ? `ÖĞRENCİ VERİSİ (Direktif görevleri bu veriye dayalı olmalı):\n${dataContext}` : '',
    body.context ? `TAM BAĞLAM:\n${body.context}` : '',
    history ? `SON KONUŞMA:\n${history}` : '',
    `KULLANICI MESAJI:\n${body.userMessage || ''}`,
    body.wantDirective ? STRUCTURED_JSON_INSTRUCTION : '',
  ].filter(Boolean).join('\n\n');
}



async function callGemini(
  messages: GroqMessage[],
  opts: { image?: boolean; maxTokens?: number; forceJson?: boolean; intent?: string } = {}
): Promise<{ text: string; keyIndex: number; model: string; provider: CoachProviderId }> {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    throw new ProviderError(503, 'GEMINI_KEYS_NOT_CONFIGURED', 'No Gemini API keys are configured');
  }

  const start = geminiKeyCursor % keys.length;
  geminiKeyCursor = (geminiKeyCursor + 1) % keys.length;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const keyIndex = (start + attempt) % keys.length;
    const model = DEFAULT_GEMINI_MODEL;

    try {
      const geminiMessages = messages.map(m => ({
        role: m.role === 'system' ? 'user' : (m.role === 'assistant' ? 'model' : 'user'),
        parts: Array.isArray(m.content) 
          ? m.content.map(c => c.type === 'text' ? { text: c.text } : { inline_data: { mime_type: 'image/jpeg', data: (c as any).image_url.url.split(',')[1] } })
          : [{ text: m.content }]
      }));

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys[keyIndex]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: opts.intent && HIGH_QUALITY_INTENTS.has(opts.intent) ? 0.72 : 0.6,
            maxOutputTokens: opts.maxTokens ?? 2048,
            responseMimeType: opts.forceJson ? 'application/json' : 'text/plain',
          }
        }),
      });

      const raw = await response.text();
      if (!response.ok) {
        lastError = { status: response.status, body: raw, keyIndex, model };
        continue;
      }

      const data = JSON.parse(raw);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== 'string' || !text.trim()) {
        lastError = { status: 502, body: 'Gemini response missing text', keyIndex, model };
        continue;
      }

      return { text, keyIndex, model, provider: 'gemini' };
    } catch (error) {
      lastError = { error: error instanceof Error ? error.message : String(error), keyIndex, model };
    }
  }

  throw new ProviderError(503, 'ALL_GEMINI_KEYS_FAILED', 'All Gemini keys failed', lastError);
}

function buildGroqMessages(prompt: string, body: AiRequestBody): GroqMessage[] {
  if (!body.imageBase64) {
    return [
      { role: 'system', content: prompt },
      { role: 'user', content: body.userMessage || 'Devam et.' },
    ];
  }

  const mime = body.imageMediaType || 'image/jpeg';
  return [
    { role: 'system', content: prompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: body.userMessage || 'Bu görseli analiz et.' },
        { type: 'image_url', image_url: { url: `data:${mime};base64,${body.imageBase64}` } },
      ],
    },
  ];
}

async function callGroq(
  messages: GroqMessage[],
  opts: { image?: boolean; maxTokens?: number; forceJson?: boolean; intent?: string } = {}
): Promise<{ text: string; keyIndex: number; model: string; provider: CoachProviderId }> {
  const keys = getGroqKeys();
  if (keys.length === 0) {
    throw new ProviderError(503, 'GROQ_KEYS_NOT_CONFIGURED', 'No Groq API keys are configured');
  }

  const start = groqKeyCursor % keys.length;
  groqKeyCursor = (groqKeyCursor + 1) % keys.length;
  let lastError: unknown = null;

  // Higher temperature for plan-generating intents → more specific, less repetitive tasks
  const temperature = opts.intent && HIGH_QUALITY_INTENTS.has(opts.intent) ? 0.72 : 0.6;

  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const keyIndex = (start + attempt) % keys.length;
    const model = opts.image ? DEFAULT_VISION_MODEL : DEFAULT_TEXT_MODEL;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keys[keyIndex]}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_completion_tokens: opts.maxTokens ?? (opts.image ? 2048 : 4096),
          ...(opts.forceJson ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

      const raw = await response.text();
      if (!response.ok) {
        lastError = { status: response.status, body: raw, keyIndex, model };
        continue;
      }

      const data = JSON.parse(raw);
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) {
        lastError = { status: 502, body: 'Groq response missing choices[0].message.content', keyIndex, model };
        continue;
      }

      return { text, keyIndex, model, provider: 'groq' };
    } catch (error) {
      lastError = { error: error instanceof Error ? error.message : String(error), keyIndex, model };
    }
  }

  throw new ProviderError(503, 'ALL_GROQ_KEYS_FAILED', 'All Groq keys failed', lastError);
}

async function callOpenRouter(
  messages: GroqMessage[],
  opts: { image?: boolean; maxTokens?: number; forceJson?: boolean; intent?: string } = {}
): Promise<{ text: string; keyIndex: number; model: string; provider: CoachProviderId }> {
  const keys = getOpenRouterKeys();
  if (keys.length === 0) {
    throw new ProviderError(503, 'OPENROUTER_KEYS_NOT_CONFIGURED', 'No OpenRouter API keys are configured');
  }

  const start = openRouterKeyCursor % keys.length;
  openRouterKeyCursor = (openRouterKeyCursor + 1) % keys.length;
  let lastError: unknown = null;
  const temperature = opts.intent && HIGH_QUALITY_INTENTS.has(opts.intent) ? 0.62 : 0.48;

  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const keyIndex = (start + attempt) % keys.length;
    const model = opts.image ? DEFAULT_OPENROUTER_VISION_MODEL : DEFAULT_OPENROUTER_TEXT_MODEL;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keys[keyIndex]}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_ORIGIN || 'https://boho-mentos.local',
          'X-Title': 'Boho Mentos Coach',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: opts.maxTokens ?? (opts.image ? 2048 : 4096),
          ...(opts.forceJson ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

      const raw = await response.text();
      if (!response.ok) {
        lastError = { status: response.status, body: raw, keyIndex, model };
        continue;
      }

      const data = JSON.parse(raw);
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) {
        lastError = { status: 502, body: 'OpenRouter response missing choices[0].message.content', keyIndex, model };
        continue;
      }

      return { text, keyIndex, model, provider: 'openrouter' };
    } catch (error) {
      lastError = { error: error instanceof Error ? error.message : String(error), keyIndex, model };
    }
  }

  throw new ProviderError(503, 'ALL_OPENROUTER_KEYS_FAILED', 'All OpenRouter keys failed', lastError);
}

async function callCoachProvider(
  messages: GroqMessage[],
  opts: { image?: boolean; maxTokens?: number; forceJson?: boolean; intent?: string } = {}
): Promise<{ text: string; keyIndex: number; model: string; provider: CoachProviderId }> {
  const orderedProviders: CoachProviderId[] = PREFERRED_PROVIDER === 'gemini'
    ? ['gemini', 'groq', 'openrouter']
    : PREFERRED_PROVIDER === 'openrouter'
      ? ['openrouter', 'gemini', 'groq']
      : ['groq', 'gemini', 'openrouter'];
  let lastError: unknown = null;

  for (const provider of orderedProviders) {
    try {
      if (provider === 'gemini') return await callGemini(messages, opts);
      if (provider === 'openrouter') return await callOpenRouter(messages, opts);
      if (provider === 'groq') return await callGroq(messages, opts);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof ProviderError
    ? lastError
    : new ProviderError(503, 'ALL_AI_PROVIDERS_FAILED', 'All AI providers failed', lastError);
}

const redis = process.env.UPSTASH_REDIS_REST_URL ? Redis.fromEnv() : null;
const ratelimit = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '60 s') }) : null;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return jsonResponse(res, 401, { error: 'AUTH_REQUIRED' });

    const user = await lookupUser(idToken);
    if (!user) return jsonResponse(res, 401, { error: 'INVALID_TOKEN' });

    if (ratelimit) {
      const { success } = await ratelimit.limit(user.localId);
      if (!success) return jsonResponse(res, 429, { error: 'RATE_LIMIT' });
    }

    const body = req.body as AiRequestBody;

    if (body.action === 'parseVoiceLog' || body.transcript) {
      const prompt = `Şu ses kaydını çalışma logu olarak analiz et ve sadece geçerli JSON döndür: ${body.transcript || body.userMessage}`;
      const result = await callCoachProvider([{ role: 'user', content: prompt }], { forceJson: true, maxTokens: 1024 });
      return jsonResponse(res, 200, {
        data: safeParseDirective(result.text) || { text: result.text },
        provider: result.provider,
        model: result.model,
        providerMeta: { provider: result.provider, model: result.model, keyIndex: result.keyIndex + 1 },
      });
    }

    const fullPrompt = buildPrompt(body);
    const messages = buildGroqMessages(fullPrompt, body);
    const intent = body.intent || 'free_chat';
    const result = await callCoachProvider(messages, {
      image: Boolean(body.imageBase64),
      maxTokens: body.maxTokens,
      forceJson: shouldForceJson(intent, Boolean(body.forceJson || body.wantDirective)),
      intent,
    });

    return jsonResponse(res, 200, {
      text: result.text,
      directive: body.wantDirective ? safeParseDirective(result.text) : null,
      provider: result.provider,
      model: result.model,
      keyIndex: result.keyIndex + 1,
      providerMeta: { provider: result.provider, model: result.model, keyIndex: result.keyIndex + 1 },
    });
  } catch (err: any) {
    const status = err instanceof ProviderError ? err.status : 500;
    const code = err instanceof ProviderError ? err.code : 'AI_SERVER_ERROR';
    console.error('[AI]', err);
    return jsonResponse(res, status, {
      error: code,
      message: err?.message || 'AI provider failed',
      debug: err instanceof ProviderError ? err.debug : undefined,
    });
  }
}
