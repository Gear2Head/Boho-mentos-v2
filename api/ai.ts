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
// ─── Inlined types from src/types/coach.ts (Vercel serverless can't resolve src/ imports) ───
type CoachIntent =
  | 'daily_plan' | 'log_analysis' | 'exam_analysis' | 'exam_debrief'
  | 'topic_explain' | 'intervention' | 'qa_mode' | 'free_chat'
  | 'war_room_analysis' | 'weekly_review' | 'micro_feedback'
  | 'inverse_coaching' | 'flashcard_generation' | 'forgetting_curve_reminder'
  | 'daily_quest' | 'vision_archive_parse' | 'generate_weekly_strategy'
  | 'quiz_generation' | 'socratic_force';

type CoachProviderId = 'groq' | 'openrouter' | 'gemini';

interface CoachApiRequest {
  intent: CoachIntent;
  userMessage: string;
  context: string;
  chatHistory?: Array<{ role: 'user' | 'coach' | 'system'; content: string }>;
  coachPersonality?: string;
  forceJson?: boolean;
  maxTokens?: number;
  userState?: Record<string, unknown>;
  wantDirective?: boolean;
  decision?: {
    shouldAttachDirective?: boolean;
    forceJson?: boolean;
    cacheable?: boolean;
    decisionKind?: string;
    responseDepth?: string;
    reason?: string;
  };
  dataFreshness?: {
    contextHash?: string;
    generatedAt?: string;
    requiresFreshData?: boolean;
  };
  imageBase64?: string;
  imageMediaType?: string;
}

// ─── Inlined from src/services/coachContract.ts ───
const JSON_ONLY_INTENTS = new Set<CoachIntent>(['flashcard_generation', 'quiz_generation']);

const DIRECTIVE_ALLOWED_INTENTS = new Set<CoachIntent>([
  'daily_plan',
  'daily_quest',
  'generate_weekly_strategy',
  'weekly_review',
  'exam_analysis',
  'exam_debrief',
  'log_analysis',
  'war_room_analysis',
  'intervention',
]);

const NATURAL_ONLY_INTENTS = new Set<CoachIntent>([
  'free_chat',
  'qa_mode',
  'topic_explain',
  'inverse_coaching',
  'micro_feedback',
  'vision_archive_parse',
  'socratic_force',
]);

function isDirectiveAllowed(intent: CoachIntent): boolean {
  return DIRECTIVE_ALLOWED_INTENTS.has(intent);
}

function shouldAttachDirective(intent: CoachIntent, wantsDirective: boolean): boolean {
  return wantsDirective && isDirectiveAllowed(intent);
}

function shouldForceJson(intent: CoachIntent, wantsDirective: boolean): boolean {
  return JSON_ONLY_INTENTS.has(intent) || shouldAttachDirective(intent, wantsDirective);
}

function resolveServerCoachDecision(body: AiRequestBody) {
  const intent = body.intent || 'free_chat';
  const userAskedForPlan = userExplicitlyAskedForPlan(body.userMessage || '');
  const clientDecision = body.decision;
  const shouldAttach = Boolean(clientDecision?.shouldAttachDirective) ||
    (shouldAttachDirective(intent, Boolean(body.forceJson || body.wantDirective)) &&
      (userAskedForPlan || intent === 'daily_plan' || intent === 'daily_quest' || intent === 'generate_weekly_strategy'));

  return {
    decisionKind: clientDecision?.decisionKind || inferDecisionKind(intent, body.userMessage || ''),
    shouldAttachDirective: shouldAttach,
    forceJson: Boolean(clientDecision?.forceJson) || shouldForceJson(intent, shouldAttach),
    cacheable: Boolean(clientDecision?.cacheable),
    responseDepth: clientDecision?.responseDepth || (shouldAttach ? 'operational' : 'standard'),
    reason: clientDecision?.reason || `serverDecision intent=${intent}; directive=${shouldAttach ? 'on' : 'off'}`,
  };
}

function inferDecisionKind(intent: CoachIntent, message: string): string {
  if (intent === 'topic_explain' || intent === 'qa_mode' || intent === 'socratic_force') return 'teach_concept';
  if (intent === 'intervention') return 'critical_intervention';
  if (intent === 'daily_plan' || intent === 'daily_quest' || intent === 'generate_weekly_strategy') return 'generate_plan';
  if (intent.includes('analysis') || intent === 'exam_debrief' || intent === 'weekly_review' || intent === 'war_room_analysis') return 'analyze_performance';
  if (/\d/.test(message) && /(çözdüm|cozdum|çalıştım|calistim|soru|doğru|dogru)/i.test(message)) return 'log_confirmation';
  if (/(kaynak|kitap|video|pdf|meb|eba|soru bankası|soru bankasi)/i.test(message)) return 'resource_guidance';
  return 'natural_chat';
}

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
  // SECURITY: Debug info is NOT stored on the error object.
  // It is only logged server-side via console.error at the catch boundary.

  constructor(status: number, code: string, message: string, _debug?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    // Log debug info server-side only, never expose to client
    if (_debug) console.error(`[ProviderError:${code}]`, _debug);
  }
}

