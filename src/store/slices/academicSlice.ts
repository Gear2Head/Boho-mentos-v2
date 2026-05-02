import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { DailyLog, ExamResult, FailedQuestion, SubjectStatus, AgendaEntry, FocusSessionRecord } from '../../types';
import { Flashcard } from '../../types/coach';
import { toISODateOnly } from '../../utils/date';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { cleanForFirestore } from "../../utils/firebaseHelpers";
import { calculateBaseElo } from "../../utils/eloRecomputator";
import { filterInvalidEloAchievementIds, sumAchievementRewards } from "../../data/achievementDefinitions";

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
  recomputeFullElo: () => void;
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
    const { authUser, tytSubjects, aytSubjects, trophies, lastEloUpdateDate, dailyEloDelta, addElo } = get();
    const newSubs = [...tytSubjects];
    const oldStatus = newSubs[index].status;
    newSubs[index] = { ...newSubs[index], ...updates };
    
    let eloDelta = 0;
    if (updates.status && updates.status !== oldStatus) {
      if (updates.status === 'in-progress' && oldStatus === 'not-started') eloDelta = 40;
      else if (updates.status === 'mastered' && oldStatus === 'in-progress') eloDelta = 110;
      else if (updates.status === 'mastered' && oldStatus === 'not-started') eloDelta = 150;
      else if (updates.status === 'not-started' && oldStatus === 'mastered') eloDelta = -150;
      else if (updates.status === 'in-progress' && oldStatus === 'mastered') eloDelta = -110;
      else if (updates.status === 'not-started' && oldStatus === 'in-progress') eloDelta = -40;
    }

    const masteredCount = [...newSubs, ...aytSubjects].filter(s => s.status === 'mastered').length;
    const newTrophies = trophies.map(t => {
      if (t.id === 'master_10' && masteredCount >= 10 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
      if (t.id === 'master_50' && masteredCount >= 50 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
      return t;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const newDailyDelta = lastEloUpdateDate !== todayStr ? eloDelta : dailyEloDelta + eloDelta;
    set({ 
      tytSubjects: newSubs, 
      trophies: newTrophies, 
      dailyEloDelta: newDailyDelta, 
      lastEloUpdateDate: todayStr, 
      lastLocalUpdateAt: new Date().toISOString() 
    });
    if (eloDelta !== 0) addElo(eloDelta, 'tyt_subject_status', `tyt:${index}:${oldStatus}->${updates.status}:${todayStr}`);
    
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ tytSubjects: newSubs, trophies: newTrophies }), { merge: true }).catch(console.error);
    }
  },

  updateAytSubject: (originalIndex, updates) => {
    const { authUser, tytSubjects, aytSubjects, trophies, lastEloUpdateDate, dailyEloDelta, addElo } = get();
    const newSubs = [...aytSubjects];
    const oldStatus = newSubs[originalIndex].status;
    newSubs[originalIndex] = { ...newSubs[originalIndex], ...updates };
    
    let eloDelta = 0;
    if (updates.status && updates.status !== oldStatus) {
      if (updates.status === 'in-progress' && oldStatus === 'not-started') eloDelta = 60;
      else if (updates.status === 'mastered' && oldStatus === 'in-progress') eloDelta = 160;
      else if (updates.status === 'mastered' && oldStatus === 'not-started') eloDelta = 220;
      else if (updates.status === 'not-started' && oldStatus === 'mastered') eloDelta = -220;
      else if (updates.status === 'in-progress' && oldStatus === 'mastered') eloDelta = -160;
      else if (updates.status === 'not-started' && oldStatus === 'in-progress') eloDelta = -60;
    }

    const masteredCount = [...tytSubjects, ...newSubs].filter(s => s.status === 'mastered').length;
    const newTrophies = trophies.map(t => {
      if (t.id === 'master_10' && masteredCount >= 10 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
      if (t.id === 'master_50' && masteredCount >= 50 && !t.unlockedAt) return { ...t, unlockedAt: new Date().toISOString() };
      return t;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const newDailyDelta = lastEloUpdateDate !== todayStr ? eloDelta : dailyEloDelta + eloDelta;
    set({ 
      aytSubjects: newSubs, 
      trophies: newTrophies, 
      dailyEloDelta: newDailyDelta, 
      lastEloUpdateDate: todayStr, 
      lastLocalUpdateAt: new Date().toISOString() 
    });
    if (eloDelta !== 0) addElo(eloDelta, 'ayt_subject_status', `ayt:${originalIndex}:${oldStatus}->${updates.status}:${todayStr}`);
    
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ aytSubjects: newSubs, trophies: newTrophies }), { merge: true }).catch(console.error);
    }
  },

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
    const { authUser, logs, eloScore, lastEloUpdateDate, dailyEloDelta, detectAndSetHabits, addElo, recomputeStreak } = get();
    const logWithId: DailyLog = {
      ...log,
      id: log.id ?? `log_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      createdAt: log.createdAt ?? new Date().toISOString(),
      source: log.source ?? 'manual',
    };
    const newLogs = [...logs, logWithId].slice(-500);
    const todayStr = toISODateOnly();
    
    let K = 60; 
    if (eloScore >= 50000) K = 20;
    else if (eloScore >= 20000) K = 35;
    else if (eloScore >= 7000) K = 45;

    let eloDelta = 0;
    if (log.questions && log.questions > 0) {
      const expectedNet = log.questions * 0.60;
      const actualNet = log.correct - (log.wrong * 0.25);
      const netDiff = Math.max(-50, Math.min(50, actualNet - expectedNet)); 
      eloDelta = Math.round(K * netDiff);
    } else {
      // 0 soruluk bir konu çalışmasıysa, süreye göre ufak bir ELO puanı ver
      eloDelta = Math.round(Math.min(log.avgTime || 0, 120) * 0.5);
    }
    
    const newDailyDelta = (lastEloUpdateDate !== todayStr ? 0 : dailyEloDelta) + eloDelta;

    set({ 
      logs: newLogs, 
      dailyEloDelta: newDailyDelta, 
      lastEloUpdateDate: todayStr, 
      lastLocalUpdateAt: new Date().toISOString() 
    });
    if (eloDelta !== 0) addElo(eloDelta, 'study_log', `log:${logWithId.id}:elo`);
    const newStreak = recomputeStreak(true);
    
    detectAndSetHabits();

    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid, 'logs', logWithId.id), cleanForFirestore(logWithId)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ logs: newLogs, streakDays: newStreak }), { merge: true }).catch(console.error);
    }
  },

  removeLog: (id) => {
    const { authUser, logs, detectAndSetHabits, recomputeStreak } = get();
    const newLogs = logs.filter(l => l.id !== id);
    set({ logs: newLogs, lastLocalUpdateAt: new Date().toISOString() });
    const newStreak = recomputeStreak(false);
    if (authUser?.uid) {
      deleteDoc(doc(db, 'users', authUser.uid, 'logs', id)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ logs: newLogs, streakDays: newStreak }), { merge: true }).catch(console.error);
    }
    detectAndSetHabits();
  },

  updateLog: (id, updates) => {
    const { authUser, logs, detectAndSetHabits, recomputeStreak } = get();
    const newLogs = logs.map(l => l.id === id ? { ...l, ...updates } : l);
    set({ logs: newLogs, lastLocalUpdateAt: new Date().toISOString() });
    const newStreak = updates.date ? recomputeStreak(false) : get().streakDays;
    if (authUser?.uid) {
      const updated = newLogs.find(l => l.id === id);
      if (updated) setDoc(doc(db, 'users', authUser.uid, 'logs', id), cleanForFirestore(updated)).catch(console.error);
      if (updates.date) setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ logs: newLogs, streakDays: newStreak }), { merge: true }).catch(console.error);
    }
    detectAndSetHabits();
  },

  addExam: (exam) => {
    const { authUser, exams, lastEloUpdateDate, dailyEloDelta, profile, addElo } = get();
    const todayStr = toISODateOnly();
    const safeTotalNet = !isFinite(exam.totalNet) || isNaN(exam.totalNet) ? 0 : exam.totalNet;
    const normalizedExam = { ...exam, totalNet: safeTotalNet };

    let eloDelta = 250;
    if (profile) {
      const target = normalizedExam.type === 'TYT' ? profile.tytTarget : profile.aytTarget;
      if (normalizedExam.totalNet >= target) eloDelta += 350;
      else if (normalizedExam.totalNet < target * 0.5) eloDelta -= 100;
    }

    const newDailyDelta = (lastEloUpdateDate !== todayStr ? 0 : dailyEloDelta) + eloDelta;
    const newExams = [...exams, normalizedExam].slice(-200);

    set({ 
      exams: newExams, 
      dailyEloDelta: newDailyDelta, 
      lastEloUpdateDate: todayStr, 
      lastLocalUpdateAt: new Date().toISOString() 
    });
    addElo(eloDelta, 'exam_result', `exam:${normalizedExam.id}:elo`);
    
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid, 'exams', normalizedExam.id), cleanForFirestore(normalizedExam)).catch(console.error);
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ exams: newExams }), { merge: true }).catch(console.error);
    }
  },

  removeExam: (id) => {
    const { authUser, exams } = get();
    const newExams = exams.filter(e => e.id !== id);
    set({ exams: newExams, lastLocalUpdateAt: new Date().toISOString() });
    if (authUser?.uid) {
      deleteDoc(doc(db, 'users', authUser.uid, 'exams', id)).catch(console.error);
    }
  },

  updateExam: (id, updates) => {
    const { authUser, exams } = get();
    const newExams = exams.map(e => e.id === id ? { ...e, ...updates } : e);
    set({ exams: newExams, lastLocalUpdateAt: new Date().toISOString() });
    if (authUser?.uid) {
      const updated = newExams.find(e => e.id === id);
      if (updated) setDoc(doc(db, 'users', authUser.uid, 'exams', id), cleanForFirestore(updated)).catch(console.error);
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
    const { authUser, failedQuestions } = get();
    const newList = failedQuestions.map(q => 
      q.id === id ? { ...q, status: 'solved' as const, solveCount: q.solveCount + 1 } : q
    );
    set({ failedQuestions: newList });
    if (authUser?.uid) {
      const updated = newList.find(q => q.id === id);
      if (updated) setDoc(doc(db, 'users', authUser.uid, 'failedQuestions', id), cleanForFirestore(updated)).catch(console.error);
    }
  },

  removeFailedQuestion: (id) => {
    const { authUser, failedQuestions } = get();
    const newList = failedQuestions.filter(q => q.id !== id);
    set({ failedQuestions: newList });
    if (authUser?.uid) {
      deleteDoc(doc(db, 'users', authUser.uid, 'failedQuestions', id)).catch(console.error);
    }
  },

  addAgendaEntry: (entry) => {
    const { authUser, agendaEntries } = get();
    const newEntries = [...agendaEntries, entry];
    set({ agendaEntries: newEntries });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid, 'agendaEntries', entry.id), cleanForFirestore(entry)).catch(console.error);
    }
  },

  updateAgendaEntry: (id, updates) => {
    const { authUser, agendaEntries } = get();
    const newEntries = agendaEntries.map(e => e.id === id ? { ...e, ...updates } : e);
    set({ agendaEntries: newEntries });
    if (authUser?.uid) {
      const updated = newEntries.find(e => e.id === id);
      if (updated) setDoc(doc(db, 'users', authUser.uid, 'agendaEntries', id), cleanForFirestore(updated)).catch(console.error);
    }
  },

  removeAgendaEntry: (id) => {
    const { authUser, agendaEntries } = get();
    const newEntries = agendaEntries.filter(e => e.id !== id);
    set({ agendaEntries: newEntries });
    if (authUser?.uid) {
      deleteDoc(doc(db, 'users', authUser.uid, 'agendaEntries', id)).catch(console.error);
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

  removeFlashcard: (id: string) => {
    const { authUser, flashcards } = get();
    const newList = flashcards.filter(c => c.id !== id);
    set({ flashcards: newList });
    if (authUser?.uid) {
      deleteDoc(doc(db, 'users', authUser.uid, 'flashcards', id)).catch(console.error);
    }
  },

  recomputeFullElo: () => {
    const {
      logs, exams, profile, authUser, tytSubjects, aytSubjects,
      evaluateAllAchievements, unlockedAchievementIds, userAchievements,
      eloScore: currentElo, bohoCoins
    } = get();

    const newBaseElo = calculateBaseElo(logs, exams, (profile as any), tytSubjects, aytSubjects);
    // SAFE: Only add achievement rewards on top of base — never strip them unless admin-forced
    const validAchievementIds = filterInvalidEloAchievementIds(unlockedAchievementIds || [], newBaseElo);
    const validAchievementIdSet = new Set(validAchievementIds);
    const validUserAchievements = (userAchievements || []).filter((a) => validAchievementIdSet.has(a.id));
    const achievementBonus = sumAchievementRewards(validAchievementIds);
    const newElo = newBaseElo + achievementBonus;

    // PROTECT: Never catastrophically drop ELO — allow max -20% drop per recompute
    // This guards against buggy recomputation wiping real earned ELO
    const minAllowedElo = Math.floor(currentElo * 0.80);
    const safeNewElo = Math.max(minAllowedElo, newElo);

    // BohoCoin delta: only apply the difference, never reset balance
    const eloDiff = safeNewElo - currentElo;
    const newCoins = Math.max(0, (bohoCoins || 0) + (eloDiff * 4));

    set({
      eloScore: safeNewElo,
      bohoCoins: newCoins,
      unlockedAchievementIds: validAchievementIds,
      userAchievements: validUserAchievements,
      lastLocalUpdateAt: new Date().toISOString()
    });
    
    evaluateAllAchievements();

    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({
        eloScore: safeNewElo,
        bohoCoins: newCoins,
        unlockedAchievementIds: validAchievementIds,
        userAchievements: validUserAchievements
      }), { merge: true }).catch(console.error);
    }
  }
});
