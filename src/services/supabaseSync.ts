/**
 * AMAÇ: Supabase veri senkronizasyonu — firestoreSync.ts'in tam karşılığı.
 * MANTIK: Local-first SPA pattern. Push/Pull/Debounce/Tombstone.
 *         Her entity kendi tablosunda; root user bilgileri users tablosunda.
 */

import { getSupabaseClient } from './supabaseClient';
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
import type { CoachDirective, DirectiveRecord, CoachMemory } from '../types/coach';
import { TYT_SUBJECTS, AYT_SUBJECTS } from '../constants';

const INITIAL_TYT = Object.entries(TYT_SUBJECTS).flatMap(([subject, topics]) =>
  topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' }))
);

const INITIAL_AYT = Object.entries(AYT_SUBJECTS).flatMap(([subject, topics]) =>
  topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' }))
);

function compressSubjects(subs: any[]): string[] {
  if (!subs || !Array.isArray(subs)) return [];
  const comp: string[] = [];
  subs.forEach((s, idx) => {
    if (typeof s === 'string') { comp.push(s); return; }
    if (s.status === 'mastered') comp.push(idx + '|M');
    else if (s.status === 'in-progress') comp.push(idx + '|I');
    else if (s.notes) comp.push(idx + '|N|' + s.notes.replace(/\|/g, ''));
  });
  return comp;
}

function decompressSubjects(comp: any[], initial: any[]): any[] {
  if (!comp || !Array.isArray(comp) || comp.length === 0) return [...initial];
  if (typeof comp[0] !== 'string') return comp;

  const res = initial.map(s => ({ ...s }));
  comp.forEach(c => {
    if (typeof c !== 'string') return;
    const parts = c.split('|');
    const idx = parseInt(parts[0], 10);
    if (isNaN(idx) || !res[idx]) return;

    if (parts[1] === 'M') res[idx].status = 'mastered';
    else if (parts[1] === 'I') res[idx].status = 'in-progress';
    else if (parts[1] === 'N') { res[idx].status = 'not-started'; res[idx].notes = parts[2] || ''; }
  });
}

