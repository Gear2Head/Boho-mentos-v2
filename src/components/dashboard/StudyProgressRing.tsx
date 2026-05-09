/**
 * AMAÇ: Bugünkü çalışma hedefini dairesel progress ring ile görselleştirir.
 * MANTIK: SVG stroke-dashoffset animasyonu, günlük hedef soru sayısına göre hesaplanır.
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../../store/appStore';
import { toISODateOnly } from '../../utils/date';

const RADIUS = 54;
const STROKE = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ProgressRingProps {
  dailyGoalQuestions?: number;
}

export function StudyProgressRing({ dailyGoalQuestions = 200 }: ProgressRingProps) {
  const logs = useAppStore(s => s.logs);
  const focusSessions = useAppStore(s => s.focusSessions);

  const today = toISODateOnly(new Date());

  const todayStats = useMemo(() => {
    const todayLogs = logs.filter(l => l.date.startsWith(today));
    const totalQ = todayLogs.reduce((sum, l) => sum + l.questions, 0);
    const totalCorrect = todayLogs.reduce((sum, l) => sum + l.correct, 0);
    const subjects = [...new Set(todayLogs.map(l => l.subject))];

    const todaySessions = focusSessions.filter(s => s.startTime.startsWith(today));
    const studyMinutes = Math.round(todaySessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60);

    const accuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

    return { totalQ, accuracy, subjects, studyMinutes };
  }, [logs, focusSessions, today]);

  const progressPercent = Math.min(todayStats.totalQ / dailyGoalQuestions, 1);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progressPercent);

  // Color by progress
  const ringColor = progressPercent >= 1
    ? '#10b981'   // Green — goal hit
    : progressPercent >= 0.6
      ? '#C17767'  // Terracotta — on track
      : '#f59e0b'; // Amber — lagging

  return (
    <div className="glass-card p-6 rounded-3xl flex flex-col items-center gap-4">
      <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Bugünkü İlerleme</span>

      {/* SVG Ring */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
          {/* Track */}
          <circle
            cx="72" cy="72" r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={STROKE}
          />
          {/* Progress */}
          <motion.circle
            cx="72" cy="72" r={RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${ringColor}60)` }}
          />
        </svg>

        {/* Center stats */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-2xl font-bold font-mono"
            style={{ color: ringColor }}
          >
            {todayStats.totalQ}
          </motion.span>
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest">/ {dailyGoalQuestions} Soru</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 w-full">
        <div className="text-center">
          <p className="text-lg font-bold font-mono text-zinc-100">{todayStats.accuracy}%</p>
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Doğruluk</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold font-mono text-zinc-100">{todayStats.studyMinutes}</p>
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Dakika</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold font-mono text-zinc-100">{todayStats.subjects.length}</p>
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Ders</p>
        </div>
      </div>

      {/* Goal status */}
      {progressPercent >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full"
        >
          ✅ Günlük Hedef Tamamlandı!
        </motion.div>
      )}
    </div>
  );
}
