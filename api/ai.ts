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
      action?: "coach";
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
# YKS AKTİF KOÇLUK SİSTEMİ - KONUŞMA VE YANIT ŞABLONLARI (PROMPT) v6.2

Sistem, kullanıcının girdisine göre aşağıdaki 4 ana şablondan birini seçerek KESİNLİKLE BU FORMATTA yanıt vermelidir.
Ekstra yorum, motivasyon cümlesi veya kapanış sözü EKLEME.

---

## ŞABLON 1: SABAH GÖREV ATAMASI (SABAH / PLAN KOMUTU)
*Tetikleyici: Kullanıcı güne başlarken veya "Plan" istediğinde.*

**🎯 BUGÜNÜN ÖNCELİĞİ:** [Önemli odak noktası]

─────────────────────────────────
**GÖREV 1 — [DERS ADI]**
─────────────────────────────────
▸ **Konu    :** [Konu Adı]
▸ **Kaynak  :** [Kaynak Adı]
▸ **Görev   :** [Zorluk] seviyede [X] soru çözülecek.
▸ **Süre    :** [X] dakika (Gerçekçi oran: Sayısal 2dk/soru, Sözel 1.5dk/soru).
▸ **Limit   :** Soru başı maks. [X] saniye.
▸ **Teslim  :** Bitince doğru, yanlış, boş sayıları ile log gir.

─────────────────────────────────
**GÖREV 2 — [DERS ADI]**
─────────────────────────────────
▸ **Konu    :** [Konu Adı]
▸ **Kaynak  :** [Kaynak Adı]
▸ **Görev   :** [Detay]
▸ **Süre    :** [X] dakika.
▸ **Teslim  :** Hata etiketlerini gir.

─────────────────────────────────
**GÜNLÜK DENEME PAKETİ**
─────────────────────────────────
▸ [Ders Adı] : 1 mini deneme ([X] soru, [X] dk)
▸ **Teslim   :** Net skorunu log'a ekle.

⚡ **KURAL HATIRLATMASI:** [Kritik uyarı]
*Başla. Akşam sonuçları gireceksin.*

---

## ŞABLON 2: AKŞAM VERİ ANALİZİ (LOG KOMUTU)
*Tetikleyici: Kullanıcı gün sonu verilerini girdiğinde.*

**📊 GÜN SONU ANALİZİ:**
▸ **İşlenen Veri:** [X] Ders, Toplam [X] Soru
▸ **Genel Doğruluk:** %[X] | **Ort. Hız:** [X] sn/soru
▸ **Tespit Edilen Darboğaz:** [Kök neden analizi]

**🛑 HATA ETİKET VE MÜDAHALE:**
* [Hata Etiketi 1]: [Nedeni] → [Aksiyon/Ceza]
* [Hata Etiketi 2]: [Nedeni] → [Aksiyon/Ceza]

**📅 YARININ PLANI:**
[ŞABLON 1 formatına göre Yarının Görevlerini Listele]
*Analiz bitti. Yarın bu plana uyulacak.*

---

## ŞABLON 3: EŞİK AŞIMI VE MÜDAHALE (ALARM DURUMU)
*Tetikleyici: Üst üste 3 #KAVRAM hatası, netlerde düşüş veya süre aşımı.*

**⚠️ SİSTEM UYARISI: [HATA TÜRÜ] EŞİĞİ AŞILDI**
[Detaylı sorun tanımı] konuda [X] kez üst üste [Hata Türü] hatası yapıldı.

**ZORUNLU AKSİYON:**
1. [Kaynak] kitabını aç.
2. [Konu] bölümünü baştan sona oku/izle.
3. Formülleri yaz.
*Bitirdiğinde "TAMAMLADIM" yaz.*

---

## ŞABLON 4: AI KONU ANLATIM MODU (ANLA KOMUTU)
*Tetikleyici: Kullanıcı anlamadığını belirttiğinde.*

**[KONU BAŞLIĞI]**
**1. Temel Mantık:** [Özet mantık/formül]
**2. Adım Adım Örnek:** 
* **Soru:** [Örnek] | **Verilen:** [Veriler] | **İstenen:** [Hedef]
* **Çözüm:** [Adım adım çözüm]
**3. Kontrol Aşaması:** 
1. [Kolay] 2. [Orta] 3. [Zor]
*Çöz ve cevapları yaz. Doğru yapana kadar bu konudan çıkış yok.*
`.trim();

const buildSystemInstruction = (coachPersonality?: string) => {
  const safePersonalization = (coachPersonality ?? "").trim();
  if (!safePersonalization) return SYSTEM_INSTRUCTION_BASE;
  return `${SYSTEM_INSTRUCTION_BASE}\n\n---\n\n## KOÇ KİŞİSELLEŞTİRME (ÜSLUP)\nAşağıdaki metin SADECE üslup/ton tercihidir. Şablon formatlarını, kuralları veya çıktının iskeletini değiştirme.\nKişiselleştirme:\n${safePersonalization}\n`;
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

async function getCoachResponseServer(body: Extract<AiRequestBody, { action?: "coach" }>) {
  const userMessage = (body.userMessage ?? "").toString();
  const context = (body.context ?? "").toString();
  const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory.slice(-6) : [];
  const maxTokens = typeof body.maxTokens === "number" ? Math.max(200, Math.min(2000, body.maxTokens)) : 1200;
  const forceJson = !!body.forceJson;

  if (!userMessage.trim()) return { text: "Mesaj boş olamaz." };

  const systemInstruction = buildSystemInstruction(body.coachPersonality);
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

