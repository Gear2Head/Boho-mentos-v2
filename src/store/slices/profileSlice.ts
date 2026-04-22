import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { StudentProfile, Trophy, HabitAlert } from '../../types';
import { toISODateOnly } from '../../utils/date';
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { cleanForFirestore } from "../../utils/firebaseHelpers";
import { computeHealthScore, HealthScore } from "../../utils/healthScore";
import { detectHabitsFromLogs } from "../appStore";

export interface ProfileSlice {
  profile: StudentProfile | null;
  eloScore: number;
  dailyEloDelta: number;
  lastEloUpdateDate: string;
  streakDays: number;
  trophies: Trophy[];
  theme: 'light' | 'dark';
  subjectViewMode: 'list' | 'map';
  healthScore: HealthScore | null;
  activeAlerts: HabitAlert[];

  setProfile: (profile: StudentProfile | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSubjectViewMode: (mode: 'list' | 'map') => void;
  addElo: (amount: number) => void;
  unlockTrophy: (trophyId: string) => void;
  updateHealthScore: () => void;
  dismissAlert: (id: string) => void;
  detectAndSetHabits: () => void;
}

export const createProfileSlice: StateCreator<AppState, [], [], ProfileSlice> = (set, get) => ({
  profile: null,
  eloScore: 0,
  dailyEloDelta: 0,
  lastEloUpdateDate: toISODateOnly(),
  streakDays: 0,
  trophies: [],
  theme: 'dark',
  subjectViewMode: 'map',
  healthScore: null,
  activeAlerts: [],

  setProfile: (profile) => {
    const { authUser } = get();
    if (profile && profile.motivationQuote === undefined) {
      profile.motivationQuote = null;
    }
    set({ profile });
    if (authUser?.uid && profile) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ profile }), { merge: true }).catch(console.error);
    }
    get().updateHealthScore();
  },

  setTheme: (theme) => {
    const { authUser } = get();
    set({ theme });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), { theme }, { merge: true }).catch(console.error);
    }
  },

  setSubjectViewMode: (mode) => {
    const { authUser } = get();
    set({ subjectViewMode: mode });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), { subjectViewMode: mode }, { merge: true }).catch(console.error);
    }
  },

  addElo: (amount) => {
    const { authUser, eloScore } = get();
    const newScore = Math.max(0, eloScore + amount);
    set({ eloScore: newScore });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), { eloScore: newScore }, { merge: true }).catch(console.error);
    }
  },

  unlockTrophy: (trophyId) => {
    const { authUser, trophies, addElo } = get();
    const idx = trophies.findIndex(t => t.id === trophyId);
    if (idx !== -1 && !trophies[idx].unlockedAt) {
      const newTrophies = [...trophies];
      newTrophies[idx] = { ...newTrophies[idx], unlockedAt: new Date().toISOString() };
      set({ trophies: newTrophies });
      if (authUser?.uid) {
        setDoc(doc(db, 'users', authUser.uid), { trophies: newTrophies }, { merge: true }).catch(console.error);
      }
      addElo(50);
    }
  },

  updateHealthScore: () => {
    const { logs, exams, profile, streakDays } = get();
    if (!profile) return;
    const score = computeHealthScore(logs, exams, profile, streakDays);
    set({ healthScore: score });
  },

  dismissAlert: (id) => set((s) => ({ activeAlerts: s.activeAlerts.filter(a => a.id !== id) })),

  detectAndSetHabits: () => {
    const alerts = detectHabitsFromLogs(get().logs);
    set({ activeAlerts: alerts });
  },
});
