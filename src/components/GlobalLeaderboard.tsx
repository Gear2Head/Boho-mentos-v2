import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { onSnapshot, collection, query, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAppStore } from '../store/appStore';
import { Trophy, Crown, Flame, MessageCircle, Clock } from 'lucide-react';
import { getLevelFromElo } from '../utils/leveling';
import { toast as toastAPI } from '../contexts/ToastContext';

type FilterTab = 'elo' | 'streak' | 'focus';

interface LeaderboardEntry {
  uid: string;
  name: string;
  eloScore: number;
  streakDays: number;
  totalFocusMinutes?: number;
  avatar?: string;
}

const FILTER_TABS: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
  { id: 'elo',    label: 'ELO',  icon: <Trophy size={12} /> },
  { id: 'streak', label: 'Seri', icon: <Flame size={12} /> },
  { id: 'focus',  label: 'Odak', icon: <Clock size={12} /> },
];

export function GlobalLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('elo');
  const authUser = useAppStore(s => s.authUser);

  useEffect(() => {
    // Auth guard: yeni hesaplarda Firestore query atmadan önce UID beklenir.
    if (!authUser?.uid) {
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'publicProfiles'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => {
        const d = doc.data();
        return {
          uid: d.uid || doc.id,
          name: d.profile?.name || d.display_name || 'Savaşçı',
          eloScore: d.eloScore !== undefined ? d.eloScore : 0,
          streakDays: d.streakDays || 0,
          totalFocusMinutes: d.totalFocusMinutes || 0,
          avatar: d.avatar || d.profile?.avatar || d.photoURL,
        } as LeaderboardEntry;
      });
      setEntries(data);
      setIsLoading(false);
    }, (err) => {
      console.error('[Leaderboard] Firestore error:', err);
      setIsLoading(false);
    });

    return () => unsub();
  }, [authUser?.uid]);

  const sortedEntries = useMemo(() => {
    const sorted = [...entries];
    if (activeFilter === 'streak') return sorted.sort((a, b) => b.streakDays - a.streakDays);
    if (activeFilter === 'focus')  return sorted.sort((a, b) => (b.totalFocusMinutes ?? 0) - (a.totalFocusMinutes ?? 0));
    return sorted.sort((a, b) => b.eloScore - a.eloScore);
  }, [entries, activeFilter]);

  const RANK_COLORS = ['text-amber-400', 'text-zinc-300', 'text-amber-700'];
  const RANK_BG = [
    'bg-amber-500/10 border-amber-500/30',
    'bg-zinc-500/5 border-zinc-500/20',
    'bg-amber-700/5 border-amber-700/20',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-[28px] border border-app"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <Crown size={18} className="text-amber-400" />
        </div>
        <div>
          <h3 className="font-display italic text-lg font-bold text-zinc-100 leading-none">Küresel Savaş Odası</h3>
          <p className="text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5 font-black">Top Boho Savaşçıları · Canlı</p>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      {/* Filtre Sekmeleri */}
      <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeFilter === tab.id
                ? 'bg-[#C17767] text-white shadow-md shadow-[#C17767]/20'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* İçerik */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !authUser?.uid ? (
        <div className="text-center py-8 text-zinc-600 italic text-sm">Liderlik tablosunu görmek için giriş yap</div>
      ) : (
        <div className="space-y-2">
          {sortedEntries.map((entry, idx) => {
            const isMe = entry.uid === authUser?.uid;
            const level = getLevelFromElo(entry.eloScore);
            const rankColor = RANK_COLORS[idx] || 'text-zinc-500';
            const rankBg = RANK_BG[idx] || 'bg-white/[0.02] border-white/5';

            const metricLabel =
              activeFilter === 'streak' ? `${entry.streakDays} gün 🔥`
              : activeFilter === 'focus' ? `${Math.round((entry.totalFocusMinutes ?? 0) / 60)}s odak`
              : `${entry.eloScore.toLocaleString()} ELO`;

            return (
              <motion.div
                key={entry.uid}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-[#C17767]/10 border-[#C17767]/30 shadow-[0_0_12px_rgba(193,119,103,0.1)]'
                    : rankBg
                }`}
              >
                {/* Rank */}
                <div className={`w-7 h-7 flex items-center justify-center shrink-0 font-display font-bold text-sm ${rankColor}`}>
                  {idx === 0 ? <Trophy size={18} className="text-amber-400" /> : `#${idx + 1}`}
                </div>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  isMe ? 'bg-[#C17767]/20 text-[#C17767]' : 'bg-white/5 text-zinc-400'
                }`}>
                  {entry.avatar
                    ? <img src={entry.avatar} alt="" className="w-full h-full rounded-xl object-cover" />
                    : entry.name.charAt(0).toUpperCase()
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold truncate ${isMe ? 'text-white' : 'text-zinc-200'}`}>
                      {entry.name}{isMe ? ' (Sen)' : ''}
                    </span>
                    {entry.streakDays > 2 && activeFilter !== 'streak' && (
                      <div className="flex items-center gap-0.5 text-[10px] font-black text-amber-500">
                        <Flame size={10} fill="currentColor" /> {entry.streakDays}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{level.title}</span>
                    <div className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span className="text-[10px] font-mono font-bold text-[#C17767]">{metricLabel}</span>
                  </div>
                </div>

                {/* DM Butonu */}
                {!isMe && (
                  <button
                    onClick={() => toastAPI.success(`${entry.name} ile sohbet başlatıldı!`)}
                    className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-[#C17767] transition-all cursor-pointer"
                    title="Mesaj Gönder"
                  >
                    <MessageCircle size={16} />
                  </button>
                )}
              </motion.div>
            );
          })}

          {sortedEntries.length === 0 && (
            <div className="text-center py-8 text-zinc-600 italic text-sm">Henüz savaşçı yok</div>
          )}
        </div>
      )}
    </motion.div>
  );
}
