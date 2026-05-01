import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

export function CelebrationOverlay({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#3b82f6', '#8b5cf6', '#10b981']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#3b82f6', '#8b5cf6', '#10b981']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        setTimeout(onComplete, 1000);
      }
    };
    frame();
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
      >
        <motion.div
          initial={{ scale: 0.5, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-center"
        >
          <div className="mx-auto w-32 h-32 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-purple-500/50">
            <Flame className="text-white w-16 h-16" />
          </div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 drop-shadow-lg uppercase tracking-widest mb-4">
            KRİTİK GÖREV TAMAMLANDI
          </h1>
          <p className="text-2xl text-white font-bold bg-black/50 px-6 py-2 rounded-full inline-block backdrop-blur-md">
            +500 ELO BONUS EKLENDİ
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
