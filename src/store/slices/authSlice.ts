import { StateCreator } from 'zustand';
import { AppState } from '../appStore';
import { AuthUser } from '../../types';

export interface AuthSlice {
  authUser: AuthUser | null;
  isDevMode: boolean;
  setAuthUser: (user: AuthUser | null) => void;
  setDevMode: (enabled: boolean) => void;
  signOut: () => Promise<void>;
}

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  authUser: null,
  isDevMode: false,
  setAuthUser: (user) => set({ authUser: user }),
  setDevMode: (enabled) => set({ isDevMode: enabled }),
  signOut: async () => {
    set({ authUser: null });
    get().hardReset();
  },
});
