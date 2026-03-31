/**
 * AMAÇ: İstemciden güvenli AI çağrısı (Vercel Serverless üzerinden)
 * MANTIK: Secret'lar istemcide tutulmaz; `/api/ai` orkestratörü key rotation + fallback yapar.
 * UYARI: İstemci sadece context/prompt gönderir, anahtarlar asla bundle'a gömülmez.
 */

import { useAppStore } from '../store/appStore';

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * safeFetch: Hata yönetimi ve retry mekanizmalı fetch sarmalayıcısı
 */
async function safeFetch(url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // Rate limit (429) veya Server Error (5xx) durumunda retry yap
    if ((response.status === 429 || response.status >= 500) && retries > 0) {
      console.warn(`AI API hatası (${response.status}). ${backoff}ms sonra tekrar deneniyor... Kalan deneme: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return safeFetch(url, options, retries - 1, backoff * 2);
    }
    
    return response;
  } catch (err) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return safeFetch(url, options, retries - 1, backoff * 2);
    }
    throw err;
  }
}

export async function getCoachResponse(
  userMessage: string,
  context: string,
  chatHistory: { role: "user" | "coach"; content: string }[] = [],
  options?: { 
    action?: "coach" | "qa_mode"; 
    coachPersonality?: string; 
    forceJson?: boolean; 
    maxTokens?: number;
    userState?: any;
  }
): Promise<string> {
  const store = useAppStore.getState();

  const payload = {
    action: options?.action || "coach",
    userMessage,
    context,
    chatHistory: chatHistory.slice(-6),
    coachPersonality: options?.coachPersonality,
    forceJson: options?.forceJson,
    maxTokens: options?.maxTokens,
    userState: options?.userState || {
      profile: store.profile,
      eloScore: store.eloScore,
      streakDays: store.streakDays,
      // ⚡ RADİKAL ÖZET: Tüm listeyi değil, sadece sayısal özetleri gönder
      stats: {
        tytProgress: `${store.tytSubjects.filter(s => s.status === 'mastered').length}/${store.tytSubjects.length}`,
        aytProgress: `${store.aytSubjects.filter(s => s.status === 'mastered').length}/${store.aytSubjects.length}`,
        failedQuestionsCount: store.failedQuestions.length
      },
      logs: store.logs.slice(-3),
      exams: store.exams.slice(-2),
      activeTopics: [
        ...store.tytSubjects.filter(s => s.status === 'in-progress').slice(0, 3).map(s => s.name),
        ...store.aytSubjects.filter(s => s.status === 'in-progress').slice(0, 3).map(s => s.name)
      ],
      activeAlerts: store.activeAlerts
    }
  };

  try {
    const response = await safeFetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const txt = await response.text();
      return `Sistem yoğunluğu nedeniyle yanıt alınamadı (${response.status}). Lütfen biraz bekleyip tekrar dene.`;
    }

    const data = (await response.json()) as { text?: string; error?: string; debug?: any };
    
    if (data.debug) {
      console.warn("GEAR_HEAD DEBUG:", data.debug);
    }

    if (data.error === "RATE_LIMITED") {
      return "Anlık limitlere takıldın. Gear_Head biraz dinleniyor, 30 saniye sonra tekrar yazabilirsin.";
    }

    return data.text ?? "Yanıt oluşturulurken bir hata oluştu. Lütfen tekrar dene.";
  } catch (err) {
    console.error("AI Fetch Error:", err);
    return "Bağlantı hatası oluştu. Lütfen internetini kontrol et veya biraz sonra tekrar dene.";
  }
}

export async function parseVoiceLog(transcript: string): Promise<Record<string, any> | null> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "parseVoiceLog", transcript }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { data?: Record<string, any> | null };
  return data.data ?? null;
}
