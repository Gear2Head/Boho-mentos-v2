import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { ACHIEVEMENTS } from '../data/achievementDefinitions';

export function useAchievementMonitor() {
  const store = useAppStore();
  const timeoutRef = useRef<number | null>(null);

  // We only depend on variables that signal a possible state change for achievements
  const logsCount = store.logs?.length || 0;
  const sessionsCount = store.focusSessions?.length || 0;
  const eloScore = store.eloScore || 0;
  
  useEffect(() => {
    // Clear any pending checks to debounce
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      // Async execution using requestIdleCallback if available to avoid blocking main thread
      const runChecks = () => {
        // Use the freshest state inside the timeout
        const state = useAppStore.getState();
        const unlockedIds = state.unlockedAchievementIds || [];
        
        // Find which achievements can be unlocked
        const newlyUnlocked = ACHIEVEMENTS.filter(ach => {
          if (unlockedIds.includes(ach.id)) return false;
          
          try {
            const { current, target } = ach.calculateProgress(state);
            return current >= target;
          } catch (e) {
            console.error(`Error calculating progress for achievement ${ach.id}:`, e);
            return false;
          }
        });

        // Batch unlock
        if (newlyUnlocked.length > 0) {
          // Add them sequentially to state
          newlyUnlocked.forEach(ach => {
            state.unlockAchievement(ach.id, ach.reward.elo || 0);
          });
        }
      };

      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(runChecks);
      } else {
        runChecks();
      }
    }, 2000); // 2 second debounce

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [logsCount, sessionsCount, eloScore]);
}
