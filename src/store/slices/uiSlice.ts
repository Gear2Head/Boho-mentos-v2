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
  ambienceType: 'none' | 'white' | 'pink' | 'brown';
  ambienceVolume: number;
  isZenMode: boolean;
  isTtsEnabled: boolean;
  lastVoiceSentiment: 'stressed' | 'confident' | 'neutral';
  
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
  setAmbienceType: (type: 'none' | 'white' | 'pink' | 'brown') => void;
  setAmbienceVolume: (volume: number) => void;
  setZenMode: (isZen: boolean) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setLastVoiceSentiment: (s: 'stressed' | 'confident' | 'neutral') => void;
  setAmbienceBySubject: (subject: string) => void;

  setActiveTab: (tab: string) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setExamModalOpen: (open: boolean) => void;
  setLogWidgetOpen: (open: boolean) => void;
  setArchiveWidgetOpen: (open: boolean) => void;
  setEditingProfile: (open: boolean) => void;
  setNotifOpen: (open: boolean) => void;
  setAdminPanelOpen: (open: boolean) => void;
  
  // Ambient Context Color
  ambientColor: string;
  setAmbientColor: (color: string) => void;
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
  ambienceType: 'none',
  ambienceVolume: 0.3,
  isZenMode: false,
  isTtsEnabled: false,
  lastVoiceSentiment: 'neutral' as const,

  activeTab: 'dashboard',
  isMobileMenuOpen: false,
  isExamModalOpen: false,
  isLogWidgetOpen: false,
  isArchiveWidgetOpen: false,
  isEditingProfile: false,
  isNotifOpen: false,
  isAdminPanelOpen: false,
  ambientColor: 'transparent',

  setPassiveMode: (isPassive) => {
    set({ isPassiveMode: isPassive });
    if (get().authUser?.uid) {
      setDoc(doc(db, 'users', get().authUser!.uid), cleanForFirestore({ isPassiveMode: isPassive }), { merge: true }).catch(console.error);
    }
  },

  setAmbientColor: (color) => set({ ambientColor: color }),
  
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
  setAmbienceType: (type) => set({ ambienceType: type }),
  setAmbienceVolume: (volume) => set({ ambienceVolume: volume }),
  setZenMode: (isZen) => set({ isZenMode: isZen }),
  setTtsEnabled: (enabled) => set({ isTtsEnabled: enabled }),
  setLastVoiceSentiment: (s) => set({ lastVoiceSentiment: s }),
  setAmbienceBySubject: (subject) => {
    const lower = subject.toLowerCase();
    // Matematik → brown noise (focus), Fen → white noise (sharp), Edebiyat/Tarih → pink noise (calm)
    let type: 'none' | 'white' | 'pink' | 'brown' = 'none';
    if (lower.includes('matematik') || lower.includes('fizik') || lower.includes('kimya') || lower.includes('biyoloji')) {
      type = 'brown';
    } else if (lower.includes('edebiyat') || lower.includes('tarih') || lower.includes('coğrafya') || lower.includes('felsefe')) {
      type = 'pink';
    } else if (lower.includes('türkçe') || lower.includes('tyt')) {
      type = 'white';
    }
    if (type !== 'none') set({ ambienceType: type });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setMobileMenuOpen: (o) => set({ isMobileMenuOpen: o }),
  setExamModalOpen: (o) => set({ isExamModalOpen: o }),
  setLogWidgetOpen: (o) => set({ isLogWidgetOpen: o }),
  setArchiveWidgetOpen: (o) => set({ isArchiveWidgetOpen: o }),
  setEditingProfile: (o) => set({ isEditingProfile: o }),
  setNotifOpen: (o) => set({ isNotifOpen: o }),
  setAdminPanelOpen: (o) => set({ isAdminPanelOpen: o }),
});
