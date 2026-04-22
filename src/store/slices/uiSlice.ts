import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { QASession } from '../../types';
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

export interface UISlice {
  isPassiveMode: boolean;
  isLofiEnabled: boolean;
  isMorningBlockerEnabled: boolean;
  morningUnlockedDate: string;
  isFocusSidePanelOpen: boolean;
  isSpotifyWidgetOpen: boolean;
  drawingMode: 'pointer' | 'pen' | 'eraser';
  qaSession: QASession | null;
  hasHydrated: boolean;
  isSyncing: boolean;

  setPassiveMode: (isPassive: boolean) => void;
  setLofiEnabled: (enabled: boolean) => void;
  setMorningBlockerEnabled: (enabled: boolean) => void;
  setMorningUnlockedDate: (date: string) => void;
  setFocusSidePanelOpen: (isOpen: boolean) => void;
  setSpotifyWidgetOpen: (open: boolean) => void;
  setDrawingMode: (mode: 'pointer' | 'pen' | 'eraser') => void;
  setQaSession: (session: QASession | null) => void;
  updateQaAnswer: (questionIndex: number, answer: string) => void;
  setHasHydrated: (val: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set, get) => ({
  isPassiveMode: false,
  isLofiEnabled: false,
  isMorningBlockerEnabled: true,
  morningUnlockedDate: '',
  isFocusSidePanelOpen: false,
  isSpotifyWidgetOpen: true,
  drawingMode: 'pen',
  qaSession: null,
  hasHydrated: false,
  isSyncing: false,

  setPassiveMode: (isPassive) => {
    const { authUser } = get();
    set({ isPassiveMode: isPassive });
    if (authUser?.uid) setDoc(doc(db, 'users', authUser.uid), { isPassiveMode: isPassive }, { merge: true }).catch(console.error);
  },

  setLofiEnabled: (enabled) => {
    const { authUser } = get();
    set({ isLofiEnabled: enabled });
    if (authUser?.uid) setDoc(doc(db, 'users', authUser.uid), { isLofiEnabled: enabled }, { merge: true }).catch(console.error);
  },

  setMorningBlockerEnabled: (enabled) => {
    const { authUser } = get();
    set({ isMorningBlockerEnabled: enabled });
    if (authUser?.uid) setDoc(doc(db, 'users', authUser.uid), { isMorningBlockerEnabled: enabled }, { merge: true }).catch(console.error);
  },

  setMorningUnlockedDate: (date) => set({ morningUnlockedDate: date }),
  setFocusSidePanelOpen: (isOpen) => set({ isFocusSidePanelOpen: isOpen }),
  setSpotifyWidgetOpen: (open) => set({ isSpotifyWidgetOpen: open }),
  setDrawingMode: (mode) => set({ drawingMode: mode }),
  setQaSession: (session) => set({ qaSession: session }),
  updateQaAnswer: (idx, ans) => set((s) => s.qaSession ? ({
    qaSession: { ...s.qaSession, answers: { ...s.qaSession.answers, [idx]: ans } }
  }) : s),
  setHasHydrated: (val) => set({ hasHydrated: val }),
  setSyncing: (isSyncing) => set({ isSyncing }),
});
