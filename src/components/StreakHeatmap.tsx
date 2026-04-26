/**
 * AMAÇ: GitHub tarzı son 30 günlük çalışma heatmap'i
 * MANTIK: Her gün için log var mı kontrol eder, günlük soru sayısına göre renk atar
 */

import React from 'react';
import { useAppStore } from '../store/appStore';
import { toISODateOnly, parseFlexibleDate } from '../utils/date';

export function StreakHeatmap() {
  const logs = useAppStore(s => s.logs);

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dayStr = toISODateOnly(d);

    const dayLogs = logs.filter(l => {
      const dt = parseFlexibleDate(l.date);
      if (!dt) return false;
      return toISODateOnly(dt) === dayStr;
    });

    const totalQuestions = dayLogs.reduce((acc, l) => acc + (l.questions || 0), 0);

    return { date: d, dayStr, totalQuestions, hasLog: dayLogs.length > 0 };
  });

  const maxQ = Math.max(1, ...last30Days.map(d => d.totalQuestions));

  const getColor = (day: typeof last30Days[0]) => {
    if (!day.hasLog) return 'bg-white/5 border border-white/[0.02]';
    const ratio = day.totalQuestions / maxQ;
    if (ratio > 0.7) return 'bg-[#C17767] shadow-[0_0_8px_rgba(193,119,103,0.3)]';
    if (ratio > 0.3) return 'bg-[#C17767]/70';
    return 'bg-[#C17767]/40';
  };

  const currentStreak = (() => {
    let streak = 0;
    for (let i = last30Days.length - 1; i >= 0; i--) {
      if (last30Days[i].hasLog) streak++;
      else break;
    }
    return streak;
  })();

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-display font-bold text-[#C17767] leading-none">{currentStreak}</span>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold leading-tight">GÜN</span>
            <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold leading-tight">SERİ</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-zinc-600 uppercase tracking-widest mr-1">Az</span>
          <div className="w-2 h-2 rounded-[1px] bg-zinc-800/50" />
          <div className="w-2 h-2 rounded-[1px] bg-[#C17767]/30" />
          <div className="w-2 h-2 rounded-[1px] bg-[#C17767]/60" />
          <div className="w-2 h-2 rounded-[1px] bg-[#C17767]" />
          <span className="text-[8px] text-zinc-600 uppercase tracking-widest ml-1">Çok</span>
        </div>
      </div>
      
      <div className="grid grid-cols-10 gap-1.5">
        {last30Days.map((day) => (
          <div
            key={day.dayStr}
            title={`${day.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}: ${day.totalQuestions} soru`}
            className={`aspect-square rounded-[3px] transition-all hover:scale-125 cursor-default ${getColor(day)}`}
          />
        ))}
      </div>
    </div>
  );
}
