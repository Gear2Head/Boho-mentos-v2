/**
 * AMAÇ: Tek kaynak-of-truth sync şeması.
 * MANTIK: Whitelist tabanlı; yeni alan eklenince sessizce cloud'a gitmez.
 *
 * V19 (SYNC-010, ARCH-004):
 *  - SYNC_ROOT_WHITELIST: root doc'a yazılacak alanlar
 *  - ENTITY_SUBCOLLECTIONS: subcollection haritası
 *  - SYNC_UI_EXCLUDED: asla cloud'a gitmeyecek UI state
 *  - buildSyncPayload: explicit payload builder (full-state iteration kaldırıldı)
 */

import type { AppState } from '../store/appStore';

// ─── Root doc whitelist ───────────────────────────────────────────────────────

/**
 * Cloud'a yazılan root alanlar. Yeni alan eklemek için buraya ekle.
 * Listede olmayan alan otomatik olarak SYNC'e dahil edilmez.
 */
export const SYNC_ROOT_WHITELIST = [
  'profile',
  'tytSubjects',
  'aytSubjects',
  'trophies',
  'eloScore',
  'streakDays',
  'theme',
  'subjectViewMode',
  'isPassiveMode',
  'activeAlerts',
  'dailyEloDelta',
  'lastEloUpdateDate',
  'isMorningBlockerEnabled',
  'morningUnlockedDate',
  // Coach direktivler (kalıcı hafıza için)
  'lastCoachDirective',
  'directiveHistory',
  'coachMemory',
] as const;

export type SyncRootKey = (typeof SYNC_ROOT_WHITELIST)[number];

// ─── Entity subcollections ────────────────────────────────────────────────────

/**
 * Store key → Firestore subcollection adı.
 * Bu haritada olmayan dizi alanları root'a yazılır (küçük diziler).
 */
export const ENTITY_SUBCOLLECTIONS: Record<string, string> = {
  logs: 'logs',
  exams: 'exams',
  failedQuestions: 'failedQuestions',
  agendaEntries: 'agendaEntries',
  focusSessions: 'focusSessions',
  chatHistory: 'chatMessages',
};

// ─── UI-only excluded fields ──────────────────────────────────────────────────

/**
 * Asla cloud'a gitmez — saf UI/geçici state.
 * AppState'e yeni UI alanı eklenirse buraya da ekle.
 */
export const SYNC_UI_EXCLUDED = new Set([
  'warRoomSession',
  'warRoomAnswers',
  'warRoomEliminated',
  'warRoomTimeLeft',
  'warRoomMode',
  'isFocusSidePanelOpen',
  'qaSession',
  'drawingMode',
  'authUser',
  'isDevMode',
  'isSyncing',
  'hasHydrated',
  'notifications',
]);

// ─── Payload Builder ──────────────────────────────────────────────────────────

export type SyncPayload = {
  root: Partial<Record<SyncRootKey, unknown>>;
  entities: Record<string, Array<Record<string, unknown>>>;
};

/**
 * buildSyncPayload: AppState'ten explicit whitelist ile sync payload üretir.
 * Full-state iteration artık yapılmıyor (SYNC-010 fix).
 */
export function buildSyncPayload(state: Partial<AppState>): SyncPayload {
  const root: Partial<Record<SyncRootKey, unknown>> = {};
  const entities: Record<string, Array<Record<string, unknown>>> = {};

  // Root alanları — whitelist'e göre
  for (const key of SYNC_ROOT_WHITELIST) {
    if (key in state && state[key as keyof AppState] !== undefined) {
      root[key] = state[key as keyof AppState];
    }
  }

  // Entity subcollections
  // BUILD-004: DirectiveRecord[] gibi strongly-typed diziler doğrudan cast edilemiyor.
  // unknown aracılığıyla çift-cast: T[] → unknown[] → Record<string, unknown>[]
  for (const [storeKey, subcollection] of Object.entries(ENTITY_SUBCOLLECTIONS)) {
    const arr = state[storeKey as keyof AppState];
    if (Array.isArray(arr)) {
      entities[subcollection] = (arr as unknown[]) as Array<Record<string, unknown>>;
    }
  }

  return { root, entities };
}

// ─── Root Snapshot (beforeunload için hafif versiyon) ─────────────────────────

/**
 * Sayfa kapanmadan sendBeacon ile gönderilecek hafif root snapshot.
 * Array'ler dahil değil — boyut limiti için.
 */
export function buildBeaconSnapshot(
  state: Partial<AppState>
): Record<string, unknown> {
  const BEACON_KEYS: Array<keyof AppState> = [
    'eloScore',
    'streakDays',
    'theme',
    'subjectViewMode',
    'isPassiveMode',
    'dailyEloDelta',
    'lastEloUpdateDate',
  ];

  const snap: Record<string, unknown> = {};
  for (const key of BEACON_KEYS) {
    if (state[key] !== undefined) {
      snap[key as string] = state[key];
    }
  }
  snap['lastSeenAt'] = new Date().toISOString();
  return snap;
}

// ─── Chat Retention ───────────────────────────────────────────────────────────

/**
 * Chat geçmişi için retention stratejisi (SYNC-009).
 * Local: son 100 mesaj, Cloud: son 50 mesaj.
 */
export const CHAT_RETENTION = {
  localMax: 100,
  cloudMax: 50,
} as const;
