/**
 * AMAÇ: Zustand merkezi durum yönetimi
 * MANTIK: Prop drilling engeli, localStorage persist, detectHabits alarmı
 */

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { openDB } from 'idb';
import { TYT_SUBJECTS, AYT_SUBJECTS } from '../constants';
import type { 
  StudentProfile, SubjectStatus, DailyLog, ExamResult, 
  FailedQuestion, ChatMessage, Trophy, FocusSessionRecord, AgendaEntry,
  HabitAlert, WarRoomMode, WarRoomSession, AuthUser, AtlasProgram
} from '../types';

export interface QASession {
  scenario: 'plan' | 'log' | 'exam' | 'topic';
  currentQuestion: number;
  totalQuestions: number;
  answers: Record<number, string>;
  isComplete: boolean;
}

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const db = await openDB('yks-store', 1, {
        upgrade(db) { db.createObjectStore('keyval'); },
      });
      return (await db.get('keyval', name)) || null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const db = await openDB('yks-store', 1, {
        upgrade(db) { db.createObjectStore('keyval'); },
      });
      await db.put('keyval', value, name);
    } catch (err) {
      console.warn('IDB write failed', err);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await openDB('yks-store', 1, {
        upgrade(db) { db.createObjectStore('keyval'); },
      });
      await db.delete('keyval', name);
    } catch (err) {
      console.warn('IDB remove failed', err);
    }
  },
};

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
  dailyEloDelta: number;
  lastEloUpdateDate: string;
  streakDays: number;
  isMorningBlockerEnabled: boolean;
  focusSessions: FocusSessionRecord[];
  agendaEntries: AgendaEntry[];
  activeAlerts: HabitAlert[];
  qaSession: QASession | null;
  drawingMode: 'pointer' | 'pen' | 'eraser';

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
  dismissAlert: (id: string) => void;
  detectAndSetHabits: () => void;
  resetStore: () => void;
  isDevMode: boolean;
  setDevMode: (enabled: boolean) => void;
  subjectViewMode: 'list' | 'map';
  setSubjectViewMode: (mode: 'list' | 'map') => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isFocusSidePanelOpen: boolean;
  setQaSession: (session: QASession | null) => void;
  updateQaAnswer: (questionIndex: number, answer: string) => void;
  setFocusSidePanelOpen: (isOpen: boolean) => void;
  setDrawingMode: (mode: 'pointer' | 'pen' | 'eraser') => void;
  analyzeUserData: () => string;

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
  lastEloUpdateDate: new Date().toLocaleDateString('tr-TR'),
  streakDays: 0,
  isMorningBlockerEnabled: true,
  focusSessions: [],
  agendaEntries: [],
  activeAlerts: [],
  isDevMode: false,
  subjectViewMode: 'map' as const,
  theme: 'dark' as const,
  isFocusSidePanelOpen: false,
  qaSession: null,
  drawingMode: 'pen' as const,
  warRoomMode: 'setup' as const,
  warRoomSession: null,
  warRoomAnswers: {},
  warRoomEliminated: {},
  warRoomTimeLeft: 0,
  authUser: null,
};

