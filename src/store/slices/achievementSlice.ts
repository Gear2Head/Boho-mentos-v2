import { UserAchievement } from '../../types';
import { db } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface AchievementSlice {
  unlockedAchievementIds: string[];
  pendingCelebrations: string[];
  userAchievements: UserAchievement[];
  unlockAchievement: (id: string, rewardElo: number) => void;
  markCelebrationViewed: (id: string) => void;
  evaluateAllAchievements: () => Promise<void>;
}

export const createAchievementSlice = (set: any, get: any): AchievementSlice => ({
  unlockedAchievementIds: [],
  pendingCelebrations: [],
  userAchievements: [],
  
  unlockAchievement: (id: string, rewardElo: number) => {
    const { authUser, unlockedAchievementIds, userAchievements, eloScore } = get();
    
    // Prevent double unlock
    if (unlockedAchievementIds.includes(id)) {
      return;
    }
    
    const newAchievement: UserAchievement = {
      id,
      unlockedAt: new Date().toISOString(),
      isViewed: false
    };
    
    const updatedIds = [...unlockedAchievementIds, id];
    const updatedUserAchievements = [...userAchievements, newAchievement];
    const newElo = (eloScore || 0) + rewardElo;

    set({
      unlockedAchievementIds: updatedIds,
      pendingCelebrations: [...get().pendingCelebrations, id],
      userAchievements: updatedUserAchievements,
      eloScore: newElo
    });

    // Firestore Sync
    if (authUser?.uid) {
      setDoc(doc(db, 'users', authUser.uid), {
        unlockedAchievementIds: updatedIds,
        userAchievements: updatedUserAchievements,
        eloScore: newElo
      }, { merge: true }).catch(err => console.error('[Achievements] Sync Error:', err));
    }
  },
  
  markCelebrationViewed: (id: string) => {
    set((state: any) => ({
      pendingCelebrations: state.pendingCelebrations.filter((cId: string) => cId !== id),
      userAchievements: state.userAchievements.map((ua: UserAchievement) => 
        ua.id === id ? { ...ua, isViewed: true } : ua
      )
    }));
  },

  evaluateAllAchievements: async () => {
    const state = get() as any;
    try {
      const { ACHIEVEMENTS } = await import('../../data/achievementDefinitions');
      
      ACHIEVEMENTS.forEach((ach: any) => {
        const progress = ach.calculateProgress(state);
        if (progress.current >= progress.target) {
          state.unlockAchievement(ach.id, ach.reward?.elo || 0);
        }
      });
    } catch (err) {
      console.error('[Achievements] Evaluation Error:', err);
    }
  }
});
