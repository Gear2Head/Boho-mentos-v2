import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { QASession } from '../../types';
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { cleanForFirestore } from "../../utils/firebaseHelpers";

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
  
  // Refactored from App.tsx (Faz 3)
  activeTab: string;
  isMobileMenuOpen: boolean;
  isExamModalOpen: boolean;
  isLogWidgetOpen: boolean;
  isArchiveWidgetOpen: boolean;
  isEditingProfile: boolean;
  isNotifOpen: boolean;
  isAdminPanelOpen: boolean;

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

  setActiveTab: (tab: string) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setExamModalOpen: (open: boolean) => void;
  setLogWidgetOpen: (open: boolean) => void;
  setArchiveWidgetOpen: (open: boolean) => void;
  setEditingProfile: (open: boolean) => void;
  setNotifOpen: (open: boolean) => void;
  setAdminPanelOpen: (open: boolean) => void;
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

  activeTab: 'dashboard',
  isMobileMenuOpen: false,
  isExamModalOpen: false,
  isLogWidgetOpen: false,
  isArchiveWidgetOpen: false,
  isEditingProfile: false,
  isNotifOpen: false,
  isAdminPanelOpen: false,

  setPassiveMode: (isPassive) => {
    const { authUser } = get();
    set({ isPassiveMode: isPassive });
    if (authUser?.uid) setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ isPassiveMode: isPassive }), { merge: true }).catch(console.error);
  },

  setLofiEnabled: (enabled) => {
    const { authUser } = get();
    set({ isLofiEnabled: enabled });
    if (authUser?.uid) setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ isLofiEnabled: enabled }), { merge: true }).catch(console.error);
  },

  setMorningBlockerEnabled: (enabled) => {
    const { authUser } = get();
    set({ isMorningBlockerEnabled: enabled });
    if (authUser?.uid) setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ isMorningBlockerEnabled: enabled }), { merge: true }).catch(console.error);
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

  setActiveTab: (tab) => set({ activeTab: tab }),
  setMobileMenuOpen: (o) => set({ isMobileMenuOpen: o }),
  setExamModalOpen: (o) => set({ isExamModalOpen: o }),
  setLogWidgetOpen: (o) => set({ isLogWidgetOpen: o }),
  setArchiveWidgetOpen: (o) => set({ isArchiveWidgetOpen: o }),
  setEditingProfile: (o) => set({ isEditingProfile: o }),
  setNotifOpen: (o) => set({ isNotifOpen: o }),
  setAdminPanelOpen: (o) => set({ isAdminPanelOpen: o }),
});
