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
import { resolveCoachDecision } from './coachContract';


// ─── Semantic Cache ─────────────────────────────────────────────────────────
async function hashPayload(payload: unknown): Promise<string> {
  const msg = new TextEncoder().encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', msg);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ASSUME: Intent'e göre cache süresi — taze veri gereken intent'lerde kısa, statik konularda uzun
const CACHE_TTL_MAP: Record<string, number> = {
  daily_plan: 2 * 60 * 60 * 1000,      // 2 saat
  log_analysis: 2 * 60 * 60 * 1000,    // 2 saat
  weekly_review: 4 * 60 * 60 * 1000,   // 4 saat
  exam_analysis: 4 * 60 * 60 * 1000,   // 4 saat
  topic_explain: 12 * 60 * 60 * 1000,  // 12 saat
  qa_mode: 12 * 60 * 60 * 1000,        // 12 saat
  flashcard_generation: 24 * 60 * 60 * 1000, // 24 saat
  quiz_generation: 4 * 60 * 60 * 1000, // 4 saat
};
const DEFAULT_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 saat fallback

function getCacheTTL(intent: string): number {
  return CACHE_TTL_MAP[intent] ?? DEFAULT_CACHE_TTL;
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

function setCache(key: string, data: string, intent: string) {
  try {
    const exp = Date.now() + getCacheTTL(intent);
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
        `[AI] HTTP ${response.status}. ${backoff}ms sonra retry. Kalan: ${retries}`
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
  chatHistory: Array<{ role: 'user' | 'coach' | 'system'; content: string }> = [],
  options: {
    intent?: CoachIntent;
    coachPersonality?: string;
    forceJson?: boolean;
    maxTokens?: number;
    userState?: Partial<CoachSystemContext>;
    wantDirective?: boolean;
    imageBase64?: string;
    imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  } = {}
): Promise<string> {
  if (!userMessage.trim() && !options.imageBase64) return '';

  const AI_DAILY_LIMIT = 100;
  const { dailyAiRequests, lastAiRequestDate } = useAppStore.getState();
  const today = new Date().toISOString().split('T')[0];
  const effectiveCount = lastAiRequestDate === today ? dailyAiRequests : 0;
  if (effectiveCount >= AI_DAILY_LIMIT) {
    return `⚠️ Günlük AI limitine ulaştın (${AI_DAILY_LIMIT}/${AI_DAILY_LIMIT}). Mental Kapasite yarın sıfırlanacak. Bugün önceki yanıtlarını gözden geçirerek çalışmaya devam edebilirsin.`;
  }

  // intent: varsayılan free_chat — "coach" artık gönderilmiyor (BUILD-001)
  const intent: CoachIntent = options.intent ?? 'free_chat';
  const decision = resolveCoachDecision(intent, {
    message: userMessage,
    explicitDirective: options.wantDirective,
    userState: options.userState,
  });
  const dataFreshness = {
    contextHash: await hashPayload({
      context,
      lastLogs: options.userState?.lastLogs ?? [],
      lastExams: options.userState?.lastExams ?? [],
      lastDirectiveStatus: options.userState?.lastDirectiveStatus,
      planComplianceScore: options.userState?.planComplianceScore,
    }),
    generatedAt: new Date().toISOString(),
    requiresFreshData: !decision.cacheable,
  };

  const payload: CoachApiRequest & { imageBase64?: string, imageMediaType?: string } = {
    intent,
    userMessage,
    context,
    chatHistory: chatHistory.slice(-8),
    coachPersonality: options.coachPersonality,
    forceJson: decision.forceJson,
    maxTokens: options.maxTokens,
    userState: options.userState ?? _defaultUserState(),
    wantDirective: decision.shouldAttachDirective,
    decision,
    dataFreshness,
    imageBase64: options.imageBase64,
    imageMediaType: options.imageMediaType,
  };

  try {
    const cacheKey = await hashPayload(payload);
    const cachedResponse = getCache(cacheKey);
    // Cache hit — free_chat ve inverse_coaching hariç cache kontrol ediyoruz
    if (cachedResponse && decision.cacheable) {
      if (import.meta.env.DEV) console.log('[SemanticCache] Hit: ' + intent);
      // ASSUME: Cache'den dönen yanıtlar daily limit'i tüketmez
      return cachedResponse;
    }

    const { auth } = await import('../services/firebase');
    const idToken = await auth.currentUser?.getIdToken();

    const response = await safeFetch('/api/ai', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken || ''}`
      },
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
    if (data.text && decision.cacheable) {
      setCache(cacheKey, finalResponse, intent);
    }
    useAppStore.getState().incrementAiRequest();
    return finalResponse;
  } catch (err) {
    console.error('[AI] Fetch error:', err);
    return resolveErrorMessage(err);
  }
}

// ─── Voice Log Parser ─────────────────────────────────────────────────────────

export async function parseVoiceLog(
  transcript: string
): Promise<Record<string, unknown> | null> {
  if (!transcript.trim()) return null;
  try {
    const { auth } = await import('../services/firebase');
    const idToken = await auth.currentUser?.getIdToken();
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken || ''}`,
      },
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
