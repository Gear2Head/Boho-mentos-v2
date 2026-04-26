import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { openDB } from 'idb';
import { toISODateOnly, toISODateTime, toDateMs } from '../utils/date';
import { DailyLog, HabitAlert } from '../types';

import { AuthSlice, createAuthSlice } from './slices/authSlice';
import { ProfileSlice, createProfileSlice } from './slices/profileSlice';
import { AcademicSlice, createAcademicSlice } from './slices/academicSlice';
import { SocialSlice, createSocialSlice } from './slices/socialSlice';
import { WarRoomSlice, createWarRoomSlice } from './slices/warRoomSlice';
import { CoachSlice, createCoachSlice } from './slices/coachSlice';
import { UISlice, createUISlice } from './slices/uiSlice';
import { SubjectStatus } from '../types';

export const COACH_NAME = 'Kübra';
export const COACH_SYSTEM_NAME = 'kübra_v2';

export type AppState = AuthSlice & ProfileSlice & AcademicSlice & SocialSlice & WarRoomSlice & CoachSlice & UISlice & {
  lastLocalUpdateAt: string;
  hardReset: (scope?: 'full' | 'ui' | 'all-data') => void;
  addTargetGoal: (goal: import('../types').AtlasProgram) => void;
  removeTargetGoal: (id: string) => void;
  dismissAlert: (id: string) => void;
  detectAndSetHabits: () => void;
  analyzeUserData: () => string;
  bulkMasterTytSubjectsByName: (names: string[]) => void;
  bulkMasterAytSubjectsByName: (names: string[]) => void;
};

// IndexDB Storage Setup
let dbPromise: ReturnType<typeof openDB> | null = null;
const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB('yks-store', 1, {
      upgrade(db) { db.createObjectStore('keyval'); },
    });
  }
  return dbPromise;
};

const idbStorage: StateStorage = {
  getItem: async (name) => (await (await getDb()).get('keyval', name)) || null,
  setItem: async (name, value) => { await (await getDb()).put('keyval', value, name); },
  removeItem: async (name) => { await (await getDb()).delete('keyval', name); },
};

// Habit Detection Logic
export function detectHabitsFromLogs(logs: DailyLog[]): HabitAlert[] {
  const alerts: HabitAlert[] = [];
  const now = new Date();
  
  const last3DaySet = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last3DaySet.add(toISODateOnly(d));
  }

  const subjectDays = new Map<string, Set<string>>();
  logs.slice(-30).forEach((l) => {
    const ms = toDateMs(l.date);
    if (ms === null) return;
    const day = toISODateOnly(new Date(ms));
    if (!subjectDays.has(l.subject)) subjectDays.set(l.subject, new Set());
    subjectDays.get(l.subject)!.add(day);
  });

  subjectDays.forEach((days, subject) => {
    const worked = Array.from(days).filter(d => last3DaySet.has(d));
    if (worked.length === 0 && subjectDays.size > 1) {
      alerts.push({
        id: `avoiding_${subject}_${Date.now()}`,
        type: 'avoiding_subject',
        subject,
        message: `Son 3 günde "${subject}" dersine hiç girmiyorsun. Bu dersten kaçıyorsun.`,
        createdAt: new Date().toISOString(),
      });
    }
  });

  return alerts.slice(0, 3);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createAuthSlice(set, get, api),
      ...createProfileSlice(set, get, api),
      ...createAcademicSlice(set, get, api),
      ...createSocialSlice(set, get, api),
      ...createWarRoomSlice(set, get, api),
      ...createCoachSlice(set, get, api),
      ...createUISlice(set, get, api),

      lastLocalUpdateAt: toISODateTime(),

      hardReset: (scope = 'full') => {
        if (scope === 'full') {
          // Note: Full reset logic should ideally re-init all slices
          window.location.reload(); 
        } else if (scope === 'all-data') {
          set({
            logs: [],
            exams: [],
            failedQuestions: [],
            agendaEntries: [],
            focusSessions: [],
            chatHistory: [],
            directiveHistory: [],
            coachMemory: null,
            lastCoachDirective: null,
          });
        }
      },

      addTargetGoal: (goal) => {
        const { profile, setProfile } = get();
        if (!profile) return;
        const newProfile = { ...profile, targetGoals: [...(profile.targetGoals || []), goal] };
        setProfile(newProfile);
      },

      removeTargetGoal: (id) => {
        const { profile, setProfile } = get();
        if (!profile) return;
        const newProfile = { ...profile, targetGoals: (profile.targetGoals || []).filter(g => g.id !== id) };
        setProfile(newProfile);
      },

      dismissAlert: (id) => set((s) => ({ activeAlerts: s.activeAlerts.filter(a => a.id !== id) })),

      detectAndSetHabits: () => {
        const alerts = detectHabitsFromLogs(get().logs);
        set({ activeAlerts: alerts });
      },

      analyzeUserData: () => {
        const state = get();
        const tytTarget = state.profile?.tytTarget || 0;
        const aytTarget = state.profile?.aytTarget || 0;
        const lastLogs = state.logs.slice(-10).map(l => `${l.subject}: %${Math.round((l.correct / (l.questions || 1)) * 100)}`).join(' | ');
        return `HEDEF: ${state.profile?.targetUniversity}. TYT: ${tytTarget}, AYT: ${aytTarget}. ELO: ${state.eloScore}. LOGLAR: ${lastLogs}`;
      },

      bulkMasterTytSubjectsByName: (names) => {
        const { tytSubjects, updateTytSubject } = get();
        tytSubjects.forEach((s, idx) => {
          if (names.includes(s.subject)) updateTytSubject(idx, { status: 'mastered' });
        });
      },

      bulkMasterAytSubjectsByName: (names) => {
        const { aytSubjects, updateAytSubject } = get();
        aytSubjects.forEach((s, idx) => {
          if (names.includes(s.subject)) updateAytSubject(idx, { status: 'mastered' });
        });
      },
    }),
    {
      name: 'yks_coach_storage_v2',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => {
        const {
          isSyncing, hasHydrated, isMobileMenuOpen, isExamModalOpen,
          isLogWidgetOpen, isArchiveWidgetOpen, isEditingProfile,
          isNotifOpen, isAdminPanelOpen, isFocusSidePanelOpen,
          warRoomTimeLeft, warRoomSession,
          ...rest
        } = state;
        return rest;
      },
      merge: (persisted: any, current: any) => ({
        ...current,
        ...persisted,
        isSyncing: false,
        hasHydrated: false,
        warRoomTimeLeft: 0,
        warRoomSession: null,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated(true);
      },
    }
  )
);
