import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAppStore } from '../store/appStore';
import { Trophy, Crown, Flame, MessageCircle } from 'lucide-react';
import { getLevelFromElo } from '../utils/leveling';
import { toast as toastAPI } from '../contexts/ToastContext';

interface LeaderboardEntry {
  uid: string;
  name: string;
  eloScore: number;
  streakDays: number;
  avatar?: string;
}

export function GlobalLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const authUser = useAppStore(s => s.authUser);
  const profile = useAppStore(s => s.profile);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      limit(200)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => {
        const d = doc.data();
        return {
          uid: doc.id,
          name: d.profile?.name || d.display_name || 'Savaşçı',
          eloScore: d.eloScore !== undefined ? d.eloScore : 1200,
          streakDays: d.streakDays || 0,
          avatar: d.profile?.avatar || d.photo_url,
        } as LeaderboardEntry;
      }).sort((a, b) => b.eloScore - a.eloScore);
      setEntries(data);
      setIsLoading(false);
    }, (err) => {
      console.error('[Leaderboard] Firestore error:', err);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const RANK_COLORS = ['text-amber-400', 'text-zinc-300', 'text-amber-700'];
  const RANK_BG = ['bg-amber-500/10 border-amber-500/30', 'bg-zinc-500/5 border-zinc-500/20', 'bg-amber-700/5 border-amber-700/20'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-[28px] border border-app"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <Crown size={18} className="text-amber-400" />
        </div>
        <div>
          <h3 className="font-display italic text-lg font-bold text-zinc-100 leading-none">Küresel Savaş Odası</h3>
          <p className="text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5 font-black">Top 10 Boho Savaşçısı · Canlı</p>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const isMe = entry.uid === authUser?.uid;
            const level = getLevelFromElo(entry.eloScore);
            const rankColor = RANK_COLORS[idx] || 'text-zinc-500';
            const rankBg = RANK_BG[idx] || 'bg-white/[0.02] border-white/5';

            return (
              <motion.div
                key={entry.uid}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  isMe ? 'bg-[#C17767]/10 border-[#C17767]/30 shadow-[0_0_12px_rgba(193,119,103,0.1)]' : rankBg
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
                  {entry.avatar ? (
                    <img src={entry.avatar} alt="" className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    entry.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold truncate ${isMe ? 'text-white' : 'text-zinc-200'}`}>{entry.name} {isMe ? '(Sen)' : ''}</span>
                      {entry.streakDays > 0 && (
                        <div className="flex items-center gap-0.5 text-[10px] font-black text-amber-500">
                           <Flame size={10} fill="currentColor" /> {entry.streakDays}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{level.title}</span>
                      <div className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span className="text-[10px] font-mono font-bold text-[#C17767]">{entry.eloScore.toLocaleString()} ELO</span>
                    </div>
                </div>

                {/* Actions */}
                {!isMe && (
                  <button 
                    onClick={() => {
                      // TODO: Open DM Panel
                      toastAPI.success(`${entry.name} ile sohbet başlatıldı!`);
                    }}
                    className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-[#C17767] transition-all"
                    title="Mesaj Gönder"
                  >
                    <MessageCircle size={16} />
                  </button>
                )}
              </motion.div>
            );
          })}

          {entries.length === 0 && (
            <div className="text-center py-8 text-zinc-600 italic text-sm">Henüz savaşçı yok</div>
          )}
        </div>
      )}
    </motion.div>
  );
}
