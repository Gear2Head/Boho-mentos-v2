import { StateCreator } from 'zustand';

export interface UiLockState {
  isLocked: boolean;
  reason: string;
  unlockCondition: string;
}

export interface UiBehaviorSlice {
  frustrationIndex: number;
  cognitiveLoad: 'low' | 'medium' | 'high';
  avoidanceLevel: number;
  lockedRoutes: string[];
  uiLockState: UiLockState;
  socraticDepth: number;

  setFrustrationIndex: (val: number) => void;
  setCognitiveLoad: (val: 'low' | 'medium' | 'high') => void;
  setAvoidanceLevel: (val: number) => void;
  setLockedRoutes: (routes: string[]) => void;
  setUiLockState: (state: Partial<UiLockState>) => void;
  setSocraticDepth: (val: number) => void;

  detectAvoidance: (weakTopics: string[], currentStudyLogTopics: string[]) => void;
  triggerIntervention: (level: 'soft' | 'medium' | 'hard', reason: string) => void;
  escalatePressure: () => void;
  resetBehaviorState: () => void;
}

export const createUiBehaviorSlice: StateCreator<
  UiBehaviorSlice,
  [],
  [],
  UiBehaviorSlice
> = (set, get, api) => ({
  frustrationIndex: 0,
  cognitiveLoad: 'low',
  avoidanceLevel: 0,
  lockedRoutes: [],
  uiLockState: { isLocked: false, reason: '', unlockCondition: '' },
  socraticDepth: 0,

  setFrustrationIndex: (val) => set({ frustrationIndex: Math.min(100, Math.max(0, val)) }),
  setCognitiveLoad: (val) => set({ cognitiveLoad: val }),
  setAvoidanceLevel: (val) => set({ avoidanceLevel: Math.max(0, val) }),
  setLockedRoutes: (routes) => set({ lockedRoutes: routes }),
  setUiLockState: (state) => set((prev) => ({ uiLockState: { ...prev.uiLockState, ...state } })),
  setSocraticDepth: (val) => set({ socraticDepth: val }),

  detectAvoidance: (weakTopics, currentStudyLogTopics) => {
    // If none of the weak topics are being studied, increase avoidance
    const isAvoiding = weakTopics.length > 0 && !weakTopics.some(t => currentStudyLogTopics.includes(t));
    if (isAvoiding) {
      set((state) => ({ avoidanceLevel: state.avoidanceLevel + 1 }));
    } else {
      set({ avoidanceLevel: 0 }); // Reset if they study a weak topic
    }
  },

  triggerIntervention: (level, reason) => {
    if (level === 'hard') {
      set({
        uiLockState: { isLocked: true, reason, unlockCondition: 'COMPLETED_MANDATORY_TASK' },
        lockedRoutes: ['/social', '/war-room'], // Example blocked routes
      });
    } else if (level === 'medium') {
      set((state) => ({ frustrationIndex: state.frustrationIndex + 20 }));
    } else {
      set((state) => ({ frustrationIndex: state.frustrationIndex + 10 }));
    }
  },

  escalatePressure: () => {
    set((state) => {
      const newFrustration = Math.min(100, state.frustrationIndex + 15);
      let load: 'low' | 'medium' | 'high' = state.cognitiveLoad;
      if (newFrustration > 70) load = 'high';
      else if (newFrustration > 40) load = 'medium';
      
      return { frustrationIndex: newFrustration, cognitiveLoad: load };
    });
  },

  resetBehaviorState: () => {
    set({
      frustrationIndex: 0,
      cognitiveLoad: 'low',
      avoidanceLevel: 0,
      lockedRoutes: [],
      uiLockState: { isLocked: false, reason: '', unlockCondition: '' },
      socraticDepth: 0,
    });
  },
});
