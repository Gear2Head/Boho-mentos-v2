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
  FailedQuestion, ChatMessage, Trophy, FocusSessionRecord, AgendaEntry
} from '../types';

type FailedQuestionInput = Omit<FailedQuestion, 'status' | 'solveCount' | 'difficulty'> & {
  difficulty?: FailedQuestion['difficulty'];
};

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
  focusSessions: FocusSessionRecord[];
  agendaEntries: AgendaEntry[];

  // Actions
  setProfile: (profile: StudentProfile | null) => void;
  updateTytSubject: (index: number, updates: Partial<SubjectStatus>) => void;
  updateAytSubject: (originalIndex: number, updates: Partial<SubjectStatus>) => void;
  addLog: (log: DailyLog) => void;
  addExam: (exam: ExamResult) => void;
  addChatMessage: (message: ChatMessage) => void;
  setPassiveMode: (isPassive: boolean) => void;
  addFailedQuestion: (question: FailedQuestionInput) => void;
  solveFailedQuestion: (id: string) => void;
  removeFailedQuestion: (id: string) => void;
  unlockTrophy: (trophyId: string) => void;
  setMorningBlockerEnabled: (enabled: boolean) => void;
  removeExam: (id: string) => void;
  updateExam: (id: string, updates: Partial<ExamResult>) => void;
  addElo: (amount: number) => void;
  addFocusSession: (record: FocusSessionRecord) => void;
  addAgendaEntry: (entry: AgendaEntry) => void;
  updateAgendaEntry: (id: string, updates: Partial<AgendaEntry>) => void;
  removeAgendaEntry: (id: string) => void;
  resetStore: () => void;
  isDevMode: boolean;
  setDevMode: (enabled: boolean) => void;
  subjectViewMode: 'list' | 'map';
  setSubjectViewMode: (mode: 'list' | 'map') => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isFocusSidePanelOpen: boolean;
  setFocusSidePanelOpen: (isOpen: boolean) => void;
}

const INITIAL_TYT = Object.entries(TYT_SUBJECTS).flatMap(([subject, topics]) => 
  topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' }))
);

const INITIAL_AYT = Object.entries(AYT_SUBJECTS).flatMap(([subject, topics]) => 
  topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' }))
);