// ─── Persona Core ─────────────────────────────────────────────────────────────

const PERSONALITY_CORE = `Sen Kübra'sın — Boho Mentos v2 içindeki veriye dayalı YKS mentörü.

ANA KİMLİK:
- Chatbot değilsin; öğrencinin çalışma hafızasını, deneme verilerini ve hedeflerini yorumlayan stratejik mentorsun.
- Varsayılan tonun sakin, net, insan gibi ve ölçülü olmalı.
- Gereksiz sertlik, aşağılama, "toxic" tavır, boş motivasyon ve rol yapma yasak.
- Öğrenci senden özellikle sertlik istemedikçe agresifleşme.

CEVAP FELSEFESİ:
- Önce kullanıcının gerçek niyetini anla.
- Her mesajı otomatik plana veya göreve çevirme.
- Kullanıcı sadece soru soruyorsa soru cevapla.
- Kullanıcı açıklama istiyorsa öğret.
- Kullanıcı sohbet ediyorsa doğal konuş.
- Kullanıcı plan, analiz, görev veya aksiyon istiyorsa ölçülebilir öneri ver.

DİREKTİF KURALI:
Direktif yalnızca şu durumlarda üretilir:
1. Kullanıcı açıkça plan isterse.
2. Kullanıcı "bugün ne çalışayım", "program yap", "görev ver" derse.
3. Kullanıcı deneme/log verisi verip aksiyon isterse.
4. Intent daily_plan, daily_quest, generate_weekly_strategy veya intervention ise.

Direktif üretilmemesi gereken durumlar:
- Serbest sohbet
- Genel soru
- Konu anlatımı
- Kısa açıklama
- Basit netleştirme
- Kullanıcının "durumum ne" gibi analiz istediği ama görev istemediği durumlar

GÖREV KALİTESİ:
Görev verilecekse asla genel olmasın.
❌ "Matematik çalış"
❌ "Konuyu tekrar et"
✅ "AYT Matematik / Diziler: 25 soru, 40 dk, hedef %75 doğruluk"

GÖRSEL FORMAT:
- Tablo, kıyaslama, net analizi ve rapor sorularında Markdown tablo kullan.
- TYT ve AYT verilerini aynı satırda karıştırma.
- Ham JSON asla kullanıcıya gösterilmez; JSON yalnızca API parse amacıyla üretilir.`;

const CLAUDE_STYLE_GUIDANCE = `
[CLAUDE-BENZERI DAVRANIS]
- Varsayilan ton sakin, dusunceli ve net olsun.
- Serbest sohbette once kullanicinin niyetini anla, sonra kisa gerekceyle cevap ver.
- Operasyonel intentlerde dogal metin + olculebilir aksiyon ayrimini koru.
- Kaynak onerisinde sadece onayli katalog kaynaklarina dayan; kaynak yoksa bunu acikca soyle.
- Gereksiz sertlik, bos motivasyon ve ham JSON gosterimi yasak.`;

const PERSONALITY_MODES: Record<string, string> = {
  enforcer:
    'ENFORCER: Net, kısa ve kararlı. Gereksiz sertlik yok; aksiyon istenirse ölçülebilir görev ver.',
  hardcore:
    'HARDCORE: Daha doğrudan ve tavizsiz konuş; ama hakaret, aşağılama ve yapay toxic dil kullanma.',
  analyst:
    'ANALYST: Rakam, trend ve kanıt kullan. Belirsizliği açık belirt. Görev üretmek zorunda değilsin.',
  oracle:
    'ORACLE: Tahmin ve projeksiyon yap. Olasılık ve belirsizlikleri sayısal ifade et.',
  motivational:
    'MOTIVATIONAL: Sakin destek ver; boş motivasyon değil, küçük uygulanabilir hamle öner.',
  default:
    'DEFAULT: Doğal, sakin, net ve bağlama duyarlı konuş.',
};

// ─── Intent Instructions ───────────────────────────────────────────────────────

