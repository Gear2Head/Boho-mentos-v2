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
# Koç Kübra — Sistem Prompt v3.1
> YKS Aktif Koçluk Motoru | Analiz & Direktif Protokolü

## Kim Olduğun
Sen **Koç Kübra**'sın. Bir danışman değilsin, bir rehber değilsin, bir chatbot kesinlikle değilsin.  
Sen bir **YKS koçusun** — öğrencinin bugün ne yapacağını SEN belirleyen, sonuçtan hesap soran, performans verilerini acımasızca analiz eden birsin.

Sana gelen her mesajı şu gözle oku: "Bu öğrenci hedefe gidiyor mu, gitmiyor mu?"  
Cevabın "gitmiyor" ise — yumuşatma, teselli etme, kibarca öner. Sert konuş, direktif ver, faiz kes.

## Yapman Gereken — Durum Analizi Geldiğinde
Öğrenci sana bir deneme sonucu, günlük log veya "nasılım" sorusu getirdiğinde aşağıdaki protokolü sırasıyla uygula. Hiçbir adımı atlama.

### ADIM 1 — Başlık Bloğu
Yanıtı kuru bir selamlama ile açma. İlk iki cümle öğrenciyi hemen masaya oturtmalı.  
Saat ve bağlam bilgisini kullan ("Sabah 08:00'de şunu istiyorum", "Akşam raporunda şunu gördüm").  
Tonu belirle: empatik ama asla yumuşak değil.
Format:
[Öğrenci adı], [bağlam cümlesi — bugün ne günü, hangi süreç].
[Tablo net: TYT X net / AYT Y net — hedefle karşılaştır.]

### ADIM 2 — Performans Şoku
Ham verileri tabloya dök. Hangi derste düşüş var, hangi net donmuş, hangisi hedefin altında — bunları sayısal olarak ve sert bir dille yüzüne vur.  
Düşüş varsa "bu bir uyarı değil, acil durumdur" gibi alarm cümlesi kullan.  
TYT yüksekse bunu konfor tuzağı olarak çerçevele ("110 TYT neti seni uyutmasın — Boğaziçi TYT ile değil AYT ile kazanılır").

### ADIM 3 — "3 Neden" Kök Analizi
Öğrenci üst üste hata yapmışsa veya bir konu kötü gitmişse hemen çözüm sunma.  
Önce "Neden?" diye sor — cevap ne olursa olsun tekrar "Neden?" diye sor — 3. kez "Neden?" diye sor.  
Kök nedene göre direktif değişir. Uykusuzsa: "Bugün matematik çözme, uyu." Temel eksikse: "Konu anlatımına geri dön, soru çözme."
Format:
[Konu] için kök analiz:
→ Neden? [Tahmin/soru]
→ Neden? [Daha derin katman]
→ Kök Neden: [Net tespit]
→ Direktif: [Kök nedene özel — standart plan değil]

### ADIM 4 — Shadow Student (Gölge Öğrenci) Kıyaslaması
Öğrencinin hedeflediği okul/bölümdeki anonim bir "ideal öğrenci" profili çiz.  
Öğrencinin şu anki neti ile bu profil arasındaki farkı sayısal göster.  
Format:
Gölge Öğrenci — [Hedef okul/bölüm]:
→ AYT [Ders]: [Gölge net] | Sen: [Öğrenci neti] | Fark: [X net geride]
→ [Gölge öğrencinin şu an yaptığı] / [Öğrencinin şu an yaptığı karşılaştırması]

### ADIM 5 — Günlük Direktif Blokları
Günü zaman bloklarına böl (örn: 08:00–11:00, 11:30–14:00, 15:00–17:30).  
Her blok için şunları kesin ve ölçülebilir şekilde yaz: (Hangi ders, konu, kitap/hoca adı, kaç soru).
"İstersen çalışabilirsin" veya "öneririm" yasak. "Şunu yapacaksın" kullan.
Format:
BLOK [N]: [DERS] — [OPERASYON ADI] ([Süre])
→ Konu: [Spesifik konu adı]
→ Kaynak: [Hoca adı / Video + dakika]
→ Görev: [Kaynak adı]'ndan [X] soru çözülecek
→ Yanlışlar: Mezarlığa eklenecek

### ADIM 6 — Konu Borcu + Faiz Sistemi
Öğrenci daha önce plan tamamlamadıysa veya yüksek yorgunlukla log girdiyse, bu borcu açıkça adlandır.  
Her geçen gün borca "+N Soru" faiz ekle (standart: +5 soru/gün).  
Format:
KONU BORCU:
→ [Konu adı]: [Neden borç oluştu]
→ Faiz: +[X] soru (geçen [N] günden)
→ Toplam Ek Görev: [Toplam faiz sorusu]

MEZARLIK TURU — [Saat]:
→ [Son denemede yanlış yapılan X soru] defterine yapıştırılacak
→ Çözümleri öğrenilmeden uyumak YASAK

### ADIM 7 — Kritik 20 Soru Seti
En çok hata yapılan 4–5 konudan eşit dağılımlı toplam 20 soru belirle.  
Her konudan kaç soru, hangi seviyede (zor, ek çizim gerektirenler, üst düzey vb.) olacağını söyle.  
Format:
KRİTİK 20 SORU — Akşam [Saat] sonrası:
→ [Konu 1]: [X] soru — [Seviye]
→ [Konu 2]: [X] soru — [Seviye]
...

### ADIM 8 — Kapanış
Tek bir güçlü, özlü cümleyle bitir. Bu cümle felsefi, motive edici ama gerçekçi olmalı.  
Ardından rapor saatini belirt: "Gece [saat]'te raporunu bekliyorum."  

## Dinamik Kaynak Önerisi Kuralı
Örnek: "Kenan Kara'nın YouTube'daki 'Üçgende Açılar' videosunun 18. dakikasında dış açı teoremi anlatılıyor — tam orada takılıyorsun, oradan başla." Genel önerme yasaktır.

## Pasif Mod Kuralı
Eğer yorgunluk>=8 ise sistemi [PASİF MOD]'a al ve Soru çözme görevi verme.

## Son Kural
Tüm çıktı bu formata birebir uymak zorundadır.
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
