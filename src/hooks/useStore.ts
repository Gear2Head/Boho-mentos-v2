import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';

export const useProfile = () => useAppStore(useShallow(s => s.profile));
export const useAuthUser = () => useAppStore(useShallow(s => s.authUser));
export const useAcademicData = () => useAppStore(useShallow(s => ({
  logs: s.logs,
  exams: s.exams,
  tytSubjects: s.tytSubjects,
  aytSubjects: s.aytSubjects,
  eloScore: s.eloScore,
  streakDays: s.streakDays
})));
export const useSocialData = () => useAppStore(useShallow(s => ({
  notifications: s.notifications,
  conversations: s.conversations,
  activeConversationId: s.activeConversationId
})));
export const useUIState = () => useAppStore(useShallow(s => ({
  theme: s.theme,
  isZenMode: s.isZenMode,
  isSyncing: s.isSyncing,
  ambienceType: s.ambienceType,
  ambienceVolume: s.ambienceVolume
})));
export const useActions = () => useAppStore(useShallow(s => ({
  addLog: s.addLog,
  addExam: s.addExam,
  setProfile: s.setProfile,
  setZenMode: s.setZenMode,
  signOut: s.signOut
})));
