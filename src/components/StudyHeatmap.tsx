import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../store/appStore';
import { toISODateOnly } from '../utils/date';

/**
 * StudyHeatmap: Son 365 günün çalışma yoğunluğunu GitHub stili grid ile gösterir.
 */
export function StudyHeatmap() {
  const logs = useAppStore((s) => s.logs);

  const { grid, maxQuestions, totalQuestions, activeDays } = useMemo(() => {
    const today = new Date();
    const data: Record<string, number> = {};
    let total = 0;
    
    // Logları tarihe göre grupla
    logs.forEach(log => {
      const dateKey = log.date.slice(0, 10);
      data[dateKey] = (data[dateKey] || 0) + (log.questions || 0);
      total += (log.questions || 0);
    });

    const days: { date: string; count: number; level: number }[] = [];
    const oneYearAgo = new Date();
    oneYearAgo.setDate(today.getDate() - 364);

    let maxQ = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(oneYearAgo);
      d.setDate(oneYearAgo.getDate() + i);
      const key = toISODateOnly(d);
      const count = data[key] || 0;
      if (count > maxQ) maxQ = count;
      days.push({ date: key, count, level: 0 });
    }

    // Level belirleme (0-4)
    const activeDaysCount = days.filter(d => d.count > 0).length;
    const gridWithLevels = days.map(d => {
      let level = 0;
      if (d.count > 0) {
        if (d.count < 20) level = 1;
        else if (d.count < 50) level = 2;
        else if (d.count < 100) level = 3;
        else level = 4;
      }
      return { ...d, level };
    });

    return { 
      grid: gridWithLevels, 
      maxQuestions: maxQ, 
      totalQuestions: total,
      activeDays: activeDaysCount
    };
  }, [logs]);

  // Haftalık gruplama (Grid düzeni için)
  const weeks = useMemo(() => {
    const w: (typeof grid)[] = [];
    for (let i = 0; i < grid.length; i += 7) {
      w.push(grid.slice(i, i + 7));
    }
    return w;
  }, [grid]);

  const levelColors = [
    'bg-zinc-900 border-zinc-800/50', // 0
    'bg-emerald-950 border-emerald-900/50', // 1
    'bg-emerald-800 border-emerald-700/50', // 2
    'bg-emerald-600 border-emerald-500/50', // 3
    'bg-emerald-400 border-emerald-300/50 shadow-[0_0_8px_rgba(52,211,153,0.4)]', // 4
  ];

  return (
    <div className="bg-surface border border-app rounded-3xl p-6 shadow-xl overflow-hidden">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-1">ÇALIŞMA YOĞUNLUĞU</h3>
          <p className="text-2xl font-display italic font-bold text-ink">
            {totalQuestions} <span className="text-xs font-mono text-ink-muted uppercase tracking-widest not-italic">Soru Çözüldü</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-bold text-emerald-400">{activeDays}</div>
          <div className="text-[8px] uppercase font-black text-ink-muted tracking-widest">AKTİF GÜN</div>
        </div>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-4 custom-scrollbar">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-1.5 shrink-0">
            {week.map((day, dIdx) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (wIdx * 0.01) + (dIdx * 0.005) }}
                className={`w-3 h-3 rounded-[3px] border transition-all duration-500 hover:scale-125 hover:z-10 cursor-help ${levelColors[day.level]}`}
                title={`${day.date}: ${day.count} soru`}
              />
            ))}
          </div>
        ))}
      </div>

      <footer className="flex items-center justify-between mt-4 border-t border-app pt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
             <span className="text-[8px] font-black text-ink-muted uppercase tracking-widest">Az</span>
             <div className="flex gap-1">
                {levelColors.map((cls, i) => (
                  <div key={i} className={`w-2 h-2 rounded-[2px] ${cls}`} />
                ))}
             </div>
             <span className="text-[8px] font-black text-ink-muted uppercase tracking-widest">Çok</span>
          </div>
        </div>
        <p className="text-[9px] font-mono text-ink-muted italic">Son 365 günün savaş raporu</p>
      </footer>
    </div>
  );
}
