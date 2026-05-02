/**
 * AMAÇ: DM içi zengin kart mesajı render.
 * MANTIK: Firestore DM mesajlarında type='card' olan mesajlar bu bileşenle çizilir.
 */

import React from 'react';
import { Trophy, BookOpen, Target, BarChart3, Clock, Flame } from 'lucide-react';

export interface CardPayload {
  cardType: 'study_report' | 'exam_result' | 'coach_analysis' | 'achievement';
  title: string;
  subtitle?: string;
  metrics?: Array<{ label: string; value: string | number; icon?: string }>;
  accent?: string;
}

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  trophy: Trophy,
  book: BookOpen,
  target: Target,
  chart: BarChart3,
  clock: Clock,
  flame: Flame,
};

const CARD_ACCENTS: Record<string, string> = {
  study_report: '#4A90D9',
  exam_result: '#C17767',
  coach_analysis: '#22C55E',
  achievement: '#E09F3E',
};

export function DMMessageCard({ payload, isMe }: { payload: CardPayload; isMe: boolean }) {
  const accent = payload.accent || CARD_ACCENTS[payload.cardType] || '#C17767';

  return (
    <div
      className={`max-w-[85%] rounded-[22px] overflow-hidden border transition-all hover:brightness-110 ${
        isMe
          ? 'bg-zinc-900 border-zinc-800 rounded-br-none'
          : 'bg-zinc-900 border-white/5 rounded-bl-none'
      }`}
    >
      {/* Accent Strip */}
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />

      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <p className="text-[9px] uppercase tracking-widest font-black" style={{ color: accent }}>
            {payload.cardType === 'study_report' ? 'Çalışma Raporu'
              : payload.cardType === 'exam_result' ? 'Deneme Sonucu'
              : payload.cardType === 'coach_analysis' ? 'Koç Analizi'
              : 'Başarım'}
          </p>
          <p className="text-sm font-bold text-zinc-100 mt-0.5">{payload.title}</p>
          {payload.subtitle && (
            <p className="text-xs text-zinc-500 mt-0.5">{payload.subtitle}</p>
          )}
        </div>

        {/* Metrics Grid */}
        {payload.metrics && payload.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {payload.metrics.map((m, i) => {
              const Icon = m.icon ? ICON_MAP[m.icon] : null;
              return (
                <div key={i} className="bg-zinc-950 rounded-xl px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    {Icon && <Icon size={10} className="text-zinc-500" />}
                    <span className="text-[8px] uppercase tracking-widest text-zinc-600 font-bold">{m.label}</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-zinc-200">{m.value}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <p className="text-[8px] text-zinc-700 uppercase tracking-widest font-bold text-right">via Boho Mentos</p>
      </div>
    </div>
  );
}
