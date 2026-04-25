import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { CoachDirective, DirectiveRecord, CoachMemory } from '../../types/coach';
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { triggerConfetti } from '../../utils/confetti';

export interface CoachSlice {
  lastCoachDirective: CoachDirective | null;
  directiveHistory: DirectiveRecord[];
  coachMemory: CoachMemory | null;

  setLastCoachDirective: (directive: CoachDirective | null) => void;
  completeCoachTask: (recordId: string, taskIndex: number) => void;
  deferCoachTask: (recordId: string, taskIndex: number, reason?: string) => void;
  failCoachTask: (recordId: string, taskIndex: number, reason?: string) => void;
  startRecoveryFlow: () => void;
  generateStrategyPlan: () => void;
  analyzeUserData: () => string;
}

export const createCoachSlice: StateCreator<AppState, [], [], CoachSlice> = (set, get) => ({
  lastCoachDirective: null,
  directiveHistory: [],
  coachMemory: null,

  setLastCoachDirective: (directive) => set({ lastCoachDirective: directive }),

  completeCoachTask: (recordId, index) => {
    const { directiveHistory, eloScore, authUser, coachMemory } = get();
    const record = directiveHistory.find(r => r.id === recordId);
    if (!record || !record.directive.tasks[index]) return;

    const task = record.directive.tasks[index];
    import('../../services/directiveHistory').then(m => {
      const nr = m.completeTask(record, index);
      const newHistory = m.updateInHistory(directiveHistory, nr);
      const newMemory = m.updateCoachMemory(newHistory, coachMemory);
      
      const bonus = task.priority === 'high' ? 40 : 25;
      const newElo = Math.min(eloScore + bonus, 20000); // Max ELO increased for scaling

      // Confetti effect for task completion
      triggerConfetti();

      set({ directiveHistory: newHistory, eloScore: newElo, coachMemory: newMemory });
      if (authUser?.uid) {
        setDoc(doc(db, 'users', authUser.uid, 'directiveHistory', nr.id), nr).catch(console.error);
        setDoc(doc(db, 'users', authUser.uid), { eloScore: newElo, coachMemory: newMemory }, { merge: true }).catch(console.error);
      }
    });
  },

  deferCoachTask: (recordId, index, reason) => {
    const { directiveHistory, eloScore, authUser, coachMemory } = get();
    const record = directiveHistory.find(r => r.id === recordId);
    if (!record) return;

    import('../../services/directiveHistory').then(m => {
      const nr = m.skipTask(record, index, reason);
      const newHistory = m.updateInHistory(directiveHistory, nr);
      const newMemory = m.updateCoachMemory(newHistory, coachMemory);
      const newElo = Math.max(eloScore - 5, 0);

      set({ directiveHistory: newHistory, eloScore: newElo, coachMemory: newMemory });
      if (authUser?.uid) {
        setDoc(doc(db, 'users', authUser.uid, 'directiveHistory', nr.id), nr).catch(console.error);
        setDoc(doc(db, 'users', authUser.uid), { eloScore: newElo, coachMemory: newMemory }, { merge: true }).catch(console.error);
      }
    });
  },

  failCoachTask: (recordId, index, reason) => {
    const { directiveHistory, eloScore, authUser, coachMemory } = get();
    const record = directiveHistory.find(r => r.id === recordId);
    if (!record) return;

    import('../../services/directiveHistory').then(m => {
      const nr = m.failTask(record, index, (reason as any) || 'other');
      const newHistory = m.updateInHistory(directiveHistory, nr);
      const newMemory = m.updateCoachMemory(newHistory, coachMemory);
      const newElo = Math.max(eloScore - 15, 0);

      set({ directiveHistory: newHistory, eloScore: newElo, coachMemory: newMemory });
      if (authUser?.uid) {
        setDoc(doc(db, 'users', authUser.uid, 'directiveHistory', nr.id), nr).catch(console.error);
        setDoc(doc(db, 'users', authUser.uid), { eloScore: newElo, coachMemory: newMemory }, { merge: true }).catch(console.error);
      }
    });
  },

  startRecoveryFlow: () => {
    const { directiveHistory } = get();
    import('../../services/directiveHistory').then(m => {
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
        taskStatus: recTasks.map(() => 'pending' as const)
      };
      // Note: We need to push this to storage via setLastCoachDirective elsewhere or here
      set({ lastCoachDirective: (newRecord.directive as any) });
    });
  },

  generateStrategyPlan: () => {
    console.log('[Strategy] Generating weekly plan...');
    // Real implementation would call Gemini
  },

  analyzeUserData: () => {
    const state = get();
    const tytTarget = state.profile?.tytTarget || 0;
    const aytTarget = state.profile?.aytTarget || 0;
    const lastLogs = state.logs.slice(-10).map(l => `${l.subject}: %${Math.round((l.correct / (l.questions || 1)) * 100)}`).join(' | ');
    return `HEDEF: ${state.profile?.targetUniversity}. TYT: ${tytTarget}, AYT: ${aytTarget}. ELO: ${state.eloScore}. LOGLAR: ${lastLogs}`;
  },
});
