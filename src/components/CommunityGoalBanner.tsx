/**
 * AMAÇ: Küresel Topluluk Hedefi Banner.
 * MANTIK: communityGoals/{weekId} Firestore belgesi. Kullanıcılar log girince increment oluyor.
 * Sadece okuma — yazma academicSlice.addLog içinden yapılacak.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Globe, Users, Target, Flame } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAppStore } from '../store/appStore';

interface CommunityGoal {
  type: 'questions' | 'focus';
  target: number;
  current: number;
  label: string;
  weekId: string;
  bonusElo?: number;
}

function getWeekId(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
}

export function CommunityGoalBanner() {
  const authUser = useAppStore(s => s.authUser);
  const [goal, setGoal] = useState<CommunityGoal | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authUser?.uid) return;
    const weekId = getWeekId();
    const ref = doc(db, 'communityGoals', weekId);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setGoal({ weekId, ...snap.data() } as CommunityGoal);
      } else {
        setGoal(null);
      }
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsub();
  }, [authUser?.uid]);

  if (isLoading || !goal) return null;

  const progress = Math.min(1, goal.current / goal.target);
  const percent = Math.round(progress * 100);
  const isCompleted = progress >= 1;
  const remaining = Math.max(0, goal.target - goal.current);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 ${
        isCompleted
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${isCompleted ? 'bg-emerald-500/20' : 'bg-[#C17767]/10'}`}>
          <Globe size={14} className={isCompleted ? 'text-emerald-400' : 'text-[#C17767]'} />
        </div>
        <div className="flex-1">
          <p className="text-[9px] uppercase tracking-widest font-black text-zinc-500">
            Haftalık Topluluk Hedefi
          </p>
          <p className="text-xs font-bold text-zinc-200 mt-0.5">{goal.label}</p>
        </div>
        {isCompleted ? (
          <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-black">
            <Flame size={12} fill="currentColor" /> TAMAMLANDI
          </div>
        ) : (
          <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-mono font-bold">
            <Users size={11} />
            {(goal.current || 0).toLocaleString('tr-TR')}/{(goal.target || 0).toLocaleString('tr-TR')}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            isCompleted
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-[#C17767] to-[#E09F3E]'
          }`}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[9px] text-zinc-600 font-bold">
          {isCompleted
            ? `Herkes +${goal.bonusElo || 25} ELO kazandı! 🎉`
            : `${(remaining || 0).toLocaleString('tr-TR')} kaldı · %${percent} tamamlandı`
          }
        </span>
        {goal.bonusElo && !isCompleted && (
          <div className="flex items-center gap-1 text-[9px] text-amber-500 font-black">
            <Target size={10} />
            +{goal.bonusElo} ELO ödülü
          </div>
        )}
      </div>
    </motion.div>
  );
}
