import { StateCreator } from 'zustand';
import { doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { cleanForFirestore } from '../../utils/firebaseHelpers';
import { setDocWithOfflineQueue } from '../../services/firestoreWriteQueue';
import { EconomyEvent } from '../../types';
import { UserInventory, CrateTier, CRATE_CONFIG, ShopItem, REWARD_POOLS, ALL_SHOP_ITEMS } from '../../types/economy';

export interface EconomySlice {
  bohoCoins: number;
  economyLedger: EconomyEvent[];
  inventory: UserInventory;
  eloScore: number;
  dailyEloDelta: number;
  lastEloUpdateDate: string;

  addBohoCoins: (amount: number, reason: string, eventKey?: string) => void;
  spendBohoCoins: (amount: number, reason: string, eventKey?: string) => boolean;
  addElo: (amount: number, source?: string, eventKey?: string) => void;
  addToInventory: (itemId: string) => void;
  useBoost: (boostType: keyof UserInventory['boosts']) => boolean;
  equipInventoryItem: (itemId: string) => boolean;
  activateInventoryBoost: (boostType: keyof UserInventory['boosts']) => boolean;
  buyShopItem: (item: ShopItem) => boolean;
  openCrate: (tier: CrateTier) => { success: boolean; rewardId?: string; error?: string };
  // Compatibility
  purchasedItems: string[];
  purchaseItem: (itemId: string, cost: number) => boolean;
  
  // Daily Quests persistence
  claimedQuests: Record<string, string[]>; // date -> [questId1, questId2]
  claimQuest: (date: string, questId: string, xp: number) => void;
}

export const createEconomySlice: StateCreator<
  import('../appStore').AppState,
  [],
  [],
  EconomySlice
> = (set, get) => ({
  bohoCoins: 0,
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
  eloScore: 0,
  dailyEloDelta: 0,
  lastEloUpdateDate: new Date().toISOString().split('T')[0],
  purchasedItems: [],

  addBohoCoins: (amount, reason, eventKey) => {
    const { bohoCoins, economyLedger, authUser } = get();
    const resolvedKey = eventKey ?? `coin:${reason}:${amount}:${Date.now()}`;
    if (economyLedger.some(e => e.eventKey === resolvedKey)) return;

    const now = new Date().toISOString();
    const event: EconomyEvent = {
      id: `eco_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      eventKey: resolvedKey,
      type: 'coin_award',
      source: reason,
      coinDelta: amount,
      createdAt: now,
    };

    set((state) => {
      const nextState = {
        bohoCoins: state.bohoCoins + amount,
        economyLedger: [...state.economyLedger, event].slice(-300),
        lastLocalUpdateAt: now
      };
      if (authUser?.uid) {
        setDocWithOfflineQueue(doc(db, 'users', authUser.uid), cleanForFirestore({ bohoCoins: nextState.bohoCoins, economyLedger: nextState.economyLedger }), { merge: true }).catch(console.error);
      }
      return nextState;
    });
  },

  spendBohoCoins: (amount, reason, eventKey) => {
    const { bohoCoins, economyLedger, authUser } = get();
    if (bohoCoins < amount) return false;

    const resolvedKey = eventKey ?? `spend:${reason}:${amount}:${Date.now()}`;
    if (economyLedger.some(e => e.eventKey === resolvedKey)) return true;

    const now = new Date().toISOString();
    const event: EconomyEvent = {
      id: `eco_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      eventKey: resolvedKey,
      type: 'coin_spend',
      source: reason,
      coinDelta: -amount,
      createdAt: now,
    };

    set((state) => {
      const nextState = {
        bohoCoins: state.bohoCoins - amount,
        economyLedger: [...state.economyLedger, event].slice(-300),
        lastLocalUpdateAt: now
      };
      if (authUser?.uid) {
        setDocWithOfflineQueue(doc(db, 'users', authUser.uid), cleanForFirestore({ bohoCoins: nextState.bohoCoins, economyLedger: nextState.economyLedger }), { merge: true }).catch(console.error);
      }
      return nextState;
    });
    return true;
  },

  addElo: (amount, source = 'manual', eventKey) => {
    const { eloScore, bohoCoins, economyLedger, authUser } = get();
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

    set((state) => {
      const nextLedger = [...state.economyLedger, event].slice(-300);
      const nextCoins = Math.max(0, state.bohoCoins + coinDelta);
      const nextState = { 
        eloScore: newScore, 
        bohoCoins: nextCoins, 
        economyLedger: nextLedger, 
        lastLocalUpdateAt: now 
      };
      
      if (authUser?.uid) {
        setDocWithOfflineQueue(doc(db, 'users', authUser.uid), cleanForFirestore({ eloScore: newScore, bohoCoins: nextCoins, economyLedger: nextLedger }), { merge: true }).catch(console.error);
      }
      return nextState;
    });
  },

  addToInventory: (itemId) => {
    set((state) => {
      const nextItems = [...new Set([...state.inventory.items, itemId])];
      const nextInventory = { ...state.inventory, items: nextItems };
      const authUser = get().authUser;
      if (authUser?.uid) {
        setDocWithOfflineQueue(doc(db, 'users', authUser.uid), cleanForFirestore({ inventory: nextInventory }), { merge: true }).catch(console.error);
      }
      return {
        inventory: nextInventory,
        lastLocalUpdateAt: new Date().toISOString(),
      };
    });
  },

  useBoost: (boostType) => {
    const { inventory, authUser } = get();
    if (inventory.boosts[boostType] <= 0) return false;

    set((state) => {
      const nextBoosts = { ...state.inventory.boosts, [boostType]: state.inventory.boosts[boostType] - 1 };
      const nextInventory = { ...state.inventory, boosts: nextBoosts };
      if (authUser?.uid) {
        setDocWithOfflineQueue(doc(db, 'users', authUser.uid), cleanForFirestore({ inventory: nextInventory }), { merge: true }).catch(console.error);
      }
      return {
        inventory: nextInventory,
        lastLocalUpdateAt: new Date().toISOString(),
      };
    });
    return true;
  },

  activateInventoryBoost: (boostType) => {
    const ok = get().useBoost(boostType);
    if (!ok) return false;

    if (boostType === 'streakFreezer') {
      const { profile, setProfile } = get();
      if (profile) setProfile({ ...profile, streakShields: (profile.streakShields || 0) + 1 });
    }

    if (boostType === 'xpMultiplier' || boostType === 'coinMultiplier') {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { profile, setProfile } = get();
      if (profile) {
        setProfile({
          ...profile,
          coachMemory: {
            ...(profile.coachMemory || { majorMistakes: [], commitments: [] }),
            commitments: [
              ...((profile.coachMemory?.commitments || []).filter((item) => !item.startsWith(`${boostType}:`))),
              `${boostType}:${expiresAt}`,
            ],
          },
        });
      }
    }

    return true;
  },

  equipInventoryItem: (itemId) => {
    const { inventory, profile, setProfile, setTheme, authUser } = get();
    if (!inventory.items.includes(itemId)) return false;

    const item = ALL_SHOP_ITEMS.find((entry) => entry.id === itemId);
    const slot = item?.metadata?.equipSlot;
    if (!slot) return false;

    const nextInventory: UserInventory = { ...inventory };
    if (slot === 'frame') nextInventory.activeFrame = itemId;
    if (slot === 'title') nextInventory.activeTitle = itemId;
    if (slot === 'theme') {
      nextInventory.activeTheme = itemId;
      if (item.metadata?.theme === 'light' || item.metadata?.theme === 'dark') setTheme(item.metadata.theme);
    }
    if (slot === 'persona') {
      nextInventory.activeCoachPersona = itemId;
      if (profile && typeof item.metadata?.coachPersonality === 'string') {
        setProfile({ ...profile, coachPersonality: item.metadata.coachPersonality });
      }
    }

    set({ inventory: nextInventory, lastLocalUpdateAt: new Date().toISOString() });
    
    if (authUser?.uid) {
      setDocWithOfflineQueue(doc(db, 'users', authUser.uid), cleanForFirestore({ inventory: nextInventory }), { merge: true }).catch(console.error);
    }
    
    return true;
  },

  buyShopItem: (item) => {
    const { spendBohoCoins, addToInventory, inventory, authUser } = get();
    
    if (item.category === 'cosmetic' || item.category === 'ai_persona') {
      if (inventory.items.includes(item.id)) return false;
    }

    if (spendBohoCoins(item.price, `Purchase: ${item.name}`)) {
      if (item.category === 'boost') {
        const boostKey = item.metadata?.boostKey as keyof UserInventory['boosts'];
        if (boostKey) {
          const amount = Number(item.metadata?.amount) || 1;
          set((state) => {
            const nextBoosts = { ...state.inventory.boosts, [boostKey]: (state.inventory.boosts[boostKey] || 0) + amount };
            const nextInventory = { ...state.inventory, boosts: nextBoosts };
            if (authUser?.uid) {
              setDocWithOfflineQueue(doc(db, 'users', authUser.uid), cleanForFirestore({ inventory: nextInventory }), { merge: true }).catch(console.error);
            }
            return {
              inventory: nextInventory,
              lastLocalUpdateAt: new Date().toISOString(),
            };
          });
        }
      } else {
        addToInventory(item.id);
      }
      return true;
    }
    return false;
  },

  openCrate: (tier) => {
    const config = CRATE_CONFIG[tier];
    const { spendBohoCoins, addToInventory, inventory, authUser, addBohoCoins } = get();

    if (!spendBohoCoins(config.price, `Open Crate: ${config.name}`)) {
      return { success: false, error: 'INSUFFICIENT_FUNDS' };
    }

    // [V21 FIX]: Filter pool to remove already owned one-time items (cosmetics, personas)
    let pool = REWARD_POOLS[tier].filter(reward => {
      const shopItem = ALL_SHOP_ITEMS.find(i => i.id === reward.itemId);
      if (!shopItem) return true;
      if (shopItem.category === 'cosmetic' || shopItem.category === 'ai_persona') {
        return !inventory.items.includes(shopItem.id);
      }
      return true;
    });

    // Fallback: If everything in the pool is owned, give a guaranteed common item or refund coins
    if (pool.length === 0) {
      const fallbackItemId = 'rival_ticket';
      const fallbackItem = ALL_SHOP_ITEMS.find(i => i.id === fallbackItemId);
      if (fallbackItem) {
        addToInventory(fallbackItemId);
        return { success: true, rewardId: fallbackItemId };
      }
      // Ultimate fallback: refund partial coins
      addBohoCoins(Math.floor(config.price * 0.5), 'Crate Refund (Pool Empty)');
      return { success: true, rewardId: 'refund' };
    }

    const totalWeight = pool.reduce((acc, i) => acc + i.weight, 0);
    let random = Math.random() * totalWeight;
    let rewardId = pool[0].itemId;

    for (const item of pool) {
      if (random < item.weight) {
        rewardId = item.itemId;
        break;
      }
      random -= item.weight;
    }

    const rewardItem = ALL_SHOP_ITEMS.find((item) => item.id === rewardId);
    if (rewardItem?.category === 'boost' && rewardItem.metadata?.boostKey) {
      const key = rewardItem.metadata.boostKey;
      const amount = Number(rewardItem.metadata.amount) || 1;
      if (key) {
        set((state) => {
          const nextBoosts = { ...state.inventory.boosts, [key]: (state.inventory.boosts[key] || 0) + amount };
          const nextInventory = { ...state.inventory, boosts: nextBoosts };
          if (authUser?.uid) {
            setDocWithOfflineQueue(doc(db, 'users', authUser.uid), cleanForFirestore({ inventory: nextInventory }), { merge: true }).catch(console.error);
          }
          return {
            inventory: nextInventory,
            lastLocalUpdateAt: new Date().toISOString(),
          };
        });
      }
    } else {
      addToInventory(rewardId);
    }

    return { success: true, rewardId };
  },

  purchaseItem: (itemId, cost) => {
    const { spendBohoCoins, addToInventory, inventory } = get();
    if (inventory.items.includes(itemId)) return true;
    if (spendBohoCoins(cost, `purchase_${itemId}`)) {
      addToInventory(itemId);
      return true;
    }
    return false;
  },

  claimedQuests: {},
  claimQuest: (date, questId, xp) => {
    const { claimedQuests, addElo, authUser } = get();
    const dayClaims = claimedQuests[date] || [];
    if (dayClaims.includes(questId)) return;

    const nextClaims = { ...claimedQuests, [date]: [...dayClaims, questId] };
    set({ claimedQuests: nextClaims, lastLocalUpdateAt: new Date().toISOString() });
    addElo(xp, `Quest: ${questId}`);

    if (authUser?.uid) {
      setDocWithOfflineQueue(doc(db, 'users', authUser.uid), cleanForFirestore({ claimedQuests: nextClaims }), { merge: true }).catch(console.error);
    }
  },
});
