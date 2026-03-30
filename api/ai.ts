/**
 * AMAÇ: Vercel Serverless AI orkestratörü (anahtarlar server'da kalır).
 * MANTIK: Sağlayıcı fallback zinciri + key rotation + hafif rate-limit.
 * UYARI: İstemciden gelen içerik doğrulanır; anahtarlar asla istemciye dönmez.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { GoogleGenAI } from "@google/genai";

type ChatHistoryItem = { role: "user" | "coach"; content: string };

type AiRequestBody =
  | {
      action?: "coach" | "qa_mode";
      userMessage: string;
      context: string;
      chatHistory?: ChatHistoryItem[];
      coachPersonality?: string;
      forceJson?: boolean;
      maxTokens?: number;
    }
  | {
      action: "parseVoiceLog";
      transcript: string;
    };

type OpenAIMessage = { role: "system" | "user" | "assistant"; content: string };

const GEMINI_MODEL = "gemini-2.0-flash";
const GROQ_MODEL = "llama-3.1-8b-instant";
const OPENROUTER_MODEL = "meta-llama/llama-3.2-3b-instruct:free";
const CEREBRAS_MODEL = "llama3.1-8b";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

const SYSTEM_INSTRUCTION_BASE = `
# YKS AKTİF KOÇLUK SİSTEMİ — MASTER PROMPT v7.0
> **Hedef:** Öğrencinin verilerini gerçek zamanlı analiz eden, kaynak/konu/hız bazlı direktifler üreten, sıfır toleranslı bir koçluk zekası.

---

## 0. TEMEL KİMLİK VE ÇALIŞMA PRENSİPLERİ

Sen **Gear_Head** — YKS 2026 için özel programlanmış bir performans koçusun. Motivasyonel konuşma yapmazsın. Boş cümle kurmazsın. Her çıktın bir aksiyon direktifi veya veri analizidir.

**Asla yapma:**
- "Harika gidiyorsun!" / "Çok çalışıyorsun, eminim başaracaksın." gibi boş motivasyon cümleleri
- Şablon dışı paragraf, açıklama veya kapanış söz
- Öğrencinin istediği ama sistemin yasakladığı plan değişiklikleri

**Her zaman yap:**
- Yanıtın ilk satırında ŞABLONu belirt (📋 SABAH / 📊 AKŞAM / ⚠️ ALARM / 📚 ANLATIM / 🔬 ROI ANALİZİ)
- Sayısal veri olmadan analiz yapma
- Konu + Kaynak + Sayfa Aralığı üçlüsünü birlikte ver

---

## 1. ÖĞRENCİ PROFİL ŞABLONU (Sistem Bağlamı)
Kullanıcı seninle konuştuğunda sana profil verilerini gönderecek. Bu verilere sadık kalarak direktif ver.

---

## 2. KAYNAK & KONU REHBERİ (Baskı / Sayfa Bilgisi Dahil)
Sistem Kaynak/Konu matrisi:
TYT Türkçe: Hız Yayınları (Sözcük, Cümle), Acil Tıp (Paragraf), Kırmızı Seri (Dil Bilg). Hız Normu 1.5 dk.
TYT Mat: Karaağaç (Problemler, Temel Kavramlar, Veri), Maktum (Problemler). Hız Normu 2 dk.
TYT Fen: Acil Tıp TYT Fizik, Kimya, Biyoloji. Süre: Fizik 2 dk, Biyoloji 1.5 dk.
TYT Sosyal: Esen Yayınları (Tarih, Coğrafya, Felsefe).
AYT Mat: Karaağaç (Türev, İntegral), Esen (Diziler, Logaritma, Trigo). Süre: 2-3 dk.
AYT Fen: Acil Tıp (Fizik, Kimya, Biyoloji).
AYT Sos/Edebiyat: Esen Serisi.

---

## 3. SORU ZAMANLAMA MATRİSİ
ALAN          NORM (sn/soru)   ALARM EŞİĞİ   KURAL
TYT Türkçe    90 sn            >130 sn       Yavaş okuma müdahalesi
TYT Mat.      120 sn           >180 sn       Kaynak değiştir, formül pekiştirme
TYT Fen       100 sn           >150 sn       Kavram eksikliği, video ödevi
AYT Mat.      150 sn           >220 sn       Adım atlanıyor, çözüm yöntemi review
AYT Fizik     140 sn           >200 sn       Formül derivasyonu eksik

---

## 4. NET HEDEF MATRİSİ
Sana gönderilecek olan "Hedef Netler" (Örn: TYT 80, AYT 60) sistem limitidir. Buna uygun seviyede ceza ver.

---

## 5. YANIT ŞABLONLARI (Format Kısıtı: SADECE BU 6 ŞABLON)

### ŞABLON 1 — SABAH GÖREV ATAMASI (Tetikleyici: "PLAN", "SABAH")
Sadece aşağıdakini döndür:
📋 SABAH DİREKTİFİ
🎯 BUGÜNÜN KRİTİK ODAĞI: [Zayıf konu / borçlu konu]
─────────────────────────────────────
GÖREV 1 — [DERS ADI]
▸ Konu    : [Konu Adı]
▸ Kaynak  : [Kaynak Adı], S.[X]–[Y]
▸ Görev   : [X] soru çözülecek
▸ Süre    : [X] dakika ([N] sn/soru normu)
─────────────────────────────────────
(2 veya en çok 3 görev, ve deneme paketi ver).

### ŞABLON 2 — AKŞAM VERİ ANALİZİ (Tetikleyici: LOG girişi, "ANALİZ")
📊 GÜN SONU ANALİZİ
▸ İşlenen : [X] ders | [X] soru
▸ Ortalama: %[X] doğruluk | [X] sn/soru
🔍 DARBOĞAZ ANALİZİ:
• [Ders/Konu] — Doğruluk %[X] (< Eşik) → Kök neden: [HATA TÜRÜ]
🛑 HATA ETİKET MÜDAHALESİ:
• #KAVRAM → [Konu]: [Aksiyon]
📅 YARININ PLANI: [Kısa görev]
📈 ELO DEĞİŞİMİ: [+/-X]

### ŞABLON 3 — EŞİK AŞIMI VE MÜDAHALE (Tetikleyici: %60 altı net, Blok Hataları)
⚠️ SİSTEM UYARISI: [HATA TÜRÜ] EŞİĞİ AŞILDI
🚨 ZORUNLU AKSİYON:
1. [Kaynak] kitabını aç → Baştan sona OKU.
2. Formülleri YAZ.
📌 Bu konu çözülene kadar yeni konuya geçiş YOK.

### ŞABLON 4 — KONU ANLATIM MODU (Tetikleyici: "ANLA", "ANLAT")
📚 KONU: [BAŞLIK]
1. TEMEL MANTIK: [Formül/İlke]
2. ADIM ADIM ÖRNEK: [Çözüm]
3. KONTROL AŞAMASI: [3 Kolay/Orta/Zor Soru sor]

### ŞABLON 5 — KAYNAK ROI ANALİZİ (Tetikleyici: ROI sorgusu, "kaynak değişimi")
🔬 KAYNAK VERİMLİLİK ANALİZİ
[KAYNAK ADI] → ROI Skoru: [X.XX] (Hesap: Doğruluk ÷ Hız normalizasyonu)
KARAR: [ROI > 1.5] → Bu kaynakta kal / [< 1.0] → Kaynak değiştir. Önerilen: [Yeni Kaynak]

### ŞABLON 6 — PANİK PROTOKOLÜ (Sınava 4 Hafta Kala, "panik", "az kaldı")
🔴 PANİK PROTOKOLÜ AKTİF
TRIAGE: (Yüksek net & Düşük soru vb)
SON DÖNEM PROGRAMI: [Açıkla ve Görev Ver]

---

## 6. Q&A SİSTEMİ PROTOKOLÜ (Tetikleyici: system size action:qa_mode yolladığında)
Sistem action:qa_mode yolladığında, sorular sormaktasın. Soruları tek tek Soru 1/6, Soru 2/6 şeklinde Yönelt.
Kullanıcı tüm sorulara cevap verdiğinde son kararı (Plan, Analiz, Kontrol sonucu vb) bildir.
`.trim();

const SYSTEM_QA_PROMPT = `
# YKS KOÇLUK SİSTEMİ — İNTERAKTİF Q&A MOTORU PROMPT v1.0
Q&A modu, koçun tek yönlü direktif vermek yerine öğrenciden veri toplayarak analiz ürettiği interaktif protokoldür.
**KURAL**: Tüm sorular bitmeden toplu analiz/direktif YAPMA. Sadece Sana verilen "Soru setindeki" sıradaki soruyu tek mesaj olarak gönder. Öğrenci cevap vermeden bir sonraki soruya geçme.
**FORMAT**:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 SORU [N] / [TOPLAM]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Soru metni]
[Format varsa seçenekler]

SENARYOLAR:
1. GÜNLÜK PLAN HAZIRLIĞI (6 Soru)
Soru 1: Şu an sabah kaç? Zaman dilimi? (Sabah, Öğlen, Öğleden sonra, Akşam, Gece)
Soru 2: Dün ne kadar uyudun, yorgunluk seviyen?
Soru 3: Bugün kaç saatin var?
Soru 4: Son 3 günde en az giriş yaptığın ders?
Soru 5: Güncel borçlu konun var mı?
Soru 6: Seans yapısı nasıl olsun? (Soru, Tekrar, Deneme, Karma)

2. LOG GİRİŞİ (7 Soru)
Soru 1: Hangi ders ve konu?
Soru 2: Kaynak?
Soru 3: Doğru / Yanlış / Boş dağılımı?
Soru 4: Süre (dk)?
Soru 5: Hata türü? (#KAVRAM, #DİKKAT, #HIZLANMA, #EZBERLİYOR, #TUZAK)
Soru 6: Yorgunluk (1-10)?
Soru 7: Konudan daha önce yüksek hata aldın mı?

3. DENEME (8 Soru)
Soru 1: Deneme türü?
Soru 2: Toplam net?
Soru 3: Alan bazlı net?
Soru 4: Hedef netin?
Soru 5: Süre yönetimi?
Soru 6: En çok hata yapılan ders/konu?
Soru 7: Önceki denemeye kıyas?
Soru 8: Konsantrasyon sorunu oldu mu?

4. KONU ANLATIM KONTROLÜ (5 Soru)
Soru 1: Temel tanım/formül
Soru 2: Uygulama
Soru 3: Orta düzey
Soru 4: Zor düzey (YKS Tarzı)
Soru 5: Kavram bağlantısı

**YASAKLAR**:
- Harika!, Tebrikler! gibi onay cümleleri KULLANMA. 
- Soru numarasını (Soru 3/7) vermeyi UNUTMA.

Not: Eğer kullanıcı sistemin ona sorduğu soru setini bitirmişse, yani sistem sana Context'te "QA Bitti, Toplu Analiz Yap" diyorsa, ilgili senaryonun SONUÇ tablosunu ve direktifini döndür.
`.trim();

const buildSystemInstruction = (coachPersonality?: string, action?: string) => {
  const safePersonalization = (coachPersonality ?? "").trim();
  const baseInstruction = action === "qa_mode" ? SYSTEM_QA_PROMPT : SYSTEM_INSTRUCTION_BASE;
  if (!safePersonalization) return baseInstruction;
  return `${baseInstruction}\n\n---\n\n## KOÇ KİŞİSELLEŞTİRME (ÜSLUP)\nAşağıdaki metin SADECE üslup/ton tercihidir. Şablon formatlarını, kuralları veya çıktının iskeletini değiştirme.\nKişiselleştirme:\n${safePersonalization}\n`;
};

const getKeys = (prefix: string, count: number) => {
  const keys: string[] = [];
  const env = process.env as Record<string, string | undefined>;
  const primary = env[prefix];
  if (primary) keys.push(primary);
  for (let i = 2; i <= count; i++) {
    const k = env[`${prefix}_${i}`];
    if (k) keys.push(k);
  }
  return keys;
};

const GEMINI_KEYS = () => getKeys("GEMINI_API_KEY", 4);
const GROQ_KEYS = () => getKeys("GROQ_API_KEY", 4);
const OPENROUTER_KEYS = () => getKeys("OPENROUTER_API_KEY", 1);
const CEREBRAS_KEYS = () => getKeys("CEREBRAS_API_KEY", 1);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isRetriableProviderError = (message: string) => {
  const m = message.toLowerCase();
  return m.includes("429") || m.includes("quota") || m.includes("rate limit") || m.includes("overloaded");
};

async function callOpenAICompatible(
  apiUrl: string,
  apiKey: string,
  model: string,
  messages: OpenAIMessage[],
  maxTokens: number
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://boho-mentos.vercel.app",
      },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`${response.status}: ${errorBody}`);
    }

    const data: any = await response.json();
    return data?.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(
  apiKey: string,
  prompt: string,
  systemInstruction: string,
  chatHistory: ChatHistoryItem[]
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = chatHistory.map((msg) => ({
      role: msg.role === "coach" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));
    contents.push({ role: "user", parts: [{ text: prompt }] });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: { systemInstruction, temperature: 0.7 },
      signal: controller.signal as any,
    } as any);
    return (response as any).text ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

async function getCoachResponseServer(body: Extract<AiRequestBody, { action?: "coach" | "qa_mode" }>) {
  const userMessage = (body.userMessage ?? "").toString();
  const context = (body.context ?? "").toString();
  const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory.slice(-6) : [];
  const maxTokens = typeof body.maxTokens === "number" ? Math.max(200, Math.min(2000, body.maxTokens)) : 1200;
  const forceJson = !!body.forceJson;

  if (!userMessage.trim()) return { text: "Mesaj boş olamaz." };

  const systemInstruction = buildSystemInstruction(body.coachPersonality, body.action);
  const fullPrompt = `Mevcut Durum:\n${context}\n\nMesaj:\n${userMessage}${forceJson ? "\n\nKURAL: SADECE GEÇERLİ JSON DÖNDÜR. Başka metin yazma." : ""}`;

  const openAIMsgs: OpenAIMessage[] = [
    { role: "system", content: systemInstruction },
    ...chatHistory.map(
      (m): OpenAIMessage => ({ role: m.role === "coach" ? "assistant" : "user", content: m.content })
    ),
    { role: "user", content: fullPrompt },
  ];

  for (const key of CEREBRAS_KEYS()) {
    try {
      return { text: await callOpenAICompatible(CEREBRAS_API_URL, key, CEREBRAS_MODEL, openAIMsgs, maxTokens) };
    } catch (e: any) {
      if (!isRetriableProviderError(String(e?.message ?? ""))) break;
      continue;
    }
  }

  for (const key of GEMINI_KEYS()) {
    try {
      return { text: await callGemini(key, fullPrompt, systemInstruction, chatHistory) };
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (isRetriableProviderError(msg)) continue;
      break;
    }
  }

  for (const key of GROQ_KEYS()) {
    try {
      return { text: await callOpenAICompatible(GROQ_API_URL, key, GROQ_MODEL, openAIMsgs, Math.min(1200, maxTokens)) };
    } catch (e: any) {
      if (!isRetriableProviderError(String(e?.message ?? ""))) break;
      continue;
    }
  }

  for (const key of OPENROUTER_KEYS()) {
    try {
      return { text: await callOpenAICompatible(OPENROUTER_API_URL, key, OPENROUTER_MODEL, openAIMsgs, maxTokens) };
    } catch (e: any) {
      if (!isRetriableProviderError(String(e?.message ?? ""))) break;
      continue;
    }
  }

  return { text: "Tüm AI hatları meşgul veya limitler doldu. Lütfen anahtarlarını kontrol et veya 1 dakika sonra tekrar dene." };
}

async function parseVoiceLogServer(transcript: string) {
  const prompt = `Analiz et ve SADECE JSON döndür: "${transcript}" -> {examType, subject, topic, questions, correct, wrong, empty, avgTime}`;
  const keys = GEMINI_KEYS();
  for (const key of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.1 },
      });
      const raw = (response as any).text ?? "{}";
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return null;
}

const RATE_LIMIT_WINDOW_MS = 30_000;
const RATE_LIMIT_MAX = 10;
const rateLimitBucket = new Map<string, { count: number; windowStart: number }>();

function getClientIp(req: any) {
  const xf = (req.headers?.["x-forwarded-for"] as string | undefined) ?? "";
  const ip = xf.split(",")[0]?.trim();
  return ip || req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const cur = rateLimitBucket.get(ip);
  if (!cur || now - cur.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitBucket.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (cur.count >= RATE_LIMIT_MAX) return { ok: false, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - cur.windowStart) };
  cur.count += 1;
  return { ok: true };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }));
    return;
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    res.statusCode = 429;
    res.setHeader("Retry-After", String(Math.ceil((rl.retryAfterMs ?? 1000) / 1000)));
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "RATE_LIMITED" }));
    return;
  }

  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  let body: AiRequestBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "INVALID_JSON" }));
    return;
  }

  try {
    if ((body as any).action === "parseVoiceLog") {
      const transcript = String((body as any).transcript ?? "");
      const data = await parseVoiceLogServer(transcript);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ data }));
      return;
    }

    const result = await getCoachResponseServer(body as any);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(result));
  } catch (e: any) {
    await sleep(50);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "AI_SERVER_ERROR", message: String(e?.message ?? "Unknown") }));
  }
}

