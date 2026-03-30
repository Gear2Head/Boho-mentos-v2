import React from 'react';
import { Trophy, Star, Shield, Medal, Target, Crown } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export type RankTitle = 'Bronz' | 'Gümüş' | 'Altın' | 'Platin' | 'Elmas' | 'Usta' | 'Şampiyon';

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
  { title: 'Gümüş', minElo: 1000, color: 'text-gray-400', iconName: 'Medal' },
  { title: 'Altın', minElo: 2500, color: 'text-yellow-500', iconName: 'Medal' },
  { title: 'Platin', minElo: 4500, color: 'text-emerald-500', iconName: 'Shield' },
  { title: 'Elmas', minElo: 7000, color: 'text-cyan-400', iconName: 'Target' },
  { title: 'Usta', minElo: 10500, color: 'text-red-500', iconName: 'Star' },
  { title: 'Şampiyon', minElo: 15000, color: 'text-purple-500', iconName: 'Crown' },
];

export function getRankDetails(elo: number) {
  // 1. Mevcut Ligi Bul
  const currentRankIndex = [...RANK_CONFIG].reverse().findIndex(r => elo >= r.minElo);
  const rankIndex = currentRankIndex === -1 ? 0 : (RANK_CONFIG.length - 1 - currentRankIndex);
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
    division = currentRank.title === 'Şampiyon' ? "" : divisions[Math.min(divIndex, 3)];
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
  
  const isToday = lastEloUpdateDate === new Date().toLocaleDateString('tr-TR');
  const delta = isToday ? dailyEloDelta : 0;
  
  const { title, division, color, progress, nextElo, iconName } = getRankDetails(eloScore);
  const IconComponent = iconMap[iconName] || Trophy;

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-5 rounded-2xl shadow-xl flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 flex items-center justify-center rounded-xl bg-[#121212] border border-[#2A2A2A] shadow-inner ${color}`}>
            <IconComponent size={28} />
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Mevcut Lig</p>
            <h3 className={`text-2xl font-black ${color} flex items-center gap-2 font-display italic`}>
              {title} <span className="text-zinc-300 not-italic font-sans">{division}</span>
            </h3>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-[#C17767]">
            {eloScore} <span className="text-[10px] opacity-50 font-sans">Puan</span>
          </div>
          {delta !== 0 && (
            <div className={`text-[10px] font-bold ${delta > 0 ? 'text-emerald-500' : 'text-red-500'} italic mt-0.5`}>
              {delta > 0 ? '+' : ''}{delta} ELO (Bugün)
            </div>
          )}
          <div className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">Hedef: {nextElo} Puan</div>
        </div>
      </div>

      <div className="w-full h-2.5 bg-[#121212] rounded-full overflow-hidden border border-[#2A2A2A] relative">
        <div
          className={`h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.1)] ${color.replace('text-', 'bg-')}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
        <p className="text-zinc-500">
           {title === 'Şampiyon' ? 'Maksimum Seviye' : `Terfi: %${100 - Math.round(progress)} Kaldı`}
        </p>
        <span className="text-[#E09F3E] bg-[#E09F3E]/10 px-2.5 py-1 rounded text-[10px] shadow-[0_0_10px_rgba(224,159,62,0.1)] flex items-center gap-1.5">
          🔥 {streakDays} GÜN SERİ
        </span>
      </div>
    </div>
  );
}
