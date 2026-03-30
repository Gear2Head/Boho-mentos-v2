/**
 * AMAÇ: AI destekli haftalık strateji planlama ve kritik zayıf nokta analizi
 * MANTIK: Store verilerini harmanlayarak özelleşmiş AI prompt'ları oluşturup Gear_Head.'e gönderir
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Target, Zap, CrosshairIcon, Loader2, RefreshCw, AlertTriangle, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getCoachResponse } from '../services/gemini';
import { YOK_ATLAS_TOP10 } from '../data/yokAtlasTop10';

const markdownComponents = {
  p: ({ node, ...props }: any) => <p className="leading-relaxed mb-3 text-zinc-300 text-sm" {...props} />,
  li: ({ node, ...props }: any) => <li className="mb-1.5 leading-relaxed text-zinc-300" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-4 space-y-1 opacity-90" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-4 space-y-1 opacity-90" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-bold text-[#C17767]" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-base font-bold font-serif italic mt-5 mb-2 border-b border-zinc-800 pb-1 text-zinc-200" {...props} />,
  table: ({ node, ...props }: any) => <div className="overflow-x-auto mb-4"><table className="w-full text-xs border-collapse" {...props} /></div>,
  th: ({ node, ...props }: any) => <th className="p-2 bg-[#1A1A1A] border border-zinc-800 text-[#C17767] uppercase tracking-widest text-left font-bold" {...props} />,
  td: ({ node, ...props }: any) => <td className="p-2 border border-zinc-800 text-zinc-300" {...props} />,
};

export function StrategyHub() {
  const store = useAppStore();
  const [weeklyPlan, setWeeklyPlan] = useState<string | null>(null);
  const [sprintPlan, setSprintPlan] = useState<string | null>(null);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);
  const [isLoadingSprint, setIsLoadingSprint] = useState(false);

  const buildBaseContext = () => {
    const recentLogs = store.logs.slice(-7);
    const logSummary = recentLogs.length > 0
      ? recentLogs.map(l => {
          const rate = Math.round((l.correct / (l.questions || 1)) * 100);
          return `${l.subject}/${l.topic}: ${l.questions}S %${rate} başarı ${l.avgTime}dk`;
        }).join(' | ')
      : 'Log yok';

    const inProgressTyt = store.tytSubjects.filter(s => s.status === 'in-progress').map(s => `${s.subject}-${s.name}`);
    const inProgressAyt = store.aytSubjects.filter(s => s.status === 'in-progress').map(s => `${s.subject}-${s.name}`);
    const recentExams = store.exams.slice(-3).map(e => `${e.type}: ${e.totalNet.toFixed(1)} net`).join(', ');

    return `Öğrenci: ${store.profile?.name} | Hedef: ${store.profile?.targetUniversity} ${store.profile?.targetMajor} | Sınav yılı: ${store.profile?.examYear || '2025'}
TYT hedef: ${store.profile?.tytTarget} | AYT hedef: ${store.profile?.aytTarget} | Alan: ${store.profile?.track}
Son 7 gün log özeti: ${logSummary}
Çalışılan TYT konuları: ${inProgressTyt.join(', ') || 'Yok'}
Çalışılan AYT konuları: ${inProgressAyt.join(', ') || 'Yok'}
Son denemeler: ${recentExams || 'Yok'}`;
  };

  const handleWeeklyPlan = async () => {
    setIsLoadingWeekly(true);
    setWeeklyPlan(null);
    const ctx = buildBaseContext();
    const prompt = `HAFTALIK KUŞATMA PLANI ÜRETİYORUM. Bu öğrencinin tüm verisini analiz et ve bugünden itibaren 7 günlük çalışma planı yaz. Formatı kesinlikle şu şekilde kullan: Her gün için "**Gün X (Tarih):**" başlığı altında 2-3 madde. Her madde: Ders | Konu | Hedef soru | Tahmini süre. Sonunda 1 satır "Haftalık Öncelik" yaz. Fazla açıklama yapma, sadece direktif.`;
    const response = await getCoachResponse(prompt, ctx, [], { coachPersonality: store.profile?.coachPersonality });
    setWeeklyPlan(response || 'Yanıt alınamadı.');
    setIsLoadingWeekly(false);
  };

  const handleSprintPlan = async () => {
    setIsLoadingSprint(true);
    setSprintPlan(null);
    const ctx = buildBaseContext();
    const prompt = `24 SAATLİK SPRINT PLANI. Bu öğrencinin verilerine bakarak SADECE bugün için 3 kritik görev belirle. Format: **Görev 1:** [Ders] - [Konu] - [Kaç soru] - [Süre]. Sonunda motivasyona gerek yok, sadece emirler.`;
    const response = await getCoachResponse(prompt, ctx, [], { coachPersonality: store.profile?.coachPersonality });
    setSprintPlan(response || 'Yanıt alınamadı.');
    setIsLoadingSprint(false);
  };

  const criticalSubjects = (() => {
    const subjectStats: Record<string, { correct: number; total: number }> = {};
    store.logs.forEach(l => {
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

    store.logs.forEach((l) => {
      const ts = new Date(l.date).getTime();
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
    const profile = store.profile;
    const lastExam = store.exams.slice(-1)[0];
    if (!profile || !lastExam) return null;

    const currentNet = lastExam.totalNet;
    const candidates = YOK_ATLAS_TOP10
      .filter(p => p.examType === lastExam.type)
      .filter(p => (p.university.toLowerCase().includes(profile.targetUniversity.toLowerCase()) || p.major.toLowerCase().includes(profile.targetMajor.toLowerCase())));

    const pool = candidates.length > 0 ? candidates : YOK_ATLAS_TOP10.filter(p => p.examType === lastExam.type);
    const next = pool
      .slice()
      .sort((a, b) => (a.lastEntrantNet - currentNet) - (b.lastEntrantNet - currentNet))
      .find(p => p.lastEntrantNet >= currentNet) ?? pool.slice().sort((a, b) => a.lastEntrantNet - b.lastEntrantNet)[0];

    const diff = Number((next.lastEntrantNet - currentNet).toFixed(2));
    const diffText = diff >= 0 ? `${diff} net gerisindesin` : `${Math.abs(diff)} net önündesin`;
    const marchDiff = Number((next.marchReferenceNet - currentNet).toFixed(2));
    const marchText = marchDiff >= 0 ? `${marchDiff} net fazlaydı` : `${Math.abs(marchDiff)} net daha düşüktü`;

    return `Şu anki netlerinle ${next.university} ${next.major}'a giren son kişinin sadece ${diffText}. O son kişi Mart ayında senin şu anki netinden ${marchText}.`;
  })();

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <header className="mb-10 border-b border-[#2A2A2A] pb-6">
        <h2 className="font-serif italic text-4xl text-zinc-200 mb-2">Strateji Odası</h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#C17767] font-bold font-mono">Gear_Head. — Taktik Merkezi</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {criticalSubjects.length > 0 ? criticalSubjects.map((cs, i) => (
          <div key={i} className={`bg-[#121212] border rounded-2xl p-5 ${cs.rate < 40 ? 'border-red-900/50' : cs.rate < 60 ? 'border-[#E09F3E]/50' : 'border-zinc-800'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">KRİTİK SALDIRI #{i + 1}</span>
              <AlertTriangle size={14} className={cs.rate < 40 ? 'text-red-500' : 'text-[#E09F3E]'} />
            </div>
            <h4 className="font-serif italic text-lg text-zinc-200 mb-1">{cs.subject}</h4>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${cs.rate < 40 ? 'bg-red-500' : cs.rate < 60 ? 'bg-[#E09F3E]' : 'bg-green-500'}`}
                  style={{ width: `${cs.rate}%` }}
                />
              </div>
              <span className={`text-sm font-bold font-mono ${cs.rate < 40 ? 'text-red-400' : 'text-[#E09F3E]'}`}>%{cs.rate}</span>
            </div>
          </div>
        )) : (
          <div className="col-span-3 py-8 text-center text-zinc-600 text-xs uppercase tracking-widest">
            Henüz yeterli log verisi yok. Önce log gir.
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#60A5FA]/10 rounded-xl border border-[#60A5FA]/20">
                <CrosshairIcon size={20} className="text-[#60A5FA]" />
              </div>
              <div>
                <h3 className="font-serif italic text-xl text-zinc-200">Akıllı Deneme Önerisi</h3>
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">Hata verilerine göre (son 14 gün)</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {!smartMockSuggestion ? (
              <div className="text-xs uppercase tracking-widest text-zinc-600 opacity-70">
                Yeterli log verisi yok. Öneri için en az 1-2 gün detaylı log gir.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-zinc-200 font-mono leading-relaxed">
                  <span className="text-[#60A5FA] font-bold">{smartMockSuggestion.message}</span>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                  {smartMockSuggestion.reasoning}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {smartMockSuggestion.focusTopics.map((t) => (
                    <span key={t} className="px-2.5 py-1 bg-[#60A5FA]/10 text-[#60A5FA] border border-[#60A5FA]/20 rounded-lg text-[10px] uppercase font-bold tracking-widest">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#C17767]/10 rounded-xl border border-[#C17767]/20">
                <ChevronRight size={20} className="text-[#C17767]" />
              </div>
              <div>
                <h3 className="font-serif italic text-xl text-zinc-200">YÖK Atlas Kovalamaca</h3>
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">Hedefle arandaki bağı koparma</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {!yokAtlasChase ? (
              <div className="text-xs uppercase tracking-widest text-zinc-600 opacity-70">
                Kovalamaca için en az 1 deneme kaydı gerekli.
              </div>
            ) : (
              <div className="text-sm font-mono leading-relaxed text-zinc-200">
                {yokAtlasChase}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#C17767]/10 rounded-xl border border-[#C17767]/20">
                <Target size={20} className="text-[#C17767]" />
              </div>
              <div>
                <h3 className="font-serif italic text-xl text-zinc-200">Haftalık Kuşatma</h3>
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">7 günlük saldırı planı</p>
              </div>
            </div>
            <button
              onClick={handleWeeklyPlan}
              disabled={isLoadingWeekly}
              className="flex items-center gap-2 px-4 py-2 bg-[#C17767]/10 text-[#C17767] border border-[#C17767]/30 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#C17767] hover:text-white transition-all disabled:opacity-40"
            >
              {isLoadingWeekly ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {weeklyPlan ? 'Yenile' : 'Oluştur'}
            </button>
          </div>
          <div className="p-6 min-h-48">
            {isLoadingWeekly && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-50">
                <Loader2 size={24} className="animate-spin text-[#C17767]" />
                <p className="text-xs uppercase tracking-widest text-zinc-500">Gear_Head. hesaplıyor...</p>
              </div>
            )}
            {!isLoadingWeekly && !weeklyPlan && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-30">
                <Target size={32} className="text-zinc-600" />
                <p className="text-xs uppercase tracking-widest text-zinc-600">Plan henüz oluşturulmadı</p>
              </div>
            )}
            {weeklyPlan && !isLoadingWeekly && (
              <ReactMarkdown components={markdownComponents}>{weeklyPlan}</ReactMarkdown>
            )}
          </div>
        </div>

        <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#E09F3E]/10 rounded-xl border border-[#E09F3E]/20">
                <Zap size={20} className="text-[#E09F3E]" />
              </div>
              <div>
                <h3 className="font-serif italic text-xl text-zinc-200">24 Saatlik Sprint</h3>
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">Bugünün 3 kritik görevi</p>
              </div>
            </div>
            <button
              onClick={handleSprintPlan}
              disabled={isLoadingSprint}
              className="flex items-center gap-2 px-4 py-2 bg-[#E09F3E]/10 text-[#E09F3E] border border-[#E09F3E]/30 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#E09F3E] hover:text-black transition-all disabled:opacity-40"
            >
              {isLoadingSprint ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {sprintPlan ? 'Yenile' : 'Başlat'}
            </button>
          </div>
          <div className="p-6 min-h-48">
            {isLoadingSprint && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-50">
                <Loader2 size={24} className="animate-spin text-[#E09F3E]" />
                <p className="text-xs uppercase tracking-widest text-zinc-500">Görevler hesaplanıyor...</p>
              </div>
            )}
            {!isLoadingSprint && !sprintPlan && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-30">
                <Zap size={32} className="text-zinc-600" />
                <p className="text-xs uppercase tracking-widest text-zinc-600">Sprint henüz başlatılmadı</p>
              </div>
            )}
            {sprintPlan && !isLoadingSprint && (
              <ReactMarkdown components={markdownComponents}>{sprintPlan}</ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
