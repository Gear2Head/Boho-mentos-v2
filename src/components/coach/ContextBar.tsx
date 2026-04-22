/**
 * AMAÇ: Koç ekranının sağ paneli — anlık öğrenci durumu özeti.
 * MANTIK: ELO, streak, son net, aktif uyarılar, hızlı analiz butonu.
 * UX-TODO §1: ContextBar (lg breakpoint, mobilde gizlenir).
 */

import React from 'react';
import { Flame, Zap, TrendingUp, TrendingDown, AlertTriangle, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import type { CoachIntent } from '../../types/coach';

interface ContextBarProps {
  onQuickAction: (msg: string, intent: CoachIntent) => void;
}

const COACH_MOOD: Record<string, { label: string; color: string; dot: string }> = {
  harsh: { label: 'Sert Mod', color: 'text-red-400', dot: 'bg-red-500' },
  motivational: { label: 'Motive Mod', color: 'text-orange-400', dot: 'bg-orange-500' },
  analytical: { label: 'Analiz Modu', color: 'text-blue-400', dot: 'bg-blue-500' },
};

export function ContextBar({ onQuickAction }: ContextBarProps) {
  const profile = useAppStore((s) => s.profile);
  const eloScore = useAppStore((s) => s.eloScore);
  const streakDays = useAppStore((s) => s.streakDays);
  const exams = useAppStore((s) => s.exams);
  const activeAlerts = useAppStore((s) => s.activeAlerts);

  const lastTyt = [...exams].reverse().find((e) => e.type === 'TYT')?.totalNet ?? null;
  const lastAyt = [...exams].reverse().find((e) => e.type === 'AYT')?.totalNet ?? null;
  const tytGap = lastTyt !== null ? (profile?.tytTarget ?? 0) - lastTyt : null;
  const aytGap = lastAyt !== null ? (profile?.aytTarget ?? 0) - lastAyt : null;

  const personality = profile?.coachPersonality || 'default';
  const mood = COACH_MOOD[personality] ?? { label: 'Aktif', color: 'text-green-400', dot: 'bg-green-500' };

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-l border-app bg-app overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-app">
        <div className="text-[9px] uppercase tracking-[0.3em] text-ink-muted font-black mb-3">Durum Paneli</div>

        {/* Coach mood */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-surface rounded-xl border border-app shadow-sm">
          <div className={`w-2 h-2 rounded-full ${mood.dot} animate-pulse shadow-[0_0_6px_currentColor]`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${mood.color}`}>
            {mood.label}
          </span>
        </div>

        {/* ELO Sparkline */}
        <div className="mb-4 bg-surface rounded-2xl border border-app p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[9px] uppercase tracking-[0.2em] text-accent font-black">ELO TRENDİ</span>
            <span className="text-[10px] text-emerald-500 font-bold">+{profile?.dailyGoalHours || 5}%</span>
          </div>
          <div className="h-10 w-full relative">
            <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,25 Q15,10 25,20 T50,15 T75,5 T100,2" fill="url(#eloGrad)" stroke="none" />
              <path d="M0,25 Q15,10 25,20 T50,15 T75,5 T100,2" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="100" cy="2" r="3" fill="var(--color-accent)" className="animate-pulse" />
            </svg>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatMini
            icon={<Flame size={12} className="text-orange-400" />}
            label="Seri"
            value={`${streakDays}G`}
            valueColor={streakDays >= 7 ? 'text-orange-400' : 'text-ink-muted'}
          />
          {lastTyt !== null && (
            <StatMini
              icon={
                tytGap !== null && tytGap > 0
                  ? <TrendingDown size={12} className="text-rose-500" />
                  : <TrendingUp size={12} className="text-emerald-500" />
              }
              label="TYT Net"
              value={lastTyt.toFixed(1)}
              sub={tytGap !== null ? `${tytGap > 0 ? '-' : '+'}${Math.abs(tytGap).toFixed(1)} gap` : undefined}
              valueColor={tytGap !== null && tytGap > 8 ? 'text-rose-500' : 'text-ink-muted'}
            />
          )}
          {lastAyt !== null && (
            <StatMini
              icon={
                aytGap !== null && aytGap > 0
                  ? <TrendingDown size={12} className="text-rose-500" />
                  : <TrendingUp size={12} className="text-emerald-500" />
              }
              label="AYT Net"
              value={lastAyt.toFixed(1)}
              sub={aytGap !== null ? `${aytGap > 0 ? '-' : '+'}${Math.abs(aytGap).toFixed(1)} gap` : undefined}
              valueColor={aytGap !== null && aytGap > 8 ? 'text-rose-500' : 'text-ink-muted'}
            />
          )}
        </div>
      </div>

      {/* Alerts */}
        <div className="p-4 border-b border-app">
          <div className="text-[9px] uppercase tracking-[0.2em] text-rose-500 font-black mb-3 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            {activeAlerts.length} UYARI
          </div>
          <div className="space-y-2">
            {activeAlerts.slice(0, 2).map((alert) => (
              <div
                key={alert.id}
                className="text-[10px] text-rose-500 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 leading-relaxed font-black uppercase tracking-tight shadow-sm"
              >
                {alert.message.slice(0, 80)}{alert.message.length > 80 ? '…' : ''}
              </div>
            ))}
          </div>
        </div>

      {/* Quick actions */}
      <div className="p-4">
        <div className="text-[9px] uppercase tracking-[0.3em] text-ink-muted font-black mb-3">Hızlı Aksiyonlar</div>
        <div className="space-y-2">
          <QuickBtn
            label="Hızlı Analiz"
            emoji="🔬"
            onClick={() => onQuickAction('ANALİZ ET', 'log_analysis')}
          />
          <QuickBtn
            label="Günlük Plan"
            emoji="📋"
            onClick={() => onQuickAction('PLAN', 'daily_plan')}
          />
          <QuickBtn
            label="Haftalık Rapor"
            emoji="📅"
            onClick={() => onQuickAction('HAFTALIK RAPOR', 'weekly_review')}
          />
        </div>
      </div>
    </aside>
  );
}

// ─── Mini Components ────────────────────────────────────────────────────────────

function StatMini({
  icon,
  label,
  value,
  sub,
  valueColor = 'text-ink',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-surface border border-app rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[8px] uppercase tracking-[0.2em] text-ink-muted font-black">{label}</span>
      </div>
      <div className={`text-lg font-mono font-bold ${valueColor}`}>{value}</div>
      {sub && <div className="text-[8px] text-ink-muted mt-0.5 font-medium">{sub}</div>}
    </div>
  );
}

function QuickBtn({
  label,
  emoji,
  onClick,
}: {
  label: string;
  emoji: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 p-3 bg-surface border border-app rounded-xl text-[10px] font-black uppercase tracking-widest text-ink-muted hover:border-accent/40 hover:text-accent transition-all group shadow-sm"
    >
      <span className="text-base">{emoji}</span>
      <span>{label}</span>
      <ChevronRight size={10} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
