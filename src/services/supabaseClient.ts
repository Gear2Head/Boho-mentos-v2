/**
 * AMAÇ: Supabase istemcisi (Vite/SPA uyumlu).
 * MANTIK: Firebase'in yerini alır. Browser ortamında tek örnek oluşturur.
 * Bağlantı bilgileri: project = duglvjdwwhqrqbmvjgla
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

// ─── Database Types ───────────────────────────────────────────────────────────

export interface UserRow {
  uid: string;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
  role: 'standard' | 'super_admin';
  elo_score: number;
  streak_days: number;
  theme: 'light' | 'dark';
  subject_view_mode: 'list' | 'map';
  is_passive_mode: boolean;
  tyt_subjects: SubjectStatus[];
  ayt_subjects: SubjectStatus[];
  active_alerts: HabitAlert[];
  trophies: Trophy[];
  last_coach_directive: CoachDirective | null;
  coach_memory: CoachMemory | null;
  profile: StudentProfile | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
  is_banned: boolean;
  ban_reason: string | null;
}

export interface LogRow extends DailyLog {
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ExamRow extends ExamResult {
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FailedQuestionRow extends FailedQuestion {
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AgendaRow extends AgendaEntry {
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FocusSessionRow extends FocusSessionRecord {
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ChatMessageRow extends ChatMessage {
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DirectiveHistoryRow extends DirectiveRecord {
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: Partial<UserRow>; Update: Partial<UserRow> };
      logs: { Row: LogRow; Insert: Partial<LogRow>; Update: Partial<LogRow> };
      exams: { Row: ExamRow; Insert: Partial<ExamRow>; Update: Partial<ExamRow> };
      failed_questions: { Row: FailedQuestionRow; Insert: Partial<FailedQuestionRow>; Update: Partial<FailedQuestionRow> };
      agenda_entries: { Row: AgendaRow; Insert: Partial<AgendaRow>; Update: Partial<AgendaRow> };
      focus_sessions: { Row: FocusSessionRow; Insert: Partial<FocusSessionRow>; Update: Partial<FocusSessionRow> };
      chat_messages: { Row: ChatMessageRow; Insert: Partial<ChatMessageRow>; Update: Partial<ChatMessageRow> };
      directive_history: { Row: DirectiveHistoryRow; Insert: Partial<DirectiveHistoryRow>; Update: Partial<DirectiveHistoryRow> };
      system_config: {
        Row: { key: string; value: unknown; updated_at: string; updated_by: string | null };
        Insert: { key: string; value: unknown; updated_at?: string; updated_by?: string | null };
        Update: { key?: string; value?: unknown; updated_at?: string; updated_by?: string | null };
      };
      admin_logs: {
        Row: { id: string; actor_uid: string; target_uid: string; action: string; details: unknown; created_at: string };
        Insert: { id?: string; actor_uid: string; target_uid: string; action: string; details?: unknown; created_at?: string };
        Update: Partial<{ id: string; actor_uid: string; target_uid: string; action: string; details: unknown; created_at: string }>;
      };
    };
  };
}

// ─── Client Singleton ─────────────────────────────────────────────────────────

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://duglvjdwwhqrqbmvjgla.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Z2x2amR3d2hxcnFibXZqZ2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTQ4MDgsImV4cCI6MjA5MTg3MDgwOH0.3yYVU5WfF1-IIdm2J2tOQj21ILwmrExQ2PRyvARPh00';

let _client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!_client) {
    _client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _client;
}

/** Alias for convenience */
export const supabase = {
  get client() { return getSupabaseClient(); },
  from: <T extends keyof Database['public']['Tables']>(table: T) =>
    getSupabaseClient().from(table),
  get auth() { return getSupabaseClient().auth; },
  get channel() { return getSupabaseClient().channel.bind(getSupabaseClient()); },
};

export function isSupabaseEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
