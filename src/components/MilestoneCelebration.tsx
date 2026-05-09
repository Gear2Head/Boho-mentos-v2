import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerConfetti } from '../utils/confetti';
import { Flame, Trophy, Zap } from 'lucide-react';

interface MilestoneCelebrationProps {
  streak: number;
  onDismiss: () => void;
}

const MILESTONES = [7, 14, 30, 60, 100];

export function getMilestoneForStreak(streak: number, prevStreak: number): number | null {
  for (const m of MILESTONES) {
    if (prevStreak < m && streak >= m) return m;
  }
  return null;
}

export function MilestoneCelebration({ streak, onDismiss }: MilestoneCelebrationProps) {
  useEffect(() => {
    triggerConfetti();
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const icon = streak >= 30 ? <Trophy size={48} className="text-amber-400" /> :
               streak >= 14 ? <Zap size={48} className="text-purple-400" /> :
               <Flame size={48} className="text-rose-500" />;

  const color = streak >= 30 ? 'from-amber-500/20 to-yellow-500/5 border-amber-500/30' :
                streak >= 14 ? 'from-purple-500/20 to-pink-500/5 border-purple-500/30' :
                'from-rose-500/20 to-orange-500/5 border-rose-500/30';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 pointer-events-none"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
        className={`pointer-events-auto glass-card rounded-[40px] p-12 text-center border bg-gradient-to-br ${color} shadow-2xl max-w-sm w-full`}
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex justify-center mb-6"
        >
          {icon}
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display italic text-4xl font-bold text-zinc-100 mb-2"
        >
          {streak} Günlük Seri!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-zinc-400 text-sm"
        >
          {streak >= 30 ? 'Efsane! Bu disiplin şampiyonlara özgü.' :
           streak >= 14 ? 'İki hafta boyunca hiç yavaşlamadın. Fırtına gibisin.' :
           'Bir haftalık seri! Alışkanlık oturdu, şimdi hız ver.'}
        </motion.p>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={onDismiss}
          className="mt-8 px-6 py-3 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/20 transition-all"
        >
          Devam Et
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
