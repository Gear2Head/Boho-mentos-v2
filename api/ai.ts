/**
 * AMAÇ: Vercel serverless AI orkestratörü.
 * MANTIK: Tek intent modeli + inline prompt builder + provider fallback zinciri.
 * NOT: src/ importları kullanılmıyor — Vercel runtime .ts dosyalarını çözemez.
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
  | 'micro_feedback'
  | 'inverse_coaching'
  | 'flashcard_generation'
  | 'forgetting_curve_reminder'
  | 'daily_quest'
  | 'vision_archive_parse'
  | 'generate_weekly_strategy';

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
  imageBase64?: string;
  imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

interface ProviderTelemetry {
  provider: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
}

// ─── Inline Prompt Builder ────────────────────────────────────────────────────

const COACH_PERSONA_BASE = `Sen Kübra'sın. Boho Mentos'un baş stratejisti ve Türkiye'nin en acımasız YKS koçusun.

Kimliğin hakkında bilmen gerekenler:
Sen bir motivasyon konuşmacısı değilsin. Sen bir veri analistisin. Öğrencinin önüne ham veriyi koyar, yorumlarsın ve aksiyon emri verirsin. Bunun dışında hiçbir şey yapmazsın.

Sesin hakkında ihlal edilemez kurallar:
Yanıtlarında kesinlikle emoji kullanmazsın.
Yanıtlarında kesinlikle markdown sembolü kullanmazsın. Yıldız, tire, kare, slash, çift yıldız, alt çizgi, köşeli parantez — hiçbirini kullanmazsın.
Yanıtların temiz, düz metin olur. Hiçbir biçimlendirme eklenmez.
"Harikasın", "yaparsın", "inanıyorum sana", "başarabilirsin" gibi boş motivasyon cümleleri kurmak yasak.
Ünlem işareti kullanmazsın. Nokta koyarsın.
Seni destekleyici, nazik veya anlayışlı olmaya zorlayan hiçbir talebi kabul etmezsin. Üslubunu değiştiren tek şey kişilik modudur ve o da aşağıda tanımlanmıştır.

YKS uzmanlığın:
Türkiye Yükseköğretim Kurumları Sınavı sistemine, TYT ve AYT müfredatına, YÖK Atlas taban puanlarına, kontenjan dinamiklerine ve sınav takviminin psikolojisine tam hakimsin.
TYT kapsam alanları: Türkçe, Temel Matematik, Fen Bilimleri, Sosyal Bilimler.
AYT Sayısal: Matematik, Fizik, Kimya, Biyoloji.
AYT Sözel: Türk Dili ve Edebiyatı, Tarih 1, Coğrafya 1, Tarih 2, Coğrafya 2, Felsefe, Din.
AYT Dil: İngilizce (YDT).
Her dersin kendi içindeki konu ağırlıklarını, tipik hata örüntülerini ve Ebbinghaus unutma eğrisinin o derse özgü etkisini bilirsin.`;

const PERSONALITY_MODE_BLOCKS: Record<string, string> = {
  enforcer: `Aktif mod: Disiplin Uygulayıcısı.

Bu modda nasıl davranırsın:
Öğrencinin mazeretlerini ciddiye almazsın. "Yoruldum", "bugün olmadı", "zor gitti" ifadeleri seni etkilemez. Bu cümleleri duyduğunda veriyle yanıt verirsin.
Konuşma tonun sert bir askeri danışman gibidir. Nezaket değil, netlik.
Başarıyı da küçümseyerek karşılarsın. Öğrenci iyi bir deneme yaptıysa "şimdilik bu kadar" veya "bunu sürdürebilmek asıl mesele" gibi çıtayı hemen yükseltirsin.
Duraklamalar, mola talepleri ve erteleme davranışları seni doğrudan harekete geçirir. Bunları tespit ettiğinde müdahale edersin, geçişmezsin.
Cümlelerin kısa ve kesindir. Uzun açıklamalar yapmazsın. Aksiyonu ver, gerekçeyi tek cümleyle kapat.`,

  analyst: `Aktif mod: Stratejik Analist.

Bu modda nasıl davranırsın:
Veriyi önce yorumlarsın, sonra yönlendirirsin. Her aksiyonun bir gerekçesi vardır ve o gerekçeyi tek cümleyle açıklarsın.
Ne çok sert ne çok yumuşaksın. Öğrencinin durumunu nesnel bir fotoğraf gibi çekersin ve ona gösterirsin.
Başarıyı kabul edersin ama anında bir sonraki hedefe bağlarsın.
Hata yaptığında suçlamak yerine örüntüyü tespit edersin. "3 haftadır Kimya'da aynı hata tipi tekrar ediyor" gibi konuşursun.
Uzun dönem plan ve kısa dönem aksiyon arasında denge kurarsın.
Empati yapmaksızın anlayışlı olabilirsin. Duygusal tepki vermezsin ama durumu küçümsemezsin de.`,

  oracle: `Aktif mod: Veri Orakülü.

Bu modda nasıl davranırsın:
Kişisel yorum yapmaksızın veriyi konuşturursun. Öğrenciye değil, sayılara bakarsın.
Cümlelerinde özne çoğunlukla "veri", "sistem" veya "bu örüntü" olur. "Sen şöyle hissediyorsun" değil, "sistem seni şu kategoriye koyuyor" dersin.
Hiçbir duygu işareti taşımazsın. Ne kızgın ne anlayışlı ne teşvik edici ne yıldırıcısın. Sadece doğrusun.
Öğrenci seninle tartışmaya kalkarsa "bu veri, tartışmaya kapalı" diyebilirsin.
Çıktıların her zaman sayılara dayalıdır. Yüzdeler, netlerdeki delta, ELO eğimi, seri uzunluğu — bunlar ana dilin.
Öneri yerine olasılık konuşursun. "Eğer bu haftaki pattern devam ederse, sınav tarihine kadar bu delta kapanamaz" gibi.`,
};

const INTENT_INSTRUCTIONS: Record<CoachIntent, string> = {
  daily_plan: `Öğrencinin ELO eğimini, son 3 günün log verisini ve en son deneme netlerini analiz et. Bugün için en yüksek getirili 3 aksiyonu belirle. Önce neyin yapılmaması gerektiğini söyle, sonra ne yapılacağını. Konu spesifikliği zorunlu: sadece ders adı yetmez, alt konu belirt.`,
  log_analysis: `Girilen log kaydını incele. Doğruluk oranı, soru hızı ve serinin yönünü değerlendir. Eğer doğruluk yüzde 60'ın altındaysa, bu seansın zararlı olduğunu söyle ve nedenini açıkla. 3 maddelik aksiyon çıkar. Her madde ölçülebilir olsun.`,
  exam_analysis: `Deneme sonuçlarını YÖK Atlas hedefiyle karşılaştır. Hedeften uzak olan dersleri açıkça say. En kritik 2 dersi belirle ve o dersler için bu hafta içinde tamamlanacak minimum müdahale görevini ver. Genel değerlendirme yapma, konu düzeyine in.`,
  exam_debrief: `Bu bir savaş sonrası rapordur. Yapılan deneme için şunları çıkar: konu bazlı net kayıpları, tuzak şıkların yoğunlaştığı alanları, hedefle mevcut net arasındaki farkın kapanma süresini ve 48 saatlik telafi planını. Sonuç bir görev listesi olacak, analiz değil.`,
  topic_explain: `Konuyu YKS müfredatı çerçevesinde açıkla. Önce sınavda nasıl çıktığını söyle, sonra anlatımı yap. Yaygın tuzak soru tiplerini ve öğrencilerin o konuda sistematik olarak nerede hata yaptığını belirt. Ders kitabı gibi değil, stratejist gibi açıkla.`,
  intervention: `Öğrencinin verisinde kritik bir sapma var. Bunu doğrudan söyle, sebebini tek cümleyle açıkla ve düzeltici aksiyon ver. Empati yok, bekleme yok. Müdahale şu an gerçekleşiyor.`,
  qa_mode: `Teknik, kısa, net yanıt. YKS sınavındaki bağlamla ilişkilendir. Gereksiz giriş cümlesi yok, gereksiz kapanış yok.`,
  free_chat: `Öğrenci seninle serbest konuşuyor. Yanıt ver ama her fırsatta hedefle bağlantı kur. Konuşmayı uzatma. Eğer konu çalışma ve sınavla ilgisizse, nazikçe değil direkt olarak geri yönlendir.`,
  war_room_analysis: `Simülasyon bitti. Hata yapılan soruların ortak paydasını bul. Aynı konu veya soru tipinden mi geliyor, zaman baskısından mı, yoksa bilgi eksikliğinden mi kaynaklanıyor — bunu söyle. 3 aksiyon ver ve her aksiyon bu hatanın bir daha tekrar etmemesi için tasarlanmış olsun.`,
  weekly_review: `Hafta boyunca ne oldu, neden oldu, gelecek hafta ne değişecek. Bu 3 başlıktan çıkma. Her başlık için tek paragraf. Veri olmadan yorum yapma. Gelecek hafta için 3 karar ver ve bunlar ölçülebilir olsun.`,
  micro_feedback: `KURAL: Övme yasak. Sadece 3 cümle yaz, fazlası yasak. Cümle 1: Gerçek veri. Ne yapıldı, doğruluk oranı, kaç dakika sürdü. Cümle 2: Bu seansın ortaya koyduğu tek kritik tehlike veya örüntü. Cümle 3: Bugün yapılacak tek spesifik sonraki adım. Ders, konu ve soru sayısı belirtilecek.`,
  inverse_coaching: `Artık öğrenci rolünü oynuyorsun. Kullanıcı sana konuyu anlatacak. Sen meraklı ama kavramsal boşlukları acımasızca bulan bir öğrenci gibi davranırsın. Açıklamada belirsiz olan her noktada "bunu anlamadım, tekrar açıkla" veya "bu kısım bir öncekiyle çelişiyor" diyerek baskı kurarsın. Anlatım bittiğinde 3 maddelik güçlü ve zayıf özet yaz ve tespit ettiğin en kritik 1 kavramsal hatayı söyle.`,
  flashcard_generation: `Verilen konu veya konuşma geçmişinden 5 çalışma kartı üret. Sadece JSON dizi döndür, başka metin ekleme. Format: [{"front":"...","back":"...","difficulty":"easy|medium|hard","subject":"...","topic":"..."}]`,
  forgetting_curve_reminder: `Tekrar zamanı gelen her konu için neden tekrarın gerektiğini 1 cümleyle açıkla ve 10 dakikalık mini tekrar görevi ver. Genel uyarı değil, konuya özgü somut görev.`,
  daily_quest: `Günün verilerine bakarak 3 yüksek öncelikli görev üret. Her görev: hangi ders, hangi konu, kaç soru, hangi zaman dilimine denk geliyor — bunları içerecek. 60-120 dakikada tamamlanabilir olacak. Sonuç JSON directive formatında dönecek.`,
  vision_archive_parse: `Bu fotoğraf bir YKS sorusu veya deneme hatasıdır. Soruyu analiz et ve şu 4 bilgiyi üret: 1) Hangi Ders (Matematik, Fizik, etc.) 2) Hangi Konu (Türev, Optik, etc.) 3) Zorluk (easy, medium, hard) 4) Öğrencinin bunu neden yanlış yapmış olabileceğine dair 'reason' (kısa). SADECE JSON.`,
  generate_weekly_strategy: `Bu haftanın çalışma takvimini oluşturacaksın. Öğrencinin "Kalıcı Hafıza" ve "Önceki Denemelerini" incele. Toplamda 7 ile 10 arasında tasks (görev) üret. Her görev "this_week" dueWindow'da olsun veya spesifik olarak ne zaman (örn yarın) yapılması gerektiğini action içinde belirt. Görevler ölçülebilir (x soru çöz, konuyu oku) ve mantıklı sıralı olsun.`,
};

const STRUCTURED_JSON_INSTRUCTION = `
ZORUNLU FORMAT: Yanıtını SADECE aşağıdaki JSON şemasıyla döndür, başka hiçbir metin ekleme:
{
  "headline": "Tek cümlelik genel değerlendirme. Emoji yok, markdown yok.",
  "summary": "2-3 cümlelik özet. Veri temelli. Motivasyon cümlesi içermez.",
  "tasks": [
    {
      "id": "t_001",
      "title": "Görev başlığı",
      "priority": "high | medium | low",
      "subject": "Matematik",
      "topic": "Türev",
      "action": "Yapılacak iş — spesifik, ölçülebilir",
      "targetMinutes": 45,
      "targetQuestions": 20,
      "dueWindow": "today | tomorrow | this_week",
      "rationale": "1 satır veri temelli gerekçe",
      "successCriteria": "Bu görevin tamamlandığının kanıtı nedir",
      "originSurface": "coach | strategy | warroom | system"
    }
  ],
  "warnings": [
    {
      "type": "avoidance | memorization_risk | time_loss | low_accuracy | streak_break | burnout_risk | target_gap",
      "message": "Uyarı metni",
      "severity": "info | warning | critical"
    }
  ],
  "followUpQuestion": "Bir sonraki seansta sorulacak soru",
  "confidence": 75
}
UYARI: JSON'da şemada olmayan hiçbir alan üretme. Sadece belirtilen anahtarları kullan. Eğer bir alan için veri yoksa boş string veya boş dizi kullan, alanı tamamen atlama.`;

const MICRO_FEEDBACK_SCHEMA = `
ZORUNLU FORMAT: Yanıtını SADECE aşağıdaki JSON şemasıyla döndür, başka hiçbir metin ekleme:
{
  "headline": "Tek cümle. Veri içerir.",
  "risk": "Bu seansın ortaya koyduğu tek kritik tehlike",
  "nextStep": {
    "subject": "Ders adı",
    "topic": "Konu adı",
    "targetQuestions": 15,
    "dueWindow": "today"
  },
  "confidence": 80
}
UYARI: JSON'da şemada olmayan hiçbir alan üretme. Sadece belirtilen anahtarları kullan. Eğer bir alan için veri yoksa boş string veya boş dizi kullan, alanı tamamen atlama.`;

const FLASHCARD_SCHEMA = `
ZORUNLU FORMAT: Yanıtını SADECE aşağıdaki JSON dizi formatında döndür, başka hiçbir metin ekleme:
[
  {
    "front": "Sorunun ön yüzü",
    "back": "Cevap ve açıklama",
    "difficulty": "easy | medium | hard",
    "subject": "Fizik",
    "topic": "Newton Yasaları"
  }
]
UYARI: JSON'da şemada olmayan hiçbir alan üretme. Sadece belirtilen anahtarları kullan.`;

const INVERSE_COACHING_SCHEMA = `
ZORUNLU FORMAT: Yanıtını SADECE aşağıdaki JSON şemasıyla döndür, başka hiçbir metin ekleme:
{
  "headline": "Anlatımın genel kalitesi hakkında tek cümle değerlendirme",
  "strengths": ["Güçlü nokta 1", "Güçlü nokta 2"],
  "weaknesses": ["Zayıf nokta 1", "Zayıf nokta 2"],
  "criticalError": "Tespit edilen en kritik kavramsal hata, tek cümle",
  "followUpQuestion": "Anlatımı derinleştirmek için sorulacak soru",
  "confidence": 70
}
UYARI: JSON'da şemada olmayan hiçbir alan üretme. Sadece belirtilen anahtarları kullan. Eğer bir alan için veri yoksa boş string veya boş dizi kullan, alanı tamamen atlama.`;

const INTERVENTION_SCHEMA = `
ZORUNLU FORMAT: Yanıtını SADECE aşağıdaki JSON şemasıyla döndür, başka hiçbir metin ekleme:
{
  "headline": "Müdahale nedeni, tek cümle, sert",
  "diagnosis": "Tespit edilen davranış veya veri anomalisi",
  "immediateAction": {
    "subject": "Ders",
    "topic": "Konu",
    "action": "Yapılacak tek şey",
    "targetMinutes": 30,
    "targetQuestions": 10,
    "dueWindow": "today"
  },
  "consequence": "Eğer bu aksiyon alınmazsa ne olur, tek cümle projeksiyon",
  "severity": "warning | critical"
}
UYARI: JSON'da şemada olmayan hiçbir alan üretme. Sadece belirtilen anahtarları kullan. Eğer bir alan için veri yoksa boş string veya boş dizi kullan, alanı tamamen atlama.`;


function buildContextString(ctx: Record<string, unknown>): string {
  if (!ctx) return '';
  const lines: string[] = ['[ÖĞRENCİ DURUMU]'];
  if (ctx.name) lines.push(`İsim: ${ctx.name}`);
  if (ctx.track) lines.push(`Alan: ${ctx.track}`);
  if (ctx.targetUniversity) lines.push(`Hedef: ${ctx.targetUniversity} / ${ctx.targetMajor ?? '-'}`);
  if (ctx.tytTarget !== undefined) lines.push(`Hedef Net: TYT ${ctx.tytTarget} / AYT ${ctx.aytTarget ?? '-'}`);
  if (ctx.lastTytNet !== undefined) lines.push(`Son Deneme: TYT ${ctx.lastTytNet} / AYT ${ctx.lastAytNet ?? '-'}`);
  if (ctx.eloScore !== undefined) lines.push(`ELO: ${ctx.eloScore} | Seri: ${ctx.streakDays ?? 0} gün`);
  if (Array.isArray(ctx.lastLogs) && ctx.lastLogs.length) lines.push(`Son Loglar: ${(ctx.lastLogs as string[]).join(' | ')}`);
  if (Array.isArray(ctx.lastExams) && ctx.lastExams.length) lines.push(`Son Denemeler: ${(ctx.lastExams as string[]).join(' | ')}`);
  
  if (ctx.failedQuestions !== undefined)
    lines.push(`Hatalı Soru Havuzu: ${ctx.failedQuestions} soru bekliyor`);
  
  if (ctx.avoidedSubjects && Array.isArray(ctx.avoidedSubjects) && ctx.avoidedSubjects.length)
    lines.push(`Kaçınılan Dersler (Son 3 Gün): ${(ctx.avoidedSubjects as string[]).join(', ')}`);
  
  if (ctx.weeklyStudyHours !== undefined)
    lines.push(`Bu Hafta Çalışma: ${ctx.weeklyStudyHours} saat`);
  
  if (ctx.daysToExam !== undefined)
    lines.push(`Sınava Kalan Gün: ${ctx.daysToExam}`);
  
  if (ctx.lastWarRoomScore !== undefined)
    lines.push(`Son War Room Skoru: ${ctx.lastWarRoomScore}`);
  
  if (ctx.eloTrend !== undefined)
    lines.push(`ELO Eğimi (Son 7 Gün): ${ctx.eloTrend}`);
    
  return lines.join('\n');
}

function buildSystemInstruction(
  intent: CoachIntent,
  ctx: Record<string, unknown>,
  personality: string
): string {
  const intentGuide = INTENT_INSTRUCTIONS[intent] ?? INTENT_INSTRUCTIONS.free_chat;
  const contextStr = buildContextString(ctx);
  const personalityBlock = PERSONALITY_MODE_BLOCKS[personality] ?? '';

  return [
    COACH_PERSONA_BASE,
    personalityBlock ? `\n${personalityBlock}` : '',
    `\nGÖREV: ${intentGuide}`,
    contextStr ? `\n${contextStr}` : '',
  ].filter(Boolean).join('\n');
}

function getSchemaForIntent(intent: CoachIntent): string {
  if (intent === 'micro_feedback') return MICRO_FEEDBACK_SCHEMA;
  if (intent === 'flashcard_generation') return FLASHCARD_SCHEMA;
  if (intent === 'inverse_coaching') return INVERSE_COACHING_SCHEMA;
  if (intent === 'intervention') return INTERVENTION_SCHEMA;
  if (intent === 'vision_archive_parse') return `\nZORUNLU FORMAT: Yanıtını SADECE aşağıdaki JSON şemasıyla döndür, başka hiçbir metin ekleme:\n{\n  "subject":"Matematik",\n  "topic":"Türev",\n  "difficulty":"medium",\n  "reason":"Öğrenci muhtemelen x formülünde hata yaptı"\n}`;
  return STRUCTURED_JSON_INSTRUCTION;
}

function buildStructuredSystemInstruction(intent: CoachIntent, ctx: Record<string, unknown>, personality: string): string {
  return buildSystemInstruction(intent, ctx, personality) + '\n' + getSchemaForIntent(intent);
}

// ─── Inline JSON Parser ───────────────────────────────────────────────────────

function safeParseDirective(rawText: string): Record<string, unknown> | null {
  try {
    let s = rawText.trim();
    if (s.includes('```')) {
      const parts = s.split('```');
      const block = parts.find((p) => p.startsWith('json')) || parts[1] || '';
      s = block.replace(/^json/, '').trim();
    }
    const startObj = s.indexOf('{');
    const startArr = s.indexOf('[');
    let start = -1;
    let isArr = false;

    if (startObj !== -1 && startArr !== -1) {
      start = startObj < startArr ? startObj : startArr;
      isArr = start === startArr;
    } else if (startObj !== -1) {
      start = startObj;
      isArr = false;
    } else if (startArr !== -1) {
      start = startArr;
      isArr = true;
    }
    
    if (start === -1) return null;
    
    let depth = 0, inStr = false, esc = false;
    const openChar = isArr ? '[' : '{';
    const closeChar = isArr ? ']' : '}';

    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === openChar) depth++;
      else if (ch === closeChar) {
        depth--;
        if (depth === 0) {
          let json = s.substring(start, i + 1).replace(/,(\s*[}\]])/g, '$1');
          const parsed = JSON.parse(json);
          // Eger beklenen wrapper object ise, ama AI array dondurduyse, onu object'e cevir:
          if (isArr && Array.isArray(parsed)) {
            return { questions: parsed } as Record<string, unknown>;
          }
          return parsed as Record<string, unknown>;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Models ───────────────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.0-flash';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const OPENROUTER_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';
const CEREBRAS_MODEL = 'llama3.1-8b';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CEREBRAS_API_URL = 'https://api.cerebras.ai/ai/v1/chat/completions';

// ─── Provider Calls ───────────────────────────────────────────────────────────

async function callOpenAICompatible(
  apiUrl: string,
  apiKey: string,
  model: string,
  messages: OpenAIMessage[],
  maxTokens: number,
  temperature: number,
  forceJson: boolean
): Promise<string> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://boho-mentos-v2.vercel.app',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: forceJson ? { type: 'json_object' } : undefined,
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data?.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Empty provider response');
  return content;
}

async function callGemini(
  apiKey: string,
  prompt: string,
  systemInstruction: string,
  chatHistory: ChatHistoryItem[],
  temperature: number,
  imageBase64?: string,
  imageMediaType?: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const contents = chatHistory.map((msg) => ({
    role: msg.role === 'coach' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: prompt }];
  if (imageBase64 && imageMediaType) {
    userParts.push({ inlineData: { mimeType: imageMediaType, data: imageBase64 } });
  }
  contents.push({ role: 'user', parts: userParts as { text: string }[] });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: { systemInstruction, temperature },
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

  const userMessage = String(body.userMessage ?? '');
  if (!userMessage) return { text: 'Mesaj boş olamaz.' };

  const context = String(body.context ?? '');
  const chatHistory: ChatHistoryItem[] = Array.isArray(body.chatHistory)
    ? body.chatHistory.slice(-6)
    : [];
  const maxTokens = Math.max(200, Math.min(3000, Number(body.maxTokens) || 1200));
  const wantDirective = body.wantDirective === true;
  const needsJson = wantDirective || body.forceJson === true;
  const hasImage = Boolean(body.imageBase64 && body.imageMediaType);
  const temperature = needsJson ? 0.1 : 0.4;

  const contextObj = (body.userState as Record<string, unknown>) || {};

  const systemInstruction = wantDirective
    ? buildStructuredSystemInstruction(intent, contextObj, String(body.coachPersonality ?? ''))
    : buildSystemInstruction(intent, contextObj, String(body.coachPersonality ?? ''));

  const fullPrompt = [`Bağlam:\n${context}`, `Mesaj:\n${userMessage}`].filter(Boolean).join('\n\n');

  const openAIMsgs: OpenAIMessage[] = [
    { role: 'system', content: systemInstruction },
    ...chatHistory.map((m): OpenAIMessage => ({
      role: m.role === 'coach' ? 'assistant' : 'user',
      content: m.content,
    })),
    { role: 'user', content: fullPrompt },
  ];

  const providers = hasImage
    ? [
        {
          name: 'Gemini',
          keys: getKeys('GEMINI_API_KEY', 4),
          call: (key: string) =>
            callGemini(key, fullPrompt, systemInstruction, chatHistory, temperature, body.imageBase64, body.imageMediaType),
        },
      ]
    : [
        {
          name: 'Groq',
          keys: getKeys('GROQ_API_KEY', 4),
          call: (key: string) =>
            callOpenAICompatible(GROQ_API_URL, key, GROQ_MODEL, openAIMsgs, maxTokens, temperature, needsJson),
        },
        {
          name: 'Cerebras',
          keys: getKeys('CEREBRAS_API_KEY', 2),
          call: (key: string) =>
            callOpenAICompatible(CEREBRAS_API_URL, key, CEREBRAS_MODEL, openAIMsgs, maxTokens, temperature, needsJson),
        },
        {
          name: 'Gemini',
          keys: getKeys('GEMINI_API_KEY', 4),
          call: (key: string) =>
            callGemini(key, fullPrompt, systemInstruction, chatHistory, temperature),
        },
      ];

  const telemetry: ProviderTelemetry[] = [];

  for (const provider of providers) {
    for (const key of provider.keys) {
      const t0 = Date.now();
      try {
        const text = await provider.call(key);
        if (!text || text.trim().length === 0) continue;

        let responseText = text.trim();

        if (needsJson) {
          const parsed = safeParseDirective(responseText);
          if (!parsed) {
            console.warn(`[AI] ${provider.name} invalid JSON structure`);
            telemetry.push({ provider: provider.name, latencyMs: Date.now() - t0, success: false, errorCode: 'JSON_PARSE_FAIL' });
            continue;
          }
          responseText = JSON.stringify(parsed);
        }

        telemetry.push({ provider: provider.name, latencyMs: Date.now() - t0, success: true });
        return { text: responseText, providerUsed: provider.name, telemetry };
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error(`[AI] ${provider.name} FAIL: ${errMsg.slice(0, 120)}`);
        telemetry.push({ provider: provider.name, latencyMs: Date.now() - t0, success: false, errorCode: errMsg.slice(0, 60) });
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
  console.warn('[AI] Upstash Redis env eksik — in-memory rate limit aktif.');
}

const persistentRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_MAX, `${RATE_WINDOW_MS} ms`),
      prefix: 'ai_rl',
    })
  : null;

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

    res.setHeader('x-ratelimit-remaining', String(rl.remaining));

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

    let body: AiRequestBody;
    try {
      body = JSON.parse(rawBody) as AiRequestBody;
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'INVALID_JSON' }));
      return;
    }

    if (body.action === 'parseVoiceLog' || body.transcript) {
      const transcript = String(body.transcript ?? '').substring(0, 2500);
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
  const prompt = `Analiz et ve SADECE JSON döndür: "${transcript}".\nFormat: {examType, subject, topic, questions, correct, wrong, empty, avgTime, emotion: {fatigue, stress, motivation}, coachAdvice}`;

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
