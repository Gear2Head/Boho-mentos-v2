/**
 * AMAÇ: Zustand merkezi durum yönetimi
 * MANTIK: Prop drilling engeli, localStorage persist, detectHabits alarmı
 */

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { openDB } from 'idb';
import { TYT_SUBJECTS, AYT_SUBJECTS } from '../constants';
import { toISODateOnly, toISODateTime, toDateMs } from '../utils/date';
import { 
  tombstoneEntityInSupabase, 
  pushSingleEntityToSupabase, 
  pushToSupabase,
  recordEloActivity 
} from '../services/supabaseSync';
import type { 
  StudentProfile, SubjectStatus, DailyLog, ExamResult, 
  FailedQuestion, ChatMessage, Trophy, FocusSessionRecord, AgendaEntry,
  HabitAlert, WarRoomMode, WarRoomSession, AuthUser, AtlasProgram, AppNotification
} from '../types';

export const COACH_NAME = 'Kübra';
export const COACH_SYSTEM_NAME = 'Gear_Head.Kübra';

export interface QASession {
  scenario: 'plan' | 'log' | 'exam' | 'topic';
  currentQuestion: number;
  totalQuestions: number;
  answers: Record<number, string>;
  isComplete: boolean;
}

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
  getItem: async (name: string): Promise<string | null> => {
    try {
      const db = await getDb();
      return (await db.get('keyval', name)) || null;
    } catch (err) {
      console.error('IDB read failed', err);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const db = await getDb();
      await db.put('keyval', value, name);
    } catch (err) {
      console.error('IDB write failed', err);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await getDb();
      await db.delete('keyval', name);
    } catch (err) {
      console.error('IDB remove failed', err);
    }
  },
};

type FailedQuestionInput = Omit<FailedQuestion, 'status' | 'solveCount' | 'difficulty'> & {
  difficulty?: FailedQuestion['difficulty'];
};

export interface AppState {
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
  dailyEloDelta: number;
  lastEloUpdateDate: string;
  streakDays: number;
  isMorningBlockerEnabled: boolean;
  focusSessions: FocusSessionRecord[];
  agendaEntries: AgendaEntry[];
  activeAlerts: HabitAlert[];
  qaSession: QASession | null;
  drawingMode: 'pointer' | 'pen' | 'eraser';
  
  isSyncing: boolean;
  lastLocalUpdateAt: string;
  setSyncing: (isSyncing: boolean) => void;

  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;

  morningUnlockedDate: string;
  setMorningUnlockedDate: (date: string) => void;

  setProfile: (profile: StudentProfile | null) => void;
  updateTytSubject: (index: number, updates: Partial<SubjectStatus>) => void;
  updateAytSubject: (originalIndex: number, updates: Partial<SubjectStatus>) => void;
  addLog: (log: DailyLog) => void;
  removeLog: (id: string) => void;
  updateLog: (id: string, updates: Partial<DailyLog>) => void;
  addExam: (exam: ExamResult) => void;
  removeExam: (id: string) => void;
  updateExam: (id: string, updates: Partial<ExamResult>) => void;
  addChatMessage: (message: ChatMessage) => void;
  setPassiveMode: (isPassive: boolean) => void;
  addFailedQuestion: (question: FailedQuestionInput) => void;
  solveFailedQuestion: (id: string) => void;
  removeFailedQuestion: (id: string) => void;
  unlockTrophy: (trophyId: string) => void;
  setMorningBlockerEnabled: (enabled: boolean) => void;
  addElo: (amount: number) => void;
  addFocusSession: (record: FocusSessionRecord) => void;
  addAgendaEntry: (entry: AgendaEntry) => void;
  updateAgendaEntry: (id: string, updates: Partial<AgendaEntry>) => void;
  removeAgendaEntry: (id: string) => void;
  dismissAlert: (id: string) => void;
  detectAndSetHabits: () => void;
  completeCoachTask: (recordId: string, taskIndex: number) => void;
  deferCoachTask: (recordId: string, taskIndex: number, reason?: string) => void;
  failCoachTask: (recordId: string, taskIndex: number, reason?: string) => void;
  startRecoveryFlow: () => void;
  generateStrategyPlan: () => void;
  hardReset: (scope?: 'full' | 'ui' | 'all-data') => void;
  isDevMode: boolean;
  setDevMode: (enabled: boolean) => void;
  subjectViewMode: 'list' | 'map';
  setSubjectViewMode: (mode: 'list' | 'map') => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isFocusSidePanelOpen: boolean;
  isSpotifyWidgetOpen: boolean;
  setSpotifyWidgetOpen: (open: boolean) => void;
  setQaSession: (session: QASession | null) => void;
  updateQaAnswer: (questionIndex: number, answer: string) => void;
  setFocusSidePanelOpen: (isOpen: boolean) => void;
  setDrawingMode: (mode: 'pointer' | 'pen' | 'eraser') => void;
  analyzeUserData: () => string;
  bulkMasterTytSubjectsByName: (subjectName: string) => void;
  bulkMasterAytSubjectsByName: (subjectName: string) => void;
  // TODO-038: Bulk update fix
  bulkUpdateTytSubjects: (updates: Array<{index: number; status: import('../types').SubjectStatusType}>) => void;
  bulkUpdateAytSubjects: (updates: Array<{index: number; status: import('../types').SubjectStatusType}>) => void;
  // TODO-008: Flashcard
  flashcards: import('../types/coach').Flashcard[];
  addFlashcard: (card: import('../types/coach').Flashcard) => void;
  updateFlashcard: (id: string, updates: Partial<import('../types/coach').Flashcard>) => void;
  removeFlashcard: (id: string) => void;
  // TODO-034: Lofi preference in store
  isLofiEnabled: boolean;
  setLofiEnabled: (enabled: boolean) => void;
  // Daily quests tracking
  dailyQuestsGeneratedDate: string;
  setDailyQuestsGeneratedDate: (date: string) => void;

