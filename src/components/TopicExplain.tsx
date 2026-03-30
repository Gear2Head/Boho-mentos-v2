/**
 * AMAÇ: Konu anlatım ekranı (ANLA modu).
 * MANTIK: Kullanıcı konu seçer; AI'dan ŞABLON 4 formatında anlatım alınır.
 */

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, BookOpen, Sparkles } from 'lucide-react';
import { TYT_SUBJECTS, AYT_SUBJECTS } from '../constants';
import { useAppStore } from '../store/appStore';
import { getCoachResponse } from '../services/gemini';

const markdownComponents = {
  p: ({ node, ...props }: any) => <p className="leading-relaxed mb-3 text-[#4A443C] dark:text-zinc-200 text-sm" {...props} />,
  li: ({ node, ...props }: any) => <li className="mb-1.5 leading-relaxed text-[#4A443C] dark:text-zinc-200" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-4 space-y-1 opacity-90" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-4 space-y-1 opacity-90" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-bold text-[#C17767] dark:text-rose-400" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-base font-bold font-display italic mt-5 mb-2 border-b border-[#EAE6DF] dark:border-zinc-800 pb-1 text-[#4A443C] dark:text-zinc-200" {...props} />,
};

export function TopicExplain() {
  const store = useAppStore();
  const [examType, setExamType] = useState<'TYT' | 'AYT'>('TYT');
  const [subject, setSubject] = useState<string>('Matematik');
  const [topic, setTopic] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const subjects = useMemo(() => {
    const map = examType === 'TYT' ? TYT_SUBJECTS : AYT_SUBJECTS;
    return Object.keys(map);
  }, [examType]);

  const topics = useMemo(() => {
    const map = examType === 'TYT' ? TYT_SUBJECTS : AYT_SUBJECTS;
    return (map as any)[subject] ?? [];
  }, [examType, subject]);

  const handleExplain = async () => {
    const t = (topic || '').trim();
    const q = (question || '').trim();
    if (!t && !q) return;
    setIsLoading(true);
    setAnswer(null);
    try {
      const ctx = `Öğrenci: ${store.profile?.name} | Alan: ${store.profile?.track}\nİstek: ${examType} / ${subject} / ${t || 'Konu seçilmedi'}\n`;
      const prompt = `ANLA\nKonu: ${examType} ${subject} - ${t || 'Genel'}\nSoru/Problem: ${q || 'Bu konuyu sıfırdan anlat.'}`;
      const res = await getCoachResponse(prompt, ctx, store.chatHistory, { coachPersonality: store.profile?.coachPersonality, maxTokens: 1400 });
      setAnswer(res || 'Yanıt alınamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-10 border-b border-[#EAE6DF] dark:border-zinc-800 pb-6">
        <h2 className="font-display italic text-4xl text-[#4A443C] dark:text-zinc-200 mb-2">Konu Anlatım</h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#C17767] font-bold font-mono">Gear_Head. — ANLA MODU</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-[#C17767]/10 rounded-xl border border-[#C17767]/20 text-[#C17767]">
              <BookOpen size={18} />
            </div>
            <h3 className="font-display italic text-xl text-[#4A443C] dark:text-zinc-200">Seçim</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 text-[#4A443C] dark:text-zinc-400 block mb-2">Oturum</label>
              <div className="flex bg-black/5 dark:bg-black/40 p-1 rounded-xl border border-[#EAE6DF] dark:border-zinc-800">
                <button
                  onClick={() => setExamType('TYT')}
                  className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest ${examType === 'TYT' ? 'bg-[#C17767] text-white' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  TYT
                </button>
                <button
                  onClick={() => setExamType('AYT')}
                  className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest ${examType === 'AYT' ? 'bg-[#C17767] text-white' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  AYT
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 text-[#4A443C] dark:text-zinc-400 block mb-2">Ders</label>
              <select
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setTopic(''); }}
                className="w-full p-3 rounded-xl border border-[#EAE6DF] dark:border-zinc-800 bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors"
              >
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 text-[#4A443C] dark:text-zinc-400 block mb-2">Konu</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#EAE6DF] dark:border-zinc-800 bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors"
              >
                <option value="">Genel (Konu seçmeden)</option>
                {topics.map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 text-[#4A443C] dark:text-zinc-400 block mb-2">Sorun / Soru</label>
              <textarea
                rows={4}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Örn: Trigonometri maksimum-minimum mantığını anlamadım. Bir örnekle anlat."
                className="w-full p-3 rounded-xl border border-[#EAE6DF] dark:border-zinc-800 bg-transparent text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] transition-colors resize-none"
              />
            </div>

            <button
              onClick={handleExplain}
              disabled={isLoading}
              className="w-full py-4 bg-[#C17767] text-white rounded-xl text-xs font-bold uppercase tracking-[0.3em] hover:bg-[#A56253] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Anlat
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl p-6 min-h-[420px]">
          {!answer && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <BookOpen size={42} className="text-[#C17767] mb-4" />
              <div className="text-xs uppercase tracking-widest font-bold text-[#4A443C] dark:text-zinc-400">
                Konu seç ve “Anlat”a bas
              </div>
            </div>
          )}
          {isLoading && (
            <div className="h-full flex flex-col items-center justify-center gap-3 opacity-60">
              <Loader2 size={28} className="animate-spin text-[#C17767]" />
              <div className="text-xs uppercase tracking-widest font-bold text-[#4A443C] dark:text-zinc-400">
                Gear_Head. anlatımı hazırlıyor...
              </div>
            </div>
          )}
          {answer && !isLoading && (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown components={markdownComponents}>{answer}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

