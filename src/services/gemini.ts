/**
 * AMAÇ: Çoklu AI sağlayıcı servisi — Gemini, Groq, OpenRouter fallback zinciri
 * MANTIK: Sağlayıcılar sırayla denenir; biri hata verir veya limit aşarsa bir sonrakine geçilir.
 *         Bu sayede ücretli sürüme geçilmez, kesintisiz çalışma sağlanır.
 * UYARI: Tüm API anahtarları .env dosyasında tutulur, kod içinde yer almaz.
 */

import { GoogleGenAI } from "@google/genai";

// ─── Sabitler ───────────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-2.0-flash";
const GROQ_MODEL = "llama-3.1-8b-instant";
const OPENROUTER_MODEL = "meta-llama/llama-3.2-3b-instruct:free";


const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ─── Provider Tespit ────────────────────────────────────────────────────────

type Provider = "gemini" | "groq" | "openrouter";

function buildProviderChain(): Provider[] {
  const chain: Provider[] = [];
  if (process.env.GEMINI_API_KEY) chain.push("gemini");
  if (process.env.GROQ_API_KEY) chain.push("groq");
  if (process.env.OPENROUTER_API_KEY) chain.push("openrouter");
  return chain;
}

// ─── System Prompt ──────────────────────────────────────────────────────────

export const SYSTEM_INSTRUCTION = `
Sen YKS Aktif Koçluk Sistemi v3.0'sın. Bir danışman değil, gerçek bir koçsun.
Öğrencinin bugün ne yapacağını SEN belirlersin. "İstersen", "öneririm" gibi ifadeler YASAKTIR. "Şunu yapacaksın", "Şu kadar süre ayır" gibi net direktifler ver.

YENİ ÖZELLİKLER VE KURALLAR:
1. "3 Neden" Kök Analizi: Öğrenci bir konuda üst üste hata yaptığında veya "yapamadım" dediğinde, hemen çözüm sunma. "Neden?" diye sor. Cevap verdiğinde tekrar "Neden?" diye sor (toplam 3 kez). Kök nedeni (uykusuzluk, temel eksikliği, stres vb.) bul ve ona göre direktif ver (örn: "Bugün matematik çözme, uyu").
2. "Konu Borcu" ve Faiz Sistemi: Öğrenci planı tamamlamadığında bunu bir "Konu Borcu" olarak kaydet. Her geçen gün bu borca "+5 Soru" faiz ekle ve bunu öğrenciye sert bir dille hatırlat.
3. "Shadow Student" (Gölge Öğrenci) Modu: Öğrencinin hedefine ulaşmış anonim bir "ideal öğrenci" profili ile kıyaslama yap. Anlık yarış hissi yarat.
4. "Soru Bankası Mezarlığı": Yanlış soruların kitabını ve sayfasını kaydetmesini söyle. Arada bir "Mezarlık Turu" yaptırarak eski yanlışlardan ani baskın sorular sor.
5. Dinamik Kaynak Kütüphanesi: YouTube'daki en iyi hocaların spesifik videolarını ve dakikalarını öner.
6. Akıllı Deneme Takvimi: En çok hata yapılan 5 konuyu belirleyip "Kritik 20 Soru" seti hazırla.

Öğrenciye mental olarak destek ol, ancak disiplinden asla taviz verme. Önceki konuşmaları, hedefleri ve netleri aklında tut.
`;

// ─── OpenAI-Uyumlu API Çağrısı (Groq & OpenRouter) ─────────────────────────

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callOpenAICompatible(
  apiUrl: string,
  apiKey: string,
  model: string,
  messages: OpenAIMessage[]
): Promise<string> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://bohomentos.local",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Gemini Çağrısı ─────────────────────────────────────────────────────────