  lastCoachDirective: import('../types/coach').CoachDirective | null;
  setLastCoachDirective: (directive: import('../types/coach').CoachDirective | null) => void;

  directiveHistory: import('../types/coach').DirectiveRecord[];
  coachMemory: import('../types/coach').CoachMemory | null;

  warRoomMode: WarRoomMode;
  setWarRoomMode: (mode: WarRoomMode) => void;
  warRoomSession: WarRoomSession | null;
  setWarRoomSession: (session: WarRoomSession | null) => void;
  warRoomAnswers: Record<string, string>;
  warRoomEliminated: Record<string, number[]>;
  warRoomTimeLeft: number;
  setWarRoomTimeLeft: (time: number | ((prev: number) => number)) => void;
  setSelectedAnswer: (questionId: string, answer: string) => void;
  toggleEliminatedOption: (questionId: string, optionIndex: number) => void;
  updateWarRoomAnswer: (questionId: string, answer: string) => void;

  authUser: AuthUser | null;
  setAuthUser: (user: AuthUser | null) => void;

  signOut: () => Promise<void>;

  addTargetGoal: (goal: AtlasProgram) => void;
  removeTargetGoal: (id: string) => void;
  
  hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
}

export const INITIAL_TYT = Object.entries(TYT_SUBJECTS).flatMap(([subject, topics]) => 
  topics.map(name => ({ subject, name, status: 'not-started' as const, notes: '' }))
);

