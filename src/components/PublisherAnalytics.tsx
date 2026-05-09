/**
 * AMAÇ: Yayın bazlı deneme analiz grafikleri.
 * MANTIK: Mevcut ExamResult[] datasından publisher alanına göre gruplama ve bar chart.
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Filter, BookOpen } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { ExamResult } from '../types';

interface PublisherStat {
  publisher: string;
  count: number;
  avgNet: number;
  bestNet: number;
  trend: number; // son 2 deneme arasındaki fark
}

export function PublisherAnalytics() {
  const exams = useAppStore(s => s.exams) as (ExamResult & { publisher?: string })[];
  const [typeFilter, setTypeFilter] = useState<'all' | 'TYT' | 'AYT'>('all');

  const filteredExams = useMemo(() => {
    if (typeFilter === 'all') return exams;
    return exams.filter(e => e.type === typeFilter);
  }, [exams, typeFilter]);

  const stats = useMemo((): PublisherStat[] => {
    const grouped: Record<string, (ExamResult & { publisher?: string })[]> = {};

    filteredExams.forEach(exam => {
      const pub = (exam as any).publisher || 'Belirtilmemiş';
      if (!grouped[pub]) grouped[pub] = [];
      grouped[pub].push(exam);
    });

    return Object.entries(grouped).map(([publisher, exList]) => {
      const nets = exList.map(e => e.totalNet || 0);
      const avgNet = nets.reduce((s, n) => s + n, 0) / nets.length;
      const bestNet = Math.max(...nets);
      const trend = nets.length >= 2 ? nets[nets.length - 1] - nets[nets.length - 2] : 0;

      return { publisher, count: exList.length, avgNet, bestNet, trend };
    }).sort((a, b) => b.count - a.count);
  }, [filteredExams]);

  if (exams.length === 0) return null;

  const maxAvg = Math.max(...stats.map(s => s.avgNet), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-[#C17767]" />
          <h3 className="text-[10px] uppercase tracking-widest font-black text-zinc-400">Yayın Bazlı Analiz</h3>
        </div>

        {/* Filtre */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
          {(['all', 'TYT', 'AYT'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                typeFilter === f
                  ? 'bg-[#C17767] text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f === 'all' ? 'Tümü' : f}
            </button>
          ))}
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="text-center py-6 text-zinc-600 text-sm italic">
          Filtreye uygun deneme yok
        </div>
      ) : (
        <div className="space-y-2">
          {stats.map((stat, i) => {
            const barWidth = Math.round((stat.avgNet / maxAvg) * 100);
            return (
              <motion.div
                key={stat.publisher}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={12} className="text-zinc-500" />
                    <span className="text-sm font-bold text-zinc-200">{stat.publisher}</span>
                    <span className="text-[9px] text-zinc-600 font-mono">({stat.count} deneme)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono font-bold text-[#C17767]">
                      Ort: {stat.avgNet.toFixed(1)}
                    </span>
                    <span className="font-mono font-bold text-amber-500">
                      En İyi: {stat.bestNet.toFixed(1)}
                    </span>
                    {stat.trend !== 0 && (
                      <span className={`font-mono font-bold text-[10px] ${stat.trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stat.trend > 0 ? '↑' : '↓'}{Math.abs(stat.trend).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-[#C17767] to-[#E09F3E]"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
