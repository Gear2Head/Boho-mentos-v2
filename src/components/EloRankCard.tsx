import React from 'react';
import { Trophy, Star, Shield, Medal, Target, Crown } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { toISODateOnly } from '../utils/date';
import { motion } from 'motion/react';
import { getLevelFromElo, SKIN_CLASSES } from '../utils/leveling';

export type RankTitle = 'Bronz' | 'Gümüş' | 'Altın' | 'Platin' | 'Elmas' | 'Usta' | 'Şampiyon' | 'Üstat' | 'Efsanevi' | 'Boho İlahı';

interface RankConfig {
  title: RankTitle;
  minElo: number;
  color: string;
  iconName: 'Trophy' | 'Medal' | 'Shield' | 'Target' | 'Star' | 'Crown';
}

const iconMap = {
  Trophy: Trophy,
  Medal: Medal,
  Shield: Shield,
  Target: Target,
  Star: Star,
  Crown: Crown,
};

export const RANK_CONFIG: RankConfig[] = [
  { title: 'Bronz', minElo: 0, color: 'text-amber-700', iconName: 'Trophy' },
  { title: 'Gümüş', minElo: 2500, color: 'text-gray-400', iconName: 'Medal' },
  { title: 'Altın', minElo: 7000, color: 'text-yellow-500', iconName: 'Medal' },
  { title: 'Platin', minElo: 13000, color: 'text-emerald-500', iconName: 'Shield' },
  { title: 'Elmas', minElo: 20000, color: 'text-cyan-400', iconName: 'Target' },
  { title: 'Usta', minElo: 30000, color: 'text-red-500', iconName: 'Star' },
  { title: 'Şampiyon', minElo: 42000, color: 'text-purple-500', iconName: 'Crown' },
  { title: 'Üstat', minElo: 58000, color: 'text-indigo-400', iconName: 'Crown' },
  { title: 'Efsanevi', minElo: 78000, color: 'text-rose-500', iconName: 'Crown' },
  { title: 'Boho İlahı', minElo: 100000, color: 'text-white shadow-[0_0_15px_rgba(255,255,255,0.5)]', iconName: 'Crown' },
];

export function getRankDetails(elo: number) {
  const currentRankIndex = [...RANK_CONFIG].reverse().findIndex(r => elo >= r.minElo);
  const rankIndex = currentRankIndex === -1
    ? 0
    : Math.max(0, Math.min(RANK_CONFIG.length - 1, RANK_CONFIG.length - 1 - currentRankIndex));
  const currentRank = RANK_CONFIG[rankIndex];
  const nextRank = RANK_CONFIG[rankIndex + 1] || null;

  // 2. Küme (Division) Hesapla (IV - I arası)
  let division = "";
  let progressInRank = 0;

  if (nextRank) {
    const range = nextRank.minElo - currentRank.minElo;
    const eloInCurrentRank = elo - currentRank.minElo;
    progressInRank = (eloInCurrentRank / range) * 100;

    const divisions = ["IV", "III", "II", "I"];
    const divIndex = Math.floor((eloInCurrentRank / range) * 4);
    division = currentRank.title === 'Boho İlahı' ? "" : divisions[Math.min(divIndex, 3)];
  } else {
    progressInRank = 100; 
  }

  return {
    ...currentRank,
    division,
    progress: Math.min(progressInRank, 100),
    nextElo: nextRank ? nextRank.minElo : elo
  };
}

