/**
 * AMAÇ: Merkezi durum (state) yönetimi (Zustand)
 * MANTIK: Prop drilling'i engelleme ve performansı artırma.
 *         Veriler localStorage'a persist edilir.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TYT_SUBJECTS, AYT_SUBJECTS } from '../constants';
import type { 
  StudentProfile, SubjectStatus, DailyLog, ExamResult, 
  FailedQuestion, ChatMessage, Trophy, SubjectStatusType, RankTitle 
} from '../types';

interface AppState {
  profile: StudentProfile | null;
  tytSubjects: SubjectStatus[];
  aytSubjects: SubjectStatus[];
  logs: DailyLog[];
  exams: ExamResult[];
  chatHistory: ChatMessage[];
  isPassiveMode: boolean;
  failedQuestions: FailedQuestion[];
  trophies: Trophy[];
  eloScore: number;
  streakDays: number;
  isMorningBlockerEnabled: boolean;

  // Actions
  setProfile: (profile: StudentProfile | null) => void;
  updateTytSubject: (index: number, updates: Partial<SubjectStatus>) => void;
  updateAytSubject: (originalIndex: number, updates: Partial<SubjectStatus>) => void;
  addLog: (log: DailyLog) => void;
  addExam: (exam: ExamResult) => void;
  addChatMessage: (message: ChatMessage) => void;
  setPassiveMode: (isPassive: boolean) => void;
  addFailedQuestion: (question: FailedQuestion) => void;
  unlockTrophy: (trophyId: string) => void;
  setMorningBlockerEnabled: (enabled: boolean) => void;
  removeExam: (id: string) => void;
  updateExam: (id: string, updates: Partial<ExamResult>) => void;
  addElo: (amount: number) => void;
  resetStore: () => void;
  isDevMode: boolean;
  setDevMode: (enabled: boolean) => void;
}

const INITIAL_TYT = Object.entries(TYT_SUBJECTS).flatMap(([subject, topics]) => 
  topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' }))
);

const INITIAL_AYT = Object.entries(AYT_SUBJECTS).flatMap(([subject, topics]) => 
  topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' }))
);

const INITIAL_TROPHIES: Trophy[] = [
  { id: 'first_blood', title: 'İlk Kan', description: 'İlk denemeni girdin', unlockedAt: null, icon: 'Award' },
  { id: 'streak_3', title: 'Alev Alev', description: '3 gün üst üste log girdin', unlockedAt: null, icon: 'Flame' },
  { id: 'master_10', title: 'Uzman', description: '10 konuda ustalaştın', unlockedAt: null, icon: 'Star' },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: null,
      tytSubjects: INITIAL_TYT,
      aytSubjects: INITIAL_AYT,
      logs: [],
      exams: [],
      chatHistory: [],
      isPassiveMode: false,
      failedQuestions: [],
      trophies: INITIAL_TROPHIES,
      eloScore: 1200, // Başlangıç ELO'su
      streakDays: 0,
      isMorningBlockerEnabled: true,
      isDevMode: false,

      setDevMode: (isDevMode) => set({ isDevMode }),

      setProfile: (profile) => set({ profile }),

      updateTytSubject: (index, updates) => set((state) => {
        const newSubs = [...state.tytSubjects];
        const oldStatus = newSubs[index].status;
        newSubs[index] = { ...newSubs[index], ...updates };
        
        let eloDelta = 0;
        if (updates.status === 'mastered' && oldStatus !== 'mastered') eloDelta = 50;
        
        return { tytSubjects: newSubs, eloScore: state.eloScore + eloDelta };
      }),

      updateAytSubject: (originalIndex, updates) => set((state) => {
        const newSubs = [...state.aytSubjects];
        const oldStatus = newSubs[originalIndex].status;
        newSubs[originalIndex] = { ...newSubs[originalIndex], ...updates };
        
        let eloDelta = 0;
        if (updates.status === 'mastered' && oldStatus !== 'mastered') eloDelta = 75;
        
        return { aytSubjects: newSubs, eloScore: state.eloScore + eloDelta };
      }),

      addLog: (log) => set((state) => {
        const newLogs = [...state.logs, log];
        // Basit Streak & Elo update
        const todayStr = new Date().toLocaleDateString('tr-TR');
        const hasLoggedToday = state.logs.some(l => l.date.includes(todayStr));
        const newStreak = hasLoggedToday ? state.streakDays : state.streakDays + 1;
        
        let eloDelta = 25;
        if (log.correct / (log.questions || 1) > 0.8) eloDelta += 50;
        
        return { logs: newLogs, streakDays: newStreak, eloScore: state.eloScore + eloDelta };
      }),

      addExam: (exam) => set((state) => {
        let eloDelta = 100;
        if (state.profile) {
            const target = exam.type === 'TYT' ? state.profile.tytTarget : state.profile.aytTarget;
            if (exam.totalNet >= target) eloDelta += 150;
        }
        return { 
          exams: [...state.exams, exam], 
          eloScore: state.eloScore + eloDelta 
        };
      }),

      removeExam: (id) => set((state) => ({
        exams: state.exams.filter(e => e.id !== id)
      })),

      updateExam: (id, updates) => set((state) => ({
        exams: state.exams.map(e => e.id === id ? { ...e, ...updates } : e)
      })),

      addElo: (amount) => set((state) => ({
        eloScore: state.eloScore + amount
      })),

      addChatMessage: (message) => set((state) => ({ 
        chatHistory: [...state.chatHistory, message] 
      })),

      setPassiveMode: (isPassiveMode) => set({ isPassiveMode }),

      addFailedQuestion: (question) => set((state) => ({ 
        failedQuestions: [...state.failedQuestions, question] 
      })),

      unlockTrophy: (trophyId) => set((state) => {
        const newTrophies = state.trophies.map(t => 
          t.id === trophyId && !t.unlockedAt ? { ...t, unlockedAt: new Date().toISOString() } : t
        );
        return { trophies: newTrophies };
      }),

      setMorningBlockerEnabled: (isMorningBlockerEnabled) => set({ isMorningBlockerEnabled }),

      resetStore: () => set({
        profile: null,
        tytSubjects: INITIAL_TYT,
        aytSubjects: INITIAL_AYT,
        logs: [],
        exams: [],
        chatHistory: [],
        isPassiveMode: false,
        failedQuestions: [],
        trophies: INITIAL_TROPHIES,
        eloScore: 1200,
        streakDays: 0,
      }),
    }),
    {
      name: 'yks_coach_storage', // localStorage state name
    }
  )
);
