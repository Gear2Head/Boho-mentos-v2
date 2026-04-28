import React from 'react';
import { motion } from 'motion/react';
import { Flame, Check } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export function StreakHistoryWidget() {
  const logs = useAppStore(s => s.logs);
  const streakDays = useAppStore(s => s.streakDays);

  const last7Days = React.useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayLogs = logs.filter(l => l.date.startsWith(dateStr));
      const totalQuestions = dayLogs.reduce((acc, l) => acc + (l.correct + l.wrong), 0);
      const isComplete = totalQuestions > 0;
      
      days.push({
        label: d.toLocaleDateString('tr-TR', { weekday: 'short' }).charAt(0),
        fullDate: dateStr,
        isComplete,
        questions: totalQuestions,
        isToday: i === 0
      });
    }
    return days;
  }, [logs]);

  return (
    <div className="glass-card p-5 rounded-2xl border border-[#EAE6DF] dark:border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-orange-500" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Haftalık İstikrar</h3>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-wider">
          {streakDays} Gün Seri
        </div>
      </div>

      <div className="flex justify-between items-end gap-1">
        {last7Days.map((day, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 flex-1">
            <div className="relative group w-full flex flex-col items-center">
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                {day.questions} Soru
              </div>
              
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: Math.min(day.questions / 3, 60) + 12 }}
                className={`w-full max-w-[24px] rounded-t-lg transition-colors ${
                  day.isToday 
                    ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.3)]' 
                    : day.isComplete ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              />
              
              <div className={`w-full max-w-[24px] h-6 rounded-b-lg flex items-center justify-center border-t border-white/10 ${
                day.isToday 
                  ? 'bg-orange-600' 
                  : day.isComplete ? 'bg-zinc-400 dark:bg-zinc-600' : 'bg-zinc-200 dark:bg-zinc-900'
              }`}>
                {day.isComplete ? <Check size={10} className="text-white" /> : <div className="w-1 h-1 rounded-full bg-zinc-400" />}
              </div>
            </div>
            <span className={`text-[10px] font-bold ${day.isToday ? 'text-orange-500' : 'text-zinc-400'}`}>
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
