import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { Trophy, Star, Zap, Swords, Target, Crown } from 'lucide-react';
import { triggerConfetti } from '../../utils/confetti';

interface Reward {
  id: string;
  name: string;
  rarity: 'basic' | 'epic' | 'legendary';
  xp: number;
  icon: React.ReactNode;
}

const POSSIBLE_REWARDS: Reward[] = [
  { id: '1', name: 'Basic XP', rarity: 'basic', xp: 50, icon: <Zap size={24} /> },
  { id: '2', name: 'Super XP', rarity: 'epic', xp: 150, icon: <Swords size={24} /> },
  { id: '3', name: 'Mega XP', rarity: 'epic', xp: 250, icon: <Target size={24} /> },
  { id: '4', name: 'BOHO GOD XP', rarity: 'legendary', xp: 1000, icon: <Crown size={24} /> },
  { id: '5', name: 'Bronze Trophy', rarity: 'basic', xp: 30, icon: <Trophy size={20} /> },
  { id: '6', name: 'Star Fragment', rarity: 'epic', xp: 120, icon: <Star size={22} /> },
];

export function CrateOpening({ onComplete, targetRewardId }: { onComplete: (reward: Reward) => void, targetRewardId?: string }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<Reward | null>(null);
  const controls = useAnimation();
  
  // Create a long reel of random rewards
  const reelRewards = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < 50; i++) {
      arr.push(POSSIBLE_REWARDS[Math.floor(Math.random() * POSSIBLE_REWARDS.length)]);
    }
    // Set the winning one at index 45
    if (targetRewardId) {
      const winner = POSSIBLE_REWARDS.find(r => r.id === targetRewardId) || POSSIBLE_REWARDS[0];
      arr[45] = winner;
    } else {
      arr[45] = POSSIBLE_REWARDS[Math.floor(Math.random() * POSSIBLE_REWARDS.length)];
    }
    return arr;
  }, [targetRewardId]);

  const startSpin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    
    // Each item is 120px wide
    const finalOffset = 45 * 120 - (window.innerWidth < 768 ? 150 : 200); // Center adjustment
    
    await controls.start({
      x: -finalOffset,
      transition: {
        duration: 5,
        ease: [0.15, 0, 0.15, 1], // Custom slow-down ease
      }
    });

    const winner = reelRewards[45];
    setResult(winner);
    triggerConfetti();
    setTimeout(() => onComplete(winner), 2000);
  };

  useEffect(() => {
    startSpin();
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-display italic font-bold text-white mb-2">ÖDÜL KASASI AÇILIYOR</h2>
        <p className="text-xs text-zinc-500 uppercase tracking-[0.3em] font-black">Şansın Yaver Gitsin...</p>
      </div>

      <div className="relative w-full max-w-4xl h-40 overflow-hidden bg-white/5 border-y border-white/10 flex items-center">
        {/* Center Pointer */}
        <div className="absolute left-1/2 -top-2 -bottom-2 w-1 bg-amber-500 z-10 shadow-[0_0_15px_#f59e0b] -translate-x-1/2">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-500 rotate-45" />
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-500 rotate-45" />
        </div>

        <motion.div 
          animate={controls}
          className="flex gap-2 pl-[50%]"
        >
          {reelRewards.map((reward, i) => (
            <div 
              key={i}
              className={`w-[112px] h-[112px] shrink-0 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                reward.rarity === 'legendary' ? 'bg-amber-500/10 border-amber-500/40' :
                reward.rarity === 'epic' ? 'bg-purple-500/10 border-purple-500/40' :
                'bg-zinc-800 border-white/5'
              }`}
            >
              <div className={
                reward.rarity === 'legendary' ? 'text-amber-400' :
                reward.rarity === 'epic' ? 'text-purple-400' : 'text-zinc-400'
              }>
                {reward.icon}
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{reward.name}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-12 text-center"
          >
            <p className="text-amber-500 text-sm font-black uppercase tracking-widest mb-1">KAZANDIN!</p>
            <h3 className="text-4xl font-display italic font-bold text-white">{result.name}</h3>
            <p className="text-zinc-500 text-xs mt-2">+{result.xp} ELO SİSTEMİNE EKLENDİ</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