const INTENT_INSTRUCTIONS: Record<string, string> = {
  daily_plan: `Kullanıcı plan istiyor.
Bugün için 3-5 somut görev üret.
Her görev: ders, konu, soru sayısı, süre, öncelik ve gerekçe içermeli.
Markdown tablo kullan:
| Ders | Konu | Soru | Süre | Öncelik | Gerekçe |
Genel görev yasak. "Çalış", "tekrar et", "gözden geçir" gibi boş fiiller kullanma.
Cevabın sonunda kısa bir uygulama sırası ver.`,

  exam_debrief: `Kullanıcı deneme değerlendirmesi istiyor.
Önce doğal dille kısa özet ver.
Sonra tablo kullan:
| Alan | Mevcut | Hedef | Fark | Yorum |
Sadece gerçekten gerekli ise 1-3 aksiyon öner. Otomatik görev kartı dili kullanma.
Kullanıcı açıkça plan istemediyse direktif üretme.`,

  exam_analysis: `Deneme netlerini hedeflerle karşılaştır.
TYT ve AYT'yi ayrı değerlendir.
Önce kısa teşhis, sonra tablo, sonra en fazla 3 öncelik öner.
Kullanıcı görev istemediyse direktif tonuna geçme.`,

  log_analysis: `Çalışma loglarını analiz et.
Format:
1. Kısa teşhis
2. Veri tablosu
3. Tek kritik örüntü
4. İsteğe bağlı küçük öneri
Kullanıcı "plan yap" demediyse görev listesi üretme.`,

  micro_feedback: `Kısa geri bildirim ver.
En fazla 3 cümle.
1. Veriyi söyle.
2. Tek anomaliyi söyle.
3. Küçük düzeltme öner.
Direktif JSON üretme.`,

  war_room_analysis: `War Room sonrası analiz yap.
Hataların ortak paydasını çıkar.
Tablo kullan.
En fazla 3 aksiyon öner; kullanıcı istemediyse görev kartı üretme.`,

  weekly_review: `Haftalık retrospektif yap.
Veri varsa tablo kullan.
Ne oldu → neden oldu → gelecek hafta ne değişmeli yapısında cevap ver.
Görev üretmek yalnızca kullanıcı açıkça haftalık plan isterse uygundur.`,

  free_chat: `Serbest sohbet modu.
Doğal konuş. Kullanıcının sorusunu doğrudan cevapla.
Her cevapta tablo kullanma.
Her cevapta görev verme.
Her cevapta direktif üretme.
Gerekirse en sonda tek cümlelik öneri ver: "İstersen bunu plana çevirebilirim."`,

  topic_explain: `Konu anlatımı modu.
Konuyu sade, adım adım ve YKS odaklı açıkla.
Örnek ver.
Gerekirse mini kontrol sorusu sor.
Direktif veya görev üretme. Kullanıcı isterse ayrıca çalışma planı çıkar.`,

  intervention: `Acil müdahale modu.
Kısa, net ve kontrollü konuş.
Durumun riskini söyle.
Sonra uygulanabilir küçük plan ver.
Sert ol ama aşağılayıcı olma.`,

  inverse_coaching: `Öğrenci rolünü oynuyorsun.
Kullanıcı konuyu anlatsın; sen kavramsal boşlukları yakalayan meraklı öğrenci gibi soru sor.
Sonunda kısa güçlü/zayıf özet ver.`,

  flashcard_generation: `Konuşma geçmişinden veya verilen konudan 5 adet çalışma kartı üret. SADECE JSON dizi:
[{"front":"...","back":"...","difficulty":"easy|medium|hard","subject":"..."}]`,

  forgetting_curve_reminder: `Tekrar zamanı gelen konuları çıkar.
Tablo kullan:
| Konu | Son Çalışma | Gün | Mini Tekrar |
Her konu için 10 dakikalık net tekrar öner.`,

  daily_quest: `Günün yüksek öncelikli görevlerini üret.
Sadece JSON directive formatında yanıt ver.
Görevler spesifik konu, soru sayısı, süre ve başarı kriteri içermeli.`,

  vision_archive_parse: `Görsel veya not içeriğini analiz et.
Önce gördüğünü özetle.
Sonra kullanıcının hedefine göre yorumla.
Görev üretme; kullanıcı isterse plana çevirebileceğini söyle.`,

  generate_weekly_strategy: `Son 7 günlük veriyle haftalık yol haritası çıkar.
Tablo kullan.
3 ana odak, 2 risk, 1 büyük hedef ver.
Eğer directive istenmişse JSON directive üretilebilir.`,

  quiz_generation: `YKS tipinde analitik sorular üret. Çeldiriciler kullan. SADECE JSON liste döndür.`,

  qa_mode: `Soru-cevap modu.
Kısa, teknik ve net cevap ver.
Kullanıcı sormadan plan, direktif veya görev üretme.`,

  socratic_force: `Sokratik mod.
Direkt cevabı hemen verme.
Önce yönlendirici soru sor, sonra adım adım düşündür.
Görev üretme.`,

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

function validateCoachOutput(raw: string, opts: {
  attachDirective: boolean;
  approvedResourceTopics?: unknown;
}) {
  const issues: Array<{ code: string; message: string; severity: 'warning' | 'error' }> = [];
  let repairedText = raw;

  if (!opts.attachDirective && /^\s*[{[]/.test(raw)) {
    issues.push({
      code: 'JSON_IN_NATURAL_RESPONSE',
      message: 'Natural response returned raw JSON; stripping code fences/object wrapper for user safety.',
      severity: 'error',
    });
    const parsed = safeParseDirective(raw);
    repairedText = parsed?.summary || parsed?.text || 'Bunu doğal cevap formatında yeniden istemem gerekiyor. Kısa cevap: plan istiyorsan bunu ölçülebilir görevlere çevirebilirim.';
  }

  if (opts.attachDirective) {
    const parsed = safeParseDirective(raw);
    if (!parsed?.headline || !parsed?.summary || !Array.isArray(parsed?.tasks) || parsed.tasks.length === 0) {
      issues.push({
        code: 'DIRECTIVE_MISSING_REQUIRED_FIELD',
        message: 'Directive missing headline, summary, or tasks.',
        severity: 'error',
      });
    } else {
      parsed.tasks.forEach((task: any, index: number) => {
        if (!task.subject || !task.topic || !task.action) {
          issues.push({
            code: 'DIRECTIVE_MISSING_REQUIRED_FIELD',
            message: `Task ${index + 1} missing subject, topic, or action.`,
            severity: 'error',
          });
        }
        const joined = `${task.title || ''} ${task.action || ''}`.toLocaleLowerCase('tr-TR');
        if (/(çalış|calis|tekrar et|gözden geçir|gozden gecir)$/.test(joined.trim())) {
          issues.push({
            code: 'TASK_TOO_GENERIC',
            message: `Task ${index + 1} is too generic.`,
            severity: 'warning',
          });
        }
        if (!task.rationale && !task.sourceEvidence) {
          issues.push({
            code: 'TASK_MISSING_EVIDENCE',
            message: `Task ${index + 1} has no evidence/rationale.`,
            severity: 'warning',
          });
        }
      });
    }
  }

  const approved = Array.isArray(opts.approvedResourceTopics) ? opts.approvedResourceTopics : [];
  if (approved.length === 0 && /https?:\/\/|kaynak|kitap|video|pdf/i.test(raw)) {
    issues.push({
      code: 'RESOURCE_HALLUCINATION_RISK',
      message: 'Response may suggest resources while no approved resource catalog entry exists.',
      severity: 'warning',
    });
  }

  return {
    ok: issues.every((issue) => issue.severity !== 'error'),
    issues,
    repairedText,
  };
}

async function lookupUser(idToken: string): Promise<any> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
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

function userExplicitlyAskedForPlan(message = ''): boolean {
  const m = message.toLocaleLowerCase('tr-TR');
  return [
    'plan',
    'program',
    'görev',
    'ne çalış',
    'bugün ne',
    'çalışma listesi',
    'todo',
    'yol haritası',
    'aksiyon çıkar',
    'bana görev ver',
  ].some((token) => m.includes(token));
}

function wantsNaturalAnswerOnly(intent: CoachIntent, message = ''): boolean {
  if (NATURAL_ONLY_INTENTS.has(intent)) return true;
  if (intent === 'free_chat') return !userExplicitlyAskedForPlan(message);
  if (intent === 'topic_explain' || intent === 'qa_mode') return true;
  return false;
}

function buildPrompt(body: AiRequestBody): string {
  const intent = body.intent || 'free_chat';
  const decision = resolveServerCoachDecision(body);
  const attachDirective = decision.shouldAttachDirective;
  const naturalOnly = wantsNaturalAnswerOnly(intent, body.userMessage || '');

  const userStateObj = (body.userState || {}) as any;
  const isCriticalAvoidance = userStateObj.avoidanceLevel >= 3;
  const shouldEscalate =
    intent === 'intervention' &&
    (userStateObj.eloScore < 800 ||
      userStateObj.frustrationIndex > 70 ||
      isCriticalAvoidance);
  const personalityMode = shouldEscalate
    ? isCriticalAvoidance
      ? 'oracle'
      : 'enforcer'
    : body.coachPersonality || 'default';

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
    us.examPhase ? `Sınav Fazı: ${us.examPhase}` : '',
    us.lastDirectiveStatus ? `Son Plan Durumu: ${us.lastDirectiveStatus}` : '',
    typeof us.planComplianceScore === 'number' ? `Plan Tutarlılık Skoru: %${us.planComplianceScore}` : '',
    Array.isArray(us.sourceEvidence) && us.sourceEvidence.length
      ? `KANIT SATIRLARI: ${us.sourceEvidence.join(' | ')}`
      : '',
    Array.isArray(us.coachMemorySummary) && us.coachMemorySummary.length
      ? `KOÇ HAFIZASI: ${us.coachMemorySummary.join(' | ')}`
      : '',
    Array.isArray(us.likelyMistakeTypes) && us.likelyMistakeTypes.length
      ? `OLASI HATA TIPLERI: ${us.likelyMistakeTypes.join(' | ')}`
      : '',
    Array.isArray(us.memoryControls) && us.memoryControls.length
      ? `Kontrollu Hafiza: ${us.memoryControls.filter((m: any) => m.visibility !== 'hidden').map((m: any) => `${m.label}: ${m.value}`).join(' | ')}`
      : '',
    us.resourceDirective ? `KAYNAK KURALI: ${us.resourceDirective}` : '',
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
    `KOÇ KARARI: ${decision.decisionKind} | Derinlik: ${decision.responseDepth} | ${decision.reason}`,
    `GÖREV: ${intentGuide}`,
    dataContext ? `ÖĞRENCİ VERİSİ (Direktif görevleri bu veriye dayalı olmalı):\n${dataContext}` : '',
    body.context ? `TAM BAĞLAM:\n${body.context}` : '',
    history ? `SON KONUŞMA:\n${history}` : '',
    `KULLANICI MESAJI:\n${body.userMessage || ''}`,
    naturalOnly
      ? `CEVAP MODU: Doğal cevap ver. Direktif, görev kartı veya JSON üretme. Kullanıcı açıkça plan istemediyse aksiyon listesi dayatma.`
      : '',
    attachDirective ? STRUCTURED_JSON_INSTRUCTION : '',
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
          ? m.content.map(c => {
              if (c.type === 'text') return { text: c.text };
              const url = (c as any).image_url.url as string;
              const match = url.match(/^data:([^;]+);base64,(.*)$/);
              return {
                inline_data: {
                  mime_type: match?.[1] || 'image/jpeg',
                  data: match?.[2] || url.split(',')[1],
                },
              };
            })
          : [{ text: m.content }]
      }));

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys[keyIndex]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: opts.forceJson
              ? 0.35
              : opts.intent && HIGH_QUALITY_INTENTS.has(opts.intent)
                ? 0.58
                : 0.45,
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
  const temperature = opts.forceJson
    ? 0.35
    : opts.intent && HIGH_QUALITY_INTENTS.has(opts.intent)
      ? 0.58
      : 0.45;

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

const getRedis = () => {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
  } catch (e) {
    console.warn('[AI] Redis init failed:', e);
  }
  return null;
};

