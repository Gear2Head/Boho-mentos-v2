import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { AuthUser } from '../../types';
import { getInitialTytSubjects, getInitialAytSubjects } from '../../utils/subjectHelpers';

// ─── BLANK SLATE for user data isolation ───────────────────────────────────────
// IMPORTANT: Every user-scoped field MUST be listed here.
// If a new field is added to any slice, add its blank value here too.
const USER_DATA_BLANK_STATE = {
  // profile
  profile: null,
  streakDays: 0,
  trophies: [],
  activeAlerts: [],
  healthScore: null,
  // academic
  logs: [],
  exams: [],
  failedQuestions: [],
  agendaEntries: [],
  focusSessions: [],
  flashcards: [],
  tytSubjects: getInitialTytSubjects(),
  aytSubjects: getInitialAytSubjects(),
  // economy
  bohoCoins: 0,
  eloScore: 0,
  dailyEloDelta: 0,
  economyLedger: [],
  inventory: {
    items: [],
    boosts: {
      streakFreezer: 0,
      xpMultiplier: 0,
      coinMultiplier: 0,
      ghostRivalTickets: 0,
    },
  },
  purchasedItems: [],
  // coach
  chatHistory: [],
  directiveHistory: [],
  coachMemory: null,
  lastCoachDirective: null,
  dailyAiRequests: 0,
  // achievements
  unlockedAchievementIds: [],
  userAchievements: [],
  // social (keep minimal — social data is public per-user)
  // war room session
  warRoomSession: null,
};

export interface AuthSlice {
  authUser: AuthUser | null;
  isDevMode: boolean;
  spotifyToken: string | null;
  setAuthUser: (user: AuthUser | null) => void;
  setDevMode: (enabled: boolean) => void;
  setSpotifyToken: (token: string | null) => void;
  signOut: () => Promise<void>;
}

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  authUser: null,
  isDevMode: false,
  spotifyToken: null,
  setAuthUser: (user) => {
    if (!user) {
      // SECURITY: Wipe all personal data when logging out to prevent cross-account data leakage
      set({ ...USER_DATA_BLANK_STATE, authUser: null });
    } else {
      set({ authUser: user });
    }
  },
  setDevMode: (enabled) => set({ isDevMode: enabled }),
  setSpotifyToken: (token) => set({ spotifyToken: token }),
  signOut: async () => {
    const { auth } = await import('../../services/firebase');
    await auth.signOut();
    set({ ...USER_DATA_BLANK_STATE, authUser: null });
    get().hardReset();
  },
});