async function callGemini(
  prompt: string,
  systemInstruction: string,
  chatHistory: { role: "user" | "coach"; content: string }[]
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const contents = chatHistory.map((msg) => ({
    role: msg.role === "coach" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
  contents.push({ role: "user", parts: [{ text: prompt }] });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });

  return response.text ?? "";
}

// ─── Ortak Mesaj Yapıcı ─────────────────────────────────────────────────────

function buildMessageChain(
  userPrompt: string,
  systemInstruction: string,
  chatHistory: { role: "user" | "coach"; content: string }[]
): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [
    { role: "system", content: systemInstruction },
  ];

  for (const msg of chatHistory) {
    messages.push({
      role: msg.role === "coach" ? "assistant" : "user",
      content: msg.content,
    });
  }

  messages.push({ role: "user", content: userPrompt });
  return messages;
}

// ─── Ana Koç Yanıtı (Fallback Zinciri) ─────────────────────────────────────

export async function getCoachResponse(
  userMessage: string,
  context: string,
  chatHistory: { role: "user" | "coach"; content: string }[] = []
): Promise<string> {
  const systemWithExtras =
    SYSTEM_INSTRUCTION +
    "\n\nEk olarak: Öğrenciye mental destek ver. 'Sen bana bu neti hedeflediğini söylemiştin, başarabiliriz' gibi hatırlatmalar yap.";

  const fullPrompt = `Mevcut Durum ve Hafıza:\n${context}\n\nKullanıcı Mesajı:\n${userMessage}`;
  const providerChain = buildProviderChain();

  for (const provider of providerChain) {
    try {
      if (provider === "gemini") {
        return await callGemini(fullPrompt, systemWithExtras, chatHistory);
      }

      const apiKey =
        provider === "groq"
          ? process.env.GROQ_API_KEY!
          : process.env.OPENROUTER_API_KEY!;

      const apiUrl = provider === "groq" ? GROQ_API_URL : OPENROUTER_API_URL;
      const model = provider === "groq" ? GROQ_MODEL : OPENROUTER_MODEL;

      const messages = buildMessageChain(fullPrompt, systemWithExtras, chatHistory);
      return await callOpenAICompatible(apiUrl, apiKey, model, messages);
    } catch (error) {
      console.warn(`[AI] ${provider} başarısız, bir sonraki deneniyor:`, error);
    }
  }

  return "Tüm AI sağlayıcıları yanıt vermedi. Lütfen biraz bekle ve tekrar dene.";
}

// ─── Sesli Log Ayrıştırıcı (Fallback Zinciri) ───────────────────────────────

export async function parseVoiceLog(
  transcript: string
): Promise<Record<string, unknown> | null> {
  const parsePrompt = `
Aşağıdaki sesli log metnini analiz et ve JSON formatında döndür.
Metin: "${transcript}"

Döndürmen gereken JSON:
{
  "examType": "TYT" veya "AYT",
  "subject": "Ders Adı",
  "topic": "Konu Adı",
  "questions": sayı,
  "correct": sayı,
  "wrong": sayı,
  "empty": sayı,
  "avgTime": dakika cinsinden sayı
}

Eksik bilgileri mantıklı varsay veya 0 bırak. SADECE JSON döndür.
`;

  const providerChain = buildProviderChain();

  for (const provider of providerChain) {
    try {
      let rawText = "";

      if (provider === "gemini") {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: parsePrompt,
          config: { responseMimeType: "application/json", temperature: 0.1 },
        });
        rawText = response.text ?? "{}";
      } else {
        const apiKey =
          provider === "groq"
            ? process.env.GROQ_API_KEY!
            : process.env.OPENROUTER_API_KEY!;
        const apiUrl = provider === "groq" ? GROQ_API_URL : OPENROUTER_API_URL;
        const model = provider === "groq" ? GROQ_MODEL : OPENROUTER_MODEL;

        rawText = await callOpenAICompatible(apiUrl, apiKey, model, [
          { role: "system", content: "Sadece geçerli JSON döndür." },
          { role: "user", content: parsePrompt },
        ]);
      }

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      console.warn(`[AI] parseVoiceLog — ${provider} başarısız:`, error);
    }
  }

  return null;
}
