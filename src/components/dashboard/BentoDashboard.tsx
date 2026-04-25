import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { Clock, CheckCircle2, Calendar, AlertTriangle, BookOpen, Target, Activity } from 'lucide-react';
import { calcWorkloadRemaining } from '../../utils/statistics';
import { calcSourceROI } from '../../utils/statistics';
import { detectHabitAlerts } from '../../utils/statistics';
import { parseFlexibleDate, toISODateOnly } from '../../utils/date';
import { MiniFlapClock } from '../FlapClock';
import { calculateDaysToExam, getForgettingCurveStatus } from '../../services/coachContext';

import { YKS_TARGET_DATE_MAIN } from '../../config/examConfig';

const YKS_DATE = YKS_TARGET_DATE_MAIN;
const getAytSubjectsForTrack = (track: string) => {
  if (track === 'EA') return ['Matematik', 'Edebiyat', 'Tarih-1', 'Coğrafya-1'];
  if (track === 'SÖZ') return ['Edebiyat', 'Tarih-1', 'Coğrafya-1', 'Tarih-2', 'Coğrafya-2', 'Felsefe Grubu', 'Din Kültürü'];
  if (track === 'DİL') return ['Yabancı Dil'];
  return ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
};
import ReactMarkdown from 'react-markdown';
import { EloRankCard } from '../EloRankCard';
import { AchievementsPanel } from '../AchievementsPanel';
import { StreakHeatmap } from '../StreakHeatmap';

