import React, { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { Ghost, Swords, TrendingUp, Flame } from 'lucide-react';
import { motion } from 'motion/react';

export function GhostRivalWidget() {
  const ghostRival = useAppStore((s) => s.ghostRival);
  const generateGhostRival = useAppStore((s) => s.generateGhostRival);
  const userElo = useAppStore((s) => s.eloScore);

  useEffect(() => {
    if (!ghostRival) {
      generateGhostRival();
    }
  }, [ghostRival, generateGhostRival]);

  if (!ghostRival) return null;

  const isUserWinning = userElo >= ghostRival.eloScore;

  return (
    <div className="bg-surface border border-app rounded-2xl p-5 shadow-sm relative overflow-hidden group">
      {/* Background abstract shape */}
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors" />

      <div className="flex items-center justify-between mb-4 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-surface-2 border border-app flex items-center justify-center">
            <Ghost size={16} className={isUserWinning ? "text-ink-muted" : "text-amber-500"} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Hayalet Rakip</h3>
            <p className="text-[10px] text-ink-muted uppercase tracking-wider font-mono">
              Eşleşme: {ghostRival.source === 'community_avg' ? 'Topluluk' : 'Geçmiş'}
            </p>
          </div>
        </div>
        <div className="bg-surface-2 px-2.5 py-1 rounded-full border border-app shadow-sm">
          <span className="text-[10px] font-black text-ink uppercase tracking-widest flex items-center gap-1.5">
            <Swords size={12} className={isUserWinning ? "text-emerald-500" : "text-amber-500"} />
            VS
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 relative">
        {/* Rival Profile */}
        <div className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-app-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center font-bold text-lg">
              {ghostRival.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-ink">{ghostRival.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-ink-muted flex items-center gap-1 font-mono">
                  <TrendingUp size={10} className="text-blue-500" />
                  {ghostRival.eloScore.toLocaleString()} ELO
                </span>
                <span className="text-[10px] text-ink-muted flex items-center gap-1 font-mono">
                  <Flame size={10} className="text-amber-500" />
                  {ghostRival.streakDays}G
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Bars */}
        <div className="space-y-2 mt-2">
          <div>
            <div className="flex justify-between text-[10px] font-bold mb-1 font-mono">
              <span className="text-ink">Senin ELO</span>
              <span className={isUserWinning ? "text-emerald-500" : "text-amber-500"}>
                {userElo.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((userElo / (userElo + ghostRival.eloScore)) * 100, 100)}%` }}
                className={`h-full ${isUserWinning ? 'bg-emerald-500' : 'bg-[#C17767]'}`}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-bold mb-1 font-mono">
              <span className="text-ink-muted">{ghostRival.name} ELO</span>
              <span className="text-ink">{ghostRival.eloScore.toLocaleString()}</span>
            </div>
            <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((ghostRival.eloScore / (userElo + ghostRival.eloScore)) * 100, 100)}%` }}
                className="h-full bg-ink-muted"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
