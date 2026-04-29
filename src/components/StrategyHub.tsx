/**
 * AMAÇ: AI destekli haftalık strateji planlama, net projeksiyonu ve kaynak ROI analizi
 * MANTIK: Store verilerini harmanlayarak insight kartları (grafik, ROI) gösterir ve AI prompt'ları çalıştırır
 */

import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Target, Zap, CrosshairIcon, Loader2, RefreshCw, AlertTriangle, 
  ChevronRight, TrendingUp, CheckCircle2, AlertCircle, BarChart3, Hourglass,
  Brain, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/appStore';
import { getCoachResponse } from '../services/gemini';
import { YOK_ATLAS_DATA, type YokAtlasProgram } from '../data/yokAtlasData';
import { calcSourceROI, predictTYTAndAYT, calculatePredictedNet, calculateBurnoutRisk } from '../utils/statistics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts';
import { SourceROIPanel } from './SourceROIPanel';
import { toDateMs } from '../utils/date';

const markdownComponents = {
  p: ({ node, ...props }: any) => <p className="leading-relaxed mb-3 text-ink-muted text-sm" {...props} />,
  li: ({ node, ...props }: any) => <li className="mb-1.5 leading-relaxed text-ink-muted" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-4 space-y-1 opacity-90" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-4 space-y-1 opacity-90" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-bold text-accent" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-base font-bold font-serif italic mt-5 mb-2 border-b border-app-subtle pb-1 text-ink" {...props} />,
  table: ({ node, ...props }: any) => <div className="overflow-x-auto mb-4 custom-scrollbar"><table className="w-full text-xs border-collapse" {...props} /></div>,
  th: ({ node, ...props }: any) => <th className="p-2 bg-surface border border-app-subtle text-accent uppercase tracking-widest text-left font-bold" {...props} />,
  td: ({ node, ...props }: any) => <td className="p-2 border border-app-subtle text-ink-muted" {...props} />,
};

