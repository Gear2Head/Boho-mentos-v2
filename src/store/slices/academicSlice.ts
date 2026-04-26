import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { DailyLog, ExamResult, FailedQuestion, SubjectStatus, AgendaEntry, FocusSessionRecord } from '../../types';
import { Flashcard } from '../../types/coach';
import { toISODateOnly, toDateMs } from '../../utils/date';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { cleanForFirestore } from "../../utils/firebaseHelpers";

export interface AcademicSlice {
  tytSubjects: SubjectStatus[];
  aytSubjects: SubjectStatus[];
  logs: DailyLog[];
  exams: ExamResult[];
  failedQuestions: FailedQuestion[];
  agendaEntries: AgendaEntry[];
  focusSessions: FocusSessionRecord[];
  flashcards: Flashcard[];

  updateTytSubject: (index: number, updates: Partial<SubjectStatus>) => void;
  updateAytSubject: (originalIndex: number, updates: Partial<SubjectStatus>) => void;
  bulkUpdateTytSubjects: (updates: Array<{index: number; status: import('../../types').SubjectStatusType}>) => void;
  bulkUpdateAytSubjects: (updates: Array<{index: number; status: import('../../types').SubjectStatusType}>) => void;
  
  addLog: (log: DailyLog) => void;
  removeLog: (id: string) => void;
  updateLog: (id: string, updates: Partial<DailyLog>) => void;
  
  addExam: (exam: ExamResult) => void;
  removeExam: (id: string) => void;
  updateExam: (id: string, updates: Partial<ExamResult>) => void;
  
  addFailedQuestion: (input: Omit<FailedQuestion, 'status' | 'solveCount' | 'difficulty'> & { difficulty?: FailedQuestion['difficulty'] }) => void;
  solveFailedQuestion: (id: string) => void;
  removeFailedQuestion: (id: string) => void;

  addAgendaEntry: (entry: AgendaEntry) => void;
  updateAgendaEntry: (id: string, updates: Partial<AgendaEntry>) => void;
  removeAgendaEntry: (id: string) => void;
  addFocusSession: (record: FocusSessionRecord) => void;
  addFlashcard: (card: Flashcard) => void;
  updateFlashcard: (id: string, updates: Partial<Flashcard>) => void;
  removeFlashcard: (id: string) => void;
}

