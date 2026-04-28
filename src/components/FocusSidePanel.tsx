import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, Square, Zap, Clock, Timer, History, Coffee, Music, EyeOff, CloudRain, Wind, Waves, Volume2 } from 'lucide-react';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { useAppStore } from '../store/appStore';
import { FlapUnit } from './FlapClock';
import { AudioEngine } from '../utils/audioEngine';

export function FocusSidePanel() {
  const isFocusSidePanelOpen = useAppStore((s) => s.isFocusSidePanelOpen);
  const setFocusSidePanelOpen = useAppStore((s) => s.setFocusSidePanelOpen);
  const addFocusSession = useAppStore((s) => s.addFocusSession);
  const isLofiEnabled = useAppStore((s) => s.isLofiEnabled);
  const setLofiEnabled = useAppStore((s) => s.setLofiEnabled);
  const ambienceType = useAppStore((s) => s.ambienceType);
  const setAmbienceType = useAppStore((s) => s.setAmbienceType);
  const ambienceVolume = useAppStore((s) => s.ambienceVolume);
  const setAmbienceVolume = useAppStore((s) => s.setAmbienceVolume);
  const focusSessions = useAppStore((s) => s.focusSessions);
  const profile = useAppStore((s) => s.profile);
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
  const [showInterventionPrompt, setShowInterventionPrompt] = useState(false);
  const [interventionFiredAt, setInterventionFiredAt] = useState<number | null>(null);
  const [pauseCount, setPauseCount] = useState(0);

  const handlePause = () => {
    if (sessionSeconds > 0) setPauseCount(p => p + 1);
    pause();
  };

  const h = Math.floor(sessionSeconds / 3600);
  const m = Math.floor((sessionSeconds % 3600) / 60);
  const s = sessionSeconds % 60;

  const presets = useMemo(() => ([
    { label: '1.5 Saat', seconds: 90 * 60, icon: <Zap size={14} /> },
    { label: '3 Saat', seconds: 180 * 60, icon: <Zap size={14} /> },
    { label: '2.45 Saat', seconds: 165 * 60, icon: <History size={14} /> },
  ]), []);

  // Task 8: Proactive Intervention v2 — fire at 50 min of continuous focus
  useEffect(() => {
    const INTERVENTION_THRESHOLD = 50 * 60; // 50 minutes in seconds
    if (
      mode === 'up' &&
      isRunning &&
      sessionSeconds >= INTERVENTION_THRESHOLD &&
      interventionFiredAt !== Math.floor(sessionSeconds / INTERVENTION_THRESHOLD)
    ) {
      setInterventionFiredAt(Math.floor(sessionSeconds / INTERVENTION_THRESHOLD));
      setShowInterventionPrompt(true);
    }
  }, [sessionSeconds, mode, isRunning, interventionFiredAt]);

  // 90 Dk Zorunlu Mola Kontrolü (5400 saniye)
  useEffect(() => {
    if (sessionSeconds >= 5400 && mode === 'up' && isRunning) {
      handlePause();
      setShowBreakOverlay(true);
      AudioEngine.playTimerDone();
    }
  }, [sessionSeconds, mode, isRunning, handlePause]);

  // Ambience Sync
  useEffect(() => {
    if (ambienceType === 'none') {
      AudioEngine.stopAmbience();
    } else {
      AudioEngine.startAmbience(ambienceType, ambienceVolume);
    }
  }, [ambienceType]);

  useEffect(() => {
    AudioEngine.setAmbienceVolume(ambienceVolume);
  }, [ambienceVolume]);

  const dailyFocusSeconds = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (focusSessions ?? [])
      .filter(s => s.startTime.startsWith(today))
      .reduce((acc, s) => acc + s.durationSeconds, 0);
  }, [focusSessions]);

  const focusGoalSeconds = (profile?.minHours ?? 6) * 3600;
  const focusProgress = Math.min((dailyFocusSeconds / focusGoalSeconds) * 100, 100);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      <AnimatePresence>
        {isFocusSidePanelOpen && (
          <motion.div
            initial={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 md:top-0 right-0 h-[85dvh] md:h-full w-full md:w-96 bg-zinc-950/95 backdrop-blur-2xl md:bg-[#FDFBF7] dark:md:bg-zinc-950 border-t md:border-t-0 md:border-l border-white/10 md:border-[#EAE6DF] dark:md:border-zinc-800 z-50 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] md:shadow-2xl flex flex-col rounded-t-[2.5rem] md:rounded-none"
          >
            {isMobile && <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 mb-2 shrink-0 max-md:block hidden" />}
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
                  onClick={() => setLofiEnabled(!isLofiEnabled)}
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
              {/* Lofi Player */}
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
                  onClick={() => setDuration(1500)}
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
                      onClick={handlePause}
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

              {/* Ambience Mixer */}
              <div className="space-y-4">
                <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-40 ml-1">ORTAM ATMOSFERİ</h3>
                <div className="bg-white dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl p-4 space-y-4">
                  <div className="flex gap-2">
                    {[
                      { id: 'none', icon: <X size={16} />, label: 'Kapalı' },
                      { id: 'white', icon: <CloudRain size={16} />, label: 'Beyaz' },
                      { id: 'pink', icon: <Waves size={16} />, label: 'Pembe' },
                      { id: 'brown', icon: <Wind size={16} />, label: 'Kahve' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setAmbienceType(item.id as any)}
                        className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${ambienceType === item.id ? 'bg-[#C17767]/10 border-[#C17767] text-[#C17767]' : 'border-[#EAE6DF] dark:border-zinc-800 text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                      >
                        {item.icon}
                        <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                      </button>
                    ))}
                  </div>
                  
                  {ambienceType !== 'none' && (
                    <div className="flex items-center gap-3 px-1">
                      <Volume2 size={14} className="text-zinc-400" />
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={ambienceVolume} 
                        onChange={(e) => setAmbienceVolume(parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#C17767]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Progress */}
              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <h3 className="text-[10px] uppercase font-bold tracking-widest opacity-40">GÜNLÜK ODAK HEDEFİ</h3>
                  <span className="text-[10px] font-mono font-bold text-[#C17767]">{Math.floor(dailyFocusSeconds / 3600)}sa {Math.floor((dailyFocusSeconds % 3600) / 60)}dk</span>
                </div>
                <div className="h-4 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-[#EAE6DF] dark:border-zinc-800 p-0.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${focusProgress}%` }}
                    className="h-full bg-gradient-to-r from-[#C17767] to-[#E09F3E] rounded-full shadow-[0_0_10px_rgba(193,119,103,0.3)]"
                  />
                </div>
                <p className="text-[9px] text-center opacity-30 font-medium italic">Bugünkü hedefin %{Math.round(focusProgress)} tamamlandı.</p>
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
                       
                       // Derin Odak Skoru (Deep Work Score) - Phase 6
                       // Formül: %100'den başla, her duraklatma için -10 puan, her 30 dk için +5 bonus, min 0 max 100.
                       const durationMinutes = Math.floor(lap.durationInSeconds / 60);
                       const bonus = Math.floor(durationMinutes / 30) * 5;
                       const penalty = pauseCount * 10;
                       let deepWorkScore = 100 - penalty + bonus;
                       deepWorkScore = Math.max(0, Math.min(100, deepWorkScore));

                       addFocusSession({
                         id: lap.id,
                         startTime,
                         endTime,
                         durationSeconds: lap.durationInSeconds,
                         label: mode === 'down' ? 'Geri Sayım' : 'Kronometre',
                         interruptions: pauseCount,
                         deepWorkScore: deepWorkScore
                       });
                       setFocusSidePanelOpen(false);
                       setPauseCount(0); // Reset for next session
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
              Aralıksız 90 dakika odaklandın. Su iç, pencereden dışarı bak veya uzağa odaklan.
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

      {/* Task 8: Proactive Intervention v2 — Active Recall prompt at 50min */}
      <AnimatePresence>
        {showInterventionPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-[9998] w-80 glass-card rounded-3xl p-6 border border-purple-500/30 bg-purple-950/20 shadow-2xl shadow-purple-500/10"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <Zap size={18} className="text-purple-400" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest font-black text-purple-400">Kübra Müdahalesi</p>
                <h4 className="font-display italic text-base font-bold text-zinc-100">50 Dakika Doldu!</h4>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Aktif Hatırlama zamanı. Şimdiye kadar öğrendiklerini bir kenara yaz. Beyin konsolidasyonu için 5 dakika mola ver.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowInterventionPrompt(false)}
                className="flex-1 py-2.5 bg-purple-500/20 text-purple-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/30 transition-all"
              >
                Anladım
              </button>
              <button
                onClick={() => { handlePause(); setShowInterventionPrompt(false); }}
                className="flex-1 py-2.5 bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-400 transition-all"
              >
                Mola Ver
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
