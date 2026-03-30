import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, Square, Zap, Clock, Timer, History, Coffee, Music, EyeOff } from 'lucide-react';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { useAppStore } from '../store/appStore';
import { FlapUnit } from './FlapClock';

export function FocusSidePanel() {
  const { isFocusSidePanelOpen, setFocusSidePanelOpen, addFocusSession } = useAppStore();
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

  const [customCountdownMinutes, setCustomCountdownMinutes] = useState<number>(25);
  const [showBreakOverlay, setShowBreakOverlay] = useState(false);
  const [isLofiEnabled, setIsLofiEnabled] = useState(() => {
    return localStorage.getItem('yks_lofi_enabled') === 'true';
  });

  const h = Math.floor(sessionSeconds / 3600);
  const m = Math.floor((sessionSeconds % 3600) / 60);
  const s = sessionSeconds % 60;

  const presets = useMemo(() => ([
    { label: '1.5 Saat', seconds: 90 * 60, icon: <Zap size={14} /> },
    { label: '3 Saat', seconds: 180 * 60, icon: <Zap size={14} /> },
    { label: '2.45 Saat', seconds: 165 * 60, icon: <History size={14} /> },
  ]), []);

  // 90 Dk Zorunlu Mola Kontrolü (5400 saniye)
  useEffect(() => {
    if (sessionSeconds >= 5400 && mode === 'up' && isRunning) {
      pause();
      setShowBreakOverlay(true);
    }
  }, [sessionSeconds, mode, isRunning, pause]);

  // Lofi state persist
  useEffect(() => {
    localStorage.setItem('yks_lofi_enabled', String(isLofiEnabled));
  }, [isLofiEnabled]);

  return (
    <>
      <AnimatePresence>
        {isFocusSidePanelOpen && (
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsLofiEnabled(p => !p)}
                  className={`p-2 rounded-full transition-colors ${isLofiEnabled ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-transparent text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
                  title="Lo-Fi Radyo"
                >
                  {isLofiEnabled ? <Music size={18} /> : <EyeOff size={18} />}
                </button>
                <button 
                  onClick={() => setFocusSidePanelOpen(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors opacity-50 hover:opacity-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar relative">
              
              {/* Lofi Player (Iframe) */}
              {isLofiEnabled && (
                <div className="w-full h-24 mb-4 rounded-xl overflow-hidden border border-[#EAE6DF] dark:border-zinc-800">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&mute=0&controls=0&modestbranding=1" 
                    title="Lofi Girl" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  ></iframe>
                </div>
              )}

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

              {mode === 'down' && (
                <div className="space-y-3">
                  <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">ÖZEL SÜRE</h3>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      min={1}
                      max={240}
                      value={customCountdownMinutes}
                      onChange={(e) => setCustomCountdownMinutes(Math.max(1, Math.min(240, Number(e.target.value) || 1)))}
                      className="flex-1 bg-white dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#C17767] text-[#4A443C] dark:text-zinc-200"
                      placeholder="Dakika"
                    />
                    <button
                      onClick={() => setDuration(customCountdownMinutes * 60)}
                      className="px-5 py-4 bg-[#C17767] text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-[#A56253] transition-colors"
                    >
                      Uygula
                    </button>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest opacity-50 text-[#4A443C] dark:text-zinc-400">
                    Limit: 1–240 dakika
                  </div>
                </div>
              )}

              {/* Session Saver */}
              <div className="pt-6">
                <button 
                  onClick={() => {
                    const lap = addLap();
                    if (lap) {
                       const startTime = lap.startTime;
                       const endTime = new Date(new Date(startTime).getTime() + lap.durationInSeconds * 1000).toISOString();
                       addFocusSession({
                         id: lap.id,
                         startTime,
                         endTime,
                         durationSeconds: lap.durationInSeconds,
                         label: mode === 'down' ? 'Geri Sayım' : 'Kronometre',
                       });
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
        )}
      </AnimatePresence>

      {/* 90 Dk Zorunlu Mola Overlay */}
      <AnimatePresence>
        {showBreakOverlay && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-24 h-24 bg-[#E09F3E]/20 text-[#E09F3E] rounded-full flex items-center justify-center mb-8 border border-[#E09F3E]/50 animate-pulse">
              <Coffee size={40} />
            </div>
            <h2 className="font-display italic text-5xl md:text-7xl text-zinc-200 mb-6">Mola Vakti</h2>
            <p className="text-zinc-400 text-lg md:text-xl max-w-xl mx-auto mb-12">
              Aralıksız 90 dakika odaklandın. Dopamin reseptörlerini sıfırlamak ve gözlerini dinlendirmek için sistem kilitlendi. Su iç, pencereden dışarı bak veya uzağa odaklan.
            </p>
            
            <button 
              onClick={() => {
                setShowBreakOverlay(false);
                reset();
              }}
              className="px-8 py-4 bg-zinc-800 text-white rounded-2xl text-xs font-bold uppercase tracking-[0.2em] border border-zinc-700 hover:bg-zinc-700 transition-colors"
            >
              Uyarımı Aldım, Kapat
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