export const INITIAL_AYT = Object.entries(AYT_SUBJECTS).flatMap(([subject, topics]) => 
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

const INITIAL_STATE = {
  profile: null,
  tytSubjects: INITIAL_TYT,
  aytSubjects: INITIAL_AYT,
  logs: [],
  exams: [],
  chatHistory: [],
  isPassiveMode: false,
  failedQuestions: [],
  trophies: INITIAL_TROPHIES,
  eloScore: 0,
  dailyEloDelta: 0,
  lastEloUpdateDate: toISODateOnly(),
  streakDays: 0,
  isMorningBlockerEnabled: true,
  morningUnlockedDate: '',
  focusSessions: [],
  agendaEntries: [],
  activeAlerts: [],
  isDevMode: false,
  subjectViewMode: 'map' as const,
  theme: 'dark' as const,
  isFocusSidePanelOpen: false,
  isSpotifyWidgetOpen: true,
  qaSession: null,
  drawingMode: 'pen' as const,
  warRoomMode: 'setup' as const,
  warRoomSession: null,
  warRoomAnswers: {},
  warRoomEliminated: {},
  warRoomTimeLeft: 0,
  authUser: null,
  isSyncing: false,
  lastLocalUpdateAt: toISODateTime(),
  notifications: [],
  hasHydrated: false,
  lastCoachDirective: null,
  directiveHistory: [] as import('../types/coach').DirectiveRecord[],
  coachMemory: null as import('../types/coach').CoachMemory | null,
  // TODO-008
  flashcards: [] as import('../types/coach').Flashcard[],
  // TODO-034
  isLofiEnabled: false,
  // Daily quests
  dailyQuestsGeneratedDate: '',
};

function detectHabitsFromLogs(logs: DailyLog[]): HabitAlert[] {
  const alerts: HabitAlert[] = [];
  const now = new Date();

  const last3Days = logs.filter((l) => {
    const ms = toDateMs(l.date);
    if (ms === null) return false;
    const diff = (now.getTime() - ms) / (1000 * 60 * 60 * 24);
    return diff <= 3;
  });

  const last5Days = logs.filter((l) => {
    const ms = toDateMs(l.date);
    if (ms === null) return false;
    const diff = (now.getTime() - ms) / (1000 * 60 * 60 * 24);
    return diff <= 5;
  });

  const subjectDays = new Map<string, Set<string>>();
  logs.slice(-30).forEach((l) => {
    const ms = toDateMs(l.date);
    if (ms === null) return;
    const day = toISODateOnly(new Date(ms));
    if (!subjectDays.has(l.subject)) subjectDays.set(l.subject, new Set());
    subjectDays.get(l.subject)!.add(day);
  });

  const last3DaySet = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last3DaySet.add(toISODateOnly(d));
  }

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

  const recentNets = logs.slice(-10);
  if (recentNets.length >= 5) {
    const accuracy = recentNets.slice(-3).every((l, i, arr) => i === 0 || (l.correct / l.questions) >= (arr[i - 1].correct / arr[i - 1].questions));
    const speed = recentNets.slice(-3).every((l, i, arr) => i === 0 || l.avgTime >= arr[i - 1].avgTime);
    if (accuracy && speed) {
      alerts.push({
        id: `memorization_${Date.now()}`,
        type: 'memorization_risk',
        subject: 'Genel',
        message: 'Doğruluk artıyor ama çözüm süren uzuyor. Ezberleme riski — konuyu farklı soru tipleriyle test et.',
        createdAt: new Date().toISOString(),
      });
    }
  }

  const last5SubjectSet = new Set(last5Days.map(l => l.subject));
  subjectDays.forEach((_, subject) => {
    if (!last5SubjectSet.has(subject) && subjectDays.size > 1) {
      if (!alerts.find(a => a.subject === subject)) {
        alerts.push({
          id: `neglected_${subject}_${Date.now()}`,
          type: 'neglected_subject',
          subject,
          message: `"${subject}" son 5 günde hiç çalışılmadı. İhmal edilen ders — bugün mutlaka gir.`,
          createdAt: new Date().toISOString(),
        });
      }
    }
  });

  return alerts.slice(0, 3);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      hardReset: (scope = 'full') => {
        if (scope === 'full') {
          set(INITIAL_STATE);
        } else if (scope === 'ui') {
          set({
            isSyncing: false,
            notifications: [],
            isFocusSidePanelOpen: false,
  isSpotifyWidgetOpen: true,
            qaSession: null,
            warRoomMode: 'setup',
            warRoomSession: null,
          });
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

      setMorningUnlockedDate: (date) => set({ morningUnlockedDate: date }),

      setProfile: (profile) => {
        const uid = get().authUser?.uid;
        set({ profile });
        if (uid && profile) void pushToSupabase(uid, { profile });
      },

      updateTytSubject: (index, updates) => {
        const uid = get().authUser?.uid;
        const newSubs = [...get().tytSubjects];
        const oldStatus = newSubs[index].status;
        newSubs[index] = { ...newSubs[index], ...updates };
        
        let eloDelta = 0;
        if (updates.status && updates.status !== oldStatus) {
            if (updates.status === 'in-progress' && oldStatus === 'not-started') eloDelta = 15;
            else if (updates.status === 'mastered' && oldStatus === 'in-progress') eloDelta = 35;
            else if (updates.status === 'mastered' && oldStatus === 'not-started') eloDelta = 50;
            else if (updates.status === 'not-started' && oldStatus === 'mastered') eloDelta = -50;
            else if (updates.status === 'in-progress' && oldStatus === 'mastered') eloDelta = -35;
            else if (updates.status === 'not-started' && oldStatus === 'in-progress') eloDelta = -15;
        }

        const masteredCount = [...newSubs, ...get().aytSubjects].filter(s => s.status === 'mastered').length;
        const trophies = get().trophies.map(t => {
          if (t.id === 'master_10' && masteredCount >= 10 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'master_50' && masteredCount >= 50 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          return t;
        });

        const todayStr = new Date().toISOString().split('T')[0];
        const newDailyDelta = get().lastEloUpdateDate !== todayStr ? eloDelta : get().dailyEloDelta + eloDelta;
        const newElo = Math.max(0, get().eloScore + eloDelta);

        set({ tytSubjects: newSubs, eloScore: newElo, trophies, dailyEloDelta: newDailyDelta, lastEloUpdateDate: todayStr, lastLocalUpdateAt: new Date().toISOString() });
        
        if (uid) {
          void pushToSupabase(uid, { tytSubjects: newSubs, trophies });
          // TODO-021: Backend ELO Sync
          recordEloActivity('tyt_subject', { oldStatus, newStatus: updates.status || oldStatus }).then(res => {
            if (res) set({ eloScore: res.newElo });
          });
        }
      },

      updateAytSubject: (originalIndex, updates) => {
        const uid = get().authUser?.uid;
        const newSubs = [...get().aytSubjects];
        const oldStatus = newSubs[originalIndex].status;
        newSubs[originalIndex] = { ...newSubs[originalIndex], ...updates };
        
        let eloDelta = 0;
        if (updates.status && updates.status !== oldStatus) {
            if (updates.status === 'in-progress' && oldStatus === 'not-started') eloDelta = 20;
            else if (updates.status === 'mastered' && oldStatus === 'in-progress') eloDelta = 55;
            else if (updates.status === 'mastered' && oldStatus === 'not-started') eloDelta = 75;
            else if (updates.status === 'not-started' && oldStatus === 'mastered') eloDelta = -75;
            else if (updates.status === 'in-progress' && oldStatus === 'mastered') eloDelta = -55;
            else if (updates.status === 'not-started' && oldStatus === 'in-progress') eloDelta = -20;
        }

        const masteredCount = [...get().tytSubjects, ...newSubs].filter(s => s.status === 'mastered').length;
        const trophies = get().trophies.map(t => {
          if (t.id === 'master_10' && masteredCount >= 10 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'master_50' && masteredCount >= 50 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          return t;
        });

        const todayStr = new Date().toISOString().split('T')[0];
        const newDailyDelta = get().lastEloUpdateDate !== todayStr ? eloDelta : get().dailyEloDelta + eloDelta;
        const newElo = Math.max(0, get().eloScore + eloDelta);

        set({ aytSubjects: newSubs, eloScore: newElo, trophies, dailyEloDelta: newDailyDelta, lastEloUpdateDate: todayStr, lastLocalUpdateAt: new Date().toISOString() });
        
        if (uid) {
          void pushToSupabase(uid, { aytSubjects: newSubs, trophies });
          // TODO-021: Backend ELO Sync
          recordEloActivity('ayt_subject', { oldStatus, newStatus: updates.status || oldStatus }).then(res => {
            if (res) set({ eloScore: res.newElo });
          });
        }
      },

      addLog: (log) => {
        const uid = get().authUser?.uid;
        const logWithId: DailyLog = {
          ...log,
          id: log.id ?? `log_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        };
        const newLogs = [...get().logs, logWithId].slice(-500);
        const todayStr = toISODateOnly();
        const hasLoggedToday = get().logs.some((l) => {
          const ms = toDateMs(l.date);
          return ms ? toISODateOnly(new Date(ms)) === todayStr : false;
        });
        const newStreak = hasLoggedToday ? get().streakDays : get().streakDays + 1;
        
        let K = 30; 
        if (get().eloScore >= 15000) K = 10;
        else if (get().eloScore >= 7000) K = 15;
        else if (get().eloScore >= 2500) K = 20;

        const expectedNet = (log.questions || 1) * 0.60;
        const actualNet = log.correct - (log.wrong * 0.25);
        let netDiff = Math.max(-50, Math.min(50, actualNet - expectedNet)); 
        const eloDelta = Math.round(K * netDiff);
        
        let newDailyDelta = get().lastEloUpdateDate !== todayStr ? 0 : get().dailyEloDelta;
        newDailyDelta += eloDelta;
        const newEloScore = Math.max(0, get().eloScore + eloDelta);

        const accuracy = log.correct / (log.questions || 1);
        const last3 = newLogs.slice(-3);
        const last3Good = last3.length === 3 && last3.every(l => (l.correct / (l.questions || 1)) >= 0.8);

        const trophies = get().trophies.map(t => {
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

        const newAlerts = newLogs.length >= 5 ? detectHabitsFromLogs(newLogs) : get().activeAlerts;

        set({ logs: newLogs, streakDays: newStreak, eloScore: newEloScore, dailyEloDelta: newDailyDelta, lastEloUpdateDate: todayStr, trophies, activeAlerts: newAlerts, lastLocalUpdateAt: new Date().toISOString() });
        
        if (uid) {
           void pushToSupabase(uid, { logs: newLogs, streakDays: newStreak, trophies });
           // TODO-021: Backend ELO Sync
           recordEloActivity('log', { questions: log.questions, correct: log.correct, wrong: log.wrong }).then(res => {
             if (res) set({ eloScore: res.newElo });
           });
        }
      },

      removeLog: (id) => {
        const uid = get().authUser?.uid;
        const newLogs = get().logs.filter(l => l.id !== id);
        set({ logs: newLogs, lastLocalUpdateAt: new Date().toISOString() });
        if (uid) {
          void tombstoneEntityInSupabase(uid, 'logs', id);
          void pushToSupabase(uid, { logs: newLogs });
        }
        get().detectAndSetHabits();
      },

      updateLog: (id, updates) => {
        const uid = get().authUser?.uid;
        const newLogs = get().logs.map(l => l.id === id ? { ...l, ...updates } : l);
        set({ logs: newLogs, lastLocalUpdateAt: new Date().toISOString() });
        if (uid) void pushToSupabase(uid, { logs: newLogs });
        get().detectAndSetHabits();
      },

      addExam: (exam) => {
        const uid = get().authUser?.uid;
        const todayStr = toISODateOnly();
        const safeTotalNet = !isFinite(exam.totalNet) || isNaN(exam.totalNet) ? 0 : exam.totalNet;
        const normalizedExam = { ...exam, totalNet: safeTotalNet };

        let eloDelta = 100;
        if (get().profile) {
            const target = normalizedExam.type === 'TYT' ? get().profile!.tytTarget : get().profile!.aytTarget;
            if (normalizedExam.totalNet >= target) eloDelta += 150;
            else if (normalizedExam.totalNet < target * 0.5) eloDelta -= 50;
        }

        let newDailyDelta = get().lastEloUpdateDate !== todayStr ? 0 : get().dailyEloDelta;
        newDailyDelta += eloDelta;
        const newEloScore = Math.max(0, get().eloScore + eloDelta);
        const newExams = [...get().exams, normalizedExam].slice(-200);
        const trophies = get().trophies.map(t => {
          if (t.id === 'first_blood' && newExams.length >= 1 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'exam_target_hit' && get().profile) {
            const target = normalizedExam.type === 'TYT' ? get().profile!.tytTarget : get().profile!.aytTarget;
            if (normalizedExam.totalNet >= target && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          }
          return t;
        });

        set({ exams: newExams, eloScore: newEloScore, dailyEloDelta: newDailyDelta, lastEloUpdateDate: todayStr, trophies, lastLocalUpdateAt: new Date().toISOString() });
        
        if (uid) {
          void pushToSupabase(uid, { exams: newExams, trophies });
          // TODO-021: Backend ELO Sync
          const target = normalizedExam.type === 'TYT' ? (get().profile?.tytTarget || 0) : (get().profile?.aytTarget || 0);
          recordEloActivity('exam', { totalNet: normalizedExam.totalNet }, target).then(res => {
            if (res) set({ eloScore: res.newElo });
          });
        }
      },

      removeExam: (id) => {
        const uid = get().authUser?.uid;
        const newExams = get().exams.filter(e => e.id !== id);
        set({ exams: newExams, lastLocalUpdateAt: new Date().toISOString() });
        if (uid) {
          void tombstoneEntityInSupabase(uid, 'exams', id);
          void pushToSupabase(uid, { exams: newExams });
        }
      },

      updateExam: (id, updates) => {
        const uid = get().authUser?.uid;
        const newExams = get().exams.map(e => e.id === id ? { ...e, ...updates } : e);
        set({ exams: newExams, lastLocalUpdateAt: new Date().toISOString() });
        if (uid) void pushToSupabase(uid, { exams: newExams });
      },

      addChatMessage: (message) => {
        const uid = get().authUser?.uid;
        const newMessage: ChatMessage = {
          ...message,
          id: message.id ?? `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        };
        // TODO-026: Cap at 100 messages to prevent memory leak
        const newHistory = [...get().chatHistory, newMessage].slice(-100);
        set({ chatHistory: newHistory });
        if (uid) void pushSingleEntityToSupabase(uid, 'chatHistory', newMessage as unknown as Record<string, unknown>);
      },

      setPassiveMode: (isPassiveMode) => {
        const uid = get().authUser?.uid;
        set({ isPassiveMode });
        if (uid) void pushToSupabase(uid, { isPassiveMode });
      },

      addFailedQuestion: (input) => {
        const uid = get().authUser?.uid;
        const newQ: FailedQuestion = {
          ...input,
          id: input.id || `fail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          status: 'active',
          solveCount: 0,
          difficulty: input.difficulty || 'medium'
        };
        const newList = [...get().failedQuestions, newQ];
        set({ failedQuestions: newList });
        if (uid) void pushSingleEntityToSupabase(uid, 'failedQuestions', newQ as unknown as Record<string, unknown>);
      },

      solveFailedQuestion: (id) => {
        const uid = get().authUser?.uid;
        const newList = get().failedQuestions.map(q => 
          q.id === id ? { ...q, status: 'solved' as const, solveCount: q.solveCount + 1 } : q
        );
        set({ failedQuestions: newList });
        if (uid) void pushToSupabase(uid, { failedQuestions: newList });
        get().addElo(15);
      },

      removeFailedQuestion: (id) => {
        const uid = get().authUser?.uid;
        const newList = get().failedQuestions.filter(q => q.id !== id);
        set({ failedQuestions: newList });
        if (uid) {
          void tombstoneEntityInSupabase(uid, 'failedQuestions', id);
          void pushToSupabase(uid, { failedQuestions: newList });
        }
      },

      unlockTrophy: (trophyId) => {
        const uid = get().authUser?.uid;
        const trophies = get().trophies;
        const idx = trophies.findIndex(t => t.id === trophyId);
        if (idx !== -1 && !trophies[idx].unlockedAt) {
          const newTrophies = [...trophies];
          newTrophies[idx] = { ...newTrophies[idx], unlockedAt: new Date().toISOString() };
          set({ trophies: newTrophies });
          if (uid) void pushToSupabase(uid, { trophies: newTrophies });
          get().addElo(50);
        }
      },

      setMorningBlockerEnabled: (enabled) => {
        const uid = get().authUser?.uid;
        set({ isMorningBlockerEnabled: enabled });
        if (uid) void pushToSupabase(uid, { isMorningBlockerEnabled: enabled } as never);
      },

      addElo: (amount) => {
        const uid = get().authUser?.uid;
        const newScore = Math.max(0, get().eloScore + amount);
        set({ eloScore: newScore });
        if (uid) void pushToSupabase(uid, { eloScore: newScore });
      },

      addFocusSession: (record) => {
        const uid = get().authUser?.uid;
        const newSessions = [...get().focusSessions, record];
        set({ focusSessions: newSessions });
        if (uid) void pushSingleEntityToSupabase(uid, 'focusSessions', record as unknown as Record<string, unknown>);
      },

      setDrawingMode: (mode) => set({ drawingMode: mode }),
      setWarRoomMode: (mode) => set({ warRoomMode: mode }),
      setWarRoomSession: (session) => set({
        warRoomSession: session,
        warRoomAnswers: {},
        warRoomEliminated: {},
        warRoomTimeLeft: 0,
      }),
      setWarRoomTimeLeft: (time) => set((s) => ({
        warRoomTimeLeft: typeof time === 'function' ? time(s.warRoomTimeLeft) : time,
      })),
      setSelectedAnswer: (qId, ans) => set((s) => ({
        warRoomAnswers: { ...s.warRoomAnswers, [qId]: ans },
      })),
      toggleEliminatedOption: (qId, optIdx) => set((s) => {
        const cur = s.warRoomEliminated[qId] ?? [];
        const next = cur.includes(optIdx) ? cur.filter(i => i !== optIdx) : [...cur, optIdx];
        return { warRoomEliminated: { ...s.warRoomEliminated, [qId]: next } };
      }),
      updateWarRoomAnswer: (qId, ans) => set((s) => ({
        warRoomAnswers: { ...s.warRoomAnswers, [qId]: ans },
      })),
      setAuthUser: (user) => set({ authUser: user }),
      signOut: async () => {
        set({ authUser: null });
        get().hardReset();
      },
      setDevMode: (enabled) => set({ isDevMode: enabled }),

      completeCoachTask: (recordId, index) => {
        const { directiveHistory, eloScore, authUser, coachMemory } = get();
        const record = directiveHistory.find(r => r.id === recordId);
        if (!record || !record.directive.tasks[index]) return;

        const task = record.directive.tasks[index];
        import('../services/directiveHistory').then(m => {
          const nr = m.completeTask(record, index);
          const newHistory = m.updateInHistory(directiveHistory, nr);
          const newMemory = m.updateCoachMemory(newHistory, coachMemory);
          
          const bonus = task.priority === 'high' ? 40 : 25;
          const newElo = Math.min(eloScore + bonus, 9000);

          set({ directiveHistory: newHistory, eloScore: newElo, coachMemory: newMemory });
          if (authUser?.uid) {
            pushSingleEntityToSupabase(authUser.uid, 'directiveHistory', nr as unknown as Record<string, unknown>);
            pushToSupabase(authUser.uid, { eloScore: newElo, coachMemory: newMemory });
          }
        });
      },

      deferCoachTask: (recordId, index, reason) => {
        const { directiveHistory, eloScore, authUser, coachMemory } = get();
        const record = directiveHistory.find(r => r.id === recordId);
        if (!record) return;

        import('../services/directiveHistory').then(m => {
          const nr = m.skipTask(record, index, reason);
          const newHistory = m.updateInHistory(directiveHistory, nr);
          const newMemory = m.updateCoachMemory(newHistory, coachMemory);
          const newElo = Math.max(eloScore - 5, 0);

          set({ directiveHistory: newHistory, eloScore: newElo, coachMemory: newMemory });
          if (authUser?.uid) {
            pushSingleEntityToSupabase(authUser.uid, 'directiveHistory', nr as unknown as Record<string, unknown>);
            pushToSupabase(authUser.uid, { eloScore: newElo, coachMemory: newMemory });
          }
        });
      },

      failCoachTask: (recordId, index, reason) => {
        const { directiveHistory, eloScore, authUser, coachMemory } = get();
        const record = directiveHistory.find(r => r.id === recordId);
        if (!record) return;

        import('../services/directiveHistory').then(m => {
          const nr = m.failTask(record, index, (reason as any) || 'other');
          const newHistory = m.updateInHistory(directiveHistory, nr);
          const newMemory = m.updateCoachMemory(newHistory, coachMemory);
          const newElo = Math.max(eloScore - 15, 0);

          set({ directiveHistory: newHistory, eloScore: newElo, coachMemory: newMemory });
          if (authUser?.uid) {
            pushSingleEntityToSupabase(authUser.uid, 'directiveHistory', nr as unknown as Record<string, unknown>);
            pushToSupabase(authUser.uid, { eloScore: newElo, coachMemory: newMemory });
          }
        });
      },

      startRecoveryFlow: () => {
        const { directiveHistory, authUser } = get();
        import('../services/directiveHistory').then(m => {
          const recTasks = m.generateRecoveryTasks(directiveHistory);
          if (recTasks.length === 0) return;

          const newRecord = {
            id: `rec_${Date.now()}`,
            directive: {
              headline: 'Akıllı Telafi Planı',
              summary: 'Kaçırdığın veya yapamadığın görevleri programa geri kazandırıyoruz.',
              tasks: recTasks,
              intent: 'intervention' as const,
              createdAt: new Date().toISOString(),
            },
            isResolved: false,
            contextHash: '',
            completedTaskCount: 0,
            skippedTaskCount: 0
          };
          const newHistory = [newRecord, ...directiveHistory];
          set({ directiveHistory: newHistory });
          if (authUser?.uid) pushSingleEntityToSupabase(authUser.uid, 'directiveHistory', newRecord as unknown as Record<string, unknown>);
        });
      },

      generateStrategyPlan: () => {
        console.log('[Strategy] Generating weekly plan...');
      },

      analyzeUserData: () => {
         const state = get();
         const tytTarget = state.profile?.tytTarget || 0;
         const aytTarget = state.profile?.aytTarget || 0;
         const last10Math = state.logs
            .filter(l => l.subject?.toLowerCase().includes('matematik') || l.subject?.toLowerCase().includes('fizik'))
            .slice(-10);
         const mistakesContext = last10Math.map(l => `${l.subject}: D:${l.correct} Y:${l.wrong}`).join(' | ');
         
         return `HEDEF: ${state.profile?.targetUniversity}. TYT: ${tytTarget}, AYT: ${aytTarget}. ELO: ${state.eloScore}. LOGLAR: ${mistakesContext}`;
      },

      bulkMasterTytSubjectsByName: (name) => set((s) => ({
        tytSubjects: s.tytSubjects.map(sub => sub.subject === name ? { ...sub, status: 'mastered' } : sub)
      })),
      bulkMasterAytSubjectsByName: (name) => set((s) => ({
        aytSubjects: s.aytSubjects.map(sub => sub.subject === name ? { ...sub, status: 'mastered' } : sub)
      })),

      // TODO-038: Atomic bulk update for subject status
      bulkUpdateTytSubjects: (updates) => set((s) => {
        const newSubs = [...s.tytSubjects];
        updates.forEach(({ index, status }) => {
          if (newSubs[index]) newSubs[index] = { ...newSubs[index], status };
        });
        const uid = s.authUser?.uid;
        if (uid) void pushToSupabase(uid, { tytSubjects: newSubs });
        return { tytSubjects: newSubs };
      }),
      bulkUpdateAytSubjects: (updates) => set((s) => {
        const newSubs = [...s.aytSubjects];
        updates.forEach(({ index, status }) => {
          if (newSubs[index]) newSubs[index] = { ...newSubs[index], status };
        });
        const uid = s.authUser?.uid;
        if (uid) void pushToSupabase(uid, { aytSubjects: newSubs });
        return { aytSubjects: newSubs };
      }),

      // TODO-008: Flashcard CRUD
      addFlashcard: (card) => set((s) => ({
        flashcards: [...s.flashcards, card],
      })),
      updateFlashcard: (id, updates) => set((s) => ({
        flashcards: s.flashcards.map(c => c.id === id ? { ...c, ...updates } : c),
      })),
      removeFlashcard: (id) => set((s) => ({
        flashcards: s.flashcards.filter(c => c.id !== id),
      })),

      // TODO-034
      setLofiEnabled: (enabled) => set({ isLofiEnabled: enabled }),

      // Daily quests
      setDailyQuestsGeneratedDate: (date) => set({ dailyQuestsGeneratedDate: date }),

      addAgendaEntry: (entry) => {
        const uid = get().authUser?.uid;
        const newEntries = [...get().agendaEntries, entry];
        set({ agendaEntries: newEntries });
        if (uid) void pushSingleEntityToSupabase(uid, 'agendaEntries', entry as unknown as Record<string, unknown>);
      },
      updateAgendaEntry: (id, updates) => {
        const uid = get().authUser?.uid;
        const newEntries = get().agendaEntries.map(e => e.id === id ? { ...e, ...updates } : e);
        set({ agendaEntries: newEntries });
        if (uid) void pushToSupabase(uid, { agendaEntries: newEntries });
      },
      removeAgendaEntry: (id) => {
        const uid = get().authUser?.uid;
        const newEntries = get().agendaEntries.filter(e => e.id !== id);
        set({ agendaEntries: newEntries });
        if (uid) {
          void tombstoneEntityInSupabase(uid, 'agendaEntries', id);
          void pushToSupabase(uid, { agendaEntries: newEntries });
        }
      },
      addTargetGoal: (goal) => set((s) => ({
        profile: s.profile ? { ...s.profile, targetGoals: [...(s.profile.targetGoals || []), goal] } : null
      })),
      removeTargetGoal: (id) => set((s) => ({
        profile: s.profile ? { ...s.profile, targetGoals: (s.profile.targetGoals || []).filter(g => g.id !== id) } : null
      })),
      setSyncing: (isSyncing) => set({ isSyncing }),
      addNotification: (notif) => set((s) => ({
        notifications: [{ ...notif, id: `notif_${Date.now()}`, timestamp: new Date().toISOString(), read: false }, ...s.notifications].slice(0, 50)
      })),
      markNotificationAsRead: (id) => set((s) => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      })),
      clearNotifications: () => set({ notifications: [] }),
      setHasHydrated: (val) => set({ hasHydrated: val }),
      setSubjectViewMode: (mode) => set({ subjectViewMode: mode }),
       setTheme: (theme) => set({ theme }),
       setFocusSidePanelOpen: (open) => set({ isFocusSidePanelOpen: open }),
       setSpotifyWidgetOpen: (open) => set({ isSpotifyWidgetOpen: open }),
       setLastCoachDirective: (dir) => set({ lastCoachDirective: dir }),
       setQaSession: (session) => set({ qaSession: session }),
       updateQaAnswer: (idx, ans) => set((s) => s.qaSession ? ({
         qaSession: { ...s.qaSession, answers: { ...s.qaSession.answers, [idx]: ans } }
       }) : s),
       dismissAlert: (id) => set((s) => ({ activeAlerts: s.activeAlerts.filter(a => a.id !== id) })),
      detectAndSetHabits: () => {
        const alerts = detectHabitsFromLogs(get().logs);
        set({ activeAlerts: alerts });
      },
    }),
    {
      name: 'yks_coach_storage',
      storage: createJSONStorage(() => idbStorage),
      merge: (persisted: any, current: any) => {
        const tyt = persisted.tytSubjects?.length > 0 ? persisted.tytSubjects : current.tytSubjects;
        const ayt = persisted.aytSubjects?.length > 0 ? persisted.aytSubjects : current.aytSubjects;
        return {
          ...current,
          ...persisted,
          tytSubjects: tyt,
          aytSubjects: ayt,
          warRoomTimeLeft: 0,
          warRoomSession: null,
          isSyncing: false,
          hasHydrated: false,
        };
      },
      partialize: (state: AppState) => {
        const { isSyncing, hasHydrated, ...rest } = state;
        return rest;
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[Store] Rehydration error:', error);
        }
        // Always mark hydrated — even on partial/failed rehydration
        if (state) {
          state.setHasHydrated(true);
        } else {
          // Fallback: set directly via the store after a tick
          setTimeout(() => useAppStore.getState().setHasHydrated(true), 0);
        }
      },
    }
  )
);
