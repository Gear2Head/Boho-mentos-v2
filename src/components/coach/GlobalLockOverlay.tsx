import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Lock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function GlobalLockOverlay() {
  const { uiLockState } = useAppStore();

  if (!uiLockState.isLocked) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-surface border border-red-500/50 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
            <Lock className="text-red-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-ink mb-2">ERİŞİM ENGELLENDİ</h2>
          <p className="text-ink-muted leading-relaxed mb-6">
            <AlertTriangle className="inline-block mr-2 text-yellow-500" size={16} />
            {uiLockState.reason || 'Kaçınma seviyeniz kritik düzeye ulaştı. Zorunlu görevi tamamlamadan bu alana erişemezsiniz.'}
          </p>
          <button 
            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20"
            onClick={() => {
              // Redirect logic to dashboard where task can be completed
              window.location.href = '/';
            }}
          >
            SAVAŞ ODASINA GERİ DÖN
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
