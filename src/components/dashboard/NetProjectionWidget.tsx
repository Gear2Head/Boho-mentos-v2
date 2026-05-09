/**
 * AMAÇ: Gelecek ay net projeksiyonunu gösteren dashboard widget'ı.
 * P2.10: predictiveAnalytics.ts çıktısını kullanıcıya görselleştirir.
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Target, Activity } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { buildNetProjection } from '../../services/predictiveAnalytics';

const CONFIDENCE_CONFIG = {
  high: { label: 'Yüksek Güven', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  medium: { label: 'Orta Güven', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  low: { label: 'Düşük Güven', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

export function NetProjectionWidget() {
  const { profile, logs, exams, focusSessions, eloScore } = useAppStore(useShallow(s => ({
    profile: s.profile,
    logs: s.logs,
    exams: s.exams,
    focusSessions: s.focusSessions,
    eloScore: s.eloScore,
  })));

  const projections = useMemo(() =>
    buildNetProjection({ profile, logs, exams, focusSessions, eloScore }),
    [profile, logs, exams, focusSessions, eloScore]
  );

  if (!profile || projections.length === 0) return null;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className="glass-card rounded-3xl p-6 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-purple-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-blue-500/10 rounded-xl">
          <Activity size={18} className="text-blue-400" />
        </div>
        <div>
          <h3 className="text-[10px] uppercase tracking-widest font-black text-zinc-500">
            Net Projeksiyonu
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {projections[0]?.projectedMonth || 'Gelecek ay'}
          </p>
        </div>
      </div>

      {/* Projections Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {projections.map((p) => {
          const target = p.examType === 'TYT' ? (profile?.tytTarget ?? 0) : (profile?.aytTarget ?? 0);
          const latestNet = exams.filter(e => e.type === p.examType).at(-1)?.totalNet ?? 0;
          const delta = p.projectedNet - latestNet;
          const onTarget = target > 0 && p.projectedNet >= target;
          const conf = CONFIDENCE_CONFIG[p.confidence];

          return (
            <div
              key={p.examType}
              className={`rounded-2xl border p-4 ${onTarget ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-950/40'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] uppercase tracking-widest font-black text-zinc-500">
                  {p.examType}
                </span>
                <span className={`text-[8px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full ${conf.bg} ${conf.border} border ${conf.color}`}>
                  {conf.label}
                </span>
              </div>

              {/* Projected Net */}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-display italic font-bold text-zinc-100">
                  {p.projectedNet}
                </span>
                <span className="text-xs text-zinc-500">net</span>
                {delta !== 0 && (
                  <span className={`flex items-center gap-0.5 text-xs font-bold ${delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                  </span>
                )}
                {delta === 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-bold text-zinc-500">
                    <Minus size={12} />0
                  </span>
                )}
              </div>

              {/* Target comparison */}
              {target > 0 && (
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-black">
                  <Target size={10} className={onTarget ? 'text-emerald-400' : 'text-zinc-500'} />
                  <span className={onTarget ? 'text-emerald-400' : 'text-zinc-500'}>
                    Hedef: {target} {onTarget ? '✓' : `(${(target - p.projectedNet).toFixed(1)} net geride)`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Blockers */}
      {projections.some(p => p.blockers.length > 0) && (
        <div className="border-t border-zinc-800 pt-4">
          <p className="text-[9px] uppercase tracking-widest font-black text-zinc-500 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={10} className="text-amber-500" />
            Engeller
          </p>
          <div className="space-y-1.5">
            {[...new Set(projections.flatMap(p => p.blockers))].map((blocker, idx) => (
              <div
                key={idx}
                className="text-xs text-zinc-400 flex items-start gap-2 pl-1"
              >
                <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                {blocker}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
