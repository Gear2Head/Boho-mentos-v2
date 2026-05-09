import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Target, AlertTriangle, LogOut, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { FlapUnit } from './FlapClock';

export function ExamSimulator() {
  const navigate = useNavigate();
  const addExam = useAppStore(s => s.addExam);
  
  const [examType, setExamType] = useState<'TYT' | 'AYT' | null>(null);
  const [mode, setMode] = useState<'setup' | 'active' | 'finished'>('setup');
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [warnEscaped, setWarnEscaped] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Setup Times
  const TYT_SECONDS = 165 * 60;
  const AYT_SECONDS = 180 * 60;

  useEffect(() => {
    // Prevent closing tab
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (mode === 'active') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [mode]);

  useEffect(() => {
    // Fullscreen listener to catch escapes
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && mode === 'active') {
        setWarnEscaped(true);
      } else {
        setWarnEscaped(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [mode]);

  useEffect(() => {
    if (mode === 'active' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            finishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, timeLeft]);

  const startExam = async (type: 'TYT' | 'AYT') => {
    setExamType(type);
    setTimeLeft(type === 'TYT' ? TYT_SECONDS : AYT_SECONDS);
    setMode('active');

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request failed", e);
    }
  };

  const finishExam = () => {
    setMode('finished');
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
  };

  const abortExam = () => {
    if (window.confirm("Sınavı iptal etmek istediğine emin misin? Tüm veriler silinecek.")) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
      navigate('/dashboard');
    }
  };

  const goToExamEntry = () => {
    navigate('/dashboard');
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('OPEN_EXAM_MODAL'));
    }, 500);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return { h, m, s };
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black text-white flex flex-col items-center justify-center overflow-hidden">
      
      {mode === 'setup' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl w-full p-8 relative">
          <div className="absolute inset-0 bg-red-900/10 blur-3xl rounded-full" />
          <div className="relative z-10 text-center">
            <Target size={48} className="mx-auto text-red-500 mb-6" />
            <h1 className="font-display italic text-5xl mb-4 text-white">Sınav Simülasyonu</h1>
            <p className="text-zinc-400 mb-12 max-w-md mx-auto text-sm leading-relaxed">
              Tam ekran moduna geçilecek. Sınav bitene kadar sekme değiştirilemez ve dışarı çıkılamaz. 
              Mokoko'ya hazırlık ciddiyet gerektirir.
            </p>

            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => startExam('TYT')}
                className="group relative px-8 py-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-blue-500/20 to-transparent translate-y-full group-hover:translate-y-0 transition-transform" />
                <h3 className="text-3xl font-display font-bold text-blue-400 mb-2">TYT</h3>
                <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">165 Dakika</p>
              </button>

              <button 
                onClick={() => startExam('AYT')}
                className="group relative px-8 py-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-amber-500/20 to-transparent translate-y-full group-hover:translate-y-0 transition-transform" />
                <h3 className="text-3xl font-display font-bold text-amber-400 mb-2">AYT</h3>
                <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">180 Dakika</p>
              </button>
            </div>
            
            <button onClick={() => navigate('/dashboard')} className="mt-12 text-xs text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">
              İptal ve Geri Dön
            </button>
          </div>
        </motion.div>
      )}

      {mode === 'active' && (
        <div className="w-full h-full flex flex-col items-center justify-center relative">
          {/* Ambient red glow for urgency when time is low */}
          <div className="absolute inset-0 transition-opacity duration-1000 pointer-events-none" 
               style={{ 
                 background: 'radial-gradient(circle at center, rgba(239,68,68,0.15) 0%, transparent 60%)',
                 opacity: timeLeft < 1800 ? 1 : 0 // Show red glow in last 30 minutes
               }} 
          />

          <div className="absolute top-8 w-full px-12 flex justify-between items-start">
            <div>
              <span className={`px-4 py-1.5 rounded border text-xs font-bold tracking-widest uppercase ${examType === 'TYT' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                {examType} SİMÜLASYONU
              </span>
            </div>
            <button onClick={abortExam} className="flex items-center gap-2 text-zinc-600 hover:text-red-500 transition-colors">
              <LogOut size={16} />
              <span className="text-[10px] uppercase font-bold tracking-widest">Sınavı İptal Et</span>
            </button>
          </div>

          <div className="z-10 text-center">
             <div className="flex justify-center gap-4 py-8 scale-150">
               <FlapUnit value={formatTime(timeLeft).h} label="Saat" />
               <div className="text-3xl font-bold opacity-20 mt-6 text-white">:</div>
               <FlapUnit value={formatTime(timeLeft).m} label="Dakika" />
               <div className="text-3xl font-bold opacity-20 mt-6 text-white">:</div>
               <FlapUnit value={formatTime(timeLeft).s} label="Saniye" />
            </div>
            <p className="mt-8 text-zinc-500 font-mono text-xs tracking-widest uppercase">Kalan Süre</p>
          </div>

          <div className="absolute bottom-12 z-10">
            <button onClick={finishExam} className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-white text-xs tracking-[0.2em] uppercase font-bold transition-all">
              Erken Bitir
            </button>
          </div>
        </div>
      )}

      {mode === 'finished' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center z-10 relative">
          <CheckCircle2 size={64} className="mx-auto text-green-500 mb-6" />
          <h1 className="font-display italic text-6xl mb-4 text-white">Sınav Tamamlandı</h1>
          <p className="text-zinc-400 mb-12 text-sm uppercase tracking-widest font-bold">Harika bir iş çıkardın.</p>
          
          <div className="flex flex-col gap-4 items-center">
            <button onClick={goToExamEntry} className="px-8 py-4 bg-green-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-green-500 transition-colors">
              Sonuçları (Netleri) Gir
            </button>
            <button onClick={() => navigate('/dashboard')} className="text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
              Dashboard'a Dön
            </button>
          </div>
        </motion.div>
      )}

      {/* Warning Overlay for Escaping Fullscreen */}
      <AnimatePresence>
        {warnEscaped && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-950/95 backdrop-blur-xl z-[99999] flex flex-col items-center justify-center p-8 text-center"
          >
            <AlertTriangle size={64} className="text-red-500 mb-6 animate-bounce" />
            <h2 className="font-display italic text-5xl text-white mb-4">Sınav İhlali!</h2>
            <p className="text-red-200/80 mb-12 max-w-lg text-lg">
              Tam ekran modundan çıktın. Gerçek sınavda salondan çıkamazsın. Odaklan ve geri dön!
            </p>
            <button 
              onClick={async () => {
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                  }
                  setWarnEscaped(false);
                } catch(e) {
                  console.error(e);
                  setWarnEscaped(false); // fallback
                }
              }}
              className="px-8 py-4 bg-red-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-red-500 transition-colors shadow-2xl shadow-red-500/20"
            >
              Tam Ekrana Dön ve Devam Et
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
