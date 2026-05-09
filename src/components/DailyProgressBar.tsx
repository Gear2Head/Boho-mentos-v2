/**
 * AMAÇ: Günlük soru hedefi progress bar'ı + konfeti
 * MANTIK: Bugünkü toplam soruyu maxDailyQuestions hedefine oranlar
 */

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { toISODateOnly, parseFlexibleDate } from '../utils/date';
import confetti from 'canvas-confetti';

export function DailyProgressBar() {
  const logs = useAppStore(s => s.logs);
  const profile = useAppStore(s => s.profile);
  const confettiFiredRef = useRef(false);

  const todayStr = toISODateOnly();
  const todayQuestions = logs
    .filter(l => {
      const dt = parseFlexibleDate(l.date);
      return dt ? toISODateOnly(dt) === todayStr : false;
    })
    .reduce((acc, l) => acc + (l.questions || 0), 0);

  const dailyTarget = profile?.maxDailyQuestions || 100;
  const pct = Math.min(100, Math.round((todayQuestions / dailyTarget) * 100));

  useEffect(() => {
    if (pct >= 100 && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#C17767', '#22C55E', '#E09F3E'] });
    }
  }, [pct]);

  // Reset confetti flag at midnight
  useEffect(() => {
    confettiFiredRef.current = false;
  }, [todayStr]);

  const barColor = pct >= 100 ? 'bg-[#22C55E]' : pct >= 60 ? 'bg-[#C17767]' : 'bg-[#E09F3E]';

  return (
    <div className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] uppercase font-bold tracking-widest text-[#C17767]">Bugün</span>
        <span className="text-xs font-mono font-bold text-zinc-300">
          {todayQuestions} / {dailyTarget} soru
        </span>
      </div>
      <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-zinc-500 uppercase tracking-widest">%{pct}</span>
        {pct >= 100 && (
          <span className="text-[9px] text-[#22C55E] font-bold uppercase tracking-widest animate-pulse">
            🎉 HEDEF TAMAM!
          </span>
        )}
      </div>
    </div>
  );
}
