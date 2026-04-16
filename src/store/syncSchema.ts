/**
 * buildSyncPayload: AppState'den Supabase'e gönderilecek veriyi hazırlar.
 * Root (users tablosu) ve entity dizilerini ayırır.
 */

import type { AppState } from './appStore';
import type { SupabaseUserData } from '../services/supabaseSync';

export function buildSyncPayload(state: AppState): {
  root: Partial<SupabaseUserData>;
  entities: Partial<SupabaseUserData>;
} {
  const root: Partial<SupabaseUserData> = {
    profile: state.profile ?? undefined,
    tytSubjects: state.tytSubjects,
    aytSubjects: state.aytSubjects,
    eloScore: state.eloScore,
    streakDays: state.streakDays,
    theme: state.theme,
    subjectViewMode: state.subjectViewMode,
    trophies: state.trophies,
    isPassiveMode: state.isPassiveMode,
    activeAlerts: state.activeAlerts,
    lastCoachDirective: state.lastCoachDirective ?? undefined,
    coachMemory: state.coachMemory ?? undefined,
  };

  const entities: Partial<SupabaseUserData> = {
    logs: state.logs,
    exams: state.exams,
    failedQuestions: state.failedQuestions,
    agendaEntries: state.agendaEntries,
    focusSessions: state.focusSessions,
    chatHistory: state.chatHistory,
    directiveHistory: state.directiveHistory,
  };

  return { root, entities };
}
