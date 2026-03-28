import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Square, Zap, Clock, Timer, History } from 'lucide-react';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { useAppStore } from '../store/appStore';
import { FlapUnit } from './FlapClock';

export function FocusSidePanel() {
  const { isFocusSidePanelOpen, setFocusSidePanelOpen } = useAppStore();
  const { 
    sessionSeconds, 
    isRunning, 
    mode, 
    start, 
    pause, 
    reset, 
    setDuration, 
    setStopwatch,
    addLap 
  } = useFocusTimer();

  if (!isFocusSidePanelOpen) return null;

  const h = Math.floor(sessionSeconds / 3600);
  const m = Math.floor((sessionSeconds % 3600) / 60);
  const s = sessionSeconds % 60;

  const presets = [
    { label: '1.5 Saat', seconds: 90 * 60, icon: <Zap size={14} /> },
    { label: '3 Saat', seconds: 180 * 60, icon: <Zap size={14} /> },
    { label: '2.45 Saat', seconds: 165 * 60, icon: <History size={14} /> },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-full md:w-96 bg-[#FDFBF7] dark:bg-zinc-950 border-l border-[#EAE6DF] dark:border-zinc-800 z-50 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#EAE6DF] dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C17767]/10 rounded-lg text-[#C17767]">
              <Clock size={20} />
            </div>
            <h2 className="font-display font-bold text-xl dark:text-zinc-200">Odak UzayI</h2>
          </div>
          <button 
            onClick={() => setFocusSidePanelOpen(false)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors opacity-50 hover:opacity-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          
          {/* Mode Selector */}
          <div className="bg-[#F5F2EB] dark:bg-zinc-900 p-1 rounded-xl flex">
            <button 
              onClick={setStopwatch}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'up' ? 'bg-[#FFFFFF] dark:bg-zinc-800 shadow-sm text-[#C17767]' : 'opacity-40 hover:opacity-70'}`}
            >
              <Timer size={14} /> KRONOMETRE
            </button>
            <button 
              onClick={() => setDuration(1500)} // Default 25 min if clicked raw
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'down' ? 'bg-[#FFFFFF] dark:bg-zinc-800 shadow-sm text-[#C17767]' : 'opacity-40 hover:opacity-70'}`}
            >
              <History size={14} /> GERİ SAYIM
            </button>
          </div>

          {/* FLAP TIMER */}
          <div className="flex justify-center gap-2 py-4">
             <FlapUnit value={h} label="Saat" />
             <div className="text-3xl font-bold opacity-20 mt-6">:</div>
             <FlapUnit value={m} label="Dak" />
             <div className="text-3xl font-bold opacity-20 mt-6">:</div>
             <FlapUnit value={s} label="San" />
          </div>

          {/* Controls */}
          <div className="flex gap-3 justify-center">
            {!isRunning ? (
                <button 
                  onClick={start}
                  className="w-16 h-16 flex items-center justify-center bg-[#C17767] text-white rounded-full shadow-lg shadow-[#C17767]/30 hover:scale-105 transition-transform"
                >
                  <Play size={28} fill="currentColor" />
                </button>
            ) : (
                <button 
                  onClick={pause}
                  className="w-16 h-16 flex items-center justify-center bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 rounded-full shadow-lg hover:scale-105 transition-transform"
                >
                  <Pause size={28} fill="currentColor" />
                </button>
            )}
            
            <button 
              onClick={reset}
              className="w-16 h-16 flex items-center justify-center bg-white dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 text-zinc-400 hover:text-red-500 rounded-full hover:scale-105 transition-all"
            >
              <Square size={24} fill="currentColor" />
            </button>
          </div>

          {/* Presets */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">HAZIR ŞABLONLAR</h3>
            <div className="grid grid-cols-1 gap-2">
               {presets.map((p, idx) => (
                 <button 
                  key={idx}
                  onClick={() => setDuration(p.seconds)}
                  className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl hover:border-[#C17767] group transition-all"
                 >
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#FDFBF7] dark:bg-zinc-800 rounded-xl group-hover:bg-[#C17767]/10 transition-colors">
                        {p.icon}
                      </div>
                      <span className="font-bold text-sm dark:text-zinc-300">{p.label}</span>
                   </div>
                   <div className="text-xs font-mono opacity-40">Süreni Ayarla</div>
                 </button>
               ))}
            </div>
          </div>

          {/* Session Saver */}
          <div className="pt-6">
            <button 
              onClick={() => {
                const lap = addLap();
                if (lap) {
                   setFocusSidePanelOpen(false);
                }
              }}
              disabled={sessionSeconds === 0}
              className="w-full py-4 bg-zinc-900 dark:bg-zinc-200 text-white dark:text-zinc-900 rounded-2xl font-bold text-xs uppercase tracking-widest disabled:opacity-30 shadow-xl"
            >
              OTURUMU TAMAMLA VE KAYDET
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