function detectHabitsFromLogs(logs: DailyLog[]): HabitAlert[] {
  const alerts: HabitAlert[] = [];
  const now = new Date();

  const last3Days = logs.filter(l => {
    const diff = (now.getTime() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 3;
  });

  const last5Days = logs.filter(l => {
    const diff = (now.getTime() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 5;
  });

  const subjectDays = new Map<string, Set<string>>();
  logs.slice(-30).forEach(l => {
    const day = new Date(l.date).toLocaleDateString('tr-TR');
    if (!subjectDays.has(l.subject)) subjectDays.set(l.subject, new Set());
    subjectDays.get(l.subject)!.add(day);
  });

  const last3DaySet = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last3DaySet.add(d.toLocaleDateString('tr-TR'));
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
    const netIncreasing = recentNets.slice(-3).every((l, i, arr) => i === 0 || (l.correct / l.questions) >= (arr[i - 1].correct / arr[i - 1].questions));
    const speedDecreasing = recentNets.slice(-3).every((l, i, arr) => i === 0 || l.avgTime >= arr[i - 1].avgTime);
    if (netIncreasing && speedDecreasing) {
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

      resetStore: () => {
        set(INITIAL_STATE);
      },

      setProfile: (profile) => set({ profile }),

      setDrawingMode: (mode: 'pointer' | 'pen' | 'eraser') => set({ drawingMode: mode }),

      setWarRoomMode: (warRoomMode) => set({ warRoomMode }),

      setWarRoomSession: (session) => set({
        warRoomSession: session,
        warRoomAnswers: {},
        warRoomEliminated: {},
        warRoomTimeLeft: 0,
      }),

      setWarRoomTimeLeft: (time) => set((state) => ({
        warRoomTimeLeft: typeof time === 'function' ? time(state.warRoomTimeLeft) : time,
      })),

      setSelectedAnswer: (questionId, answer) => set((state) => ({
        warRoomAnswers: { ...state.warRoomAnswers, [questionId]: answer },
      })),

      toggleEliminatedOption: (questionId, optionIndex) => set((state) => {
        const current = state.warRoomEliminated[questionId] ?? [];
        const next = current.includes(optionIndex)
          ? current.filter((i) => i !== optionIndex)
          : [...current, optionIndex];
        return { warRoomEliminated: { ...state.warRoomEliminated, [questionId]: next } };
      }),

      updateWarRoomAnswer: (questionId, answer) => set((state) => ({
        warRoomAnswers: { ...state.warRoomAnswers, [questionId]: answer },
      })),

      setAuthUser: (authUser) => set({ authUser }),

      signOut: async () => {
        set({ authUser: null });
        get().resetStore();
      },

      setDevMode: (isDevMode) => set({ isDevMode }),
      setSubjectViewMode: (subjectViewMode) => set({ subjectViewMode }),
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== 'undefined') {
          const html = document.documentElement;
          if (theme === 'dark') {
            html.classList.add('dark');
            html.classList.remove('light');
          } else {
            html.classList.remove('dark');
            html.classList.add('light');
          }
          html.style.colorScheme = theme;
        }
      },
      qaSession: null,
      setQaSession: (session) => set({ qaSession: session }),
      updateQaAnswer: (qIdx, ans) => set((s) => {
        if (!s.qaSession) return s;
        return {
          qaSession: {
            ...s.qaSession,
            answers: { ...s.qaSession.answers, [qIdx]: ans }
          }
        };
      }),
      isFocusSidePanelOpen: false,
      setFocusSidePanelOpen: (isOpen) => set({ isFocusSidePanelOpen: isOpen }),

      dismissAlert: (id) => set((state) => ({
        activeAlerts: state.activeAlerts.filter(a => a.id !== id),
      })),

      detectAndSetHabits: () => {
        const logs = get().logs;
        if (logs.length < 5) return;
        const alerts = detectHabitsFromLogs(logs);
        set({ activeAlerts: alerts });
      },

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
        const newLogs = [...state.logs, log].slice(-500);
        const todayStr = new Date().toLocaleDateString('tr-TR');
        const hasLoggedToday = state.logs.some(l => l.date.includes(todayStr));
        const newStreak = hasLoggedToday ? state.streakDays : state.streakDays + 1;
        
        let K = 30; 
        if (state.eloScore >= 15000) K = 10;
        else if (state.eloScore >= 7000) K = 15;
        else if (state.eloScore >= 2500) K = 20;

        const expectedNet = (log.questions || 1) * 0.60;
        const actualNet = log.correct - (log.wrong * 0.25);
        let netDiff = actualNet - expectedNet;
        netDiff = Math.max(-50, Math.min(50, netDiff)); 
        
        const eloDelta = Math.round(K * netDiff);
        
        let newDailyDelta = state.dailyEloDelta;
        if (state.lastEloUpdateDate !== todayStr) {
           newDailyDelta = 0;
        }
        newDailyDelta += eloDelta;
        
        const newEloScore = Math.max(0, state.eloScore + eloDelta);

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

        const newAlerts = newLogs.length >= 5 ? detectHabitsFromLogs(newLogs) : state.activeAlerts;

        return { logs: newLogs, streakDays: newStreak, eloScore: newEloScore, dailyEloDelta: newDailyDelta, lastEloUpdateDate: todayStr, trophies, activeAlerts: newAlerts };
      }),

      addExam: (exam) => set((state) => {
        const todayStr = new Date().toLocaleDateString('tr-TR');
        const safeTotalNet = !isFinite(exam.totalNet) || isNaN(exam.totalNet) ? 0 : exam.totalNet;
        const safeScores = exam.scores ?? {};
        const normalizedExam = { ...exam, totalNet: safeTotalNet, scores: safeScores };

        let eloDelta = 100;
        if (state.profile) {
            const target = normalizedExam.type === 'TYT' ? state.profile.tytTarget : state.profile.aytTarget;
            if (normalizedExam.totalNet >= target) eloDelta += 150;
            else if (normalizedExam.totalNet < target * 0.5) eloDelta -= 50;
        }

        let newDailyDelta = state.dailyEloDelta;
        if (state.lastEloUpdateDate !== todayStr) {
           newDailyDelta = 0;
        }
        newDailyDelta += eloDelta;
        const newEloScore = Math.max(0, state.eloScore + eloDelta);
        const newExams = [...state.exams, normalizedExam];
        const trophies = state.trophies.map(t => {
          if (t.id === 'first_blood' && newExams.length >= 1 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          if (t.id === 'exam_target_hit' && state.profile) {
            const target = normalizedExam.type === 'TYT' ? state.profile.tytTarget : state.profile.aytTarget;
            if (normalizedExam.totalNet >= target && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
          }
          return t;
        });

        return { exams: newExams.slice(-200), eloScore: newEloScore, dailyEloDelta: newDailyDelta, lastEloUpdateDate: todayStr, trophies };
      }),

      removeExam: (id) => set((state) => ({
        exams: state.exams.filter(e => e.id !== id)
      })),

      analyzeUserData: () => {
         const state = get();
         const tytTarget = state.profile?.tytTarget || 0;
         const aytTarget = state.profile?.aytTarget || 0;
         const last10Math = state.logs
            .filter(l => l.subject?.toLowerCase().includes('matematik') || l.subject?.toLowerCase().includes('fizik') || l.subject?.toLowerCase().includes('kimya') || l.subject?.toLowerCase().includes('biyoloji'))
            .slice(-10);
            
         const recentExams = state.exams.slice(-3);
         const lastTyt = recentExams.filter(e => e.type === 'TYT').pop()?.totalNet || 0;
         const lastAyt = recentExams.filter(e => e.type === 'AYT').pop()?.totalNet || 0;
         
         const mistakesContext = last10Math.map(l => `[${l.subject}] Konu: ${l.topic} -> Doğru: ${l.correct}, Hata: ${l.wrong}, Boş: ${l.empty} / Soru: ${l.questions}`).join(' | ');
         
         return `HEDEF: ${state.profile?.targetUniversity} ${state.profile?.targetMajor}. 
MEVCUT NET: TYT ${lastTyt} (Hedef: ${tytTarget}), AYT ${lastAyt} (Hedef: ${aytTarget}).
ELO: ${state.eloScore} | SERİ: ${state.streakDays} Gün.
SON 10 SAYISAL LOG (Mezarlık Kaydı): ${mistakesContext || 'Yeterli log yok.'}
TALİMAT: Öğrencinin son hatalarını ve eksiklerini incele. Disipliner bir koç gibi davran ve MF (Sayısal) odaklı gerçekçi eleştiriler yap. Sorunun nereden kaynaklandığını belirleyen net ve nokta atışı 3 maddelik bir Savaş Planı/Strateji tavsiyesi sun! Lütfen gereksiz yorum yapma, sadece 3 madde ver.`;
      },

      updateExam: (id, updates) => set((state) => ({
        exams: state.exams.map(e => e.id === id ? { ...e, ...updates } : e)
      })),

      addElo: (amount) => set((state) => ({
        eloScore: state.eloScore + amount
      })),

      addChatMessage: (message) => set((state) => ({ 
        chatHistory: [...state.chatHistory.slice(-100), message] 
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

      addTargetGoal: (goal) => set((state) => {
        const currentGoals = state.profile?.targetGoals || [];
        if (currentGoals.find(g => g.id === goal.id)) return state;
        return {
          profile: state.profile ? { 
            ...state.profile, 
            targetGoals: [...currentGoals, goal] 
          } : null
        };
      }),

      removeTargetGoal: (id) => set((state) => ({
        profile: state.profile ? {
          ...state.profile,
          targetGoals: (state.profile.targetGoals || []).filter(g => g.id !== id)
        } : null
      })),
    }),
    {
      name: 'yks_coach_storage',
      storage: createJSONStorage(() => idbStorage),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        warRoomTimeLeft: 0,
        warRoomSession: null,
        warRoomAnswers: {},
        warRoomEliminated: {},
        warRoomMode: 'setup' as const,
        activeAlerts: persistedState?.activeAlerts || [],
        focusSessions: persistedState?.focusSessions || [],
        agendaEntries: persistedState?.agendaEntries || [],
        logs: persistedState?.logs || [],
        exams: persistedState?.exams || [],
        failedQuestions: persistedState?.failedQuestions || [],
        chatHistory: persistedState?.chatHistory || [],
        tytSubjects: persistedState?.tytSubjects || currentState.tytSubjects,
        aytSubjects: persistedState?.aytSubjects || currentState.aytSubjects,
        trophies: persistedState?.trophies || currentState.trophies,
      })
    }
  )
);
