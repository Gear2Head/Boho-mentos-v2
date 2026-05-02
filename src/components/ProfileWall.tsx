/**
 * AMAÇ: Profil Ziyaretçi Duvarı.
 * MANTIK: users/{uid}/wall/{entryId} koleksiyonu. Firestore rules ile spam koruması.
 * Günde 1 kullanıcıya max 3 not limiti servis katmanında uygulanıyor.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageSquare, Send, Loader2 } from 'lucide-react';
import {
  collection, addDoc, onSnapshot, query, orderBy, limit,
  serverTimestamp, getDocs, where, Timestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAppStore } from '../store/appStore';

interface WallEntry {
  id: string;
  from: string;
  fromName: string;
  emoji: string;
  note: string;
  createdAt: Timestamp | null;
}

const QUICK_EMOJIS = ['🔥', '💪', '⚡', '🏆', '🎯', '👑', '✨', '🚀'];

interface ProfileWallProps {
  targetUid: string;
  isOwnProfile?: boolean;
}

async function canPostToWall(fromUid: string, toUid: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wallRef = collection(db, 'users', toUid, 'wall');
  const q = query(wallRef, where('from', '==', fromUid), where('createdAt', '>=', Timestamp.fromDate(today)));
  const snap = await getDocs(q);
  return snap.size < 3;
}

export function ProfileWall({ targetUid, isOwnProfile = false }: ProfileWallProps) {
  const authUser = useAppStore(s => s.authUser);
  const profile = useAppStore(s => s.profile);
  const [entries, setEntries] = useState<WallEntry[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState('🔥');
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sentToday, setSentToday] = useState(false);

  useEffect(() => {
    if (!targetUid) return;
    const q = query(
      collection(db, 'users', targetUid, 'wall'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as WallEntry)));
      setIsLoading(false);
    });
    return () => unsub();
  }, [targetUid]);

  useEffect(() => {
    if (!authUser?.uid || isOwnProfile) return;
    canPostToWall(authUser.uid, targetUid).then(can => setSentToday(!can));
  }, [authUser?.uid, targetUid, isOwnProfile]);

  const handlePost = useCallback(async () => {
    if (!authUser?.uid || !note.trim() || isSending) return;
    const canPost = await canPostToWall(authUser.uid, targetUid);
    if (!canPost) { setSentToday(true); return; }

    setIsSending(true);
    try {
      await addDoc(collection(db, 'users', targetUid, 'wall'), {
        from: authUser.uid,
        fromName: profile?.name || 'Savaşçı',
        emoji: selectedEmoji,
        note: note.trim().slice(0, 200),
        createdAt: serverTimestamp(),
      });
      setNote('');
    } catch (e) {
      console.error('[Wall] Post error:', e);
    } finally {
      setIsSending(false);
    }
  }, [authUser?.uid, targetUid, note, selectedEmoji, isSending, profile?.name]);

  const formatTime = (ts: Timestamp | null): string => {
    if (!ts) return '';
    const d = ts.toDate();
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'şimdi';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}dk önce`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}s önce`;
    return `${Math.floor(diff / 86_400_000)}g önce`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare size={16} className="text-[#C17767]" />
        <h3 className="text-[10px] uppercase tracking-widest font-black text-zinc-400">
          Profil Duvarı
        </h3>
        <span className="text-[10px] text-zinc-600 font-bold">({entries.length})</span>
      </div>

      {/* Input Alanı — Sadece başkasının profili ve auth varsa */}
      {authUser?.uid && !isOwnProfile && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          {/* Emoji Seçici */}
          <div className="flex gap-2 flex-wrap">
            {QUICK_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => setSelectedEmoji(e)}
                className={`w-9 h-9 rounded-xl text-lg transition-all cursor-pointer ${
                  selectedEmoji === e
                    ? 'bg-[#C17767]/20 ring-2 ring-[#C17767]/50 scale-110'
                    : 'hover:bg-white/5'
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Not Alanı */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={sentToday ? 'Bugün 3 not bıraktın, yarın tekrar!' : 'Bir not bırak... (max 200 karakter)'}
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 200))}
              onKeyDown={e => e.key === 'Enter' && handlePost()}
              disabled={sentToday || isSending}
              autoComplete="off"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#C17767]/50 disabled:opacity-40"
            />
            <button
              onClick={handlePost}
              disabled={!note.trim() || sentToday || isSending}
              className="w-10 h-10 rounded-xl bg-[#C17767] text-white flex items-center justify-center hover:bg-[#A56253] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <p className="text-[9px] text-zinc-700 font-mono">{note.length}/200 · Günde max 3 not</p>
        </div>
      )}

      {/* Notlar Listesi */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-zinc-600 text-sm italic">
          Henüz not yok. İlk notu sen bırak! ✨
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3"
              >
                <span className="text-xl shrink-0 mt-0.5">{entry.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-zinc-200">{entry.fromName}</span>
                    <span className="text-[9px] text-zinc-600 font-mono">{formatTime(entry.createdAt)}</span>
                  </div>
                  <p className="text-sm text-zinc-400 break-words">{entry.note}</p>
                </div>
                <Heart size={12} className="text-zinc-700 shrink-0 mt-1" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
