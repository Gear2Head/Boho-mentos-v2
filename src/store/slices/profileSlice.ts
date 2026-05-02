import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { EconomyEvent, StudentProfile, Trophy, HabitAlert } from '../../types';
import { toISODateOnly } from '../../utils/date';
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { cleanForFirestore } from "../../utils/firebaseHelpers";
import { computeHealthScore, HealthScore } from "../../utils/healthScore";
import { detectHabitsFromLogs } from "../appStore";
import { computeStudyStreak } from '../../utils/streak';
import { TYT_SUBJECTS, AYT_SUBJECTS } from '../../constants';

// Build flat subject lists from the nested constants
function buildTytSubjects() {
  return Object.entries(TYT_SUBJECTS).flatMap(([subject, topics]) =>
    topics.map(topic => ({ subject, name: topic, status: 'not-started' as const, notes: '' }))
  );
}

function buildAytSubjectsForTrack(track: string) {
  const trackMap: Record<string, string[]> = {
    'Sayısal': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
    'Eşit Ağırlık': ['Matematik', 'Edebiyat', 'Tarih', 'Coğrafya'],
    'Sözel': ['Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe Grubu'],
    'Dil': ['Yabancı Dil'],
    'EA': ['Matematik', 'Edebiyat', 'Tarih', 'Coğrafya'],
    'SÖZ': ['Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe Grubu'],
    'DİL': ['Yabancı Dil'],
  };
  const allowed = trackMap[track] ?? trackMap['Sayısal'];
  return Object.entries(AYT_SUBJECTS)
    .filter(([subject]) => allowed.includes(subject))
    .flatMap(([subject, topics]) =>
      topics.map(topic => ({ subject, name: topic, status: 'not-started' as const, notes: '' }))
    );
}


export interface ProfileSlice {
  profile: StudentProfile | null;
  streakDays: number;
  trophies: Trophy[];
  theme: 'light' | 'dark';
  subjectViewMode: 'list' | 'map';
  healthScore: HealthScore | null;
  activeAlerts: HabitAlert[];

  setProfile: (profile: StudentProfile | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSubjectViewMode: (mode: 'list' | 'map') => void;
  unlockTrophy: (trophyId: string) => void;
  updateHealthScore: () => void;
  recomputeStreak: (consumeShields?: boolean) => number;
  recordActivity: () => void;
  dismissAlert: (id: string) => void;
  detectAndSetHabits: () => void;
  buyStreakFreeze: () => boolean;
}

export const createProfileSlice: StateCreator<AppState, [], [], ProfileSlice> = (set, get) => ({
  profile: null,
  streakDays: 0,
  trophies: [],
  theme: 'dark',
  subjectViewMode: 'map',
  healthScore: null,
  activeAlerts: [],

  setProfile: (profile) => {
    const { authUser, tytSubjects, aytSubjects } = get();
    if (profile && profile.motivationQuote === undefined) {
      profile.motivationQuote = null;
    }

    // AUTO-INIT: Initialize subjects for new accounts when profile is first set
    const stateUpdates: any = { profile };
    if (profile && tytSubjects.length === 0) {
      stateUpdates.tytSubjects = buildTytSubjects();
    }
    if (profile && aytSubjects.length === 0 && profile.track) {
      stateUpdates.aytSubjects = buildAytSubjectsForTrack(profile.track);
    }

    set(stateUpdates);
    if (authUser?.uid && profile) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ profile }), { merge: true }).catch(console.error);
      // Also persist initialized subjects if they were just created
      if (stateUpdates.tytSubjects) {
        setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ tytSubjects: stateUpdates.tytSubjects }), { merge: true }).catch(console.error);
      }
      if (stateUpdates.aytSubjects) {
        setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ aytSubjects: stateUpdates.aytSubjects }), { merge: true }).catch(console.error);
      }
    }
    get().updateHealthScore();
  },


  setTheme: (theme) => {
    const { authUser } = get();
    set({ theme });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ theme }), { merge: true }).catch(console.error);
    }
  },

  setSubjectViewMode: (mode) => {
    const { authUser } = get();
    set({ subjectViewMode: mode });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ subjectViewMode: mode }), { merge: true }).catch(console.error);
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
        setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ trophies: newTrophies }), { merge: true }).catch(console.error);
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

  recomputeStreak: (consumeShields = true) => {
    const { authUser, logs, profile, streakDays } = get();
    const computed = computeStudyStreak(logs, {
      availableShieldCount: profile?.streakShields ?? 0,
      usedShieldDates: profile?.usedStreakShieldDates ?? [],
      activityDays: profile?.activeDays ?? [],
    });
    const nextProfile = profile && consumeShields
      ? { ...profile, usedStreakShieldDates: computed.usedShieldDates }
      : profile;
    const nextStreakDays = Math.max(streakDays || 0, computed.streakDays);
    set({ streakDays: nextStreakDays, ...(nextProfile ? { profile: nextProfile } : {}), lastLocalUpdateAt: new Date().toISOString() });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({
        streakDays: nextStreakDays,
        ...(nextProfile ? { profile: nextProfile } : {})
      }), { merge: true }).catch(console.error);
    }
    return nextStreakDays;
  },

  recordActivity: () => {
    const { authUser, profile, recomputeStreak } = get();
    if (!profile) return;
    const today = toISODateOnly();
    const currentActiveDays = profile.activeDays ?? [];
    if (currentActiveDays.includes(today)) return;
    
    const nextActiveDays = [...currentActiveDays, today].slice(-365);
    const nextProfile = { ...profile, activeDays: nextActiveDays };
    set({ profile: nextProfile });
    
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ profile: nextProfile }), { merge: true }).catch(console.error);
    }
    recomputeStreak(false);
  },

  dismissAlert: (id) => set((s) => ({ activeAlerts: s.activeAlerts.filter(a => a.id !== id) })),

  detectAndSetHabits: () => {
    const alerts = detectHabitsFromLogs(get().logs);
    set({ activeAlerts: alerts });
  },

  buyStreakFreeze: () => {
    const { spendBohoCoins, profile, setProfile } = get();
    if (profile && spendBohoCoins(2000, 'streak_shield')) {
      const currentShields = profile.streakShields || 0;
      setProfile({ ...profile, streakShields: currentShields + 1 });
      return true;
    }
    return false;
  },
});