export function EloRankCard() {
  const eloScore = useAppStore(state => state.eloScore);
  const streakDays = useAppStore(state => state.streakDays);
  const dailyEloDelta = useAppStore(state => state.dailyEloDelta);
  const lastEloUpdateDate = useAppStore(state => state.lastEloUpdateDate);
  
  const isToday = lastEloUpdateDate === toISODateOnly();
  const delta = isToday ? dailyEloDelta : 0;
  
  const { title, division, color, progress, nextElo, iconName } = getRankDetails(eloScore);
  const IconComponent = iconMap[iconName] || Trophy;

  return (
    <motion.div 
      whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', borderColor: 'rgba(193,119,103,0.3)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className="glass-card p-4 md:p-5 rounded-2xl flex flex-col gap-3 md:gap-4 transition-all duration-300 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3 md:gap-4">
          <motion.div 
            whileHover={{ rotate: 12, scale: 1.1 }}
            className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl bg-[#121212] border border-[#2A2A2A] shadow-inner ${color}`}
          >
            <IconComponent size={24} className="md:w-7 md:h-7" />
          </motion.div>
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Mevcut Lig</p>
            <h3 className={`text-xl md:text-2xl font-black ${color} flex items-center gap-2 font-display italic leading-none`}>
              {title} <span className="text-zinc-300 not-italic font-sans text-sm md:text-base">{division}</span>
            </h3>
          </div>
        </div>
        <div className="text-right">
          <motion.div 
            key={eloScore}
            initial={{ scale: 1.2, color: delta > 0 ? '#10b981' : '#C17767' }}
            animate={{ scale: 1, color: '#C17767' }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="font-mono text-2xl font-bold"
          >
            {eloScore} <span className="text-[10px] opacity-50 font-sans text-zinc-400">Puan</span>
          </motion.div>
          {delta !== 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-[10px] font-bold ${delta > 0 ? 'text-emerald-500' : 'text-red-500'} italic mt-0.5`}
            >
              {delta > 0 ? '+' : ''}{delta} ELO (Bugün)
            </motion.div>
          )}
          <div className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">Hedef: {nextElo} Puan</div>
        </div>
      </div>

      <div className="w-full h-2.5 bg-[#121212] rounded-full overflow-hidden border border-[#2A2A2A] relative z-10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`h-full shadow-[0_0_15px_rgba(255,255,255,0.1)] ${color.includes('shadow') ? 'bg-white' : color.replace('text-', 'bg-')}`}
        />
      </div>

      {/* Level Badge — Task 10 */}
      {(() => {
        const lvl = getLevelFromElo(eloScore);
        const skinBg = lvl.skin === 'divine' ? 'linear-gradient(135deg,#fff,#fcd34d,#fff)' :
                      lvl.skin === 'void' ? 'linear-gradient(135deg,#000,#4c1d95,#000)' :
                      lvl.skin === 'legendary' ? 'linear-gradient(135deg,#f59e0b,#ef4444)' :
                      lvl.skin === 'obsidian' ? 'linear-gradient(135deg,#6b7280,#374151)' :
                      lvl.skin === 'crimson' ? 'linear-gradient(135deg,#ef4444,#dc2626)' :
                      lvl.skin === 'gold' ? 'linear-gradient(135deg,#f59e0b,#d97706)' :
                      lvl.skin === 'silver' ? 'linear-gradient(135deg,#9ca3af,#6b7280)' :
                      '#C17767';

        return (
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5 relative z-10 overflow-hidden">
            <div className="flex items-center gap-2">
              <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white relative overflow-hidden`}
                style={{ background: skinBg }}>
                {/* Shine effect */}
                <motion.div 
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                />
                <span className="relative z-10">Lvl {lvl.level}</span>
              </div>
              <span className="text-xs font-bold text-zinc-300">{lvl.title}</span>
            </div>
            <div className="flex-1 mx-3">
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#C17767]"
                  initial={{ width: 0 }}
                  animate={{ width: `${lvl.progressPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">{lvl.xpCurrent}/{lvl.xpRequired} XP</span>
          </div>
        );
      })()}

      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest relative z-10">
        <p className="text-zinc-500">
           {title === 'Şampiyon' ? 'Maksimum Seviye' : `Terfi: %${100 - Math.round(progress)} Kaldı`}
        </p>
        <motion.span 
          whileHover={{ scale: 1.1 }}
          className="text-[#E09F3E] bg-[#E09F3E]/10 px-2.5 py-1 rounded text-[10px] shadow-[0_0_10px_rgba(224,159,62,0.1)] flex items-center gap-1.5"
        >
          🔥 {streakDays} GÜN SERİ
        </motion.span>
      </div>
    </motion.div>
  );
}
