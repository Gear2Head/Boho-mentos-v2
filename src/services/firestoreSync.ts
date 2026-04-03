/**
 * Firestore sync — root user doc (profile, counters, settings) + entity subcollections.
 * Legacy: arrays may still exist on users/{uid}; pull merges with subcollection docs.
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  writeBatch,
  Timestamp,
  deleteField,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { getDeviceId } from '../utils/deviceId';
import type {
  StudentProfile,
  DailyLog,
  ExamResult,
  FailedQuestion,
  SubjectStatus,
  ChatMessage,
  AgendaEntry,
  FocusSessionRecord,
  Trophy,
  HabitAlert,
} from '../types';

export interface FirestoreUserData {
  profile: StudentProfile | null;
  tytSubjects: SubjectStatus[];
  aytSubjects: SubjectStatus[];
  logs: DailyLog[];
  exams: ExamResult[];
  failedQuestions: FailedQuestion[];
  agendaEntries: AgendaEntry[];
  focusSessions: FocusSessionRecord[];
  trophies: Trophy[];
  eloScore: number;
  streakDays: number;
  theme: 'light' | 'dark';
  subjectViewMode: 'list' | 'map';
  chatHistory: ChatMessage[];
  isPassiveMode: boolean;
  activeAlerts: HabitAlert[];
}

const EXCLUDED_KEYS = new Set([
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
  'lastSyncAt',
]);

/** Store key -> Firestore subcollection id */
const ENTITY_SUBCOLLECTION: Record<string, string> = {
  logs: 'logs',
  exams: 'exams',
  failedQuestions: 'failedQuestions',
  agendaEntries: 'agendaEntries',
  focusSessions: 'focusSessions',
  chatHistory: 'chatMessages',
};

const LEGACY_ROOT_ARRAY_KEYS = new Set([
  'logs',
  'exams',
  'failedQuestions',
  'agendaEntries',
  'focusSessions',
  'chatHistory',
]);

function toMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

export function stripFirestoreEntityFields(data: DocumentData): Record<string, unknown> {
  const { updatedAt, deviceId, deletedAt, ...rest } = data;
  void updatedAt;
  void deviceId;
  void deletedAt;
  return rest;
}

/** Realtime: remote docs + local rows not yet on server (by id). */
export function mergeRemoteDocsWithLocal<T extends { id?: string }>(
  local: T[],
  docs: Array<{ id: string; data: () => DocumentData }>
): T[] {
  const remote: T[] = [];
  for (const d of docs) {
    const raw = d.data();
    if (raw.deletedAt) continue;
    const rest = stripFirestoreEntityFields(raw) as T;
    remote.push({ ...rest, id: d.id });
  }
  const remoteIds = new Set(remote.map((r) => r.id).filter(Boolean));
  const out = [...remote];
  for (const l of local) {
    if (l.id && !remoteIds.has(l.id)) out.push(l);
  }
  return out;
}

function mergeLegacyAndSub<T extends { id?: string }>(
  legacy: T[] | undefined,
  fromSub: Array<T & { _updatedAtMs?: number }>
): T[] {
  const byId = new Map<string, T>();
  for (const item of legacy ?? []) {
    const id = item.id;
    if (id) byId.set(id, item);
  }
  for (const item of fromSub) {
    const id = item.id;
    if (!id) continue;
    const prev = byId.get(id);
    const nMs = item._updatedAtMs ?? 0;
    const pMs = (prev as { _updatedAtMs?: number } | undefined)?._updatedAtMs ?? 0;
    if (!prev || nMs >= pMs) {
      const { _updatedAtMs, ...rest } = item;
      void _updatedAtMs;
      byId.set(id, rest as T);
    }
  }
  return Array.from(byId.values());
}

async function loadSubcollection<T extends { id?: string }>(
  uid: string,
  name: string,
  legacy: T[] | undefined
): Promise<T[]> {
  const snap = await getDocs(collection(db, 'users', uid, name));
  const fromSub: Array<T & { _updatedAtMs?: number }> = [];
  for (const d of snap.docs) {
    const raw = d.data();
    if (raw.deletedAt) continue;
    const ms = toMillis(raw.updatedAt);
    const entity = stripFirestoreEntityFields(raw) as T;
    fromSub.push({ ...entity, id: d.id, _updatedAtMs: ms });
  }
  return mergeLegacyAndSub(legacy, fromSub);
}

/**
 * Push: root doc without large arrays; each entity -> users/{uid}/{sub}/{id}
 * Optionally removes legacy array fields from root (deleteField).
 */