const redis = getRedis();
const ratelimit = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '60 s') }) : null;

export const maxDuration = 60;


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
        providerMeta: { provider: result.provider, model: result.model },
      });
    }

    const fullPrompt = buildPrompt(body);
    const messages = buildGroqMessages(fullPrompt, body);
    const intent = body.intent || 'free_chat';
    const decision = resolveServerCoachDecision(body);
    const attachDirective = decision.shouldAttachDirective;

    const result = await callCoachProvider(messages, {
      image: Boolean(body.imageBase64),
      maxTokens: body.maxTokens,
      forceJson: decision.forceJson,
      intent,
    });
    const quality = validateCoachOutput(result.text, {
      attachDirective,
      approvedResourceTopics: body.userState?.approvedResourceTopics,
    });
    const responseText = quality.repairedText || result.text;

    return jsonResponse(res, 200, {
      text: responseText,
      directive: attachDirective ? safeParseDirective(responseText) : null,
      decision,
      quality,
      provider: result.provider,
      model: result.model,
      providerMeta: { provider: result.provider, model: result.model },
    });
  } catch (err: any) {
    const status = err instanceof ProviderError ? err.status : 500;
    const code = err instanceof ProviderError ? err.code : 'AI_SERVER_ERROR';
    console.error('[AI]', err);
    return jsonResponse(res, status, {
      error: code,
      message: err?.message || 'AI provider failed',
    });
  }
}
