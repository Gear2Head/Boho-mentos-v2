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
    'bg-zinc-900/40 border-white/5', // 0
    'bg-emerald-500/10 border-emerald-500/10', // 1
    'bg-emerald-500/30 border-emerald-500/20', // 2
    'bg-emerald-500/60 border-emerald-500/30', // 3
    'bg-emerald-400 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]', // 4
  ];

  return (
    <div className="bg-surface border border-app rounded-[32px] p-8 shadow-xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />

      <header className="flex flex-wrap justify-between items-start mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Çalışma Yoğunluğu</h3>
          </div>
          <p className="text-4xl font-display italic font-bold text-zinc-100">
            {totalQuestions.toLocaleString()} <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest not-italic ml-1">Toplam Soru</span>
          </p>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <div className="text-2xl font-display italic font-bold text-emerald-400 leading-none">{activeDays}</div>
            <div className="text-[8px] uppercase font-black text-zinc-500 tracking-widest mt-1">Aktif Gün</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-display italic font-bold text-blue-400 leading-none">
              {activeDays > 0 ? Math.round(totalQuestions / activeDays) : 0}
            </div>
            <div className="text-[8px] uppercase font-black text-zinc-500 tracking-widest mt-1">Ort. Günlük</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-display italic font-bold text-amber-400 leading-none">{maxQuestions}</div>
            <div className="text-[8px] uppercase font-black text-zinc-500 tracking-widest mt-1">Rekor Gün</div>
          </div>
        </div>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-4 no-scrollbar">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-1.5 shrink-0">
            {week.map((day, dIdx) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: (wIdx * 0.005) }}
                className={`w-[14px] h-[14px] rounded-[4px] border transition-all duration-300 hover:scale-150 hover:z-10 cursor-help ${levelColors[day.level]}`}
                title={`${day.date}: ${day.count} soru`}
              />
            ))}
          </div>
        ))}
      </div>

      <footer className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Stabil</span>
             <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={`w-2 h-2 rounded-[2px] ${levelColors[i]}`} />
                ))}
             </div>
             <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Yoğun</span>
          </div>
        </div>
        <p className="text-[10px] font-serif italic text-zinc-500">Son 365 günün gelişim haritası</p>
      </footer>
    </div>
  );
}
