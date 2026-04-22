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
import { useAppStore } from '../store/appStore';


// ─── Semantic Cache ─────────────────────────────────────────────────────────
async function hashPayload(payload: any): Promise<string> {
  const msg = new TextEncoder().encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', msg);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCache(key: string): string | null {
  try {
    const raw = localStorage.getItem(`ai_cache_${key}`);
    if (!raw) return null;
    const { exp, data } = JSON.parse(raw);
    if (Date.now() > exp) {
      localStorage.removeItem(`ai_cache_${key}`);
      return null;
    }
    return data;
  } catch { return null; }
}

function setCache(key: string, data: string) {
  try {
    const exp = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    localStorage.setItem(`ai_cache_${key}`, JSON.stringify({ exp, data }));
  } catch { /* ignore full quota */ }
}

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

  // Rate limit guard — client-side check before hitting the API
  const AI_DAILY_LIMIT = 50;
  const { dailyAiRequests, lastAiRequestDate } = useAppStore.getState();
  const today = new Date().toISOString().split('T')[0];
  const effectiveCount = lastAiRequestDate === today ? dailyAiRequests : 0;
  if (effectiveCount >= AI_DAILY_LIMIT) {
    return `⚠️ Günlük AI limitine ulaştın (${AI_DAILY_LIMIT}/${AI_DAILY_LIMIT}). Mental Kapasite yarın sıfırlanacak. Bugün önceki yanıtlarını gözden geçirerek çalışmaya devam edebilirsin.`;
  }

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
    const cacheKey = await hashPayload(payload);
    const cachedResponse = getCache(cacheKey);
    // free_chat gibi diyalog ağırlıklı konularda cache'i atlıyoruz, statik analizlerde cache kullanıyoruz
    if (cachedResponse && !['free_chat', 'inverse_coaching'].includes(intent)) {
      console.log(`[SemanticCache] Hatırlanan yanıt dönüldü: ${intent}`);
      return cachedResponse;
    }

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

    const finalResponse = data.text ?? 'Yanıt oluşturulamadı. Tekrar dene.';
    if (data.text && !['free_chat', 'inverse_coaching'].includes(intent)) {
      setCache(cacheKey, finalResponse);
    }
    useAppStore.getState().incrementAiRequest();
    return finalResponse;
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
