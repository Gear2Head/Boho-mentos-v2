import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/appStore';
import { Clock, CheckCircle2, Calendar, AlertTriangle, BookOpen, Target, Activity, Brain, Zap, Trophy } from 'lucide-react';
import { calcWorkloadRemaining, calcSourceROI, detectHabitAlerts } from '../../utils/statistics';
import { parseFlexibleDate, toISODateOnly } from '../../utils/date';
import { MiniFlapClock } from '../FlapClock';
import { triggerConfetti } from '../../utils/confetti';
import ReactMarkdown from 'react-markdown';
import { EloRankCard } from '../EloRankCard';
import { AchievementsPanel } from '../AchievementsPanel';
import { StudyHeatmap } from '../StudyHeatmap';

import { YKS_TARGET_DATE_MAIN } from '../../config/examConfig';

const YKS_DATE = YKS_TARGET_DATE_MAIN;

// ─── ALT BİLEŞENLER ──────────────────────────────────────────────────────────

const BentoStatCard = ({ title, value, total, unit, icon }: any) => (
  <div className="glass-card p-6 rounded-3xl hover:-translate-y-1 transition-all duration-300 group">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-white/5 rounded-xl group-hover:bg-[#C17767]/10 transition-colors">
        {icon}
      </div>
      <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500">{title}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-display italic font-bold text-zinc-100">{value}</span>
      {unit && <span className="text-xs font-bold text-zinc-500">{unit}</span>}
    </div>
    {total !== undefined && (
      <div className="mt-4 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#C17767] transition-all duration-1000" 
          style={{ width: `${Math.min(100, (parseFloat(value) / total) * 100)}%` }} 
        />
      </div>
    )}
  </div>
);

import { GhostRivalWidget } from './GhostRivalWidget';
import { MemoryDecayWidget } from './MemoryDecayWidget';
import { WeakLinkWidget } from './WeakLinkWidget';
import { WeeklyBossFight } from '../WeeklyBossFight';
import { StudyProgressRing } from './StudyProgressRing';
import { DailyMotivationWidget } from './DailyMotivationWidget';
import { StreakHistoryWidget } from './StreakHistoryWidget';
import { BurnoutGauge } from './BurnoutGauge';
import { EloTrendGraph } from './EloTrendGraph';
import { SubjectMasterySunburst } from './SubjectMasterySunburst';

// ─── ANA BİLEŞEN ─────────────────────────────────────────────────────────────

export function BentoDashboard() {
  const profile = useAppStore(s => s.profile);
  const tytSubjects = useAppStore(s => s.tytSubjects);
  const aytSubjects = useAppStore(s => s.aytSubjects);
  const logs = useAppStore(s => s.logs);
  const lastCoachDirective = useAppStore(s => s.lastCoachDirective);
  const chatHistory = useAppStore(s => s.chatHistory);

  const [selectedTaskForLog, setSelectedTaskForLog] = useState<{ id: string, index: number, task: any } | null>(null);
  const [taskLogData, setTaskLogData] = useState({ correct: 0, wrong: 0, empty: 0, duration: 30 });

  const getAytSubjectsForTrack = (track: string) => {
    if (track === 'EA') return ['Matematik', 'Edebiyat', 'Tarih-1', 'Coğrafya-1'];
    if (track === 'SÖZ') return ['Edebiyat', 'Tarih-1', 'Coğrafya-1', 'Tarih-2', 'Coğrafya-2', 'Felsefe Grubu', 'Din Kültürü'];
    if (track === 'DİL') return ['Yabancı Dil'];
    return ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
  };

  const handleCompleteTaskWithLog = () => {
    if (!selectedTaskForLog) return;
    const { index, task } = selectedTaskForLog;

    useAppStore.getState().completeCoachTask(selectedTaskForLog.id, index);
    useAppStore.getState().addLog({
      id: `ai_log_${Date.now()}`,
      date: new Date().toISOString(),
      subject: task.subject || 'Genel Çalışma',
      topic: task.title || task.action,
      questions: taskLogData.correct + taskLogData.wrong + taskLogData.empty,
      correct: taskLogData.correct,
      wrong: taskLogData.wrong,
      empty: taskLogData.empty,
      avgTime: taskLogData.duration,
      fatigue: 0,
      notes: `AI Koç Görevi Tamamlandı: ${task.title || task.action} (%${Math.round((taskLogData.correct / Math.max(1, (taskLogData.correct + taskLogData.wrong))) * 100)} başarı) | Kaynak: AI Coach`
    });

    useAppStore.getState().addAgendaEntry({
      id: `ai_agenda_${Date.now()}`,
      date: new Date().toISOString(),
      content: `GÖREV TAMAMLANDI: ${task.title || task.action}\n${taskLogData.correct}D ${taskLogData.wrong}Y | ${taskLogData.duration} Dakika`,
      tags: ['AI-Task', task.subject || 'Genel'],
    });

    setSelectedTaskForLog(null);
    setTaskLogData({ correct: 0, wrong: 0, empty: 0, duration: 30 });
    triggerConfetti();
  };

  const wp = calcWorkloadRemaining(tytSubjects, aytSubjects.filter(s => getAytSubjectsForTrack(profile?.track || 'SAY').includes(s.subject)), logs);
  const todayStr = toISODateOnly();
  const todayLogs = logs.filter(l => toISODateOnly(parseFlexibleDate(l.date)) === todayStr);
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
      {/* Header Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className={`md:col-span-3 glass-card rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden group transition-all duration-500 ${profile?.coachPersonality === 'hardcore' ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : ''}`}>
          <div className={`absolute inset-0 bg-gradient-to-br from-[#C17767]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${profile?.coachPersonality === 'hardcore' ? 'from-amber-500/20' : ''}`} />
          <h2 className="font-display italic text-5xl text-zinc-100 mb-6 z-10">Hoş geldin, <span className={`${profile?.coachPersonality === 'hardcore' ? 'text-amber-500' : 'text-[#C17767]'}`}>{profile?.name}</span></h2>
          <div className="flex flex-col md:flex-row gap-6 text-sm font-medium z-10">
            <div className="flex-1">
              <div className="flex justify-between mb-2 text-zinc-400 font-mono tracking-wider">
                <span>TYT Hedefi</span>
                <span className="text-zinc-200">{profile?.tytTarget}</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-emerald-500" style={{ width: `70%` }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-2 text-zinc-400 font-mono tracking-wider">
                <span>AYT Hedefi</span>
                <span className="text-zinc-200">{profile?.aytTarget}</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-amber-500" style={{ width: `45%` }} />
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-1 glass-card rounded-3xl p-6 flex flex-col items-center justify-center relative hover:scale-[1.02] transition-transform">
          <MiniFlapClock targetDate={YKS_DATE} />
          <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mt-4">Gün Kaldı</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <BentoStatCard title="Tamamlanan" value={completedMastery.toString()} total={totalMastery} icon={<CheckCircle2 className="text-[#C17767]" />} />
        <BentoStatCard title="Günlük Çalışma" value={todayHours} total={profile?.dailyGoalHours || 0} unit="Saat" icon={<Calendar className="text-blue-400" />} />
        <BentoStatCard title="Kritik Sorunlar" value={logs.filter(l => l.wrong > l.correct).length.toString()} unit="Sorunlu" icon={<AlertTriangle className="text-orange-500" />} />
        <BentoStatCard title="En Verimli" value={calcSourceROI(logs)[0]?.sourceName.split(' ')[0] || 'YOK'} unit="Kaynak" icon={<BookOpen className="text-green-500" />} />
      </div>

      {activeHabitAlerts[0] && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 glass-card border-red-900/30 bg-red-900/5 p-6 rounded-3xl">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-red-500 shrink-0" size={24} />
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-1">Kırmızı Alarm</div>
              <p className="text-sm text-red-100/70">{activeHabitAlerts[0].message}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Action & Coach */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
        <div 
          onClick={() => useAppStore.getState().setFocusSidePanelOpen(true)}
          className="md:col-span-4 glass-card hover:-translate-y-1 transition-all rounded-3xl p-8 bg-gradient-to-br from-[#C17767]/20 to-transparent border-[#C17767]/20 flex flex-col justify-between cursor-pointer"
        >
          <div>
            <Activity className="text-[#C17767] mb-6" size={32} />
            <h3 className="font-display italic text-3xl mb-2 text-zinc-100">Focus Tüneli</h3>
            <p className="text-zinc-400 text-xs uppercase tracking-widest">Seferberlik Modu</p>
          </div>
          <div className="mt-8">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-black tracking-widest text-[#C17767] uppercase">Müfredat Yükü</span>
              <span className="text-lg font-mono font-bold text-zinc-100">%{wp.completedPercent}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#C17767]" style={{ width: `${wp.completedPercent}%` }} />
            </div>
          </div>
        </div>

        <div className={`md:col-span-8 glass-card rounded-3xl p-8 relative overflow-hidden transition-all duration-500 ${profile?.coachPersonality === 'hardcore' ? 'border-amber-500/40 bg-amber-950/5' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`font-display italic text-2xl uppercase tracking-tight flex items-center gap-2 ${profile?.coachPersonality === 'hardcore' ? 'text-amber-500' : 'text-[#C17767]'}`}><Activity size={20} /> {profile?.coachPersonality === 'hardcore' ? 'TOKSİK DİREKTİF' : 'Günün Direktifi'}</h3>
            {lastCoachDirective && (
              <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[9px] font-black tracking-widest text-zinc-500 uppercase">
                {lastCoachDirective.tasks.filter(t => t.status === 'completed').length}/{lastCoachDirective.tasks.length} Tamamlandı
              </div>
            )}
          </div>

          <div className="prose prose-invert max-w-none text-zinc-300">
            {lastCoachDirective ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-white font-bold text-xl leading-snug">{lastCoachDirective.headline}</h4>
                  <div className="text-zinc-400 text-sm mt-2 leading-relaxed">
                    <ReactMarkdown>{lastCoachDirective.summary.replace(/<br\s*\/?>/gi, '\n')}</ReactMarkdown>
                  </div>
                </div>
                <div className="space-y-3">
                  {lastCoachDirective.tasks.map((task, idx) => {
                    const isCompleted = task.status === 'completed';
                    return (
                      <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isCompleted ? 'bg-green-500/5 border-green-500/20' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                        <div className="flex items-start gap-4">
                          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isCompleted ? 'bg-green-500' : 'bg-[#C17767]'}`} />
                          <div>
                            <p className={`text-sm font-bold leading-tight ${isCompleted ? 'text-green-200/50 line-through' : 'text-zinc-200'}`}>{task.action}</p>
                            <span className="text-[9px] uppercase tracking-widest font-black text-zinc-500">{task.subject || 'Genel'}</span>
                          </div>
                        </div>
                        {!isCompleted && (
                          <button 
                            onClick={() => setSelectedTaskForLog({ id: lastCoachDirective.headline, index: idx, task })}
                            className="p-2 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all shadow-lg shadow-green-500/10"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {isCompleted && <CheckCircle2 size={20} className="text-green-500/30" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 opacity-30 text-zinc-500 italic">Akış bekleniyor...</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-6">
          <StudyProgressRing dailyGoalQuestions={profile?.minDailyQuestions ?? 200} />
          <DailyMotivationWidget />
          <EloRankCard />
          <SubjectMasterySunburst />
          <GhostRivalWidget />
          <WeakLinkWidget logs={logs} />
        </div>
        <div className="space-y-6">
          <BurnoutGauge />
          <EloTrendGraph />
          <StreakHistoryWidget />
          <MemoryDecayWidget logs={logs} />
          <StudyHeatmap />
        </div>
      </div>

      <div className="mb-6">
        <WeeklyBossFight />
      </div>

      <div className="mb-20">
        <AchievementsPanel />
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {selectedTaskForLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTaskForLog(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md glass-card rounded-[32px] p-8 border-white/10 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-[#C17767]/10 rounded-2xl text-[#C17767]"><Brain size={24} /></div>
                <div>
                  <h3 className="font-display italic text-2xl font-bold">Performans Verisi</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-black">Görevi Sonlandır</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <input type="number" placeholder="Doğru" value={taskLogData.correct} onChange={e => setTaskLogData({...taskLogData, correct: parseInt(e.target.value) || 0})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-white" />
                <input type="number" placeholder="Yanlış" value={taskLogData.wrong} onChange={e => setTaskLogData({...taskLogData, wrong: parseInt(e.target.value) || 0})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-white" />
                <input type="number" placeholder="Boş" value={taskLogData.empty} onChange={e => setTaskLogData({...taskLogData, empty: parseInt(e.target.value) || 0})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-white" />
                <input type="number" placeholder="Dakika" value={taskLogData.duration} onChange={e => setTaskLogData({...taskLogData, duration: parseInt(e.target.value) || 0})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-white" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSelectedTaskForLog(null)} className="flex-1 p-4 rounded-2xl bg-white/5 text-zinc-400 font-bold text-xs uppercase tracking-widest">İptal</button>
                <button onClick={handleCompleteTaskWithLog} className="flex-[2] p-4 rounded-2xl bg-[#C17767] text-white font-bold text-xs uppercase tracking-widest">Kaydet ve Bitir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