const INITIAL_TROPHIES: Trophy[] = [
  { id: 'first_blood', title: 'İlk Kan', description: 'İlk denemeni girdin', unlockedAt: null, icon: 'Award', category: 'milestone' },
  { id: 'log_10', title: 'Rutin Kurucu', description: '10 log girdin', unlockedAt: null, icon: 'List', category: 'milestone' },
  { id: 'log_50', title: 'Disiplin Makinesi', description: '50 log girdin', unlockedAt: null, icon: 'List', category: 'milestone' },
  { id: 'streak_3', title: 'Alev Alev', description: '3 gün üst üste log girdin', unlockedAt: null, icon: 'Flame', category: 'streak' },
  { id: 'streak_7', title: 'Haftalık Seri', description: '7 gün seri yaptın', unlockedAt: null, icon: 'Flame', category: 'streak' },
  { id: 'streak_14', title: 'Çelik İrade', description: '14 gün seri yaptın', unlockedAt: null, icon: 'Shield', category: 'streak' },
  { id: 'streak_30', title: 'Efsane Seri', description: '30 gün seri yaptın', unlockedAt: null, icon: 'Crown', category: 'streak' },
  { id: 'accuracy_90', title: 'Keskin Nişancı', description: 'Tek logda %90+ doğruluk', unlockedAt: null, icon: 'Target', category: 'performance' },
  { id: 'accuracy_80_streak', title: 'Temiz İş', description: 'Üst üste 3 logda %80+ doğruluk', unlockedAt: null, icon: 'CheckCircle2', category: 'performance' },
  { id: 'master_10', title: 'Uzman', description: '10 konuda ustalaştın', unlockedAt: null, icon: 'Star', category: 'milestone' },
  { id: 'master_50', title: 'Hakimiyet', description: '50 konuda ustalaştın', unlockedAt: null, icon: 'Star', category: 'milestone' },
  { id: 'exam_target_hit', title: 'Eşik Kırıldı', description: 'Bir denemede hedef nete ulaştın', unlockedAt: null, icon: 'Trophy', category: 'performance' },
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
      focusSessions: [],
      agendaEntries: [],
      isDevMode: false,
      subjectViewMode: 'map' as const,
      theme: 'dark' as const,

      setDevMode: (isDevMode) => set({ isDevMode }),
      setSubjectViewMode: (subjectViewMode) => set({ subjectViewMode }),
      setTheme: (theme) => set({ theme }),
      isFocusSidePanelOpen: false,
      setFocusSidePanelOpen: (isOpen) => set({ isFocusSidePanelOpen: isOpen }),

      setProfile: (profile) => set({ profile }),

      updateTytSubject: (index, updates) => set((state) => {
        const newSubs = [...state.tytSubjects];
        const oldStatus = newSubs[index].status;
        newSubs[index] = { ...newSubs[index], ...updates };
        
        let eloDelta = 0;
        if (updates.status === 'mastered' && oldStatus !== 'mastered') eloDelta = 50;

        const masteredCount = [...newSubs, ...state.aytSubjects].filter(s => s.status === 'mastered').length;
        const trophies = state.trophies.map(t => {
          if (t.id === 'master_10' && masteredCount >= 10 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'master_50' && masteredCount >= 50 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          return t;
        });

        return { tytSubjects: newSubs, eloScore: state.eloScore + eloDelta, trophies };
      }),

      updateAytSubject: (originalIndex, updates) => set((state) => {
        const newSubs = [...state.aytSubjects];
        const oldStatus = newSubs[originalIndex].status;
        newSubs[originalIndex] = { ...newSubs[originalIndex], ...updates };
        
        let eloDelta = 0;
        if (updates.status === 'mastered' && oldStatus !== 'mastered') eloDelta = 75;

        const masteredCount = [...state.tytSubjects, ...newSubs].filter(s => s.status === 'mastered').length;
        const trophies = state.trophies.map(t => {
          if (t.id === 'master_10' && masteredCount >= 10 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'master_50' && masteredCount >= 50 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          return t;
        });

        return { aytSubjects: newSubs, eloScore: state.eloScore + eloDelta, trophies };
      }),

      addLog: (log) => set((state) => {
        const newLogs = [...state.logs, log];
        // Basit Streak & Elo update
        const todayStr = new Date().toLocaleDateString('tr-TR');
        const hasLoggedToday = state.logs.some(l => l.date.includes(todayStr));
        const newStreak = hasLoggedToday ? state.streakDays : state.streakDays + 1;
        
        let eloDelta = 25;
        if (log.correct / (log.questions || 1) > 0.8) eloDelta += 50;

        const accuracy = log.correct / (log.questions || 1);
        const last3 = newLogs.slice(-3);
        const last3Good = last3.length === 3 && last3.every(l => (l.correct / (l.questions || 1)) >= 0.8);

        const trophies = state.trophies.map(t => {
          if (t.id === 'log_10' && newLogs.length >= 10 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'log_50' && newLogs.length >= 50 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'streak_3' && newStreak >= 3 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'streak_7' && newStreak >= 7 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'streak_14' && newStreak >= 14 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'streak_30' && newStreak >= 30 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'accuracy_90' && accuracy >= 0.9 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'accuracy_80_streak' && last3Good && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          return t;
        });

        return { logs: newLogs, streakDays: newStreak, eloScore: state.eloScore + eloDelta, trophies };
      }),

      addExam: (exam) => set((state) => {
        let eloDelta = 100;
        if (state.profile) {
            const target = exam.type === 'TYT' ? state.profile.tytTarget : state.profile.aytTarget;
            if (exam.totalNet >= target) eloDelta += 150;
        }
        const newExams = [...state.exams, exam];
        const trophies = state.trophies.map(t => {
          if (t.id === 'first_blood' && newExams.length >= 1 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'exam_target_hit' && state.profile) {
            const target = exam.type === 'TYT' ? state.profile.tytTarget : state.profile.aytTarget;
            if (exam.totalNet >= target && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          }
          return t;
        });

        return { exams: newExams, eloScore: state.eloScore + eloDelta, trophies };
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
        failedQuestions: [...state.failedQuestions, { 
          ...question, 
          status: 'active', 
          solveCount: 0,
          difficulty: question.difficulty || 'medium' 
        }] 
      })),

      solveFailedQuestion: (id) => set((state) => {
        const newQuestions = state.failedQuestions.map(q => {
          if (q.id === id) {
            const newCount = q.solveCount + 1;
            return { 
              ...q, 
              solveCount: newCount, 
              status: newCount >= 3 ? 'solved' as const : 'active' as const 
            };
          }
          return q;
        });
        return { failedQuestions: newQuestions };
      }),

      removeFailedQuestion: (id) => set((state) => ({
        failedQuestions: state.failedQuestions.filter(q => q.id !== id)
      })),

      unlockTrophy: (trophyId) => set((state) => {
        const newTrophies = state.trophies.map(t => 
          t.id === trophyId && !t.unlockedAt ? { ...t, unlockedAt: new Date().toISOString() } : t
        );
        return { trophies: newTrophies };
      }),

      setMorningBlockerEnabled: (isMorningBlockerEnabled) => set({ isMorningBlockerEnabled }),

      addFocusSession: (record) => set((state) => ({
        focusSessions: [...state.focusSessions, record],
      })),

      addAgendaEntry: (entry) => set((state) => ({
        agendaEntries: [...state.agendaEntries, entry],
      })),

      updateAgendaEntry: (id, updates) => set((state) => ({
        agendaEntries: state.agendaEntries.map(e => e.id === id ? { ...e, ...updates } : e),
      })),

      removeAgendaEntry: (id) => set((state) => ({
        agendaEntries: state.agendaEntries.filter(e => e.id !== id),
      })),

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
        focusSessions: [],
        agendaEntries: [],
      }),
    }),
    {
      name: 'yks_coach_storage', // localStorage state name
    }
  )
);
