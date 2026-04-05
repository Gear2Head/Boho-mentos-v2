/**
 * AMAÇ: Kullanıcının günlük ajandası (tek giriş, hızlı kullanım).
 * MANTIK: Metinden deneme/net bilgisi yakalanır; uygun ise Analiz’e otomatik yansır.
 */

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CheckCircle2, CircleDashed, Timer, XCircle, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { AgendaEntry, ExamResult } from '../types';
import { getCoachResponse } from '../services/gemini';
import { toDateMs, parseFlexibleDate } from '../utils/date';

const markdownComponents = {
  p: ({ node, ...props }: any) => <p className="leading-relaxed mb-3 text-[#4A443C] dark:text-zinc-200 text-sm" {...props} />,
  li: ({ node, ...props }: any) => <li className="mb-1.5 leading-relaxed text-[#4A443C] dark:text-zinc-200" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-4 space-y-1 opacity-90" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-4 space-y-1 opacity-90" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-bold text-[#C17767] dark:text-rose-400" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-base font-bold font-display italic mt-5 mb-2 border-b border-[#EAE6DF] dark:border-zinc-800 pb-1 text-[#4A443C] dark:text-zinc-200" {...props} />,
};

const tryParseExamFromText = (text: string): AgendaEntry['parsedExam'] | null => {
  const m = text.match(/\b(TYT|AYT)\b[^0-9]{0,12}(\d{1,3}(?:[.,]\d{1,2})?)\s*net\b/i);
  if (!m) return null;
  const type = m[1].toUpperCase() as 'TYT' | 'AYT';
  const raw = m[2].replace(',', '.');
  const totalNet = Number(raw);
  if (!Number.isFinite(totalNet)) return null;
  return { type, totalNet };
};

const buildExamFromParsed = (p: NonNullable<AgendaEntry['parsedExam']>): ExamResult => {
  return {
    id: `agenda_${Date.now()}`,
    date: new Date().toISOString(),
    type: p.type,
    totalNet: p.totalNet,
    scores: {
      Toplam: { correct: 0, wrong: 0, net: p.totalNet },
    },
    source: 'agenda',
    note: 'Ajanda üzerinden otomatik eklendi',
  };
};

export function AgendaPage() {
  const { 
    agendaEntries, addAgendaEntry, addExam, profile, chatHistory, 
    updateAgendaEntry, removeAgendaEntry, directiveHistory,
    completeCoachTask, deferCoachTask, failCoachTask 
  } = useAppStore();

  const [draft, setDraft] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // V19: Aktif AI Görevlerini Çek
  const activeTasks = useMemo(() => {
    return (directiveHistory || [])
      .filter(r => !r.isResolved)
      .flatMap(r => r.directive.tasks.map((t, idx) => ({ ...t, recordId: r.id, taskIndex: idx })))
      .filter(t => t.status === 'pending');
  }, [directiveHistory]);

  const entries = useMemo(() => {
    return agendaEntries
      .slice()
      .sort((a, b) => (toDateMs(b.date) ?? 0) - (toDateMs(a.date) ?? 0));
  }, [agendaEntries]);

  const addEntry = () => {
    const content = draft.trim();
    if (!content) return;
    const parsedExam = tryParseExamFromText(content) ?? undefined;
    const entry: AgendaEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content,
      parsedExam: parsedExam ?? undefined,
      tags: [],
      aiAnalysis: undefined,
    };
    addAgendaEntry(entry);
    setDraft('');
    if (parsedExam) {
      addExam(buildExamFromParsed(parsedExam));
    }
  };

  const analyzeEntry = async (entry: AgendaEntry) => {
    setIsAnalyzing(true);
    try {
      const ctx = `Öğrenci: ${profile?.name} | Alan: ${profile?.track}\nHedef: TYT ${profile?.tytTarget}, AYT ${profile?.aytTarget}\n`;
      const prompt = `Aşağıdaki ajanda girişinden YKS ile ilgili verileri çıkar.\n\nAJANDA:\n${entry.content}\n\nKURAL: SADECE JSON DÖNDÜR.\nŞema:\n{ "summary": string, "tags": string[], "parsedExam": { "type": "TYT"|"AYT", "totalNet": number } | null }`;
      const res = await getCoachResponse(prompt, ctx, chatHistory, { coachPersonality: profile?.coachPersonality, forceJson: true, maxTokens: 900 });
      const jsonMatch = res.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      const data = JSON.parse(jsonMatch[0]) as { summary?: string; tags?: string[]; parsedExam?: { type: 'TYT' | 'AYT'; totalNet: number } | null };
      const parsedExam = data.parsedExam ?? null;
      updateAgendaEntry(entry.id, {
        aiAnalysis: data.summary ?? undefined,
        tags: Array.isArray(data.tags) ? data.tags : entry.tags,
        parsedExam: parsedExam ?? undefined,
      });
      if (parsedExam) {
        addExam(buildExamFromParsed(parsedExam));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-10 border-b border-[#EAE6DF] dark:border-zinc-800 pb-6">
        <h2 className="font-display italic text-4xl text-[#4A443C] dark:text-zinc-200 mb-2">Ajanda</h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#C17767] font-bold font-mono">Günlük kayıt — deneme/net yazarsan Analiz’e işler</p>
      </header>

      <div className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl p-6 mb-8">
        <div className="text-[10px] uppercase tracking-widest font-bold opacity-50 text-[#4A443C] dark:text-zinc-400 mb-3">
          Bugün ne yaptın?
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          placeholder="Örn: Deneme yaptım AYT 55 net. Matematikte trigonometri yine patladı. 150 soru çözdüm."
          className="w-full p-4 rounded-2xl border border-[#EAE6DF] dark:border-zinc-800 bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors resize-none"
        />
        <div className="mt-4 flex items-center justify-end">
          <button
            onClick={addEntry}
            className="flex items-center gap-2 px-5 py-3 bg-[#C17767] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#A56253] transition-colors"
            aria-label="Ajanda Girişini Kaydet"
          >
            <Plus size={16} /> Kaydet
          </button>
        </div>
      </div>

      {/* V19: AI Tasks Section */}
      {activeTasks.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#C17767]" />
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#C17767]">Kübra'nın Görevleri</h3>
            <span className="px-1.5 py-0.5 bg-[#C17767]/10 text-[#C17767] rounded text-[8px] font-bold">{activeTasks.length} AKTİF</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTasks.map((t) => (
              <div key={`${t.recordId}-${t.taskIndex}`} className="bg-white dark:bg-zinc-900 border-l-4 border-l-[#C17767] border border-[#EAE6DF] dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${
                        t.priority === 'high' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {t.priority} PRiORiTY
                      </span>
                      {t.subject && <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">{t.subject}</span>}
                    </div>
                    <h4 className="font-bold text-sm text-[#4A443C] dark:text-zinc-100">{t.title}</h4>
                  </div>
                  <CircleDashed className="w-4 h-4 text-[#C17767] animate-pulse" />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-2">{t.action}</p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => completeCoachTask(t.recordId, t.taskIndex)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600/10 hover:bg-green-600 hover:text-white text-green-600 rounded-lg text-[10px] font-bold uppercase transition-all"
                  >
                    <CheckCircle2 size={12} /> TAMAMLA
                  </button>
                  <button 
                    onClick={() => deferCoachTask(t.recordId, t.taskIndex)}
                    className="p-2 bg-amber-600/10 hover:bg-amber-600 hover:text-white text-amber-600 rounded-lg transition-all"
                    title="Ertele (-5 ELO)"
                  >
                    <Timer size={14} />
                  </button>
                  <button 
                    onClick={() => failCoachTask(t.recordId, t.taskIndex)}
                    className="p-2 bg-rose-600/10 hover:bg-rose-600 hover:text-white text-rose-600 rounded-lg transition-all"
                    title="Yapamadım (-15 ELO)"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="text-center py-16 opacity-40 text-xs uppercase tracking-widest font-bold text-[#4A443C] dark:text-zinc-400">
            Henüz ajanda kaydı yok.
          </div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-6 mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-50 text-[#4A443C] dark:text-zinc-400">
                    {(parseFlexibleDate(e.date) ?? new Date()).toLocaleString('tr-TR')}
                  </div>
                  {e.parsedExam && (
                    <div className="mt-2 text-[10px] uppercase tracking-widest font-bold text-[#C17767] dark:text-rose-400">
                      Otomatik Deneme: {e.parsedExam.type} {e.parsedExam.totalNet} net
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => analyzeEntry(e)}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-900/10 text-blue-400 border border-blue-900/30 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-900/20 transition-colors disabled:opacity-40"
                    aria-label="AI ile Girişi Analiz Et"
                  >
                    {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI Analiz
                  </button>
                  <button
                    onClick={() => removeAgendaEntry(e.id)}
                    className="p-2 bg-red-900/10 text-red-400 border border-red-900/30 rounded-xl hover:bg-red-900/20 transition-colors"
                    aria-label="Girişi Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="text-sm leading-relaxed text-[#4A443C] dark:text-zinc-200 whitespace-pre-wrap">
                {e.content}
              </div>

              {e.aiAnalysis && (
                <div className="mt-4 p-4 rounded-2xl bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800">
                  <div className="text-[10px] uppercase tracking-widest font-bold opacity-50 text-[#4A443C] dark:text-zinc-400 mb-2">
                    AI Özet
                  </div>
                  <ReactMarkdown components={markdownComponents}>{e.aiAnalysis}</ReactMarkdown>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

