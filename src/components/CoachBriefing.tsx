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
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import {
  completeTask,
  skipTask,
  updateInHistory,
  calcComplianceRate,
} from '../services/directiveHistory';
import type { CoachIntent } from '../types/coach';

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
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8 space-y-6 pb-32">
      {/* ── Durum Özeti ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <StatusCard
          icon={<Zap size={16} className="text-[#C17767]" />}
          label="ELO"
          value={eloScore.toString()}
          sub="Puan"
        />
        <StatusCard
          icon={<Flame size={16} className="text-orange-400" />}
          label="Seri"
          value={streakDays.toString()}
          sub="Gün"
        />
        <StatusCard
          icon={<TrendingUp size={16} className="text-blue-400" />}
          label="TYT Açık"
          value={tytGap > 0 ? `-${tytGap.toFixed(1)}` : `+${Math.abs(tytGap).toFixed(1)}`}
          sub="Net"
          valueClass={tytGap > 5 ? 'text-red-400' : 'text-green-400'}
        />
        <StatusCard
          icon={<Target size={16} className="text-purple-400" />}
          label="Uyumluluk"
          value={`%${complianceRate}`}
          sub="7 günlük görev"
        />
      </motion.div>

      {/* ── Aktif Uyarılar ── */}
      <AnimatePresence>
        {activeAlerts.slice(0, 1).map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 bg-red-950/20 border border-red-900/40 rounded-2xl"
          >
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200 font-mono leading-relaxed">{alert.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Son Direktif ── */}
      {latestRecord && !latestRecord.isResolved && lastCoachDirective ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#C17767] font-bold mb-1">
                AKTİF DİREKTİF
              </div>
              <h3 className="text-base font-bold text-zinc-200 leading-snug">
                {lastCoachDirective.headline}
              </h3>
            </div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest shrink-0">
              {latestRecord.completedTaskCount}/{lastCoachDirective.tasks.length} TAMAMLANDI
            </div>
          </div>

          <p className="text-sm text-zinc-400 font-mono leading-relaxed mb-6">
            {lastCoachDirective.summary}
          </p>

          {/* Görevler */}
          <div className="space-y-3">
            {lastCoachDirective.tasks.map((task, i) => {
              const isDone = task.status === 'completed';
              const isSkipped = task.status === 'skipped';
              const isDimmed = isDone || isSkipped;

              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                    isDone
                      ? 'border-green-900/40 bg-green-900/10 opacity-60'
                      : isSkipped
                      ? 'border-zinc-800 bg-zinc-900/30 opacity-40'
                      : 'border-[#2A2A2A] bg-[#1A1A1A]'
                  }`}
                >
                  {/* Priority dot */}
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      task.priority === 'high'
                        ? 'bg-red-500'
                        : task.priority === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium leading-snug ${
                        isDimmed ? 'line-through text-zinc-500' : 'text-zinc-200'
                      }`}
                    >
                      {task.action}
                    </p>
                    {task.subject && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase tracking-widest text-zinc-600">
                          {task.subject}
                          {task.targetMinutes ? ` • ${task.targetMinutes}dk` : ''}
                        </span>
                        {task.dueWindow && (
                          <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded uppercase tracking-widest">
                            {task.dueWindow === 'today' ? 'BUGÜN' : task.dueWindow === 'tomorrow' ? 'YARIN' : 'HAFTA'}
                          </span>
                        )}
                      </div>
                    )}
                    {task.rationale && (
                      <p className="text-[10px] text-zinc-600 italic mt-1">{task.rationale}</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  {!isDimmed && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleCompleteTask(i)}
                        className="p-1.5 bg-green-900/30 text-green-400 border border-green-900/50 rounded-lg hover:bg-green-600 hover:text-white transition-all"
                        title="Görevi tamamla"
                        aria-label={`Görevi tamamla: ${task.action}`}
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <button
                        onClick={() => handleSkipTask(i)}
                        className="p-1.5 bg-zinc-800/50 text-zinc-500 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:text-zinc-300 transition-all"
                        title="Görevi atla"
                        aria-label={`Görevi atla: ${task.action}`}
                      >
                        <SkipForward size={14} />
                      </button>
                    </div>
                  )}

                  {isDone && (
                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : (
        /* Direktif yok — günlük plan al */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-8 text-center"
        >
          <Target size={40} className="mx-auto mb-4 text-[#C17767] opacity-60" />
          <h3 className="text-lg font-bold text-zinc-300 mb-2">Bugün için direktif yok</h3>
          <p className="text-sm text-zinc-500 mb-6">
            Günlük planını oluşturmak için aşağıdaki butona bas.
          </p>
          <button
            onClick={() => onSendMessage('PLAN', 'daily_plan')}
            disabled={isTyping}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C17767] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#A56253] transition-colors disabled:opacity-50"
          >
            {isTyping ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Günlük Plan Al
          </button>
        </motion.div>
      )}

      {/* ── Hızlı Komutlar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd.intent}
            onClick={() => onSendMessage(cmd.message, cmd.intent)}
            disabled={isTyping}
            className="flex items-center gap-2 p-3 bg-[#121212] border border-[#2A2A2A] rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-400 hover:border-[#C17767] hover:text-[#C17767] transition-all disabled:opacity-50 group"
          >
            <span className="text-base">{cmd.emoji}</span>
            <span>{cmd.label}</span>
            <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Status Card ──────────────────────────────────────────────────────────────

function StatusCard({
  icon,
  label,
  value,
  sub,
  valueClass = 'text-zinc-200',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-[#121212] border border-[#2A2A2A] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
          {label}
        </span>
      </div>
      <div className={`text-2xl font-mono font-bold ${valueClass}`}>{value}</div>
      <div className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">{sub}</div>
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
