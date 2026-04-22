import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { WarRoomMode, WarRoomSession } from '../../types';
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

export interface WarRoomSlice {
  warRoomMode: WarRoomMode;
  warRoomSession: WarRoomSession | null;
  lastWarRoomSummary: { examType: string; score: number; completedAt: string; status: 'completed' | 'quit' } | null;
  warRoomAnswers: Record<string, string>;
  warRoomEliminated: Record<string, number[]>;
  warRoomTimeLeft: number;

  setWarRoomMode: (mode: WarRoomMode) => void;
  setWarRoomSession: (session: WarRoomSession | null) => void;
  setLastWarRoomSummary: (summary: { examType: string; score: number; completedAt: string; status: 'completed' | 'quit' } | null) => void;
  setWarRoomTimeLeft: (time: number | ((prev: number) => number)) => void;
  setSelectedAnswer: (questionId: string, answer: string) => void;
  toggleEliminatedOption: (questionId: string, optionIndex: number) => void;
  updateWarRoomAnswer: (questionId: string, answer: string) => void;
}

export const createWarRoomSlice: StateCreator<AppState, [], [], WarRoomSlice> = (set, get) => ({
  warRoomMode: 'setup',
  warRoomSession: null,
  lastWarRoomSummary: null,
  warRoomAnswers: {},
  warRoomEliminated: {},
  warRoomTimeLeft: 0,

  setWarRoomMode: (mode) => set({ warRoomMode: mode }),

  setWarRoomSession: (session) => set({
    warRoomSession: session,
    warRoomAnswers: {},
    warRoomEliminated: {},
    warRoomTimeLeft: 0,
  }),

  setLastWarRoomSummary: (summary) => {
    const { authUser } = get();
    set({ lastWarRoomSummary: summary });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), { lastWarRoomSummary: summary }, { merge: true }).catch(console.error);
    }
  },

  setWarRoomTimeLeft: (time) => set((s) => ({
    warRoomTimeLeft: typeof time === 'function' ? (time as any)(s.warRoomTimeLeft) : time,
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
});
