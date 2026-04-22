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
    <section className="border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5 border-b border-[#EAE6DF] dark:border-zinc-800 pb-3">
        <h3 className="font-display italic text-xl uppercase tracking-tight text-[#C17767] dark:text-rose-400">Başarımlar</h3>
        <span className="text-[10px] uppercase tracking-widest opacity-50 text-[#4A443C] dark:text-zinc-400">
          Açılan: {trophies.filter(t => !!t.unlockedAt).length}/{trophies.length}
        </span>
      </div>

      <div className="space-y-6">
        {keys.map((k) => (
          <div key={k}>
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-60 text-[#4A443C] dark:text-zinc-400 mb-3">
              {groupLabel(k as any)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grouped[k]
                .slice()
                .sort((a, b) => Number(!!b.unlockedAt) - Number(!!a.unlockedAt))
                .map((t) => {
                  const unlocked = !!t.unlockedAt;
                  return (
                    <div
                      key={t.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border ${unlocked ? 'border-green-500/30 bg-green-500/5' : 'border-[#EAE6DF] dark:border-zinc-800 bg-[#F5F2EB] dark:bg-zinc-950 opacity-70'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${unlocked ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400' : 'border-[#EAE6DF] dark:border-zinc-800 bg-white/40 dark:bg-black/20 text-[#C17767]'}`}>
                        {ICONS[t.icon] ?? <TrophyIcon size={18} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="font-bold text-sm text-[#4A443C] dark:text-zinc-200">{t.title}</div>
                          <div className="text-[10px] uppercase tracking-widest opacity-50 text-[#4A443C] dark:text-zinc-400">
                            {unlocked ? new Date(t.unlockedAt!).toLocaleDateString('tr-TR') : 'Kilitli'}
                          </div>
                        </div>
                        <div className="text-xs opacity-70 mt-1 text-[#4A443C] dark:text-zinc-300">{t.description}</div>
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

