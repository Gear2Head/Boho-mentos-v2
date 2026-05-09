import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Trophy, TrendingDown, TrendingUp, Star, RefreshCw, Target } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getCoachResponse } from '../services/gemini';
import { buildCoachContext } from '../services/coachContext';
import { CoachParser } from './coach/CoachParser';
import { useToast } from './ToastContext';
import { AudioEngine } from '../utils/audioEngine';

interface WeeklyBoss {
  name: string;
  subject: string;
  weakness: string;
  hp: number;
  maxHp: number;
  icon: string;
}

function getWeekBounds() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const start = new Date(now);
  start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function WeeklyBossFight() {
  const logs = useAppStore(s => s.logs);
  const exams = useAppStore(s => s.exams);
  const profile = useAppStore(s => s.profile);
  const { toast } = useToast();

  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [bossDefeated, setBossDefeated] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const { start, end } = getWeekBounds();

  const weekLogs = useMemo(() => {
    return logs.filter(l => {
      const d = new Date(l.date);
      return d >= start && d <= end;
    });
  }, [logs, start, end]);

  const weekExams = useMemo(() => {
    return exams.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
  }, [exams, start, end]);

  const boss = useMemo((): WeeklyBoss | null => {
    if (weekLogs.length === 0) return null;

    const subjectMap = new Map<string, { q: number; c: number }>();
    weekLogs.forEach(l => {
      const ex = subjectMap.get(l.subject) || { q: 0, c: 0 };
      subjectMap.set(l.subject, { q: ex.q + l.questions, c: ex.c + l.correct });
    });

    let worstSubject = '';
    let lowestRate = 1;
    subjectMap.forEach((v, subject) => {
      if (v.q < 20) return;
      const rate = v.c / v.q;
      if (rate < lowestRate) {
        lowestRate = rate;
        worstSubject = subject;
      }
    });

    if (!worstSubject) return null;

    const stats = subjectMap.get(worstSubject)!;
    const hpRemaining = Math.round((1 - (stats.c / stats.q)) * 100);

    return {
      name: `${worstSubject} Canavarı`,
      subject: worstSubject,
      weakness: 'Yanlış sorular',
      hp: hpRemaining,
      maxHp: 100,
      icon: hpRemaining > 60 ? '💀' : hpRemaining > 30 ? '🔥' : '⚡',
    };
  }, [weekLogs]);

  const weekStats = useMemo(() => {
    const totalQ = weekLogs.reduce((s, l) => s + l.questions, 0);
    const totalC = weekLogs.reduce((s, l) => s + l.correct, 0);
    const accuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
    const studyDays = new Set(weekLogs.map(l => l.date.substring(0, 10))).size;
    return { totalQ, accuracy, studyDays, exams: weekExams.length };
  }, [weekLogs, weekExams]);

  const requestBossDebrief = async () => {
    if (!profile) return;
    setLoading(true);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 2000);

    try {
      const { contextString, userState } = buildCoachContext({ profile, logs: weekLogs, exams: weekExams, eloScore: 0, streakDays: 0, tytSubjects: [], aytSubjects: [], activeAlerts: [] });
      const summaryStats = `Bu hafta ${weekStats.totalQ} soru çözüldü, %${weekStats.accuracy} doğruluk, ${weekStats.studyDays} gün çalışıldı, ${weekStats.exams} deneme girildi.${boss ? ` En zayıf ders: ${boss.subject} (%${100 - boss.hp} doğruluk).` : ''}`;

      const response = await getCoachResponse(
        summaryStats,
        contextString,
        [],
        { intent: 'weekly_review', coachPersonality: profile.coachPersonality, wantDirective: true, userState }
      );
      setAnalysis(response);
      if (boss && weekStats.accuracy > 70) {
        setBossDefeated(true);
        AudioEngine.playBossDefeated();
      }
    } catch (e) {
      toast.error('Haftalık analiz alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`glass-card p-6 rounded-[32px] relative overflow-hidden transition-all duration-500 ${isShaking ? 'animate-shake scale-[1.02]' : ''} ${boss && !bossDefeated ? 'border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]' : 'border-app'}`}>
      <div className={`absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-transparent pointer-events-none transition-opacity duration-1000 ${boss && !bossDefeated ? 'opacity-100' : 'opacity-0'}`} />
      
      {boss && !bossDefeated && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="w-full h-1 bg-red-500/50 shadow-[0_0_15px_red] animate-[sync-progress_2s_linear_infinite]" />
        </div>
      )}

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <motion.div 
            animate={boss && !bossDefeated ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className="p-3 bg-red-500/20 rounded-2xl text-red-500 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
          >
            <Swords size={24} />
          </motion.div>
          <div>
            <h3 className="text-xl font-display italic font-black text-white leading-none tracking-tight">HAFTALIK BOSS FIGHT</h3>
            <p className="text-[10px] text-zinc-500 tracking-[0.2em] mt-1 font-black uppercase">
              {start.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} – {end.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
            </p>
          </div>
        </div>
        {boss && !bossDefeated && (
          <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
            <span className="text-[10px] font-black text-red-500 animate-pulse uppercase tracking-widest">TEHLİKE: YÜKSEK</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6 relative z-10">
        {[
          { label: 'Soru', value: weekStats.totalQ, icon: <Target size={12} /> },
          { label: 'Doğruluk', value: `%${weekStats.accuracy}`, icon: <Star size={12} /> },
          { label: 'Gün', value: weekStats.studyDays, icon: <TrendingUp size={12} /> },
          { label: 'Deneme', value: weekStats.exams, icon: <Trophy size={12} /> },
        ].map((s, i) => (
          <div key={i} className="bg-[#121212] border border-white/5 p-3 rounded-2xl text-center">
            <div className="text-zinc-500 mb-1 flex justify-center">{s.icon}</div>
            <p className="text-lg font-bold font-mono text-zinc-100">{s.value}</p>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative z-10 mb-6">
        {boss ? (
          <AnimatePresence mode="wait">
            {!bossDefeated ? (
              <motion.div 
                key="boss" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
                className="bg-[#0A0A0C] border-2 border-red-900/40 p-6 rounded-[28px] shadow-2xl relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-red-500/[0.02] group-hover:bg-red-500/[0.04] transition-colors pointer-events-none" />
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="text-5xl">{boss.icon}</motion.span>
                    <div>
                      <h4 className="text-2xl font-display italic font-black text-red-500 tracking-tight">{boss.name.toUpperCase()}</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{boss.subject}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-4xl font-display italic font-black text-white">{boss.hp}</span>
                      <span className="text-xs font-bold text-zinc-600">/{boss.maxHp} HP</span>
                    </div>
                  </div>
                </div>
                <div className="h-3 bg-zinc-900 rounded-full overflow-hidden border border-white/5 p-0.5">
                  <motion.div initial={{ width: '100%' }} animate={{ width: `${boss.hp}%` }} className={`h-full rounded-full ${boss.hp > 60 ? 'bg-red-600' : boss.hp > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="defeated" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-500/10 border-2 border-emerald-500/30 p-8 rounded-[32px] text-center">
                <Trophy size={40} className="text-emerald-400 mx-auto mb-4" />
                <h4 className="font-display italic font-black text-emerald-400 text-3xl mb-2">BOSS YERLE BİR!</h4>
                <div className="mt-6 flex justify-center gap-3">
                   <div className="px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-[10px] font-black text-emerald-400">+500 ELO</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
            <TrendingDown size={24} className="mx-auto text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-500">Bu hafta analiz için yeterli veri yok.<br />En az 20 soru çöz.</p>
          </div>
        )}
      </div>

      <div className="relative z-10">
        <button
          onClick={requestBossDebrief}
          disabled={loading || weekLogs.length === 0}
          className="w-full py-3 bg-red-600/20 border border-red-500/30 text-red-400 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-red-600/40 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Swords size={14} />}
          {loading ? 'Kübra Raporu Hazırlıyor...' : 'Haftalık Boss Raporu Al'}
        </button>

        {analysis && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-[#0D0D0D] border border-[#2A2A2A] rounded-2xl p-5">
            <div className="text-sm leading-relaxed text-zinc-300">
              <CoachParser content={analysis} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
