/**
 * AMAÇ: Koç AI servis istemcisi — /api/ai endpoint'ine güvenli çağrı.
 * MANTIK: safeFetch retry + Türkçe hata çözümleyicisi.
 *
 * V19 Değişiklikler (BUILD-001, COACH-003):
 *  - legacy "coach" action kaldırıldı → intent bazlı model
 *  - CoachApiRequest ve CoachApiResponse tam tip-güvenli
 *  - parseVoiceLog ayrı metot olarak korundu
 *  - wantDirective parametresi eklendi
 */

import { resolveAiError, resolveErrorMessage } from '../utils/errorMessages';
import type {
  CoachApiRequest,
  CoachApiResponse,
  CoachIntent,
  CoachSystemContext,
} from '../types/coach';

// ─── Safe Fetch ───────────────────────────────────────────────────────────────

async function safeFetch(
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if ((response.status === 429 || response.status >= 500) && retries > 0) {
      console.warn(
        `[Gemini] HTTP ${response.status}. ${backoff}ms sonra retry. Kalan: ${retries}`
      );
      await delay(backoff);
      return safeFetch(url, options, retries - 1, backoff * 2);
    }
    return response;
  } catch (err) {
    if (retries > 0) {
      await delay(backoff);
      return safeFetch(url, options, retries - 1, backoff * 2);
    }
    throw err;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Ana istemci metodu ───────────────────────────────────────────────────────

/**
 * getCoachResponse: Koç AI'ına istek gönder.
 *
 * @param userMessage - Kullanıcının mesajı veya sistem prompt'u
 * @param context     - Öğrenci bağlam string'i (buildCoachContext'ten gelir)
 * @param chatHistory - Son N mesaj geçmişi
 * @param options     - intent, wantDirective, coachPersonality vs.
 */
export async function getCoachResponse(
  userMessage: string,
  context: string,
  chatHistory: Array<{ role: 'user' | 'coach'; content: string }> = [],
  options: {
    intent?: CoachIntent;
    coachPersonality?: string;
    forceJson?: boolean;
    maxTokens?: number;
    userState?: Partial<CoachSystemContext>;
    wantDirective?: boolean;
  } = {}
): Promise<string> {
  if (!userMessage.trim()) return '';

  // intent: varsayılan free_chat — "coach" artık gönderilmiyor (BUILD-001)
  const intent: CoachIntent = options.intent ?? 'free_chat';

  const payload: CoachApiRequest = {
    intent,
    userMessage,
    context,
    chatHistory: chatHistory.slice(-6),
    coachPersonality: options.coachPersonality,
    forceJson: options.forceJson,
    maxTokens: options.maxTokens,
    userState: options.userState ?? _defaultUserState(),
    wantDirective: options.wantDirective ?? false,
  };

  try {
    const response = await safeFetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return resolveErrorMessage({ status: response.status });
    }

    const data = (await response.json()) as CoachApiResponse & {
      debug?: unknown;
    };

    if (data.debug) {
      console.warn('[Coach DEBUG]', data.debug);
    }

    if (data.error) {
      return resolveAiError(data.error);
    }

    return data.text ?? 'Yanıt oluşturulamadı. Tekrar dene.';
  } catch (err) {
    console.error('[Gemini] Fetch error:', err);
    return resolveErrorMessage(err);
  }
}

// ─── Voice Log Parser ─────────────────────────────────────────────────────────

export async function parseVoiceLog(
  transcript: string
): Promise<Record<string, unknown> | null> {
  if (!transcript.trim()) return null;
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'parseVoiceLog', transcript }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: Record<string, unknown> };
    return data.data ?? null;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _defaultUserState(): Partial<CoachSystemContext> {
  return {
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
  };
}
