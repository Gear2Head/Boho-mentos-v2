import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { AuthUser } from '../../types';

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
  setAuthUser: (user) => set({ authUser: user }),
  setDevMode: (enabled) => set({ isDevMode: enabled }),
  setSpotifyToken: (token) => set({ spotifyToken: token }),
  signOut: async () => {
    set({ authUser: null });
    get().hardReset();
  },
});
