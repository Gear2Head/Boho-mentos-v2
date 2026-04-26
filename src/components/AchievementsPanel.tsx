/**
 * AMAÇ: Başarımlar paneli (kilitli/kilit açıldı görünümü).
 * MANTIK: Store’daki `trophies` listesini kategorilere göre gruplar.
 */

import React from 'react';
import { Award, Flame, Star, Trophy as TrophyIcon, Target, Crown, Shield, List, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Trophy } from '../types';

const ICONS: Record<string, React.ReactNode> = {
  Award: <Award size={18} />,
  Flame: <Flame size={18} />,
  Star: <Star size={18} />,
  Trophy: <TrophyIcon size={18} />,
  Target: <Target size={18} />,
  Crown: <Crown size={18} />,
  Shield: <Shield size={18} />,
  List: <List size={18} />,
  CheckCircle2: <CheckCircle2 size={18} />,
};

const groupLabel = (k: Trophy['category']) => {
  if (k === 'streak') return 'Seri';
  if (k === 'performance') return 'Performans';
  if (k === 'milestone') return 'Kilometre Taşı';
  if (k === 'special') return 'Özel';
  return 'Genel';
};

export function AchievementsPanel() {
  const trophies = useAppStore(s => s.trophies);

  const grouped = trophies.reduce<Record<string, Trophy[]>>((acc, t) => {
    const key = t.category ?? 'special';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const keys = Object.keys(grouped);
  if (keys.length === 0) return null;

  return (
    <section className="border border-app rounded-xl bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5 border-b border-app pb-3">
        <h3 className="font-serif text-xl uppercase tracking-tight text-accent font-black">Başarımlar</h3>
        <span className="text-[10px] uppercase tracking-widest text-ink-muted font-black">
          Açılan: {trophies.filter(t => !!t.unlockedAt).length}/{trophies.length}
        </span>
      </div>

      <div className="space-y-6">
        {keys.map((k) => (
          <div key={k}>
            <div className="text-[10px] uppercase tracking-widest font-black text-ink-muted mb-3 opacity-60">
              {groupLabel(k as any)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {grouped[k]
                .slice()
                .sort((a, b) => Number(!!b.unlockedAt) - Number(!!a.unlockedAt))
                .map((t) => {
                  const unlocked = !!t.unlockedAt;
                  return (
                    <div
                      key={t.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${unlocked ? 'border-green-500/20 bg-green-500/5' : 'border-app bg-surface-2 opacity-70'}`}
                    >
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border transition-all ${unlocked ? 'border-green-500/20 bg-green-500/10 text-green-600' : 'border-app bg-surface text-accent'}`}>
                        {ICONS[t.icon] ?? <TrophyIcon size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="font-black text-sm text-ink leading-tight truncate uppercase tracking-tight">{t.title}</div>
                          <div className="text-[9px] uppercase tracking-widest text-ink-muted shrink-0 font-black">
                            {unlocked ? new Date(t.unlockedAt!).toLocaleDateString('tr-TR') : 'KİLİTLİ'}
                          </div>
                        </div>
                        <div className="text-[11px] mt-1 text-ink-muted leading-relaxed font-medium">{t.description}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

