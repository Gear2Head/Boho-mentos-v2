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

export interface ProfileSlice {
  profile: StudentProfile | null;
  eloScore: number;
  dailyEloDelta: number;
  lastEloUpdateDate: string;
  streakDays: number;
  bohoCoins: number;
  economyLedger: EconomyEvent[];
  trophies: Trophy[];
  theme: 'light' | 'dark';
  subjectViewMode: 'list' | 'map';
  healthScore: HealthScore | null;
  activeAlerts: HabitAlert[];
  purchasedItems: string[];

  setProfile: (profile: StudentProfile | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSubjectViewMode: (mode: 'list' | 'map') => void;
  addElo: (amount: number, source?: string, eventKey?: string) => void;
  spendBohoCoins: (amount: number, source: string, eventKey?: string) => boolean;
  addBohoCoins: (amount: number, source: string, eventKey?: string) => void;
  unlockTrophy: (trophyId: string) => void;
  updateHealthScore: () => void;
  recomputeStreak: (consumeShields?: boolean) => number;
  recordActivity: () => void;
  dismissAlert: (id: string) => void;
  detectAndSetHabits: () => void;
  buyStreakFreeze: () => boolean;
  purchaseItem: (itemId: string, cost: number) => boolean;
}

export const createProfileSlice: StateCreator<AppState, [], [], ProfileSlice> = (set, get) => ({
  profile: null,
  eloScore: 1200,
  dailyEloDelta: 0,
  lastEloUpdateDate: toISODateOnly(),
  streakDays: 0,
  bohoCoins: 0,
  economyLedger: [],
  trophies: [],
  theme: 'dark',
  subjectViewMode: 'map',
  healthScore: null,
  activeAlerts: [],
  purchasedItems: [],

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

  addElo: (amount, source = 'manual', eventKey) => {
    const { authUser, eloScore, bohoCoins, economyLedger } = get();
    const resolvedKey = eventKey ?? `elo:${source}:${amount}:${Date.now()}`;
    if (economyLedger.some((e) => e.eventKey === resolvedKey)) return;
    const newScore = Math.max(0, eloScore + amount);
    const coinDelta = amount > 0 ? amount * 4 : 0;
    const now = new Date().toISOString();
    const event: EconomyEvent = {
      id: `eco_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      eventKey: resolvedKey,
      type: 'elo_award',
      source,
      eloDelta: amount,
      coinDelta,
      createdAt: now,
    };
    const newLedger = [...economyLedger, event].slice(-300);
    const newCoins = Math.max(0, bohoCoins + coinDelta);
    set({ eloScore: newScore, bohoCoins: newCoins, economyLedger: newLedger, lastLocalUpdateAt: now });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ eloScore: newScore, bohoCoins: newCoins, economyLedger: newLedger }), { merge: true }).catch(console.error);
    }
  },

  addBohoCoins: (amount, source, eventKey) => {
    if (amount <= 0) return;
    const { authUser, bohoCoins, economyLedger } = get();
    const resolvedKey = eventKey ?? `coin:${source}:${amount}:${Date.now()}`;
    if (economyLedger.some((e) => e.eventKey === resolvedKey)) return;
    const now = new Date().toISOString();
    const event: EconomyEvent = {
      id: `eco_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      eventKey: resolvedKey,
      type: 'coin_award',
      source,
      coinDelta: amount,
      createdAt: now,
    };
    const newCoins = bohoCoins + amount;
    const newLedger = [...economyLedger, event].slice(-300);
    set({ bohoCoins: newCoins, economyLedger: newLedger, lastLocalUpdateAt: now });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ bohoCoins: newCoins, economyLedger: newLedger }), { merge: true }).catch(console.error);
    }
  },

  spendBohoCoins: (amount, source, eventKey) => {
    const { authUser, bohoCoins, economyLedger } = get();
    if (amount <= 0 || bohoCoins < amount) return false;
    const resolvedKey = eventKey ?? `spend:${source}:${amount}:${Date.now()}`;
    if (economyLedger.some((e) => e.eventKey === resolvedKey)) return true;
    const now = new Date().toISOString();
    const event: EconomyEvent = {
      id: `eco_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      eventKey: resolvedKey,
      type: 'coin_spend',
      source,
      coinDelta: -amount,
      createdAt: now,
    };
    const newCoins = Math.max(0, bohoCoins - amount);
    const newLedger = [...economyLedger, event].slice(-300);
    set({ bohoCoins: newCoins, economyLedger: newLedger, lastLocalUpdateAt: now });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ bohoCoins: newCoins, economyLedger: newLedger }), { merge: true }).catch(console.error);
    }
    return true;
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
    const { authUser, logs, profile } = get();
    const computed = computeStudyStreak(logs, {
      availableShieldCount: profile?.streakShields ?? 0,
      usedShieldDates: profile?.usedStreakShieldDates ?? [],
      activityDays: profile?.activeDays ?? [],
    });
    const nextProfile = profile && consumeShields
      ? { ...profile, usedStreakShieldDates: computed.usedShieldDates }
      : profile;
    set({ streakDays: computed.streakDays, ...(nextProfile ? { profile: nextProfile } : {}), lastLocalUpdateAt: new Date().toISOString() });
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({
        streakDays: computed.streakDays,
        ...(nextProfile ? { profile: nextProfile } : {})
      }), { merge: true }).catch(console.error);
    }
    return computed.streakDays;
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

  purchaseItem: (itemId, cost) => {
    const { authUser, spendBohoCoins, purchasedItems } = get();
    if (purchasedItems.includes(itemId)) return true;
    if (spendBohoCoins(cost, `purchase_${itemId}`)) {
      const newPurchased = [...purchasedItems, itemId];
      set({ purchasedItems: newPurchased });
      if (authUser?.uid) {
        setDoc(doc(db, 'users', authUser.uid), cleanForFirestore({ purchasedItems: newPurchased }), { merge: true }).catch(console.error);
      }
      return true;
    }
    return false;
  },
});
