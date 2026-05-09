/**
 * AMAÇ: Günlük Koç Durum Brifingi — KOÇ ekranının ana bileşeni.
 * MANTIK: Boş sohbet listesi yerine öğrenciye anlamlı açılış ekranı sunar.
 *
 * V19 (COACH-PRODUCT-001, COACH-PRODUCT-002, UX-006):
 *  - Üstte: Durum özeti (ELO, seri, net gap)
 *  - Ortada: Son direktif (tamamlanabilir görevler)
 *  - Altta: Hızlı komut seçenekleri
 *  - Task completion lifecycle: tamamla / atla butonları
 */

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  SkipForward,
  Zap,
  AlertTriangle,
  TrendingUp,
  Target,
  Flame,
  ChevronRight,
  ChevronRight,
  Loader2,
  Activity,
  BrainCircuit,
  Info,
  Layers,
  Fingerprint,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { completeTask, skipTask, updateInHistory, calcComplianceRate } from '../services/directiveHistory';
import type { CoachIntent, DirectiveRecord } from '../types/coach';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CoachBriefingProps {
  onSendMessage: (message: string, intent?: CoachIntent) => void;
  isTyping: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CoachBriefing({ onSendMessage, isTyping }: CoachBriefingProps) {
  const profile = useAppStore((s) => s.profile);
  const eloScore = useAppStore((s) => s.eloScore);
  const streakDays = useAppStore((s) => s.streakDays);
  const exams = useAppStore((s) => s.exams);
  const lastCoachDirective = useAppStore((s) => s.lastCoachDirective);
  const directiveHistory = useAppStore((s) => s.directiveHistory ?? []);
  const activeAlerts = useAppStore((s) => s.activeAlerts);

  // Net gap hesabı
  const lastTyt = [...exams].reverse().find((e) => e.type === 'TYT')?.totalNet ?? 0;
  const lastAyt = [...exams].reverse().find((e) => e.type === 'AYT')?.totalNet ?? 0;
  const tytGap = (profile?.tytTarget ?? 0) - lastTyt;
  const aytGap = (profile?.aytTarget ?? 0) - lastAyt;

  const complianceRate = calcComplianceRate(directiveHistory);
  const latestRecord = directiveHistory[0];

  // ─── Task Actions ────────────────────────────────────────────────────────

  const handleCompleteTask = useCallback(
    (taskIndex: number) => {
      if (!latestRecord) return;
      const updated = completeTask(latestRecord, taskIndex);
      const newHistory = updateInHistory(directiveHistory, updated);
      useAppStore.setState({
        directiveHistory: newHistory,
        lastCoachDirective: updated.directive,
      });
    },
    [latestRecord, directiveHistory]
  );

  const handleSkipTask = useCallback(
    (taskIndex: number) => {
      if (!latestRecord) return;
      const updated = skipTask(latestRecord, taskIndex, 'Kullanıcı atladı');
      const newHistory = updateInHistory(directiveHistory, updated);
      useAppStore.setState({
        directiveHistory: newHistory,
        lastCoachDirective: updated.directive,
      });
    },
    [latestRecord, directiveHistory]
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-10 space-y-12 pb-32 custom-scrollbar">
      {/* ── Cockpit Header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
              Kübra Intelligence OS v5.2
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-ink font-serif italic tracking-tight">
            Hoş Geldin, <span className="text-accent underline decoration-accent/20">{profile?.name || 'Warrior'}</span>
          </h2>
          <p className="text-zinc-500 text-sm mt-3 font-medium opacity-80 max-w-lg">
            Sistem aktif. Tüm loglar senkronize edildi. Bugünün stratejisi için brifing hazır.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-zinc-950/50 p-2 rounded-2xl border border-zinc-800/50 backdrop-blur-xl">
           <div className="flex flex-col px-4 border-r border-zinc-800">
             <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Sistem Durumu</span>
             <span className="text-xs font-black text-emerald-400">OPTIMAL</span>
           </div>
           <div className="flex flex-col px-4">
             <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Gereksinimler</span>
             <span className="text-xs font-black text-amber-400">3 GÖREV</span>
           </div>
        </div>
      </header>

      {/* ── Intelligence Grid (Bento) ── */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.08 } }
        }}
        className="grid grid-cols-1 md:grid-cols-12 gap-5"
      >
        {/* ELO & Streak - Glow Card */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="md:col-span-5 bento-card p-8 bg-gradient-to-br from-accent/10 to-transparent border-accent/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Fingerprint size={120} />
          </div>
          <div className="relative z-10 flex items-center justify-between">
             <div className="space-y-1">
               <div className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4">Performans İndeksi</div>
               <div className="text-6xl font-black text-ink tracking-tighter">{eloScore}</div>
               <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest pt-2">Global ELO Derecesi</div>
             </div>
             <div className="flex flex-col items-center gap-2 bg-zinc-950/40 p-4 rounded-3xl border border-white/5">
                <Flame size={32} className="text-orange-500" />
                <span className="text-2xl font-black">{streakDays}</span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">GÜN SERİ</span>
             </div>
          </div>
        </motion.div>

        {/* Academic Projection */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="md:col-span-7 bento-card p-8 bg-zinc-950/40 border-white/5 flex flex-col justify-between">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-400 flex items-center gap-2">
                <Target size={16} className="text-blue-500" /> Akademik Projeksiyon
              </h3>
              <div className="text-[10px] bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full font-black uppercase">
                Hedef %{Math.round(((lastTyt + lastAyt) / ((profile?.tytTarget || 1) + (profile?.aytTarget || 1))) * 100)}
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                 <div className="flex items-end justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TYT GAP</span>
                    <span className={`text-xl font-mono font-bold ${tytGap > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {tytGap > 0 ? `-${tytGap.toFixed(1)}` : `+${Math.abs(tytGap).toFixed(1)}`}
                    </span>
                 </div>
                 <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${Math.min(100, (lastTyt / (profile?.tytTarget || 1)) * 100)}%` }} 
                      className="h-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
                    />
                 </div>
              </div>
              <div className="space-y-4">
                 <div className="flex items-end justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AYT GAP</span>
                    <span className={`text-xl font-mono font-bold ${aytGap > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {aytGap > 0 ? `-${aytGap.toFixed(1)}` : `+${Math.abs(aytGap).toFixed(1)}`}
                    </span>
                 </div>
                 <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${Math.min(100, (lastAyt / (profile?.aytTarget || 1)) * 100)}%` }} 
                      className="h-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.5)]" 
                    />
                 </div>
              </div>
           </div>
        </motion.div>

        {/* Warning / Intelligence Bar */}
        <AnimatePresence>
          {activeAlerts.length > 0 && (
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
              className="md:col-span-12 flex items-center gap-4 p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl"
            >
              <div className="h-10 w-10 shrink-0 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">KRİTİK MÜDAHALE</div>
                <p className="text-xs text-rose-200/80 font-medium leading-relaxed truncate">{activeAlerts[0].message}</p>
              </div>
              <button onClick={() => onSendMessage('Tavsiye ver', 'intervention')} className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all">ANALİZ ET</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Directive Panel */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="md:col-span-12 lg:col-span-8 bento-card p-0 overflow-hidden bg-zinc-950/40 border-white/5">
           <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 bg-accent/20 rounded-2xl flex items-center justify-center text-accent">
                    <Activity size={24} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-ink font-serif italic italic">Aktif Görev Gücü</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Stratejik Direktifler & Aksiyon Planı</p>
                 </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-xl border border-white/5">
                 <Layers size={14} className="text-zinc-500" />
                 <span className="text-xs font-black font-mono tracking-widest text-zinc-400">%{complianceRate} UYUM</span>
              </div>
           </div>
           
           <div className="p-8">
              {latestRecord && !latestRecord.isResolved && lastCoachDirective ? (
                <div className="space-y-4">
                   <div className="mb-8 p-6 bg-accent/5 border border-accent/10 rounded-3xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Info size={40} className="text-accent" /></div>
                      <h4 className="text-lg font-bold text-accent mb-2">{lastCoachDirective.headline}</h4>
                      <p className="text-sm text-zinc-400 leading-relaxed font-medium">{lastCoachDirective.summary}</p>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-3">
                      {lastCoachDirective.tasks.map((task, i) => {
                        const isDone = task.status === 'completed';
                        const isSkipped = task.status === 'deferred' || task.status === 'cancelled';
                        const isDimmed = isDone || isSkipped;

                        return (
                          <div
                            key={i}
                            className={`group relative flex items-center gap-5 p-5 rounded-3xl border transition-all duration-300 ${
                              isDone
                                ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60'
                                : isSkipped
                                ? 'bg-zinc-900/40 border-zinc-800 opacity-40'
                                : 'bg-zinc-900/60 border-white/5 hover:border-accent/40 hover:bg-zinc-900/80'
                            }`}
                          >
                            <div className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center transition-all ${
                              isDone ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
                              isSkipped ? 'bg-zinc-800 text-zinc-500' :
                              task.priority === 'high' ? 'bg-rose-500/10 text-rose-500' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                               {isDone ? <CheckCircle2 size={24} /> : <span className="text-lg font-black font-mono">{i + 1}</span>}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                               <h5 className={`text-sm font-bold truncate ${isDimmed ? 'line-through text-zinc-600' : 'text-ink'}`}>
                                  {task.action}
                               </h5>
                               <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{task.subject || 'GENEL'}</span>
                                  {task.targetMinutes && <span className="text-[10px] font-mono text-zinc-600 tracking-tighter">[{task.targetMinutes} DK]</span>}
                                  {task.priority === 'high' && <span className="flex items-center gap-1 text-[8px] font-black uppercase text-rose-500 tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-full">KRİTİK</span>}
                               </div>
                            </div>
                            
                            {!isDimmed && (
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCompleteTask(i)}
                                  className="h-10 w-10 flex items-center justify-center bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                                  title="Tamamla"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleSkipTask(i)}
                                  className="h-10 w-10 flex items-center justify-center bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 hover:text-white transition-all"
                                  title="Atla"
                                >
                                  <SkipForward size={18} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                   </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                   <div className="h-20 w-20 bg-zinc-900 rounded-full border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600">
                      <BrainCircuit size={40} />
                   </div>
                   <div className="space-y-2">
                      <h4 className="text-xl font-bold text-ink">Direktif Bekleniyor</h4>
                      <p className="text-sm text-zinc-500 max-w-xs">Bugünün hedeflerini belirlemek ve aksiyon planı çıkarmak için Kübra'dan analiz iste.</p>
                   </div>
                   <button
                     onClick={() => onSendMessage('Günü analiz et ve bana direktif ver.', 'daily_plan')}
                     disabled={isTyping}
                     className="px-8 py-4 bg-accent text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-accent/20 hover:scale-105 transition-all disabled:opacity-50"
                   >
                     {isTyping ? <Loader2 size={16} className="animate-spin" /> : 'Stratejiyi Başlat'}
                   </button>
                </div>
              )}
           </div>
        </motion.div>

        {/* Quick Actions Panel */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="md:col-span-12 lg:col-span-4 space-y-5">
           <div className="bento-card p-8 bg-zinc-950/40 border-white/5">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-6">Neural Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                 {QUICK_COMMANDS.map((cmd) => (
                   <button
                     key={cmd.intent}
                     onClick={() => onSendMessage(cmd.message, cmd.intent)}
                     disabled={isTyping}
                     className="group flex items-center gap-4 p-4 bg-zinc-900/60 border border-white/5 rounded-2xl hover:border-accent/40 hover:bg-accent/5 transition-all disabled:opacity-50"
                   >
                     <div className="h-10 w-10 shrink-0 bg-zinc-800 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">{cmd.emoji}</div>
                     <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-accent transition-colors">{cmd.label}</span>
                     <ChevronRight size={14} className="ml-auto text-zinc-700 group-hover:text-accent transition-all group-hover:translate-x-1" />
                   </button>
                 ))}
              </div>
           </div>
           
           {/* Mini Coach Stats */}
           <div className="bento-card p-8 bg-accent text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20"><Zap size={60} /></div>
              <div className="relative z-10">
                 <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Gelişim Hızı</div>
                 <div className="text-3xl font-black">+%24.8</div>
                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-4 leading-relaxed">
                   Son 7 günde netlerinde tutarlı bir yükseliş gözlemlendi.
                 </p>
              </div>
           </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Status Card ──────────────────────────────────────────────────────────────

function StatusCard({
  icon,
  label,
  value,
  sub,
  valueClass = 'text-ink',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="bento-card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[9px] uppercase tracking-widest text-ink-muted font-black">
          {label}
        </span>
      </div>
      <div className={`text-2xl font-mono font-bold ${valueClass}`}>{value}</div>
      <div className="text-[9px] text-ink-muted uppercase tracking-widest mt-1 font-medium">{sub}</div>
    </div>
  );
}

// ─── Quick Commands ───────────────────────────────────────────────────────────

const QUICK_COMMANDS: Array<{
  emoji: string;
  label: string;
  message: string;
  intent: CoachIntent;
}> = [
  { emoji: '📋', label: 'Günlük Plan', message: 'PLAN', intent: 'daily_plan' },
  { emoji: '🔬', label: 'Log Analiz', message: 'ANALİZ ET', intent: 'log_analysis' },
  { emoji: '📖', label: 'Konu Anlat', message: 'ANLA', intent: 'topic_explain' },
  { emoji: '📅', label: 'Haftalık', message: 'HAFTALIK RAPOR', intent: 'weekly_review' },
];
