import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type SpinReward =
  | { type: 'elo'; amount: number; label: string }
  | { type: 'coins'; amount: number; label: string }
  | { type: 'crate'; tier: 'wooden' | 'silver'; label: string }
  | { type: 'empty'; label: string };

export const SPIN_REWARDS: SpinReward[] = [
  { type: 'elo', amount: 10, label: '+10 ELO' },
  { type: 'elo', amount: 25, label: '+25 ELO' },
  { type: 'elo', amount: 50, label: '+50 ELO' },
  { type: 'coins', amount: 50, label: '+50 Coin' },
  { type: 'coins', amount: 100, label: '+100 Coin' },
  { type: 'crate', tier: 'wooden', label: 'Tahta Sandik' },
  { type: 'crate', tier: 'silver', label: 'Gumus Sandik' },
  { type: 'empty', label: 'Sanssiz Gun' },
  { type: 'elo', amount: 15, label: '+15 ELO' },
  { type: 'coins', amount: 75, label: '+75 Coin' },
  { type: 'empty', label: 'Bos Slot' },
  { type: 'elo', amount: 30, label: '+30 ELO' },
];

const WEIGHTS = [20, 15, 5, 18, 10, 12, 3, 8, 15, 10, 7, 8];

function weightedRandom(): number {
  const total = WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  let cursor = Math.random() * total;
  for (let index = 0; index < WEIGHTS.length; index += 1) {
    cursor -= WEIGHTS[index];
    if (cursor <= 0) return index;
  }
  return WEIGHTS.length - 1;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function canSpinToday(uid: string): Promise<boolean> {
  const ref = doc(db, 'users', uid, 'dailySpin', 'record');
  const snap = await getDoc(ref);
  if (!snap.exists()) return true;
  return snap.data().lastSpinDate !== todayStr();
}

export async function performSpin(uid: string): Promise<{ reward: SpinReward; rewardIndex: number } | null> {
  const ref = doc(db, 'users', uid, 'dailySpin', 'record');
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists() && snap.data().lastSpinDate === todayStr()) {
      return null;
    }

    const rewardIndex = weightedRandom();
    const reward = SPIN_REWARDS[rewardIndex];

    tx.set(ref, {
      lastSpinDate: todayStr(),
      lastReward: reward,
      updatedAt: serverTimestamp(),
    });

    return { reward, rewardIndex };
  });
}
