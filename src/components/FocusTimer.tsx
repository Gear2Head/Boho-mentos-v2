import React, { useState } from 'react';
import { Play, Pause, Square, History, Plus } from 'lucide-react';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { useToast } from './ToastContext';

export function FocusTimer() {
  const { sessionSeconds, formattedTime, isRunning, start, pause, reset, addLap } = useFocusTimer();
  const { toast } = useToast();
  const [showToast, setShowToast] = useState(false);

  const handleLap = () => {
    if (sessionSeconds < 60) {
      toast.warning("En az 1 dakika çalışmalısın.");
      return;
    }
    addLap();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="relative border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-4 shadow-sm flex items-center justify-between">
      {/* Toast Bildirimi */}
      <div 
        className={`absolute -top-12 left-1/2 -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all duration-300 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
      >
        🌟 Harika bir oturum çıkardın! Mola zamanı.
      </div>

      <div className="flex items-center gap-4">
        <div className="text-[#C17767] dark:text-rose-400 bg-[#C17767]/10 dark:bg-rose-400/10 w-10 h-10 rounded-full flex items-center justify-center">
          <History size={18} />
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-widest opacity-50 font-bold dark:text-zinc-200">Odak Süresi</h4>
          <span className="text-2xl font-mono text-[#4A443C] dark:text-zinc-200 leading-none block mt-1">
            {formattedTime}
          </span>
        </div>
      </div>

      <div className="flex bg-[#F5F2EB] dark:bg-zinc-950 p-1 rounded-lg border border-[#EAE6DF] dark:border-zinc-800">
        {!isRunning ? (
          <button 
            onClick={start}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 text-[#4A443C] dark:text-zinc-200 hover:bg-[#C17767] hover:text-white dark:hover:border-rose-400 transition-colors shadow-sm"
            title="Başlat"
          >
            <Play size={16} fill="currentColor" />
          </button>
        ) : (
          <button 
            onClick={pause}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 text-[#E09F3E] hover:bg-[#E09F3E] hover:text-white transition-colors shadow-sm"
            title="Duraklat"
          >
            <Pause size={16} fill="currentColor" />
          </button>
        )}
        
        <button 
          onClick={reset}
          disabled={sessionSeconds === 0}
          className="w-10 h-10 flex items-center justify-center rounded-md text-[#8C857B] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 ml-1"
          title="Sıfırla"
        >
          <Square size={14} fill="currentColor" />
        </button>
        
        <button 
          onClick={handleLap}
          disabled={sessionSeconds === 0}
          className="w-10 h-10 flex items-center justify-center rounded-md text-[#8C857B] hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-30 border-l border-[#EAE6DF] dark:border-zinc-800 ml-1 rounded-l-none"
          title="Turu Bitir (Kaydet)"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