export async function pushToFirestore(
  uid: string,
  data: Partial<FirestoreUserData> | Record<string, unknown>,
  onComplete?: () => void
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const deviceId = getDeviceId();

    const rootPayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      lastSyncAt: new Date().toISOString(),
      syncSchemaVersion: 2,
    };

    const batchWrites: Array<{ path: string[]; id: string; payload: Record<string, unknown> }> = [];
    const entityKeysWritten = new Set<string>();

    for (const [key, value] of Object.entries(data)) {
      if (EXCLUDED_KEYS.has(key)) continue;

      if (LEGACY_ROOT_ARRAY_KEYS.has(key) && Array.isArray(value)) {
        entityKeysWritten.add(key);
        const subName = ENTITY_SUBCOLLECTION[key];
        if (!subName) continue;
        for (const item of value as Array<Record<string, unknown>>) {
          const id =
            (item.id as string | undefined) ||
            `gen_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
          const payload: Record<string, unknown> = {
            ...item,
            id,
            updatedAt: serverTimestamp(),
            deviceId,
          };
          delete payload.deletedAt;
          batchWrites.push({ path: ['users', uid, subName, id], id, payload });
        }
        continue;
      }

      if (key === 'profile' && value && typeof value === 'object') {
        const profileObj = value as Record<string, unknown>;
        if (typeof profileObj.avatar === 'string' && profileObj.avatar.length > 50000) {
          rootPayload.profile = { ...profileObj };
          delete (rootPayload.profile as Record<string, unknown>).avatar;
          continue;
        }
      }

      rootPayload[key] = value;
    }

    for (const k of entityKeysWritten) {
      rootPayload[k] = deleteField();
    }

    const chunks: typeof batchWrites[] = [];
    for (let i = 0; i < batchWrites.length; i += 450) {
      chunks.push(batchWrites.slice(i, i + 450));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const w of chunk) {
        const ref = doc(db, w.path[0], w.path[1], w.path[2], w.path[3]);
        batch.set(ref, w.payload, { merge: true });
      }
      await batch.commit();
    }

    await setDoc(userRef, rootPayload, { merge: true });
    if (onComplete) onComplete();
  } catch (err) {
    console.warn('[Firestore] Push failed:', err);
  }
}

export async function pullFromFirestore(uid: string): Promise<FirestoreUserData | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;

    const d = userSnap.data();

    const logs = await loadSubcollection<DailyLog>(uid, 'logs', d.logs as DailyLog[] | undefined);
    const exams = await loadSubcollection<ExamResult>(uid, 'exams', d.exams as ExamResult[] | undefined);
    const failedQuestions = await loadSubcollection<FailedQuestion>(
      uid,
      'failedQuestions',
      d.failedQuestions as FailedQuestion[] | undefined
    );
    const agendaEntries = await loadSubcollection<AgendaEntry>(
      uid,
      'agendaEntries',
      d.agendaEntries as AgendaEntry[] | undefined
    );
    const focusSessions = await loadSubcollection<FocusSessionRecord>(
      uid,
      'focusSessions',
      d.focusSessions as FocusSessionRecord[] | undefined
    );
    const chatHistory = await loadSubcollection<ChatMessage>(
      uid,
      'chatMessages',
      d.chatHistory as ChatMessage[] | undefined
    );

    return {
      profile: d.profile ?? null,
      tytSubjects: d.tytSubjects ?? [],
      aytSubjects: d.aytSubjects ?? [],
      eloScore: d.eloScore ?? 0,
      streakDays: d.streakDays ?? 0,
      theme: d.theme ?? 'dark',
      subjectViewMode: d.subjectViewMode ?? 'map',
      trophies: d.trophies ?? [],
      chatHistory,
      focusSessions,
      logs,
      exams,
      failedQuestions,
      agendaEntries,
      isPassiveMode: d.isPassiveMode ?? false,
      activeAlerts: d.activeAlerts ?? [],
    };
  } catch (err) {
    console.warn('[Firestore] Pull failed:', err);
    return null;
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedPush(
  uid: string,
  data: Partial<FirestoreUserData>,
  onComplete?: () => void,
  delayMs = 2500
): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    pushToFirestore(uid, data, onComplete);
    debounceTimer = null;
  }, delayMs);
}

/** Tombstone delete for subcollection entity (soft delete). */
export async function tombstoneEntity(
  uid: string,
  subcollection: string,
  entityId: string
): Promise<void> {
  try {
    const ref = doc(db, 'users', uid, subcollection, entityId);
    await setDoc(
      ref,
      {
        id: entityId,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deviceId: getDeviceId(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[Firestore] Tombstone failed:', e);
  }
}

export async function pushSingleEntity(
  uid: string,
  storeKey: keyof FirestoreUserData,
  item: Record<string, unknown>
): Promise<void> {
  const subName = ENTITY_SUBCOLLECTION[storeKey as string];
  if (!subName) return;
  const id =
    (item.id as string | undefined) ||
    `gen_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const ref = doc(db, 'users', uid, subName, id);
  await setDoc(
    ref,
    {
      ...item,
      id,
      updatedAt: serverTimestamp(),
      deviceId: getDeviceId(),
    },
    { merge: true }
  );
}
