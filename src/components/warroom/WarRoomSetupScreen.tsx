/**
 * AMAÇ: War Room başlangıç/konfigürasyon ekranı
 * MANTIK: Animasyonlu hedef/seviye seçimi, ardından oturumu başlatır
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, Swords, ChevronRight, Loader2 } from 'lucide-react';
import { useWarRoom } from '../../hooks/useWarRoom';

export function WarRoomSetupScreen() {
  const { startSession, isGenerating, error } = useWarRoom();
  const [examType, setExamType] = useState<'TYT' | 'AYT'>('TYT');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'elite'>('medium');
  const [count, setCount] = useState(5);

  const handleStart = () => {
    // 5 soru = 5 * 2dk = 10dk vb. (her seviyede süre formülü değiştirilebilir)
    const timeLimitS = count * 90;
    startSession({ examType, difficulty, count }, timeLimitS);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C17767]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#4A443C]/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl z-10"
      >
        <div className="mb-12 text-center">
           <div className="inline-flex items-center justify-center p-4 bg-[#C17767]/10 dark:bg-rose-900/10 rounded-2xl mb-6 shadow-xl shadow-[#C17767]/5">
             <Swords size={32} className="text-[#C17767] dark:text-rose-400 stroke-[1.5]" />
           </div>
           <h1 className="font-display italic text-5xl font-bold bg-gradient-to-br from-[#111] to-[#666] dark:from-white dark:to-zinc-500 bg-clip-text text-transparent mb-4 tracking-tight">Savaş Odası</h1>
           <p className="font-mono text-sm uppercase tracking-[0.3em] font-bold text-[#C17767]">Gerçek Ölçekli Simülasyon</p>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#121212] border border-[#EAE6DF] dark:border-[#2A2A2A] rounded-[2rem] p-8 shadow-2xl shadow-black/5">
           
           {/* TYPE SELECTOR */}
           <div className="mb-8">
             <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#4A443C] dark:text-zinc-500 mb-4 ml-2">ARENA SEÇİMİ</h3>
             <div className="grid grid-cols-2 gap-3">
               {(['TYT', 'AYT'] as const).map(type => (
                 <button
                   key={type}
                   onClick={() => setExamType(type)}
                   className={`relative overflow-hidden group py-4 px-6 rounded-2xl border transition-all duration-300 ${examType === type ? 'bg-[#C17767] border-[#C17767] text-white shadow-lg shadow-[#C17767]/20 scale-[1.02]' : 'bg-[#FDFBF7] dark:bg-[#1A1A1A] border-[#EAE6DF] dark:border-[#2A2A2A] text-zinc-500 hover:border-[#C17767]/30'}`}
                 >
                   <div className="relative z-10 flex items-center justify-center gap-2 font-bold tracking-widest text-sm">
                     {type === 'TYT' ? <Zap size={16} /> : <Target size={16} />} {type} CEPHESİ
                   </div>
                 </button>
               ))}
             </div>
           </div>

           {/* DIFFICULTY SELECTOR */}
           <div className="mb-8">
             <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#4A443C] dark:text-zinc-500 mb-4 ml-2">DİRENÇ SEVİYESİ</h3>
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
               {[
                 { id: 'easy', label: 'EASY', desc: 'Isınma Turu' },
                 { id: 'medium', label: 'MEDIUM', desc: 'Sınav Ayarı' },
                 { id: 'hard', label: 'HARD', desc: 'Seçici Sorular' },
                 { id: 'elite', label: 'ELITE', desc: 'Ölümcül Darbe' }
               ].map(level => (
                 <button
                   key={level.id}
                   onClick={() => setDifficulty(level.id as any)}
                   className={`p-3 rounded-xl border text-left transition-all ${difficulty === level.id ? 'bg-[#4A443C] dark:bg-zinc-800 border-transparent text-white shadow-md' : 'bg-transparent border-[#EAE6DF] dark:border-[#2A2A2A] text-zinc-500 hover:border-zinc-400'}`}
                 >
                   <div className="text-xs font-bold tracking-widest mb-1 leading-none">{level.label}</div>
                   <div className="text-[9px] font-mono opacity-60 leading-tight block truncate">{level.desc}</div>
                 </button>
               ))}
             </div>
           </div>

           {error && (
             <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-mono font-bold">
               {error}
             </motion.div>
           )}

           <button
             onClick={handleStart}
             disabled={isGenerating}
             className="w-full relative overflow-hidden group py-5 rounded-2xl bg-[#C17767] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-2xl shadow-[#C17767]/30"
           >
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
             <div className="relative z-10 flex items-center justify-center gap-3">
               {isGenerating ? (
                 <>
                   <Loader2 size={18} className="animate-spin" />
                   <span className="text-sm font-bold tracking-[0.2em] uppercase">Mühimmat Yükleniyor...</span>
                 </>
               ) : (
                 <>
                   <span className="text-sm font-bold tracking-[0.2em] uppercase text-shadow-sm">Savaşa Başla</span>
                   <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                 </>
               )}
             </div>
           </button>
        </div>
      </motion.div>
    </div>
  );
}
