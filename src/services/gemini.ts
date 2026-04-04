/**
 * AMAÇ: Koç AI servis istemcisi — /api/ai endpoint'ine güvenli çağrı.
 * MANTIK: safeFetch retry + Türkçe hata mesajı çözümleyicisi.
 * [UX-005 FIX]: resolveAiError ile raw hata kodları/status kullanıcıya gösterilmez.
 */

import { resolveAiError, resolveErrorMessage } from '../utils/errorMessages';
import type { CoachApiRequest, CoachIntent } from '../types/coach';

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * safeFetch: Hata yönetimi ve exponential backoff retry mekanizmalı fetch sarmalayıcısı
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
    action?: Extract<CoachIntent, "free_chat" | "qa_mode">;
    coachPersonality?: string;
    forceJson?: boolean;
    maxTokens?: number;
    userState?: Record<string, unknown>;
  }
): Promise<string> {
  const payload: Partial<CoachApiRequest> = {
    action: options?.action === "qa_mode" ? "qa_mode" : "free_chat",
    userMessage,
    context,
    chatHistory: chatHistory.slice(-6),
    coachPersonality: options?.coachPersonality,
    forceJson: options?.forceJson,
    maxTokens: options?.maxTokens,
    userState: options?.userState ?? {
      name: '',
      track: '',
      tytTarget: 0,
      aytTarget: 0,
      eloScore: 0,
      streakDays: 0,
      lastLogs: [],
      lastExams: [],
      alertCount: 0,
      tytProgressPercent: 0,
      aytProgressPercent: 0,
    }
  };

  try {
    const response = await safeFetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // [UX-005 FIX]: HTTP status raw kodu yerine Türkçe hata
      return resolveErrorMessage({ status: response.status });
    }

    const data = (await response.json()) as { text?: string; error?: string; debug?: unknown };

    if (data.debug) {
      console.warn("Kübra DEBUG:", data.debug);
    }

    if (data.error) {
      // [UX-005 FIX]: AI hata kodu → TR mesaj
      return resolveAiError(data.error);
    }

    return data.text ?? 'Yanıt oluşturulurken bir hata oluştu. Lütfen tekrar dene.';
  } catch (err) {
    console.error("AI Fetch Error:", err);
    return resolveErrorMessage(err);
  }
}

export async function parseVoiceLog(transcript: string): Promise<Record<string, unknown> | null> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "parseVoiceLog", transcript }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { data?: Record<string, unknown> | null };
  return data.data ?? null;
}