export function StrategyHub() {
  const logs = useAppStore(s => s.logs);
  const exams = useAppStore(s => s.exams);
  const profile = useAppStore(s => s.profile);
  const tytSubjects = useAppStore(s => s.tytSubjects);
  const aytSubjects = useAppStore(s => s.aytSubjects);
  const directiveHistory = useAppStore(s => s.directiveHistory);
  const generateStrategyPlan = useAppStore(s => s.generateStrategyPlan);
  const startRecoveryFlow = useAppStore(s => s.startRecoveryFlow);
  const eloScore = useAppStore(s => s.eloScore);
  const analyzeUserData = useAppStore(s => s.analyzeUserData);
  const streakDays = useAppStore(s => s.streakDays);
  const healthScore = useAppStore(s => s.healthScore);
  const updateHealthScore = useAppStore(s => s.updateHealthScore);

  useEffect(() => {
    updateHealthScore();
  }, [logs, exams, profile, streakDays]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [localWorkload, setLocalWorkload] = useState<any>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<string | null>(null);
  const [sprintPlan, setSprintPlan] = useState<string | null>(null);
  const [warRoomPlan, setWarRoomPlan] = useState<string | null>(null);

  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);
  const [isLoadingSprint, setIsLoadingSprint] = useState(false);
  const [isLoadingWarRoom, setIsLoadingWarRoom] = useState(false);

  useEffect(() => {
    import('../services/directiveHistory').then(m => {
      setLocalWorkload(m.calculateWeeklyWorkload(directiveHistory || []));
    });
  }, [directiveHistory]);

  const recoveryTasks = useMemo(() => {
    return (directiveHistory || [])
      .filter(r => !r.isResolved)
      .flatMap(r => r.directive.tasks)
      .filter(t => t.status === 'failed' || t.status === 'deferred');
  }, [directiveHistory]);

  const handleRefreshStrategy = async () => {
    setIsAnalyzing(true);
    await generateStrategyPlan();
    setTimeout(() => setIsAnalyzing(false), 1500);
  };

  // --- FAZ 1: KAYNAK ROI ---
  const sourceROIs = useMemo(() => calcSourceROI(logs), [logs]);
  
  // --- FAZ 2: NET PROJEKSİYONU ---
  const examDate = new Date('2026-06-20T10:15:00+03:00');
  const projection = useMemo(() => predictTYTAndAYT(exams, examDate), [exams]);
  
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const aiPredTyt = useMemo(() => calculatePredictedNet(exams, logs, examDate, 'TYT', eloScore), [exams, logs, eloScore]);
  const aiPredAyt = useMemo(() => calculatePredictedNet(exams, logs, examDate, 'AYT', eloScore), [exams, logs, eloScore]);
  
  const projectionChartData = useMemo(() => {
    const data: any[] = [];
    const tytExams = exams.filter(e => e.type === 'TYT').slice(-5);

    tytExams.forEach((e, i) => {
      data.push({ name: `Deneme ${i + 1}`, gercek: e.totalNet, tahmin: null });
    });

    if (projection.tyt.hasEnoughData && tytExams.length > 0) {
      const lastGercek = tytExams[tytExams.length - 1].totalNet;
      if (data.length > 0) data[data.length - 1].tahmin = lastGercek;
      data.push({ name: 'Sınav 2026', gercek: null, tahmin: projection.tyt.predictedNet });
    }
    return data;
  }, [exams, projection]);

  const burnout = useMemo(() => calculateBurnoutRisk(logs), [logs]);

  const fatigueData = useMemo(() => {
    return logs.slice(-7).map(l => ({
      day: new Date(l.date).toLocaleDateString('tr-TR', { weekday: 'short' }),
      fatigue: l.fatigue || 3,
      accuracy: Math.round((l.correct / (l.questions || 1)) * 100)
    }));
  }, [logs]);

  const buildBaseContext = () => {
    const recentLogs = logs.slice(-7);
    const logSummary = recentLogs.length > 0
      ? recentLogs.map(l => `${l.subject}/${l.topic}: ${l.questions}S %${Math.round((l.correct / (l.questions || 1)) * 100)} başarı ${l.avgTime}dk`).join(' | ')
      : 'Log yok';

    const inProgressTyt = tytSubjects.filter(s => s.status === 'in-progress').map(s => `${s.subject}-${s.name}`);
    const inProgressAyt = aytSubjects.filter(s => s.status === 'in-progress').map(s => `${s.subject}-${s.name}`);
    const recentExams = exams.slice(-3).map(e => `${e.type}: ${e.totalNet.toFixed(1)} net`).join(', ');

    return `Öğrenci: ${profile?.name} | Hedef: ${profile?.targetUniversity} ${profile?.targetMajor} | Sınav yılı: ${profile?.examYear || '2025'}
TYT hedef: ${profile?.tytTarget} | AYT hedef: ${profile?.aytTarget} | Alan: ${profile?.track}
Son 7 gün log özeti: ${logSummary}
Çalışılan TYT konuları: ${inProgressTyt.join(', ') || 'Yok'}
Çalışılan AYT konuları: ${inProgressAyt.join(', ') || 'Yok'}
Son denemeler: ${recentExams || 'Yok'}`;
  };

  const handleWeeklyPlan = async () => {
    setIsLoadingWeekly(true);
    const ctx = buildBaseContext();
    const prompt = `HAFTALIK KUŞATMA PLANI ÜRETİYORUM. Bu öğrencinin tüm verisini analiz et ve bugünden itibaren 7 günlük çalışma planı yaz. Formatı kesinlikle şu şekilde kullan: Her gün için "**Gün X (Tarih):**" başlığı altında 2-3 madde. Her madde: Ders | Konu | Hedef soru | Tahmini süre. Sonunda 1 satır "Haftalık Öncelik" yaz.`;
    const response = await getCoachResponse(prompt, ctx, [], { coachPersonality: profile?.coachPersonality });
    setWeeklyPlan(response || 'Yanıt alınamadı.');
    setIsLoadingWeekly(false);
  };

  const handleSprintPlan = async () => {
    setIsLoadingSprint(true);
    const ctx = buildBaseContext();
    const prompt = `24 SAATLİK SPRINT PLANI. Bu öğrencinin verilerine bakarak SADECE bugün için 3 kritik görev belirle. Format: **Görev 1:** [Ders] - [Konu] - [Kaç soru] - [Süre]. Sonunda motivasyona gerek yok, sadece emirler.`;
    const response = await getCoachResponse(prompt, ctx, [], { coachPersonality: profile?.coachPersonality });
    setSprintPlan(response || 'Yanıt alınamadı.');
    setIsLoadingSprint(false);
  };

  const handleWarRoom = async () => {
    setIsLoadingWarRoom(true);
    const ctx = "GERÇEK BİR ANALİZ CANAVARI (MF-WARRIOR)";
    const prompt = analyzeUserData();
    const response = await getCoachResponse(prompt, ctx, [], { coachPersonality: profile?.coachPersonality });
    setWarRoomPlan(response || 'Savaş planı elde edilemedi.');
    setIsLoadingWarRoom(false);
  };

  const criticalSubjects = useMemo(() => {
    const subjectStats: Record<string, { correct: number; total: number }> = {};
    logs.forEach(l => {
      if (!subjectStats[l.subject]) subjectStats[l.subject] = { correct: 0, total: 0 };
      subjectStats[l.subject].correct += l.correct;
      subjectStats[l.subject].total += l.questions;
    });
    return Object.entries(subjectStats)
      .filter(([, s]) => s.total > 0)
      .map(([subject, s]) => ({ subject, rate: Math.round((s.correct / s.total) * 100) }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 3);
  }, [logs]);

  const smartMockSuggestion = useMemo(() => {
    const topicStats = new Map<string, { subject: string; topic: string; wrong: number; total: number }>();
    const last14Days = Date.now() - 14 * 24 * 60 * 60 * 1000;

    logs.forEach((l) => {
      const ts = toDateMs(l.date);
      if (!Number.isFinite(ts) || ts < last14Days) return;
      const key = `${l.subject}__${l.topic}`;
      const cur = topicStats.get(key) ?? { subject: l.subject, topic: l.topic, wrong: 0, total: 0 };
      cur.wrong += l.wrong;
      cur.total += l.questions;
      topicStats.set(key, cur);
    });

    const ranked = Array.from(topicStats.values())
      .filter((t) => t.total >= 10)
      .map((t) => ({ ...t, wrongRate: t.wrong / (t.total || 1) }))
      .sort((a, b) => b.wrongRate - a.wrongRate);

    const top = ranked.slice(0, 3);
    if (top.length === 0) return null;

    const focusTopics = top.slice(0, 2).map((t) => t.topic);
    const primarySubject = top[0].subject;
    const examType = primarySubject.toUpperCase().includes("AYT") ? "AYT" : "TYT";
    const cleanedSubject = primarySubject.replace(/^TYT\s*/i, "").replace(/^AYT\s*/i, "").trim();
    const mockLabel = `${examType} ${cleanedSubject} denemesi`;

    return {
      mockLabel,
      focusTopics,
      reasoning: `Son 14 günde en çok hata yaptığın konu(lar): ${top.slice(0, 3).map(t => `${t.topic} (%${Math.round(t.wrongRate * 100)})`).join(", ")}.`,
      message: `${mockLabel} çözmelisin. Özellikle ${focusTopics.join(" ve ")} konularına odaklan; bu denemede bu konulardan daha fazla soru çıkacak.`,
    };
  }, [logs]);

  const yokAtlasChase = useMemo(() => {
    const lastExam = exams.slice(-1)[0];
    if (!profile || !lastExam) return null;

    const currentNet = lastExam.totalNet;
    const candidates = YOK_ATLAS_DATA.filter(p =>
    (p.university.toLowerCase().includes(profile.targetUniversity.toLowerCase()) &&
      p.major.toLowerCase().includes(profile.targetMajor.toLowerCase()))
    );

    const pool = candidates.length > 0 ? candidates : YOK_ATLAS_DATA.filter(p => p.track === profile.track);
    const next = pool
      .slice()
      .sort((a, b) => {
        const aTarget = lastExam.type === 'TYT' ? a.tytNet : a.aytNet;
        const bTarget = lastExam.type === 'TYT' ? b.tytNet : b.aytNet;
        return Math.abs(aTarget - currentNet) - Math.abs(bTarget - currentNet);
      })[0];

    if (!next) return null;
    const targetNet = lastExam.type === 'TYT' ? next.tytNet : next.aytNet;
    const diff = Number((targetNet - currentNet).toFixed(2));
    const diffText = diff >= 0 ? `${diff} net gerisindesin` : `${Math.abs(diff)} net önündesin`;

    const marchDiff = Number((next.marchReferenceNet - currentNet).toFixed(2));
    const isAheadOfMarch = marchDiff < 0;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-zinc-100 font-bold text-sm">{next.university}</h4>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{next.major} • 2024 Sıralama: #{next.ranking.toLocaleString()}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${diff >= 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
            {diffText}
          </div>
        </div>

        <div className="p-4 bg-surface rounded-2xl border border-app-subtle">
          <p className="text-xs text-ink-muted leading-relaxed italic">
            "Geçen yıl bu bölüme giren son kişi Mart ayında ortalama <strong className="text-ink">{next.marchReferenceNet} net</strong> yapıyordu.
            Sen şu an {isAheadOfMarch ? <span className="text-green-500">onun {Math.abs(marchDiff)} net önündesin.</span> : <span className="text-amber-500">o seviyenin {marchDiff} net gerisindesin.</span>}
            Saldırıya devam et!"
          </p>
        </div>
      </div>
    );
  }, [profile, exams]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.1 }
        }
      }}
      className="p-4 md:p-8 space-y-10 max-w-7xl mx-auto"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-ink font-serif italic flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-2xl text-accent"><Brain size={32} /></div>
            Strateji Merkezi
          </h2>
          <p className="text-ink-muted text-xs uppercase tracking-[0.3em] font-bold mt-3 opacity-60">Akademik Projeksiyon & Veri Analitiği</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-surface-2 p-2 pr-6 rounded-2xl border border-app-subtle">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
              <Trophy size={24} />
            </div>
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-ink-muted uppercase tracking-widest">Global ELO</span>
               <span className="text-xl font-bold text-ink">{eloScore}</span>
            </div>
          </div>
          <button 
            onClick={handleRefreshStrategy}
            disabled={isAnalyzing}
            className="p-3 bg-accent text-white rounded-2xl hover:brightness-110 shadow-lg shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
          </button>
        </div>
      </header>

      <motion.div 
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        className="grid grid-cols-1 md:grid-cols-5 gap-6"
      >
        {[
          { label: 'Haftalık Yük', val: `${localWorkload?.totalMinutes || 0} dk`, sub: 'Toplam Kalan Efor', icon: <Hourglass size={18} />, color: 'rose-500' },
          { label: 'Hedef Soru', val: `+${localWorkload?.totalQuestions || 0}`, sub: 'Kritik Soru Havuzu', icon: <Target size={18} />, color: 'amber-500' },
          { label: 'Health Score', val: healthScore?.total || 0, sub: healthScore?.label || 'ANALIZ...', icon: <TrendingUp size={18} />, color: 'emerald-500', isHealth: true },
          { label: 'Burnout Riski', val: `%${burnout.probability}`, sub: burnout.reason, icon: <AlertTriangle size={18} />, color: 'red-500' },
          { label: 'Akıllı Telafi', val: recoveryTasks.length, sub: 'Başarısız Görevler', icon: <Zap size={18} />, color: 'accent', isRecovery: true }
        ].map((kpi, idx) => (
          <motion.div 
            key={idx}
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -5, boxShadow: `0 20px 40px rgba(0,0,0,0.1)`, borderColor: `var(--color-${kpi.color})` }}
            className="bg-surface-2 p-5 rounded-2xl border border-app-subtle transition-colors relative overflow-hidden group"
          >
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className={`p-2 bg-${kpi.color}/10 text-${kpi.color} rounded-lg`}>{kpi.icon}</div>
              <span className={`text-[10px] font-bold text-${kpi.color} uppercase tracking-widest`}>{kpi.label}</span>
            </div>
            <div className="text-2xl font-bold text-ink relative z-10">{kpi.val}</div>
            <div className="text-[10px] text-ink-muted mt-1 uppercase font-bold tracking-tight relative z-10 truncate">{kpi.sub}</div>
            {kpi.isHealth && (
              <div className="mt-3 h-1 bg-surface rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${kpi.val}%` }} className="h-full bg-emerald-500" />
              </div>
            )}
            {kpi.isRecovery && Number(kpi.val) > 0 && (
              <button onClick={() => startRecoveryFlow()} className="mt-3 w-full py-1.5 bg-accent text-white rounded-lg text-[8px] font-bold uppercase tracking-widest relative z-10">TELAFİ ET</button>
            )}
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }} className="bg-surface-2 border border-app-subtle rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-50"></div>
          <h3 className="font-serif italic text-2xl text-ink flex items-center gap-3 mb-6">
            <TrendingUp size={24} className="text-blue-500" /> TYT Projeksiyonu
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="p-4 bg-surface rounded-2xl border border-app-subtle">
                <div className="text-[9px] uppercase font-bold text-ink-muted mb-1">Tahmini Net</div>
                <div className="text-2xl font-bold text-accent">{aiPredTyt.predictedNet}</div>
             </div>
             <div className="p-4 bg-surface rounded-2xl border border-app-subtle">
                <div className="text-[9px] uppercase font-bold text-ink-muted mb-1">Güven Oranı</div>
                <div className="text-2xl font-bold text-emerald-500">%{aiPredTyt.confidence}</div>
             </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                <Line type="monotone" dataKey="gercek" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="tahmin" stroke="#10B981" strokeWidth={3} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }} className="bg-surface-2 border border-app-subtle rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-amber-500 opacity-50"></div>
          <h3 className="font-serif italic text-2xl text-ink flex items-center gap-3 mb-6">
            <AlertCircle size={24} className="text-red-500" /> Fatigue Trend
          </h3>
          <div className="h-[200px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fatigueData}>
                <defs>
                  <linearGradient id="colorAcc2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="day" hide />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                <Area type="monotone" dataKey="accuracy" stroke="#10B981" fill="url(#colorAcc2)" />
                <Area type="monotone" dataKey="fatigue" stroke="#EF4444" fill="transparent" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-4 bg-red-500/5 rounded-2xl border border-red-500/10 text-[10px] text-ink-muted italic leading-relaxed">
            <strong>Analiz:</strong> {burnout.advice}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface-2 border border-app-subtle rounded-3xl p-6">
          <SourceROIPanel />
        </div>
        <div className="bg-surface-2 border border-app-subtle rounded-3xl p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-6 flex items-center gap-2">
            <AlertTriangle size={14} /> Kritik Konular
          </h3>
          <div className="space-y-4">
            {criticalSubjects.map((cs, i) => (
              <div key={i} className="p-4 bg-surface rounded-2xl border border-app-subtle">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-ink">{cs.subject}</span>
                  <span className="text-[10px] font-mono text-accent">%{cs.rate}</span>
                </div>
                <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${cs.rate}%` }} className={`h-full ${cs.rate < 40 ? 'bg-red-500' : 'bg-accent'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Haftalık Plan', plan: weeklyPlan, loading: isLoadingWeekly, fn: handleWeeklyPlan, icon: <Target size={18} />, color: 'accent' },
          { title: 'Günlük Sprint', plan: sprintPlan, loading: isLoadingSprint, fn: handleSprintPlan, icon: <Zap size={18} />, color: 'amber-500' },
          { title: 'Savaş Planı', plan: warRoomPlan, loading: isLoadingWarRoom, fn: handleWarRoom, icon: <AlertTriangle size={18} />, color: 'red-500' }
        ].map(panel => (
          <div key={panel.title} className="bg-surface-2 border border-app-subtle rounded-3xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-app-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${panel.color}/10 rounded-xl text-${panel.color}`}>{panel.icon}</div>
                <h3 className="font-serif italic text-lg text-ink">{panel.title}</h3>
              </div>
              <button onClick={panel.fn} className="p-2 hover:bg-surface rounded-xl transition-all">
                <RefreshCw size={14} className={panel.loading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="p-6 flex-1 min-h-[150px] max-h-[300px] overflow-y-auto custom-scrollbar">
              {panel.loading ? (
                <div className="h-full flex items-center justify-center opacity-30 text-[10px] uppercase font-bold tracking-widest">Analiz Ediliyor...</div>
              ) : panel.plan ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown components={markdownComponents}>{panel.plan}</ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center opacity-20 text-[10px] uppercase font-bold tracking-widest">Analizi Başlat</div>
              )}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
