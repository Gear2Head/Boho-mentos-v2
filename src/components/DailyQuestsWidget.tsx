import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/appStore';
import { Swords, Zap, Target, Clock, CheckCircle2, Trophy, Star } from 'lucide-react';
import { toISODateOnly } from '../utils/date';

interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'questions' | 'accuracy' | 'time' | 'subject';
  target: number;
  unit: string;
  xp: number;
  subject?: string;
  icon: React.ReactNode;
}

// Deterministic seed based on date + user profile
function seedRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return (h >>> 0) / 0x100000000;
  };
}

function generateDailyQuests(date: string, profile: any, logs: any[]): Quest[] {
  const rand = seedRandom(date + (profile?.name || 'user'));
  
  const questPool: Quest[] = [
    {
      id: 'q_questions',
      title: '50 Soru Savaşçısı',
      description: 'Bugün en az 50 soru çöz',
      type: 'questions',
      target: 50,
      unit: 'soru',
      xp: 100,
      icon: <Swords size={16} className="text-amber-400" />,
    },
    {
      id: 'q_accuracy',
      title: 'Keskin Nişancı',
      description: 'Bir derste %80+ doğruluk yakala',
      type: 'accuracy',
      target: 80,
      unit: '%',
      xp: 150,
      icon: <Target size={16} className="text-emerald-400" />,
    },
    {
      id: 'q_time',
      title: 'Saat Ustası',
      description: 'Bugün 2 saat+ çalış',
      type: 'time',
      target: 120,
      unit: 'dk',
      xp: 120,
      icon: <Clock size={16} className="text-blue-400" />,
    },
    {
      id: 'q_streak',
      title: 'Seri Devam',
      description: 'Bugün en az 1 log gir ve seriyi koru',
      type: 'questions',
      target: 1,
      unit: 'log',
      xp: 80,
      icon: <Star size={16} className="text-yellow-400" />,
    },
    {
      id: 'q_heavy',
      title: 'Ağır Topçu',
      description: '100+ soru çöz tek seansta',
      type: 'questions',
      target: 100,
      unit: 'soru',
      xp: 200,
      icon: <Zap size={16} className="text-rose-400" />,
    },
    {
      id: 'q_perfect',
      title: 'Mükemmel Seans',
      description: '0 hatayla bir seans tamamla',
      type: 'accuracy',
      target: 100,
      unit: '%',
      xp: 300,
      icon: <Trophy size={16} className="text-purple-400" />,
    },
  ];

  // Pick 3 random quests from pool using seeded random
  const shuffled = [...questPool].sort(() => rand() - 0.5);
  const selected = shuffled.slice(0, 3);

  // MYSTERIOUS MISSION: 10% chance to replace the last quest
  if (rand() > 0.9) {
    selected[2] = {
      id: 'q_mystery',
      title: 'Gizemli Görev',
      description: '??? (Sadece çözmeye başlayınca ne olduğunu anlayacaksın)',
      type: 'questions',
      target: 77, // Hidden target
      unit: '???',
      xp: 500,
      icon: <Swords size={16} className="text-white animate-pulse" />,
    };
  }

  return selected;
}

function computeQuestProgress(quest: Quest, logs: any[], todayStr: string): number {
  const todayLogs = logs.filter(l => l.date?.startsWith(todayStr));
  
  switch (quest.type) {
    case 'questions': {
      if (quest.id === 'q_streak') return todayLogs.length >= 1 ? 1 : 0;
      const total = todayLogs.reduce((acc, l) => acc + (l.questions || 0), 0);
      return Math.min(quest.target, total);
    }
    case 'accuracy': {
      const pct = todayLogs
        .map(l => (l.correct / Math.max(1, l.questions)) * 100)
        .filter(p => p >= quest.target);
      return pct.length > 0 ? quest.target : 0;
    }
    case 'time': {
      const mins = todayLogs.reduce((acc, l) => acc + (l.avgTime || 0), 0);
      return Math.min(quest.target, mins);
    }
    default:
      return 0;
  }
}

export function DailyQuestsWidget() {
  const profile = useAppStore(s => s.profile);
  const logs = useAppStore(s => s.logs);
  const claimedQuests = useAppStore(s => s.claimedQuests);
  const claimQuest = useAppStore(s => s.claimQuest);

  const todayStr = toISODateOnly();
  const dayClaims = useMemo(() => new Set(claimedQuests[todayStr] || []), [claimedQuests, todayStr]);

  const quests = useMemo(() => generateDailyQuests(todayStr, profile, logs), [todayStr, profile]);

  const handleClaim = (quest: Quest) => {
    claimQuest(todayStr, quest.id, quest.xp);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-[28px] border border-app"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <Swords size={18} className="text-amber-400" />
        </div>
        <div>
          <h3 className="font-display italic text-lg font-bold text-zinc-100 leading-none">Günlük Görevler</h3>
          <p className="text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5 font-black">
            {todayStr} · Her gün yenilenir
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {quests.map((quest) => {
          const progress = computeQuestProgress(quest, logs, todayStr);
          const isComplete = progress >= quest.target;
          const isClaimed = dayClaims.has(quest.id);
          const pct = Math.round((progress / quest.target) * 100);

          return (
            <motion.div
              key={quest.id}
              className={`p-4 rounded-2xl border transition-all ${
                isClaimed
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : isComplete
                  ? 'bg-amber-500/5 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.1)]'
                  : 'bg-white/[0.02] border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {quest.icon}
                  <span className={`text-sm font-bold ${isClaimed ? 'text-emerald-200/50 line-through' : 'text-zinc-200'}`}>
                    {quest.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">+{quest.xp} XP</span>
                  {isClaimed && <CheckCircle2 size={16} className="text-emerald-500" />}
                  {isComplete && !isClaimed && (
                    <button
                      onClick={() => handleClaim(quest)}
                      className="px-3 py-1 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-400 transition-all"
                    >
                      AL
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 mb-2">{quest.description}</p>
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${isClaimed ? 'bg-emerald-500' : isComplete ? 'bg-amber-500' : 'bg-[#C17767]'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, pct)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-zinc-600">{progress} / {quest.target} {quest.unit}</span>
                <span className="text-[9px] text-zinc-600">{pct}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
