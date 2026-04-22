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
    if (!day.hasLog) return 'bg-zinc-800/50';
    const ratio = day.totalQuestions / maxQ;
    if (ratio > 0.7) return 'bg-[#C17767] shadow-[0_0_6px_rgba(193,119,103,0.4)]';
    if (ratio > 0.3) return 'bg-[#C17767]/60';
    return 'bg-[#C17767]/30';
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
    <div className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-[10px] uppercase font-bold tracking-widest text-[#C17767]">Çalışma Seri Haritası</h3>
          <p className="text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5">Son 30 Gün</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-display font-bold text-[#C17767]">{currentStreak}</span>
          <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">GÜN<br/>SERİ</span>
        </div>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {last30Days.map((day) => (
          <div
            key={day.dayStr}
            title={`${day.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}: ${day.totalQuestions} soru`}
            className={`aspect-square rounded-[4px] transition-all hover:scale-125 cursor-default ${getColor(day)}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[8px] text-zinc-600 uppercase tracking-widest">Az</span>
        <div className="w-2.5 h-2.5 rounded-[2px] bg-zinc-800/50" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-[#C17767]/30" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-[#C17767]/60" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-[#C17767]" />
        <span className="text-[8px] text-zinc-600 uppercase tracking-widest">Çok</span>
      </div>
    </div>
  );
}
