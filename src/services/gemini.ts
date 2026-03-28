/**
 * AMAÇ: Çoklu AI sağlayıcı servisi — Gemini, Groq, OpenRouter fallback zinciri + KEY ROTATION
 * MANTIK: Sağlayıcılar sırayla denenir; her sağlayıcının anahtar havuzu (Primary + Backup) vardır.
 *         Dönen hatalara (429, 413, 402) göre anahtar veya sağlayıcı değiştirilir.
 * UYARI: Vite config'de (define) tanımlanan process.env değişkenlerini kullanır.
 */

import { GoogleGenAI } from "@google/genai";

// ─── Key Pools (Rotation) ──────────────────────────────────────────────────

const getKeys = (prefix: string, count: number) => {
  const keys: string[] = [];
  // Vite 'define' bloğundan gelen process.env'leri oku
  const env = (typeof process !== 'undefined' ? process.env : {}) as any;
  
  // Birinci (Primary) anahtar
  if (env[prefix]) keys.push(env[prefix]);
  
  // Yedekleri (Backup) ekle: PREFIX_2, PREFIX_3...
  for (let i = 2; i <= count; i++) {
    const backupKey = `${prefix}_${i}`;
    if (env[backupKey]) keys.push(env[backupKey]);
  }
  return keys;
};

const GEMINI_KEYS = getKeys('GEMINI_API_KEY', 4);
const GROQ_KEYS = getKeys('GROQ_API_KEY', 2);
const OPENROUTER_KEYS = getKeys('OPENROUTER_API_KEY', 1);
const CEREBRAS_KEYS = getKeys('CEREBRAS_API_KEY', 1);

const GEMINI_MODEL = "gemini-2.0-flash";
const GROQ_MODEL = "llama-3.1-8b-instant";
const OPENROUTER_MODEL = "meta-llama/llama-3.2-3b-instruct:free";
const CEREBRAS_MODEL = "llama3.1-8b";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

// ─── Compact System Prompt (Token Sıkıştırma) ───────────────────────────────

export const SYSTEM_INSTRUCTION = `
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
`;

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── AI Çağrı Fonksiyonları ──────────────────────────────────────────────────

async function callOpenAICompatible(
  apiUrl: string,
  apiKey: string,
  model: string,
  messages: OpenAIMessage[],
  maxTokens: number = 1000
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
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(
  apiKey: string,
  prompt: string,
  systemInstruction: string,
  chatHistory: { role: "user" | "coach"; content: string }[]
): Promise<string> {
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
  });

  return response.text ?? "";
}

// ─── Ana Servis (Rotation Logic) ───────────────────────────────────────────

export async function getCoachResponse(
  userMessage: string,
  context: string,
  chatHistory: { role: "user" | "coach"; content: string }[] = []
): Promise<string> {
  // Chat geçmişini son 6 mesaj ile sınırla (Hafıza optimizasyonu)
  const trimmedHistory = chatHistory.slice(-6);
  const fullPrompt = `Mevcut Durum:\n${context}\n\nMesaj:\n${userMessage}`;
  
  // 1. DENE: Cerebras (Llama 3.1) - Primary
  const openAIMsgs: OpenAIMessage[] = [
    { role: "system", content: SYSTEM_INSTRUCTION },
    ...trimmedHistory.map(m => ({ role: (m.role === 'coach' ? 'assistant' : 'user') as any, content: m.content })),
    { role: "user", content: fullPrompt }
  ];

  for (const key of CEREBRAS_KEYS) {
    try {
      return await callOpenAICompatible(CEREBRAS_API_URL, key, CEREBRAS_MODEL, openAIMsgs, 1200);
    } catch (e: any) {
      console.warn(`[AI] Cerebras Key Failed:`, e.message);
      continue;
    }
  }

  // 2. DENE: Gemini Havuzu
  for (const key of GEMINI_KEYS) {
     try {
       return await callGemini(key, fullPrompt, SYSTEM_INSTRUCTION, trimmedHistory);
     } catch (e: any) {
       console.warn(`[AI] Gemini Key Failed:`, e.message);
       if (e.message.includes('429') || e.message.includes('Quota')) continue;
       else break; 
     }
  }

  // 3. DENE: Groq Havuzu
  for (const key of GROQ_KEYS) {
    try {
      return await callOpenAICompatible(GROQ_API_URL, key, GROQ_MODEL, openAIMsgs, 800);
    } catch (e: any) {
      console.warn(`[AI] Groq Key Failed:`, e.message);
      continue;
    }
  }

  // 4. DENE: OpenRouter Havuzu
  for (const key of OPENROUTER_KEYS) {
    try {
      return await callOpenAICompatible(OPENROUTER_API_URL, key, OPENROUTER_MODEL, openAIMsgs, 1000);
    } catch (e: any) {
      console.warn(`[AI] OpenRouter Key Failed:`, e.message);
      continue;
    }
  }

  return "Tüm AI hatları meşgul veya limitler doldu. Lütfen anahtarlarını kontrol et veya 1 dakika sonra tekrar dene.";
}

export async function parseVoiceLog(transcript: string): Promise<Record<string, any> | null> {
  const prompt = `Analiz et ve SADECE JSON döndür: "${transcript}" -> {examType, subject, topic, questions, correct, wrong, empty, avgTime}`;
  
  for (const key of GEMINI_KEYS) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.1 }
      });
      return JSON.parse(response.text || "{}");
    } catch { continue; }
  }
  return null;
}
