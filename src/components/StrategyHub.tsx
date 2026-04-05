/**
 * AMAÇ: AI destekli haftalık strateji planlama, net projeksiyonu ve kaynak ROI analizi
 * MANTIK: Store verilerini harmanlayarak insight kartları (grafik, ROI) gösterir ve AI prompt'ları çalıştırır
 */

import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Target, Zap, CrosshairIcon, Loader2, RefreshCw, AlertTriangle, 
  ChevronRight, TrendingUp, CheckCircle2, AlertCircle, BarChart3, Hourglass 
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getCoachResponse } from '../services/gemini';
import { YOK_ATLAS_DATA, type YokAtlasProgram } from '../data/yokAtlasData';
import { calcSourceROI, predictTYTAndAYT, calculatePredictedNet } from '../utils/statistics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
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
  const { 
    logs, exams, profile, tytSubjects, aytSubjects, directiveHistory,
    generateStrategyPlan, startRecoveryFlow, eloScore, analyzeUserData 
  } = useAppStore();

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

  const criticalSubjects = (() => {
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
  })();

  const smartMockSuggestion = (() => {
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
  })();

  const yokAtlasChase = (() => {
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
  })();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="font-serif italic text-4xl text-ink leading-tight">Strateji Hub</h2>
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent mt-2 font-bold font-mono">Veri Madenciliği & Gelecek Projeksiyonu v2.1</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={analyzeUserData}
            className="px-5 py-2.5 bg-surface-2 border border-app-subtle text-ink-muted hover:text-ink rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} /> VERİLERİ HARMANLA
          </button>
          <button 
            onClick={handleRefreshStrategy}
            disabled={isAnalyzing}
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:brightness-110 flex items-center gap-2 shadow-lg shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} AI ANALİZİ TAZELİ
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-2 p-5 rounded-2xl border border-app-subtle group hover:border-accent/30 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg"><Hourglass size={18} /></div>
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Haftalık Yük</span>
          </div>
          <div className="text-2xl font-bold text-ink">{localWorkload?.totalMinutes || 0}<span className="text-xs ml-1 opacity-40 font-normal">dk</span></div>
          <div className="text-[10px] text-ink-muted mt-1 uppercase font-bold tracking-tight">Toplam Kalan Efor</div>
        </div>

        <div className="bg-surface-2 p-5 rounded-2xl border border-app-subtle group hover:border-accent/30 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><Target size={18} /></div>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Hedef Soru</span>
          </div>
          <div className="text-2xl font-bold text-ink">+{localWorkload?.totalQuestions || 0}</div>
          <div className="text-[10px] text-ink-muted mt-1 uppercase font-bold tracking-tight">Kritik Soru Havuzu</div>
        </div>

        <div className="bg-accent/5 p-5 rounded-2xl border border-accent/20 flex flex-col justify-between group hover:border-accent/40 transition-colors">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Akıllı Telafi</span>
            </div>
            <p className="text-[10px] text-ink-muted leading-tight">
              {recoveryTasks.length > 0 
                ? `${recoveryTasks.length} adet başarısız görev tespit edildi. Programa dahil etmek istersin?`
                : 'Şu an telafi edilmesi gereken kritik bir görev bulunmuyor.'}
            </p>
          </div>
          {recoveryTasks.length > 0 && (
            <button 
              onClick={() => startRecoveryFlow()}
              className="mt-3 w-full py-2 bg-accent hover:brightness-110 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all"
            >
              TELAFİ ET (RECOVERY)
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface-2 border border-app-subtle rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 to-green-500/50"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h3 className="font-serif italic text-2xl text-ink flex items-center gap-3">
              <TrendingUp size={24} className="text-blue-500" /> Tahmini TYT Projeksiyonu
            </h3>
            <p className="text-[10px] uppercase tracking-widest text-ink-muted mt-2 font-bold">Veri Seti: Son 5 Deneme + ELO Liyakati</p>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full border border-blue-500/20 font-bold uppercase tracking-widest">Regresyon Modeli: Aktif</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-surface/50 backdrop-blur-md border border-accent/20 rounded-2xl p-5 group hover:border-accent/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-accent font-bold uppercase tracking-widest text-[10px] flex items-center gap-2"><Zap size={14} /> Sınav Günü Simülasyonu (TYT)</h4>
              <span className="text-ink-muted text-[9px] uppercase font-bold tracking-tighter">{daysRemaining} GÜN KALDI</span>
            </div>
            <p className="text-ink-muted text-sm leading-relaxed italic border-l-2 border-accent/50 pl-3">
              "{profile?.name?.split(' ')[0] || 'Dostum'}, bu tempoyla ve mevcut ELO liyakatinle gidersen TYT'de <strong className="text-accent text-xl">{aiPredTyt.predictedNet} nete</strong> ulaşma olasılığın <strong className="text-ink font-mono">%{aiPredTyt.confidence}</strong>."
            </p>
          </div>
          <div className="bg-surface/50 backdrop-blur-md border border-amber-500/20 rounded-2xl p-5 group hover:border-amber-500/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-amber-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2"><Zap size={14} /> Sınav Günü Simülasyonu (AYT)</h4>
              <span className="text-ink-muted text-[9px] uppercase font-bold tracking-tighter">{daysRemaining} GÜN KALDI</span>
            </div>
            <p className="text-ink-muted text-sm leading-relaxed italic border-l-2 border-amber-500/50 pl-3">
              "Alan testindeki ivmen, doğru/yanlış analizine ve algoritmanın regresyon hesabına göre AYT'de <strong className="text-amber-500 text-xl">{aiPredAyt.predictedNet} nete</strong> ulaşma olasılığın <strong className="text-ink font-mono">%{aiPredAyt.confidence}</strong>."
            </p>
          </div>
        </div>

        {projection.tyt.hasEnoughData ? (
          <div className="mt-8 w-full h-[320px] min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" stroke="var(--color-ink-muted)" tick={{ fill: 'var(--color-ink-muted)', fontSize: 10 }} />
                <YAxis stroke="var(--color-ink-muted)" tick={{ fill: 'var(--color-ink-muted)', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                {profile?.tytTarget && <ReferenceLine y={profile.tytTarget} stroke="var(--color-accent)" strokeDasharray="3 3" />}
                <Line type="monotone" dataKey="gercek" name="Gerçekleşen Net" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6' }} />
                <Line type="monotone" dataKey="tahmin" name="Tahmini Gidişat" stroke="#10B981" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-app-subtle rounded-2xl gap-3">
            <TrendingUp size={32} className="opacity-10" />
            <p className="text-[10px] uppercase tracking-widest text-ink-muted italic font-bold text-center">Projeksiyon için yeterli deneme kaydı bulunmuyor.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SourceROIPanel />
        </div>
        <div className="space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4 border-b border-app-subtle pb-2">Kritik Saldırı Planı</h3>
          {criticalSubjects.length > 0 ? criticalSubjects.map((cs, i) => (
            <div key={i} className="bg-surface-2 border border-app-subtle rounded-2xl p-5 hover:border-accent/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] uppercase font-bold tracking-widest text-ink-muted">ÖNCELİK #{i + 1}</span>
                <AlertTriangle size={14} className={cs.rate < 40 ? 'text-red-500' : 'text-amber-500'} />
              </div>
              <h4 className="font-serif italic text-lg text-ink mb-2">{cs.subject}</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${cs.rate < 40 ? 'bg-red-500' : cs.rate < 60 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${cs.rate}%` }} />
                </div>
                <span className="text-xs font-bold font-mono text-ink">%{cs.rate}</span>
              </div>
            </div>
          )) : (
            <div className="py-8 text-center text-ink-muted text-[10px] uppercase tracking-widest italic border border-dashed border-app-subtle rounded-2xl">Yeterli veri yok.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface-2 border border-app-subtle rounded-3xl overflow-hidden group hover:border-accent/30 transition-colors">
          <div className="p-6 border-b border-app-subtle flex items-center gap-4">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><CrosshairIcon size={20} /></div>
            <div>
              <h3 className="font-serif italic text-xl text-ink leading-none">Deneme Önerisi</h3>
              <p className="text-[9px] uppercase tracking-widest text-ink-muted mt-1.5 font-bold">Son 14 Güne Dayalı Analiz</p>
            </div>
          </div>
          <div className="p-6">
            {!smartMockSuggestion ? (
              <p className="text-xs italic text-ink-muted">Deneme önerisi hazırlamak için daha fazla log girişi yapmalısın.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-ink-muted leading-relaxed italic"><strong className="text-blue-500 font-bold font-mono">{smartMockSuggestion.mockLabel}:</strong> {smartMockSuggestion.message}</p>
                <div className="flex flex-wrap gap-2">
                  {smartMockSuggestion.focusTopics.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-blue-500/5 text-blue-500 border border-blue-500/20 rounded-full text-[9px] font-bold uppercase tracking-widest">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface-2 border border-app-subtle rounded-3xl overflow-hidden group hover:border-accent/30 transition-colors">
          <div className="p-6 border-b border-app-subtle flex items-center gap-4">
            <div className="p-2 bg-accent/10 rounded-xl text-accent"><ChevronRight size={20} /></div>
            <div>
              <h3 className="font-serif italic text-xl text-ink leading-none">YÖK Atlas Takibi</h3>
              <p className="text-[9px] uppercase tracking-widest text-ink-muted mt-1.5 font-bold">Hedefle Mevcut Durum Analizi</p>
            </div>
          </div>
          <div className="p-6">
            {!yokAtlasChase ? (
              <p className="text-xs italic text-ink-muted">Hedef takibi için en az bir deneme kaydı gerekiyor.</p>
            ) : (
              <div className="no-scrollbar">{yokAtlasChase}</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-surface-2 border border-app-subtle rounded-3xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-app-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><Target size={18} /></div>
              <h3 className="font-serif italic text-lg text-ink">Haftalık Plan</h3>
            </div>
            <button onClick={handleWeeklyPlan} disabled={isLoadingWeekly} className="p-2 hover:bg-accent/10 text-accent rounded-xl transition-all disabled:opacity-50">
              {isLoadingWeekly ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            </button>
          </div>
          <div className="p-6 flex-1 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
            {isLoadingWeekly ? <div className="flex flex-col items-center justify-center h-full opacity-50"><Loader2 className="animate-spin mb-2" size={24} /><p className="text-[10px] uppercase font-bold tracking-widest">Hesaplanıyor...</p></div> : 
             weeklyPlan ? <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown components={markdownComponents}>{weeklyPlan}</ReactMarkdown></div> :
             <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-widest text-ink-muted font-bold opacity-30">Plan Üretmek İçin Tıkla</div>}
          </div>
        </div>

        <div className="bg-surface-2 border border-app-subtle rounded-3xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-app-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><Zap size={18} /></div>
              <h3 className="font-serif italic text-lg text-ink">Günlük Sprint</h3>
            </div>
            <button onClick={handleSprintPlan} disabled={isLoadingSprint} className="p-2 hover:bg-amber-500/10 text-amber-500 rounded-xl transition-all disabled:opacity-50">
              {isLoadingSprint ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            </button>
          </div>
          <div className="p-6 flex-1 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
            {isLoadingSprint ? <div className="flex flex-col items-center justify-center h-full opacity-50"><Loader2 className="animate-spin mb-2" size={24} /><p className="text-[10px] uppercase font-bold tracking-widest">Hazırlanıyor...</p></div> : 
             sprintPlan ? <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown components={markdownComponents}>{sprintPlan}</ReactMarkdown></div> :
             <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-widest text-ink-muted font-bold opacity-30">Sprint Başlat</div>}
          </div>
        </div>

        <div className="bg-surface-2 border border-red-950/20 rounded-3xl overflow-hidden shadow-sm flex flex-col border-red-500/10">
          <div className="p-6 border-b border-red-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl text-red-500"><AlertTriangle size={18} /></div>
              <h3 className="font-serif italic text-lg text-ink">Savaş Planı</h3>
            </div>
            <button onClick={handleWarRoom} disabled={isLoadingWarRoom} className="p-2 hover:bg-red-500/10 text-red-500 rounded-xl transition-all disabled:opacity-50">
              {isLoadingWarRoom ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
            </button>
          </div>
          <div className="p-6 flex-1 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
            {isLoadingWarRoom ? <div className="flex flex-col items-center justify-center h-full opacity-50"><Loader2 className="animate-spin mb-2" size={24} /><p className="text-[10px] uppercase font-bold tracking-widest">Analiz Ediliyor...</p></div> : 
             warRoomPlan ? <div className="prose prose-invert prose-sm max-w-none border-l-2 border-red-500/30 pl-4 py-1 italic"><ReactMarkdown components={markdownComponents}>{warRoomPlan}</ReactMarkdown></div> :
             <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-widest text-ink-muted font-bold opacity-30">Analizi Başlat</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
