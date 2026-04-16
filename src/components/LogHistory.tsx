import React, { useState, useMemo } from 'react';
import { DailyLog } from '../types';
import { parseFlexibleDate } from '../utils/date';

const parseDateMs = (d: string) => {
  const parsed = parseFlexibleDate(d);
  if (!parsed) return null;
  const ms = parsed.getTime();
  return Number.isFinite(ms) ? ms : null;
};

interface LogHistoryProps {
  logs: DailyLog[];
  onLogClick: (log: DailyLog) => void;
}

function LogHistoryBase({ logs, onLogClick }: LogHistoryProps) {
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const allTags = useMemo(() => Array.from(new Set(logs.flatMap(log => log.tags || []))), [logs]);
  const allSubjects = useMemo(() => Array.from(new Set(logs.map(log => log.subject))), [logs]);

  const fromMs = fromDate ? new Date(fromDate).getTime() : null;
  const toMs = toDate ? (new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1) : null;

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterSubject && log.subject !== filterSubject) return false;
      if (filterTag && (!log.tags || !log.tags.includes(filterTag))) return false;
      const ms = parseDateMs(log.date);
      if (fromMs !== null && ms !== null && ms < fromMs) return false;
      if (toMs !== null && ms !== null && ms > toMs) return false;
      return true;
    }).sort((a, b) => (parseDateMs(b.date) ?? 0) - (parseDateMs(a.date) ?? 0));
  }, [logs, filterSubject, filterTag, fromMs, toMs]);

  const tagDistribution = useMemo(() => {
    const map: Map<string, number> = new Map();
    filteredLogs.forEach(l => (l.tags || []).forEach(t => map.set(t, (map.get(t) ?? 0) + 1)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filteredLogs]);

  return (
    <div className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-6">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          className="p-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors"
        />
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          className="p-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors"
        />
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="p-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors">
          <option value="">Tüm Dersler</option>
          {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="p-2 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors">
          <option value="">Tüm Etiketler</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {tagDistribution.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tagDistribution.map(([tag, count]) => (
            <span
              key={tag}
              className="px-2.5 py-1 bg-[#C17767]/10 dark:bg-rose-400/10 text-[#C17767] dark:text-rose-400 rounded text-[10px] uppercase tracking-widest font-bold"
              title={`${count} kez`}
            >
              #{tag} <span className="opacity-60 ml-1">({count})</span>
            </span>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <p className="text-center py-8 opacity-40 text-xs text-[#4A443C] dark:text-zinc-400">Kriterlere uygun log bulunamadı.</p>
        ) : (
          filteredLogs.map((log, i) => (
            <button 
              key={i} 
              onClick={() => onLogClick(log)}
              className="w-full text-left p-4 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#F5F2EB] dark:bg-zinc-950 hover:border-[#C17767]/50 transition-all active:scale-[0.99]"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-1 text-[#4A443C] dark:text-zinc-400">{new Date(log.date).toLocaleString('tr-TR')}</span>
                  <h4 className="font-bold text-[#4A443C] dark:text-zinc-200">{log.subject} - {log.topic}</h4>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#C17767] dark:text-rose-400">{log.questions} Soru</span>
                  <div className="text-[10px] opacity-60 mt-1">
                    <span className="text-green-600 dark:text-green-400">{log.correct}D</span> / <span className="text-red-600 dark:text-red-400">{log.wrong}Y</span> / <span className="text-gray-500 dark:text-gray-400">{log.empty}B</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 bg-[#EAE6DF] dark:bg-zinc-800 rounded text-[10px] uppercase tracking-widest text-[#4A443C] dark:text-zinc-300">
                  Toplam Süre: {log.avgTime}dk
                </span>
                <span className="px-2 py-1 bg-[#EAE6DF] dark:bg-zinc-800 rounded text-[10px] uppercase tracking-widest text-[#4A443C] dark:text-zinc-300">
                  Doğruluk: %{Math.round((log.correct / (log.questions || 1)) * 100)}
                </span>
                <span className="px-2 py-1 bg-[#EAE6DF] dark:bg-zinc-800 rounded text-[10px] uppercase tracking-widest text-[#4A443C] dark:text-zinc-300">
                  Hız: {Math.max(1, Math.round(((log.avgTime || 0) * 60) / (log.questions || 1)))} sn/soru
                </span>
                <span className="px-2 py-1 bg-[#EAE6DF] dark:bg-zinc-800 rounded text-[10px] uppercase tracking-widest text-[#4A443C] dark:text-zinc-300">
                  Yorgunluk: {log.fatigue}/10
                </span>
                {log.tags && log.tags.length > 0 && log.tags.map((tag, j) => (
                  <span key={j} className="px-2 py-1 bg-[#C17767]/10 dark:bg-rose-400/10 text-[#C17767] dark:text-rose-400 rounded text-[10px] uppercase tracking-widest">
                    #{tag}
                  </span>
                ))}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export const LogHistory = React.memo(LogHistoryBase);