export const createAcademicSlice: StateCreator<AppState, [], [], AcademicSlice> = (set, get) => ({
  tytSubjects: [],
  aytSubjects: [],
  logs: [],
  exams: [],
  failedQuestions: [],
  agendaEntries: [],
  focusSessions: [],
  flashcards: [],

  updateTytSubject: (index, updates) => {
    const { authUser, tytSubjects, aytSubjects, trophies, eloScore, lastEloUpdateDate, dailyEloDelta } = get();
    const newSubs = [...tytSubjects];
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

    const masteredCount = [...newSubs, ...aytSubjects].filter(s => s.status === 'mastered').length;
    const newTrophies = trophies.map(t => {
      if (t.id === 'master_10' && masteredCount >= 10 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
      if (t.id === 'master_50' && masteredCount >= 50 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
      return t;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const newDailyDelta = lastEloUpdateDate !== todayStr ? eloDelta : dailyEloDelta + eloDelta;
    const newElo = Math.max(0, eloScore + eloDelta);

    set({ 
      tytSubjects: newSubs, 
      eloScore: newElo, 
      trophies: newTrophies, 
      dailyEloDelta: newDailyDelta, 
      lastEloUpdateDate: todayStr, 
      lastLocalUpdateAt: new Date().toISOString() 
    });
    
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ tytSubjects: newSubs, trophies: newTrophies, eloScore: newElo }), { merge: true }).catch(console.error);
    }
  },

  updateAytSubject: (originalIndex, updates) => {
    const { authUser, tytSubjects, aytSubjects, trophies, eloScore, lastEloUpdateDate, dailyEloDelta } = get();
    const newSubs = [...aytSubjects];
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

    const masteredCount = [...tytSubjects, ...newSubs].filter(s => s.status === 'mastered').length;
    const newTrophies = trophies.map(t => {
      if (t.id === 'master_10' && masteredCount >= 10 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
      if (t.id === 'master_50' && masteredCount >= 50 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
      return t;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const newDailyDelta = lastEloUpdateDate !== todayStr ? eloDelta : dailyEloDelta + eloDelta;
    const newElo = Math.max(0, eloScore + eloDelta);

    set({ 
      aytSubjects: newSubs, 
      eloScore: newElo, 
      trophies: newTrophies, 
      dailyEloDelta: newDailyDelta, 
      lastEloUpdateDate: todayStr, 
      lastLocalUpdateAt: new Date().toISOString() 
    });
    
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ aytSubjects: newSubs, trophies: newTrophies, eloScore: newElo }), { merge: true }).catch(console.error);
    }
  },

  // TODO-038: Bulk update fix
  bulkUpdateTytSubjects: (updates) => {
    const { authUser, tytSubjects } = get();
    const newSubs = [...tytSubjects];
    updates.forEach(({ index, status }) => {
      if (newSubs[index]) newSubs[index].status = status;
    });
    set({ tytSubjects: newSubs, lastLocalUpdateAt: new Date().toISOString() });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ tytSubjects: newSubs }), { merge: true }).catch(console.error);
    }
  },

  bulkUpdateAytSubjects: (updates) => {
    const { authUser, aytSubjects } = get();
    const newSubs = [...aytSubjects];
    updates.forEach(({ index, status }) => {
      if (newSubs[index]) newSubs[index].status = status;
    });
    set({ aytSubjects: newSubs, lastLocalUpdateAt: new Date().toISOString() });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ aytSubjects: newSubs }), { merge: true }).catch(console.error);
    }
  },

  addLog: (log) => {
    const { authUser, logs, eloScore, lastEloUpdateDate, dailyEloDelta, streakDays, trophies, activeAlerts, detectAndSetHabits } = get();
    const logWithId: DailyLog = {
      ...log,
      id: log.id ?? `log_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    };
    const newLogs = [...logs, logWithId].slice(-500);
    const todayStr = toISODateOnly();
    const hasLoggedToday = logs.some((l) => {
      const ms = toDateMs(l.date);
      return ms ? toISODateOnly(new Date(ms)) === todayStr : false;
    });
    const newStreak = hasLoggedToday ? streakDays : streakDays + 1;
    
    let K = 30; 
    if (eloScore >= 15000) K = 10;
    else if (eloScore >= 7000) K = 15;
    else if (eloScore >= 2500) K = 20;

    const expectedNet = (log.questions || 1) * 0.60;
    const actualNet = log.correct - (log.wrong * 0.25);
    const netDiff = Math.max(-50, Math.min(50, actualNet - expectedNet)); 
    const eloDelta = Math.round(K * netDiff);
    
    const newDailyDelta = (lastEloUpdateDate !== todayStr ? 0 : dailyEloDelta) + eloDelta;
    const newEloScore = Math.max(0, eloScore + eloDelta);

    const accuracy = log.correct / (log.questions || 1);
    const last3 = newLogs.slice(-3);
    const last3Good = last3.length === 3 && last3.every(l => (l.correct / (l.questions || 1)) >= 0.8);

    const newTrophies = trophies.map(t => {
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

    set({ 
      logs: newLogs, 
      streakDays: newStreak, 
      eloScore: newEloScore, 
      dailyEloDelta: newDailyDelta, 
      lastEloUpdateDate: todayStr, 
      trophies: newTrophies, 
      lastLocalUpdateAt: new Date().toISOString() 
    });
    
    detectAndSetHabits();

    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid, 'logs', logWithId.id), cleanForFirestore(logWithId)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ logs: newLogs, streakDays: newStreak, trophies: newTrophies, eloScore: newEloScore }), { merge: true }).catch(console.error);
    }
  },

  removeLog: (id) => {
    const { authUser, logs, detectAndSetHabits } = get();
    const newLogs = logs.filter(l => l.id !== id);
    set({ logs: newLogs, lastLocalUpdateAt: new Date().toISOString() });
    if (authUser?.uid) {
      deleteDoc(doc(db, 'users', authUser.uid, 'logs', id)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ logs: newLogs }), { merge: true }).catch(console.error);
    }
    detectAndSetHabits();
  },

  updateLog: (id, updates) => {
    const { authUser, logs, detectAndSetHabits } = get();
    const newLogs = logs.map(l => l.id === id ? { ...l, ...updates } : l);
    set({ logs: newLogs, lastLocalUpdateAt: new Date().toISOString() });
    if (authUser?.uid) {
      const updated = newLogs.find(l => l.id === id);
      if (updated) setDoc(doc(db, 'users', authUser.uid, 'logs', id), cleanForFirestore(updated)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ logs: newLogs }), { merge: true }).catch(console.error);
    }
    detectAndSetHabits();
  },

  addExam: (exam) => {
    const { authUser, exams, eloScore, lastEloUpdateDate, dailyEloDelta, profile, trophies } = get();
    const todayStr = toISODateOnly();
    const safeTotalNet = !isFinite(exam.totalNet) || isNaN(exam.totalNet) ? 0 : exam.totalNet;
    const normalizedExam = { ...exam, totalNet: safeTotalNet };

    let eloDelta = 100;
    if (profile) {
      const target = normalizedExam.type === 'TYT' ? profile.tytTarget : profile.aytTarget;
      if (normalizedExam.totalNet >= target) eloDelta += 150;
      else if (normalizedExam.totalNet < target * 0.5) eloDelta -= 50;
    }

    const newDailyDelta = (lastEloUpdateDate !== todayStr ? 0 : dailyEloDelta) + eloDelta;
    const newEloScore = Math.max(0, eloScore + eloDelta);
    const existingIndex = exams.findIndex((item) => item.id === normalizedExam.id);
    const newExams = existingIndex >= 0
      ? exams.map((item, index) => index === existingIndex ? normalizedExam : item).slice(-200)
      : [...exams, normalizedExam].slice(-200);

    const newTrophies = trophies.map(t => {
      if (t.id === 'first_blood' && newExams.length >= 1 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
      if (t.id === 'exam_target_hit' && profile) {
        const target = normalizedExam.type === 'TYT' ? profile.tytTarget : profile.aytTarget;
        if (normalizedExam.totalNet >= target && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
      }
      return t;
    });

    set({ 
      exams: newExams, 
      eloScore: newEloScore, 
      dailyEloDelta: newDailyDelta, 
      lastEloUpdateDate: todayStr, 
      trophies: newTrophies, 
      lastLocalUpdateAt: new Date().toISOString() 
    });
    
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid, 'exams', normalizedExam.id), cleanForFirestore(normalizedExam)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ exams: newExams, trophies: newTrophies, eloScore: newEloScore }), { merge: true }).catch(console.error);
    }
  },

  removeExam: (id) => {
    const { authUser, exams } = get();
    const newExams = exams.filter(e => e.id !== id);
    set({ exams: newExams, lastLocalUpdateAt: new Date().toISOString() });
    if (authUser?.uid) {
      deleteDoc(doc(db, 'users', authUser.uid, 'exams', id)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ exams: newExams }), { merge: true }).catch(console.error);
    }
  },

  updateExam: (id, updates) => {
    const { authUser, exams } = get();
    const newExams = exams.map(e => e.id === id ? { ...e, ...updates } : e);
    set({ exams: newExams, lastLocalUpdateAt: new Date().toISOString() });
    if (authUser?.uid) {
      const updated = newExams.find(e => e.id === id);
      if (updated) setDoc(doc(db, 'users', authUser.uid, 'exams', id), cleanForFirestore(updated)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ exams: newExams }), { merge: true }).catch(console.error);
    }
  },

  addFailedQuestion: (input) => {
    const { authUser, failedQuestions } = get();
    const newQ: FailedQuestion = {
      ...input,
      id: input.id || `fail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'active',
      solveCount: 0,
      difficulty: input.difficulty || 'medium'
    };
    const newList = [...failedQuestions, newQ];
    set({ failedQuestions: newList });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid, 'failedQuestions', newQ.id), cleanForFirestore(newQ)).catch(console.error);
    }
  },

  solveFailedQuestion: (id) => {
    const { authUser, failedQuestions, addElo } = get();
    const newList = failedQuestions.map(q => 
      q.id === id ? { ...q, status: 'solved' as const, solveCount: q.solveCount + 1 } : q
    );
    set({ failedQuestions: newList });
    if (authUser?.uid) {
      const updated = newList.find(q => q.id === id);
      if (updated) setDoc(doc(db, 'users', authUser.uid, 'failedQuestions', id), cleanForFirestore(updated)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ failedQuestions: newList }), { merge: true }).catch(console.error);
    }
    addElo(15);
  },

  removeFailedQuestion: (id) => {
    const { authUser, failedQuestions } = get();
    const newList = failedQuestions.filter(q => q.id !== id);
    set({ failedQuestions: newList });
    if (authUser?.uid) {
      deleteDoc(doc(db, 'users', authUser.uid, 'failedQuestions', id)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ failedQuestions: newList }), { merge: true }).catch(console.error);
    }
  },

  addAgendaEntry: (entry) => {
    const { authUser, agendaEntries } = get();
    const newEntries = [...agendaEntries, entry];
    set({ agendaEntries: newEntries });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid, 'agendaEntries', entry.id), cleanForFirestore(entry)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ agendaEntries: newEntries }), { merge: true }).catch(console.error);
    }
  },

  updateAgendaEntry: (id, updates) => {
    const { authUser, agendaEntries } = get();
    const newEntries = agendaEntries.map(e => e.id === id ? { ...e, ...updates } : e);
    set({ agendaEntries: newEntries });
    if (authUser?.uid) {
      const updated = newEntries.find(e => e.id === id);
      if (updated) setDoc(doc(db, 'users', authUser.uid, 'agendaEntries', id), cleanForFirestore(updated)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ agendaEntries: newEntries }), { merge: true }).catch(console.error);
    }
  },

  removeAgendaEntry: (id) => {
    const { authUser, agendaEntries } = get();
    const newEntries = agendaEntries.filter(e => e.id !== id);
    set({ agendaEntries: newEntries });
    if (authUser?.uid) {
      deleteDoc(doc(db, 'users', authUser.uid, 'agendaEntries', id)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ agendaEntries: newEntries }), { merge: true }).catch(console.error);
    }
  },

  addFocusSession: (record) => {
    const { authUser, focusSessions } = get();
    const newSessions = [...focusSessions, record];
    set({ focusSessions: newSessions });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid, 'focusSessions', record.id), cleanForFirestore(record)).catch(console.error);
    }
  },

  addFlashcard: (card) => {
    const { authUser, flashcards } = get();
    const newList = [...flashcards, card];
    set({ flashcards: newList });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid, 'flashcards', card.id), cleanForFirestore(card)).catch(console.error);
    }
  },

  updateFlashcard: (id, updates) => {
    const { authUser, flashcards } = get();
    const newList = flashcards.map(c => c.id === id ? { ...c, ...updates } : c);
    set({ flashcards: newList });
    if (authUser?.uid) {
      const updated = newList.find(c => c.id === id);
      if (updated) setDoc(doc(db, 'users', authUser.uid, 'flashcards', id), cleanForFirestore(updated)).catch(console.error);
    }
  },

  removeFlashcard: (id) => {
    const { authUser, flashcards } = get();
    const newList = flashcards.filter(c => c.id !== id);
    set({ flashcards: newList });
    if (authUser?.uid) {
      deleteDoc(doc(db, 'users', authUser.uid, 'flashcards', id)).catch(console.error);
    }
  },
});