export interface SyncSummary {
  rootSynced: boolean;
  entities: Record<string, number>;
  totalDelta: number;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupabaseUserData {
  updated_at?: string;
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
  lastCoachDirective: CoachDirective | null;
  directiveHistory: DirectiveRecord[];
  coachMemory: CoachMemory | null;
}

// Store key -> Supabase table name
export const ENTITY_TABLES: Record<string, string> = {
  logs: 'logs',
  exams: 'exams',
  failedQuestions: 'failed_questions',
  agendaEntries: 'agenda_entries',
  focusSessions: 'focus_sessions',
  chatHistory: 'chat_messages',
  directiveHistory: 'directive_history',
};

// Whitelist: Store key → DB column name. ONLY columns that exist in the users table.
const USERS_STORE_TO_DB: Record<string, string> = {
  eloScore: 'elo_score',
  streakDays: 'streak_days',
  theme: 'theme',
  subjectViewMode: 'subject_view_mode',
  isPassiveMode: 'is_passive_mode',
  tytSubjects: 'tyt_subjects',
  aytSubjects: 'ayt_subjects',
  activeAlerts: 'active_alerts',
  trophies: 'trophies',
  lastCoachDirective: 'last_coach_directive',
  coachMemory: 'coach_memory',
  profile: 'profile',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() { return new Date().toISOString(); }

function stripSyncFields<T extends Record<string, unknown>>(row: T): T {
  const { user_id, created_at, updated_at, deleted_at, ...rest } = row as Record<string, unknown>;
  void user_id; void created_at; void updated_at; void deleted_at;
  return rest as T;
}

// ─── Push Root Doc ────────────────────────────────────────────────────────────

export async function pushRootToSupabase(
  uid: string,
  data: Partial<SupabaseUserData> & Record<string, unknown>
): Promise<void> {
  const sb = getSupabaseClient();
  const rootPayload: Record<string, unknown> = {
    uid,
    updated_at: now(),
    last_sync_at: now(),
    device_id: getDeviceId(),
  };

  for (const [storeKey, dbCol] of Object.entries(USERS_STORE_TO_DB)) {
    const value = data[storeKey];
    if (value === undefined) continue;

    // Truncate avatar (base64 images can be huge)
    if (storeKey === 'profile' && value && typeof value === 'object') {
      const p = { ...(value as Record<string, unknown>) };
      if (typeof p.avatar === 'string' && p.avatar.length > 50000) delete p.avatar;
      rootPayload[dbCol] = p;
    } else if (storeKey === 'tytSubjects' || storeKey === 'aytSubjects') {
      rootPayload[dbCol] = compressSubjects(value as any[]);
    } else {
      rootPayload[dbCol] = value;
    }
  }

  console.log('[SupabaseSync] Root Push — keys:', Object.keys(rootPayload).join(', '));
  console.log('[SupabaseSync] Root Push — size:', JSON.stringify(rootPayload).length, 'bytes');

  const { error } = await sb.from('users').upsert(rootPayload as never, { onConflict: 'uid' });

  if (error) {
    console.error('[SupabaseSync] Root push FAILED:', error.message);
    throw error;
  }
  console.log('[SupabaseSync] Root push OK');
}

// ─── Push Entity Arrays ───────────────────────────────────────────────────────

export async function pushEntitiesToSupabase(
  uid: string,
  data: Partial<SupabaseUserData>
): Promise<Record<string, number>> {
  const sb = getSupabaseClient();
  const deviceId = getDeviceId();
  const stats: Record<string, number> = {};

  for (const [storeKey, tableName] of Object.entries(ENTITY_TABLES)) {
    const items = (data as Record<string, unknown>)[storeKey];
    if (!Array.isArray(items) || items.length === 0) continue;

    console.log(`[SupabaseSync] Pushing ${items.length} items to ${tableName}...`);
    console.time(`[SupabaseSync] Table ${tableName}`);

    const rows = (items as Array<Record<string, unknown>>).map((item) => {
      const id = (item.id as string) || `gen_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      return {
        id,
        user_id: uid,
        updated_at: now(),
        last_modified_at: Date.now(),
        device_id: deviceId,
        deleted_at: null,
        payload: { ...item, id }
      };
    });

    let count = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const payloadSize = JSON.stringify(chunk).length;
      console.log(`[SupabaseSync] Upserting chunk to ${tableName} (${payloadSize} bytes)...`);

      const { error } = await sb
        .from(tableName as never)
        .upsert(chunk as never, { onConflict: 'id' });
      if (error) {
        console.warn(`[SupabaseSync] Entity push failed (${tableName}):`, error.message);
      } else {
        count += chunk.length;
      }
    }
    console.timeEnd(`[SupabaseSync] Table ${tableName}`);
    if (count > 0) stats[storeKey] = count;
  }
  return stats;
}

// ─── Push All ─────────────────────────────────────────────────────────────────

/**
 * Backward-compatible: accepts a single merged data object.
 * Internally splits root fields from entity arrays.
 */
export async function pushToSupabase(
  uid: string,
  data: Record<string, unknown>,
  onComplete?: (summary: SyncSummary) => void
): Promise<SyncSummary> {
  const summary: SyncSummary = { rootSynced: false, entities: {}, totalDelta: 0 };
  try {
    // STEP 1: Root push (whitelist-filtered inside pushRootToSupabase)
    summary.rootSynced = await pushRootToSupabase(uid, data as any)
      .then(() => true)
      .catch((err) => {
        console.error('[SupabaseSync] Root Push Error:', err);
        return false;
      });

    console.log('[SupabaseSync] Root synchronized:', summary.rootSynced);

    // STEP 2: Entity push (only keys in ENTITY_TABLES)
    const entityData: Record<string, unknown> = {};
    for (const key of Object.keys(ENTITY_TABLES)) {
      if (data[key] !== undefined) entityData[key] = data[key];
    }
    summary.entities = await pushEntitiesToSupabase(uid, entityData);

    console.log('[SupabaseSync] Push complete:', summary);
    if (onComplete) onComplete(summary);
  } catch (err) {
    console.warn('[SupabaseSync] Push failed:', err);
  }
  return summary;
}

// ─── Pull ─────────────────────────────────────────────────────────────────────

export async function pullFromSupabase(uid: string): Promise<SupabaseUserData | null> {
  const sb = getSupabaseClient();

  const { data: userRow, error: userErr } = await sb
    .from('users')
    .select('*')
    .eq('uid', uid)
    .single();

  if (userErr || !userRow) {
    console.warn('[SupabaseSync] Pull user row failed:', userErr?.message);
    return null;
  }

  const u = userRow as Record<string, unknown>;

  // Load entity tables
  async function loadTable<T extends { id?: string }>(
    table: string
  ): Promise<T[]> {
    const { data, error } = await sb
      .from(table as never)
      .select('id, payload')
      .eq('user_id', uid)
      .is('deleted_at', null);

    if (error) {
      console.warn(`[SupabaseSync] Load ${table} failed:`, error.message);
      return [];
    }

    // Unpack payloads
    return ((data as any[]) || []).map((row) => ({
      ...(row.payload || {}), // this correctly restores camelCase
      id: row.id // ensure ID is preserved
    })) as T[];
  }

  const [logs, exams, failedQuestions, agendaEntries, focusSessions, chatHistory, directiveHistory] =
    await Promise.all([
      loadTable<DailyLog>('logs'),
      loadTable<ExamResult>('exams'),
      loadTable<FailedQuestion>('failed_questions'),
      loadTable<AgendaEntry>('agenda_entries'),
      loadTable<FocusSessionRecord>('focus_sessions'),
      loadTable<ChatMessage>('chat_messages'),
      loadTable<DirectiveRecord>('directive_history'),
    ]);

  return {
    updated_at: (u.updated_at as string) ?? '',
    profile: (u.profile as StudentProfile) ?? null,
    tytSubjects: decompressSubjects((u.tyt_subjects as any[]) ?? [], INITIAL_TYT),
    aytSubjects: decompressSubjects((u.ayt_subjects as any[]) ?? [], INITIAL_AYT),
    eloScore: (u.elo_score as number) ?? 0,
    streakDays: (u.streak_days as number) ?? 0,
    theme: (u.theme as 'light' | 'dark') ?? 'dark',
    subjectViewMode: (u.subject_view_mode as 'list' | 'map') ?? 'map',
    trophies: (u.trophies as Trophy[]) ?? [],
    isPassiveMode: (u.is_passive_mode as boolean) ?? false,
    activeAlerts: (u.active_alerts as HabitAlert[]) ?? [],
    lastCoachDirective: (u.last_coach_directive as CoachDirective) ?? null,
    coachMemory: (u.coach_memory as CoachMemory) ?? null,
    logs,
    exams,
    failedQuestions,
    agendaEntries,
    focusSessions,
    chatHistory,
    directiveHistory,
  };
}

// ─── Single Entity Push ───────────────────────────────────────────────────────

export async function pushSingleEntityToSupabase(
  uid: string,
  storeKey: string,
  item: Record<string, unknown>
): Promise<void> {
  const tableName = ENTITY_TABLES[storeKey];
  if (!tableName) return;

  const sb = getSupabaseClient();
  const id = (item.id as string) || `gen_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const { error } = await sb
    .from(tableName as never)
    .upsert({
      id,
      user_id: uid,
      updated_at: now(),
      device_id: getDeviceId(),
      payload: { ...item, id }
    } as never, { onConflict: 'id' });

  if (error) console.warn(`[SupabaseSync] Single entity push failed (${tableName}):`, error.message);
}

// ─── Tombstone (Soft Delete) ──────────────────────────────────────────────────

export async function tombstoneEntityInSupabase(
  uid: string,
  storeKey: string,
  entityId: string
): Promise<void> {
  const tableName = ENTITY_TABLES[storeKey];
  if (!tableName) return;

  const sb = getSupabaseClient();
  const { error } = await sb
    .from(tableName as never)
    .update({ deleted_at: now(), updated_at: now() } as never)
    .eq('id', entityId)
    .eq('user_id', uid);

  if (error) console.warn(`[SupabaseSync] Tombstone failed (${tableName}):`, error.message);
}

// ─── Debounced Push ───────────────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedPushToSupabase(
  uid: string,
  data: Record<string, unknown>,
  onComplete?: (summary: SyncSummary) => void,
  delayMs = 2500
): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    pushToSupabase(uid, data, onComplete);
    debounceTimer = null;
  }, delayMs);
}

// ─── Backend Score Engine (RPC) ──────────────────────────────────────────────

export async function recordEloActivity(
  activityType: 'tyt_subject' | 'ayt_subject' | 'log' | 'exam',
  payload: Record<string, unknown>,
  targetNet = 0
): Promise<{ newElo: number; delta: number } | null> {
  const sb = getSupabaseClient();
  const { data, error } = await (sb.rpc as any)('record_activity_and_update_elo', {
    p_activity_type: activityType,
    p_payload: payload,
    p_target_net: targetNet
  });

  if (error) {
    console.error('[SupabaseSync] ELO RPC failed:', error.message);
    return null;
  }
  return data as { newElo: number; delta: number };
}

// ─── camelCase -> snake_case helper ──────────────────────────────────────────

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}


//

//