/** 
 * AMAÇ: War Room Üst Bar & Mod Yönetimi
 * MANTIK: Timer, Soru özeti ve Solve/Draw arası hızlı geçiş.
 */

import React from 'react';
import { Clock, X, CheckCircle2, PenTool, MousePointer2, BrainCircuit } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export function TopBar({ timeLeft, onExit }: { timeLeft: number, onExit: () => void }) {
  const store = useAppStore();
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex-1 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={onExit}
          className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-xl transition-all"
        >
          <X size={20} />
        </button>
        <div className="h-8 w-px bg-border hidden md:block" />
        <div className="hidden md:flex flex-col">
          <span className="text-[10px] font-bold text-accent uppercase tracking-widest leading-none">WAR ROOM</span>
          <span className="text-xs opacity-50 font-mono mt-1">Savaş Simülasyonu v5.1</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${timeLeft <= 30 ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse' : 'bg-black/5 dark:bg-white/5 border-border text-zinc-400'}`}>
          <Clock size={16} />
          <span className="font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
        </div>
      </div>
    </div>
  );
}

export function ModeSwitcher() {
  const store = useAppStore();
  
  const modes = [
    { id: 'solve', label: 'Çöz', icon: <MousePointer2 size={16} />, dMode: 'pointer' as const },
    { id: 'draw', label: 'Çiz', icon: <PenTool size={16} />, dMode: 'pen' as const },
    { id: 'analysis', label: 'Analiz', icon: <BrainCircuit size={16} />, dMode: 'pointer' as const },
  ] as const;

  return (
    <div className="inline-flex bg-white/20 dark:bg-black/40 backdrop-blur-3xl p-1.5 rounded-3xl border border-white/10 shadow-2xl relative">
       {modes.map((m) => (
         <button
           key={m.id}
           onClick={() => {
             // WarRoomMode sadece setup|solve|result olarak kalır.
             if (store.warRoomMode === 'setup') {
               store.setWarRoomMode('solve');
             }
             store.setDrawingMode(m.dMode);
           }}
           className={`
             flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] uppercase font-bold tracking-widest transition-all
             ${((m.id === 'solve' || m.id === 'analysis') && store.drawingMode === 'pointer') || (m.id === 'draw' && store.drawingMode !== 'pointer')
                ? 'bg-accent text-white shadow-xl shadow-accent/20 scale-105' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
             }
           `}
         >
           {m.icon}
           <span className="hidden sm:inline">{m.label}</span>
         </button>
       ))}
    </div>
  );
}
