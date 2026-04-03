/**
 * AMAÇ: Kullanıcının günlük ajandası (tek giriş, hızlı kullanım).
 * MANTIK: Metinden deneme/net bilgisi yakalanır; uygun ise Analiz’e otomatik yansır.
 */

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
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
  const store = useAppStore();
  const [draft, setDraft] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const entries = useMemo(() => {
    return store.agendaEntries
      .slice()
      .sort((a, b) => (toDateMs(b.date) ?? 0) - (toDateMs(a.date) ?? 0));
  }, [store.agendaEntries]);

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
    store.addAgendaEntry(entry);
    setDraft('');
    if (parsedExam) {
      store.addExam(buildExamFromParsed(parsedExam));
    }
  };

  const analyzeEntry = async (entry: AgendaEntry) => {
    setIsAnalyzing(true);
    try {
      const ctx = `Öğrenci: ${store.profile?.name} | Alan: ${store.profile?.track}\nHedef: TYT ${store.profile?.tytTarget}, AYT ${store.profile?.aytTarget}\n`;
      const prompt = `Aşağıdaki ajanda girişinden YKS ile ilgili verileri çıkar.\n\nAJANDA:\n${entry.content}\n\nKURAL: SADECE JSON DÖNDÜR.\nŞema:\n{ "summary": string, "tags": string[], "parsedExam": { "type": "TYT"|"AYT", "totalNet": number } | null }`;
      const res = await getCoachResponse(prompt, ctx, store.chatHistory, { coachPersonality: store.profile?.coachPersonality, forceJson: true, maxTokens: 900 });
      const jsonMatch = res.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      const data = JSON.parse(jsonMatch[0]) as { summary?: string; tags?: string[]; parsedExam?: { type: 'TYT' | 'AYT'; totalNet: number } | null };
      const parsedExam = data.parsedExam ?? null;
      store.updateAgendaEntry(entry.id, {
        aiAnalysis: data.summary ?? undefined,
        tags: Array.isArray(data.tags) ? data.tags : entry.tags,
        parsedExam: parsedExam ?? undefined,
      });
      if (parsedExam) {
        store.addExam(buildExamFromParsed(parsedExam));
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
          >
            <Plus size={16} /> Kaydet
          </button>
        </div>
      </div>

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
                  >
                    {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    AI Analiz
                  </button>
                  <button
                    onClick={() => store.removeAgendaEntry(e.id)}
                    className="p-2 bg-red-900/10 text-red-400 border border-red-900/30 rounded-xl hover:bg-red-900/20 transition-colors"
                    title="Sil"
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

