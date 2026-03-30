import React from 'react';
import { Trophy, Star, Shield, Medal, Target, Crown } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { RankTitle } from '../types';

export function getRankTier(elo: number): { title: RankTitle; icon: React.ReactNode; color: string; nextLimit: number } {
  if (elo >= 3000) return { title: 'Şampiyon', icon: <Crown size={20} />, color: 'text-purple-500', nextLimit: 3000 };
  if (elo >= 2600) return { title: 'Usta', icon: <Star size={20} />, color: 'text-red-500', nextLimit: 3000 };
  if (elo >= 2200) return { title: 'Elmas', icon: <Target size={20} />, color: 'text-cyan-400', nextLimit: 2600 };
  if (elo >= 1800) return { title: 'Platin', icon: <Shield size={20} />, color: 'text-emerald-500', nextLimit: 2200 };
  if (elo >= 1500) return { title: 'Altın', icon: <Medal size={20} fill="currentColor" />, color: 'text-yellow-500', nextLimit: 1800 };
  if (elo >= 1200) return { title: 'Gümüş', icon: <Medal size={20} />, color: 'text-gray-400', nextLimit: 1500 };
  return { title: 'Bronz', icon: <Trophy size={20} />, color: 'text-amber-700', nextLimit: 1200 }; // Varsayılan başlangıç
}

export function EloRankCard() {
  const eloScore = useAppStore(state => state.eloScore);
  const streakDays = useAppStore(state => state.streakDays);

  const rank = getRankTier(eloScore);

  // Calculate Progress
  let currentLimit = 0;
  if (rank.title === 'Gümüş') currentLimit = 2200;
  else if (rank.title === 'Altın') currentLimit = 4500;
  else if (rank.title === 'Platin') currentLimit = 5800;
  else if (rank.title === 'Elmas') currentLimit = 7200;
  else if (rank.title === 'Usta') currentLimit = 8600;
  else if (rank.title === 'Şampiyon') currentLimit = 10000;

  const progress = rank.title === 'Şampiyon'
    ? 100
    : Math.max(0, Math.min(100, ((eloScore - currentLimit) / (rank.nextLimit - currentLimit)) * 100));

  return (
    <div className="flex items-center gap-4 border border-[#2A2A2A] bg-[#1A1A1A] rounded-xl p-4 shadow-sm">
      <div className={`w-12 h-12 flex items-center justify-center rounded-xl bg-[#121212] border border-[#2A2A2A] shadow-inner ${rank.color}`}>
        {rank.icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-baseline mb-1">
          <h4 className="font-serif italic font-bold text-zinc-200 uppercase tracking-widest">{rank.title} Ligi</h4>
          <span className="font-mono text-sm font-bold text-[#C17767]">{eloScore} <span className="text-[10px] opacity-50 font-sans">Puan</span></span>
        </div>
        <div className="h-2 w-full bg-[#121212] border border-[#2A2A2A] rounded-full overflow-hidden mt-2 relative">
          <div
            className="h-full bg-gradient-to-r from-[#C17767] to-[#E09F3E] transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[9px] uppercase tracking-widest opacity-60 text-zinc-400">
          <span>{rank.title !== 'Şampiyon' ? `${rank.nextLimit - eloScore} puan kaldı` : 'Maksimum Seviye'}</span>
          <span className="text-[#C17767] font-bold flex items-center gap-1">🔥 {streakDays} GÜN SERİ</span>
        </div>
      </div>
    </div>
  );
}
