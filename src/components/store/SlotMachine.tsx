import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useAnimation } from 'motion/react';
import { Coins, Dices, Flame, Rocket, Star, Trophy, Zap } from 'lucide-react';
import { AudioEngine } from '../../utils/audioEngine';

const SLOT_ICONS = [
  { icon: <Zap size={40} />, color: '#F59E0B' },
  { icon: <Flame size={40} />, color: '#EF4444' },
  { icon: <Rocket size={40} />, color: '#3B82F6' },
  { icon: <Star size={40} />, color: '#8B5CF6' },
  { icon: <Trophy size={40} />, color: '#10B981' },
  { icon: <Coins size={40} />, color: '#FFD700' },
];

const REEL_COUNT = 3;
const ITEM_HEIGHT = 96;
const SPIN_STRIP_LENGTH = 42;

function clampIconIndex(index: number): number {
  return Number.isInteger(index) && index >= 0 && index < SLOT_ICONS.length ? index : 0;
}

function randomIconIndex(): number {
  return Math.floor(Math.random() * SLOT_ICONS.length);
}

interface SlotMachineProps {
  onSpin: () => boolean;
  balance: number;
}

export const SlotMachine: React.FC<SlotMachineProps> = ({ onSpin, balance }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState([0, 1, 2]);
  const [spinTargets, setSpinTargets] = useState([0, 1, 2]);
  const [result, setResult] = useState<string | null>(null);

  const reelOne = useAnimation();
  const reelTwo = useAnimation();
  const reelThree = useAnimation();
  const controls = useMemo(() => [reelOne, reelTwo, reelThree], [reelOne, reelTwo, reelThree]);
  const canSpin = !isSpinning && balance >= 10;

  const reelStrips = useMemo(() => {
    return Array.from({ length: REEL_COUNT }, (_, reelIndex) => {
      const target = clampIconIndex(spinTargets[reelIndex]);
      const current = clampIconIndex(reels[reelIndex]);
      const strip = [SLOT_ICONS[current]];

      for (let idx = 1; idx < SPIN_STRIP_LENGTH - 1; idx += 1) {
        strip.push(SLOT_ICONS[(idx + reelIndex + target) % SLOT_ICONS.length]);
      }

      strip.push(SLOT_ICONS[target]);
      return strip;
    });
  }, [reels, spinTargets]);

  const spin = async () => {
    if (!canSpin) return;
    if (!onSpin()) return;

    const finalReels = Array.from({ length: REEL_COUNT }, randomIconIndex);
    setSpinTargets(finalReels);
    setIsSpinning(true);
    setResult(null);
    controls.forEach((ctrl) => ctrl.set({ y: 0 }));
    AudioEngine.playSlotSpin();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const spinDurations = [2, 2.5, 3];
    const targetY = -((SPIN_STRIP_LENGTH - 1) * ITEM_HEIGHT);

    await Promise.all(controls.map((ctrl, i) =>
      ctrl.start({
        y: [0, targetY],
        transition: {
          duration: spinDurations[i],
          ease: [0.22, 1, 0.36, 1],
          times: [0, 1],
        },
      })
    ));

    setReels(finalReels);
    controls.forEach((ctrl) => ctrl.set({ y: 0 }));
    setIsSpinning(false);

    const isJackpot = finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2];
    const isPair = finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2] || finalReels[0] === finalReels[2];
    AudioEngine.playSlotStop(isJackpot || isPair);

    if (isJackpot) {
      setResult('JACKPOT! +1000 Coin');
    } else if (isPair) {
      setResult('AMORTI! +XP Boost');
    }
  };

  return (
    <div className="glass-card p-8 rounded-[40px] flex flex-col items-center gap-8 relative overflow-hidden border border-amber-400/20 shadow-[0_0_60px_rgba(245,158,11,0.08)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.18),transparent_55%)] pointer-events-none" />

      <div className="text-center z-10">
        <h3 className="text-3xl font-display italic font-bold text-zinc-100 flex items-center gap-3 justify-center">
          <Dices className="text-amber-500" /> BOHO SLOTS
        </h3>
        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-black mt-2">Dusuk Risk, Yuksek Heyecan</p>
      </div>

      <div className="flex gap-4 p-4 bg-black/50 rounded-3xl border border-white/10 shadow-inner relative z-10">
        {reels.map((iconIdx, i) => {
          const settledIcon = SLOT_ICONS[clampIconIndex(iconIdx)];
          return (
            <div key={i} className="w-24 h-24 bg-zinc-950 rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/10 shadow-[inset_0_0_24px_rgba(0,0,0,0.65)]">
              <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/70 to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/70 to-transparent z-10 pointer-events-none" />
              <motion.div animate={controls[i]} initial={false} className="flex w-full flex-col items-center" style={{ willChange: 'transform' }}>
                {isSpinning ? (
                  reelStrips[i].map((item, idx) => (
                    <div key={`${i}-${idx}`} className="h-24 w-24 flex items-center justify-center shrink-0" style={{ color: item.color }}>
                      {item.icon}
                    </div>
                  ))
                ) : (
                  <div className="h-24 w-24 flex items-center justify-center shrink-0" style={{ color: settledIcon.color }}>
                    {settledIcon.icon}
                  </div>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>

      <div className="z-10 flex flex-col items-center gap-4">
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-amber-500 font-bold text-sm tracking-widest uppercase animate-pulse"
            >
              {result}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={spin}
          disabled={!canSpin}
          className={`px-12 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-xl ${
            canSpin
              ? 'bg-amber-500 text-black hover:scale-105 active:scale-95 shadow-amber-500/20'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
        >
          {isSpinning ? 'DONUYOR...' : balance < 10 ? 'YETERSIZ COIN' : 'KOLU CEK (10 COIN)'}
        </button>
      </div>
    </div>
  );
};