export function BentoDashboard() {
  const profile = useAppStore(s => s.profile);
  const tytSubjects = useAppStore(s => s.tytSubjects);
  const aytSubjects = useAppStore(s => s.aytSubjects);
  const logs = useAppStore(s => s.logs);
  const setFocusSidePanelOpen = useAppStore(s => s.setFocusSidePanelOpen);
  const lastCoachDirective = useAppStore(s => s.lastCoachDirective);
  const chatHistory = useAppStore(s => s.chatHistory);

  const wp = calcWorkloadRemaining(tytSubjects, aytSubjects.filter(s => getAytSubjectsForTrack(profile?.track || 'SAY').includes(s.subject)), logs);

  const todayStr = toISODateOnly();
  const todayLogs = logs.filter((l) => {
    const dt = parseFlexibleDate(l.date);
    if (!dt) return false;
    return toISODateOnly(dt) === todayStr;
  });
  const todayHours = (todayLogs.reduce((acc, log) => acc + log.avgTime, 0) / 60).toFixed(1);
  const activeHabitAlerts = detectHabitAlerts(logs);

  const completedMastery = tytSubjects.filter(s => s.status === 'mastered').length + aytSubjects.filter(s => getAytSubjectsForTrack(profile?.track || 'SAY').includes(s.subject) && s.status === 'mastered').length;
  const totalMastery = tytSubjects.length + aytSubjects.filter(s => getAytSubjectsForTrack(profile?.track || 'SAY').includes(s.subject)).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 md:p-8 max-w-7xl mx-auto"
    >
      {/* 1. Header & Welcome (Bento Row 1) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="md:col-span-3 glass-card rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#C17767]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <h2 className="font-display italic text-5xl text-[#4A443C] dark:text-zinc-100 mb-6 z-10">Hoş geldin, <span className="text-[#C17767]">{profile?.name}</span></h2>
          <div className="flex flex-col md:flex-row gap-6 text-sm font-medium z-10">
            <div className="flex-1">
              <div className="flex justify-between mb-2 text-zinc-400 font-mono tracking-wider">
                <span>TYT Sınavı Hedefi</span>
                <span className="text-zinc-200">Max: {profile?.tytTarget}</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `70%` }} />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex justify-between mb-2 text-zinc-400 font-mono tracking-wider">
                <span>AYT Sınavı Hedefi</span>
                <span className="text-zinc-200">Max: {profile?.aytTarget}</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]" style={{ width: `45%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-1 glass-card rounded-3xl p-6 flex flex-col items-center justify-center relative hover:scale-[1.02] transition-transform">
          <MiniFlapClock targetDate={YKS_DATE} />
          <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mt-4">{calculateDaysToExam()} Gün Kaldı</p>
        </div>
      </div>

      {/* 2. Core Stats (Bento Row 2) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <BentoStatCard title="Tamamlanan" value={completedMastery.toString()} total={totalMastery} icon={<CheckCircle2 className="text-[#C17767]" />} />
        <BentoStatCard title="Günlük Çalışma" value={todayHours} total={profile?.dailyGoalHours || profile?.minHours || 0} unit="Saat" icon={<Calendar className="text-blue-400" />} />
        <BentoStatCard title="Kritik Sorunlar" value={logs.filter(l => l.wrong > l.correct).length.toString()} unit="Sorunlu" icon={<AlertTriangle className="text-orange-500" />} />
        <BentoStatCard title="ROI Kaynak" value={(() => { const roi = calcSourceROI(logs).slice(0, 1)[0]; return roi ? roi.sourceName.split(' ')[0] : 'YOK'; })()} unit={(() => { const roi = calcSourceROI(logs).slice(0, 1)[0]; return roi ? `ROI:${roi.roiScore}` : ''; })()} icon={<BookOpen className="text-green-500" />} />
      </div>

      {activeHabitAlerts[0] && (
        <div className="mb-6 rounded-2xl border border-red-800/50 bg-red-950/30 p-5 backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-2 flex items-center gap-2"><AlertTriangle size={14} /> KIRMIZI ALARM</div>
          <p className="text-sm text-red-200/80">{activeHabitAlerts[0].message}</p>
        </div>
      )}

      {/* 3. Main Action & Coach (Bento Row 3) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">

        {/* Odak Modu / Müfredat */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <button
            onClick={() => setFocusSidePanelOpen(true)}
            className="h-32 bg-gradient-to-br from-[#C17767] to-[#A56253] text-white rounded-3xl p-6 shadow-xl shadow-[#C17767]/20 hover:scale-[1.03] active:scale-95 transition-all flex flex-col items-start justify-between group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-4 opacity-20 filter blur-sm group-hover:blur-none transition-all">
              <Clock size={64} />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Target size={20} />
            </div>
            <div>
              <h3 className="font-bold text-xl tracking-tight">Focus Tünelini Aç</h3>
              <p className="text-xs opacity-70 uppercase tracking-widest mt-1">Seferberlik Modu</p>
            </div>
          </button>

          <div className="flex-1 glass-card rounded-3xl p-6 shadow-md flex flex-col justify-center">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs uppercase font-bold tracking-widest text-[#C17767]">Müfredat Yükü</span>
              <span className="text-xl font-mono font-bold text-zinc-100">%{wp.completedPercent}</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-4 border border-zinc-700/50">
              <div className="h-full bg-[#C17767] transition-all" style={{ width: `${wp.completedPercent}%` }} />
            </div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{wp.completedTopics} Bitti / {wp.remainingTopics} Kaldı</div>
          </div>
        </div>

        {/* Coach Directive */}
        <div className="md:col-span-8 glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#C17767] blur-[120px] rounded-full opacity-10 pointer-events-none" />
          <h3 className="font-display italic text-2xl mb-6 uppercase tracking-tight text-[#C17767] flex items-center gap-2"><Activity size={20} /> Günün Direktifi</h3>

          <div className="prose prose-invert max-w-none text-zinc-300">
            {lastCoachDirective ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-white font-bold text-xl leading-snug">{lastCoachDirective.headline}</h4>
                  <p className="text-zinc-400 text-sm mt-2">{lastCoachDirective.summary}</p>
                </div>

                {lastCoachDirective.tasks && lastCoachDirective.tasks.length > 0 && (
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                    <ul className="space-y-3 m-0 p-0 list-none">
                      {lastCoachDirective.tasks.map((t, idx) => (
                        <li key={idx} className="flex gap-4 items-start">
                          <div className={`mt-1 w-2.5 h-2.5 rounded hover:scale-125 transition-transform shrink-0 ${t.priority === 'high' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                          <div>
                            <p className="text-sm font-medium text-zinc-200">{t.action}</p>
                            {(t.subject || t.targetMinutes) && (
                              <p className="text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-wider">
                                {t.subject} {t.targetMinutes ? `// ${t.targetMinutes} DK` : ''}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : chatHistory.filter(m => m.role === 'coach').slice(-1)[0]?.content ? (
              <div className="font-mono text-sm leading-relaxed opacity-80">
                <ReactMarkdown>{chatHistory.filter(m => m.role === 'coach').slice(-1)[0].content}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12 opacity-30 text-zinc-500 italic">Akış bekleniyor...</div>
            )}
          </div>
        </div>

      </div>

      {/* 4. Gamification & History (Bento Row 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-20">
        <div className="lg:col-span-1 space-y-6">
          <EloRankCard />
          <GhostRivalWidget eloScore={useAppStore.getState().eloScore} />
        </div>

        <div className="lg:col-span-1 space-y-6">
          <MemoryDecayWidget logs={logs} />
          <div className="glass-card rounded-3xl p-6">
            <h3 className="font-bold text-sm tracking-widest uppercase text-zinc-500 mb-4">Aktivite Haritası</h3>
            <div className="h-40">
              <StreakHeatmap logs={logs} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <AchievementsPanel />
        </div>
      </div>
    </motion.div>
  );
}

function BentoStatCard({ title, value, total, unit, icon }: { title: string; value: string | number; total?: number; unit?: string; icon: React.ReactNode }) {
  return (
    <div className="glass-card hover:border-[#C17767]/30 transition-colors rounded-3xl p-6 relative overflow-hidden group">
      <div className="flex justify-between items-start mb-4">
        <span className="p-2 bg-black/20 rounded-xl">{icon}</span>
        {unit && <span className="text-[10px] font-mono uppercase tracking-widest text-[#C17767]">{unit}</span>}
      </div>
      <div>
        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-display font-medium text-zinc-100">{value}</h3>
          {total !== undefined && <span className="text-sm font-mono text-zinc-600">/ {total}</span>}
        </div>
      </div>
    </div>
  );
}
function GhostRivalWidget({ eloScore }: { eloScore: number }) {
  const targetElo = eloScore + 500;
  return (
    <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-3xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5"><Target size={80} /></div>
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Gölge Rakip (Ghost Rival)</h3>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-zinc-100">-{targetElo - eloScore}</div>
          <div className="text-[10px] text-zinc-500 uppercase">ELO Farkı</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-emerald-400">Hedef: {targetElo}</div>
          <div className="text-[10px] text-zinc-500 uppercase">Top %1 Seviyesi</div>
        </div>
      </div>
      <div className="mt-4 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500" style={{ width: `${(eloScore / targetElo) * 100}%` }} />
      </div>
    </div>
  );
}

function MemoryDecayWidget({ logs }: { logs: any[] }) {
  const decayTopics = getForgettingCurveStatus(logs);
  return (
    <div className="glass-card rounded-3xl p-6">
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Zap size={14} className="text-amber-400" /> Kalıcı Hafıza (Ebbinghaus)
      </h3>
      <div className="space-y-3">
        {decayTopics.length > 0 ? (
          decayTopics.slice(0, 3).map((topic, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-zinc-300 font-medium">{topic}</span>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-xs text-zinc-500 italic">Hafıza taze, sorun yok.</div>
        )}
      </div>
      {decayTopics.length > 3 && (
        <div className="mt-3 text-[10px] text-center text-zinc-600 font-bold uppercase">+{decayTopics.length - 3} Diğer Konu Detayda</div>
      )}
    </div>
  );
}

import { Zap } from 'lucide-react';
