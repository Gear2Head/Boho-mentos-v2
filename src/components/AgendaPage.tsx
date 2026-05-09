/**
 * AMAÇ: Koç ekranı / günlük ajanda / AI görev paneli.
 * GELİŞTİRME:
 * - Daha güçlü dashboard başlığı
 * - Aktif görev, yüksek öncelik, deneme ve ajanda istatistikleri
 * - Per-entry AI loading
 * - Daha iyi görev kartları
 * - Hızlı giriş şablonları
 * - Takvim + ajanda düzeni daha profesyonel hale getirildi
 */

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  CheckCircle2,
  CircleDashed,
  Timer,
  XCircle,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Target,
  Flame,
  Brain,
  CalendarDays,
  ClipboardList,
  AlertTriangle,
  Wand2,
} from 'lucide-react';

import { useAppStore } from '../store/appStore';
import type { AgendaEntry, ExamResult } from '../types';
import { getCoachResponse } from '../services/gemini';
import { parseAiObject, sanitizeAiText, validateNullableParsedExam, validateStringArray } from '../utils/aiJson';
import { toDateMs, parseFlexibleDate } from '../utils/date';
import { isNonEmptyString, isRecord } from '../utils/typeGuards';
import { InteractiveCalendar } from './dashboard/InteractiveCalendar';

const markdownComponents = {
  p: ({ node, ...props }: any) => (
    <p
      className="leading-relaxed mb-3 text-[#4A443C] dark:text-zinc-200 text-sm"
      {...props}
    />
  ),
  li: ({ node, ...props }: any) => (
    <li
      className="mb-1.5 leading-relaxed text-[#4A443C] dark:text-zinc-200"
      {...props}
    />
  ),
  ul: ({ node, ...props }: any) => (
    <ul
      className="list-disc pl-5 mb-4 space-y-1 opacity-90"
      {...props}
    />
  ),
  ol: ({ node, ...props }: any) => (
    <ol
      className="list-decimal pl-5 mb-4 space-y-1 opacity-90"
      {...props}
    />
  ),
  strong: ({ node, ...props }: any) => (
    <strong
      className="font-bold text-[#C17767] dark:text-rose-400"
      {...props}
    />
  ),
  h3: ({ node, ...props }: any) => (
    <h3
      className="text-base font-bold font-display italic mt-5 mb-2 border-b border-[#EAE6DF] dark:border-zinc-800 pb-1 text-[#4A443C] dark:text-zinc-200"
      {...props}
    />
  ),
};

const quickTemplates = [
  'Bugün deneme yaptım. TYT __ net. En çok zorlandığım konular: __',
  'Bugün __ soru çözdüm. Verimim düşüktü çünkü __',
  'Matematikte __ konusunu çalıştım. Hata sebebim genelde __',
  'Bugün çalışamadım. Sebebi __. Yarın telafi planım __',
];

const tryParseExamFromText = (text: string): AgendaEntry['parsedExam'] | null => {
  const m = text.match(/\b(TYT|AYT)\b[^0-9]{0,12}(\d{1,3}(?:[.,]\d{1,2})?)\s*net\b/i);
  if (!m) return null;

  const type = m[1].toUpperCase() as 'TYT' | 'AYT';
  const raw = m[2].replace(',', '.');
  const totalNet = Number(raw);

  if (!Number.isFinite(totalNet)) return null;

  return { type, totalNet };
};

const buildExamFromParsed = (
  entryId: string,
  p: NonNullable<AgendaEntry['parsedExam']>,
): ExamResult => {
  return {
    id: `agenda_${entryId}`,
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

function validateAgendaAiPayload(value: unknown): {
  summary?: string;
  tags: string[];
  parsedExam: AgendaEntry['parsedExam'] | null;
} | null {
  if (!isRecord(value)) return null;

  return {
    summary: isNonEmptyString(value.summary)
      ? sanitizeAiText(value.summary, 400)
      : undefined,
    tags: validateStringArray(value.tags, 6),
    parsedExam: validateNullableParsedExam(value.parsedExam),
  };
}

function getTodayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function AgendaPage() {
  const agendaEntries = useAppStore((s) => s.agendaEntries);
  const addAgendaEntry = useAppStore((s) => s.addAgendaEntry);
  const addExam = useAppStore((s) => s.addExam);
  const profile = useAppStore((s) => s.profile);
  const chatHistory = useAppStore((s) => s.chatHistory);
  const updateAgendaEntry = useAppStore((s) => s.updateAgendaEntry);
  const removeAgendaEntry = useAppStore((s) => s.removeAgendaEntry);

  const directiveHistory = useAppStore((s) => s.directiveHistory);
  const completeCoachTask = useAppStore((s) => s.completeCoachTask);
  const deferCoachTask = useAppStore((s) => s.deferCoachTask);
  const failCoachTask = useAppStore((s) => s.failCoachTask);

  const [draft, setDraft] = useState('');
  const [analyzingEntryId, setAnalyzingEntryId] = useState<string | null>(null);

  const entries = useMemo(() => {
    return agendaEntries
      .slice()
      .sort((a, b) => (toDateMs(b.date) ?? 0) - (toDateMs(a.date) ?? 0));
  }, [agendaEntries]);

  const activeTasks = useMemo(() => {
    return (directiveHistory || [])
      .filter((r) => !r.isResolved)
      .flatMap((r) =>
        (r.directive?.tasks || []).map((t, idx) => ({
          ...t,
          recordId: r.id,
          taskIndex: idx,
        })),
      )
      .filter((t) => t.status === 'pending');
  }, [directiveHistory]);

  const dashboardStats = useMemo(() => {
    const today = getTodayKey(new Date());

    const todayEntries = entries.filter((e) => {
      const parsed = parseFlexibleDate(e.date);
      return parsed ? getTodayKey(parsed) === today : false;
    });

    const examEntries = entries.filter((e) => Boolean(e.parsedExam));
    const highPriorityTasks = activeTasks.filter((t) => t.priority === 'high');

    const allTasks = (directiveHistory || []).flatMap((r) => r.directive?.tasks || []);
    const completedTasks = allTasks.filter((t) => t.status === 'completed').length;
    const failedTasks = allTasks.filter((t) => t.status === 'failed').length;

    return {
      todayEntries: todayEntries.length,
      totalEntries: entries.length,
      examEntries: examEntries.length,
      activeTasks: activeTasks.length,
      highPriorityTasks: highPriorityTasks.length,
      completedTasks,
      failedTasks,
    };
  }, [entries, activeTasks, directiveHistory]);

  const parsedDraftExam = useMemo(() => {
    return tryParseExamFromText(draft);
  }, [draft]);

  const addEntry = () => {
    const content = draft.trim();
    if (!content) return;

    const parsedExam = tryParseExamFromText(content) ?? undefined;

    const entry: AgendaEntry = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(),
      date: new Date().toISOString(),
      content,
      parsedExam: parsedExam ?? undefined,
      tags: [],
      aiAnalysis: undefined,
    };

    addAgendaEntry(entry);
    setDraft('');

    if (parsedExam) {
      addExam(buildExamFromParsed(entry.id, parsedExam));
    }
  };

  const analyzeEntry = async (entry: AgendaEntry) => {
    setAnalyzingEntryId(entry.id);

    try {
      const ctx = [
        `Öğrenci: ${profile?.name || 'Bilinmiyor'}`,
        `Alan: ${profile?.track || 'Bilinmiyor'}`,
        `Hedef: TYT ${profile?.tytTarget || '-'}, AYT ${profile?.aytTarget || '-'}`,
      ].join('\n');

      const prompt = `Aşağıdaki ajanda girişinden YKS ile ilgili verileri çıkar.

AJANDA:
${entry.content}

KURAL: SADECE JSON DÖNDÜR.

Şema:
{
  "summary": string,
  "tags": string[],
  "parsedExam": { "type": "TYT"|"AYT", "totalNet": number } | null
}

Özet, öğrencinin ne yaptığına göre kısa ama koç gibi net olsun. Zayıf konu, risk ve sonraki aksiyon varsa belirt.`;

      const res = await getCoachResponse(prompt, ctx, chatHistory, {
        coachPersonality: profile?.coachPersonality,
        forceJson: true,
        maxTokens: 900,
      });

      const data = parseAiObject(res, validateAgendaAiPayload);
      if (!data) return;

      const parsedExam = data.parsedExam ?? null;

      updateAgendaEntry(entry.id, {
        aiAnalysis: data.summary ?? undefined,
        tags: data.tags.length > 0 ? data.tags : entry.tags,
        parsedExam: parsedExam ?? undefined,
      });

      if (parsedExam) {
        addExam(buildExamFromParsed(entry.id, parsedExam));
      }
    } finally {
      setAnalyzingEntryId(null);
    }
  };

  const insertTemplate = (template: string) => {
    setDraft((prev) => {
      if (!prev.trim()) return template;
      return `${prev.trim()}\n${template}`;
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F5EF] dark:bg-black">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <header className="relative overflow-hidden rounded-[2rem] border border-[#EAE6DF] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-7 lg:p-8 mb-8 shadow-sm">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#C17767]/10 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C17767]/10 text-[#C17767] border border-[#C17767]/15 mb-4">
                <Brain size={14} />
                <span className="text-[10px] uppercase tracking-[0.22em] font-bold">
                  Koç Kontrol Paneli
                </span>
              </div>

              <h2 className="font-display italic text-4xl lg:text-5xl text-[#4A443C] dark:text-zinc-100 mb-3">
                Bugünün karar merkezi
              </h2>

              <p className="text-sm text-[#6F675C] dark:text-zinc-400 max-w-2xl leading-relaxed">
                Günlük kayıtlarını yaz, deneme netlerini otomatik Analiz’e işle,
                Kübra’nın verdiği görevleri tamamla ve çalışma ritmini tek ekrandan takip et.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-full lg:min-w-[520px]">
              <StatCard
                icon={<ClipboardList size={17} />}
                label="Bugün"
                value={dashboardStats.todayEntries}
                hint="kayıt"
              />
              <StatCard
                icon={<CircleDashed size={17} />}
                label="Aktif"
                value={dashboardStats.activeTasks}
                hint="görev"
              />
              <StatCard
                icon={<AlertTriangle size={17} />}
                label="Kritik"
                value={dashboardStats.highPriorityTasks}
                hint="öncelik"
              />
              <StatCard
                icon={<Target size={17} />}
                label="Deneme"
                value={dashboardStats.examEntries}
                hint="işlendi"
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <main className="lg:col-span-7 space-y-8">
            <section className="bg-white dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-[1.75rem] p-6 shadow-sm">
              <div className="flex items-start justify-between gap-5 mb-5">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#C17767] mb-2">
                    Hızlı günlük kayıt
                  </div>
                  <h3 className="text-xl font-display italic font-bold text-[#4A443C] dark:text-zinc-100">
                    Bugün ne yaptın?
                  </h3>
                </div>

                {parsedDraftExam && (
                  <div className="shrink-0 px-3 py-2 rounded-2xl bg-[#C17767]/10 border border-[#C17767]/20 text-[#C17767]">
                    <div className="text-[9px] uppercase tracking-widest font-bold opacity-70">
                      Algılandı
                    </div>
                    <div className="text-xs font-black">
                      {parsedDraftExam.type} {parsedDraftExam.totalNet} net
                    </div>
                  </div>
                )}
              </div>

              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                placeholder="Örn: Deneme yaptım AYT 55 net. Matematikte trigonometri yine patladı. 150 soru çözdüm."
                className="w-full p-5 rounded-[1.4rem] border border-[#EAE6DF] dark:border-zinc-800 bg-[#FBFAF7] dark:bg-zinc-900/70 text-sm text-[#4A443C] dark:text-zinc-200 focus:outline-none focus:border-[#C17767] focus:ring-4 focus:ring-[#C17767]/10 transition-all resize-none"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {quickTemplates.map((template) => (
                  <button
                    key={template}
                    onClick={() => insertTemplate(template)}
                    className="px-3 py-2 rounded-xl bg-[#F5F2EB] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-[#6F675C] dark:text-zinc-400 hover:text-[#C17767] hover:border-[#C17767]/40 transition-all"
                  >
                    Şablon ekle
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-[11px] text-[#8B8176] dark:text-zinc-500 leading-relaxed">
                  “TYT 75 net” veya “AYT 55,5 net” yazarsan sistem denemeyi otomatik yakalar.
                </p>

                <button
                  onClick={addEntry}
                  disabled={!draft.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#C17767] text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-[#A56253] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  aria-label="Ajanda Girişini Kaydet"
                >
                  <Plus size={16} />
                  Kaydet
                </button>
              </div>
            </section>

            {activeTasks.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C17767]" />
                    <h3 className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#C17767]">
                      Kübra’nın aktif görevleri
                    </h3>
                    <span className="px-2 py-1 bg-[#C17767]/10 text-[#C17767] rounded-lg text-[9px] font-black">
                      {activeTasks.length} AKTİF
                    </span>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400">
                    <Flame size={13} />
                    Disiplin modu
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTasks.map((t) => (
                    <article
                      key={`${t.recordId}-${t.taskIndex}`}
                      className="group relative overflow-hidden bg-white dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-[1.4rem] p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
                    >
                      <div
                        className={`absolute inset-y-0 left-0 w-1 ${t.priority === 'high'
                            ? 'bg-rose-500'
                            : 'bg-[#C17767]'
                          }`}
                      />

                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className={`text-[8px] px-2 py-1 rounded-lg font-black uppercase tracking-widest ${t.priority === 'high'
                                  ? 'bg-rose-500/10 text-rose-500'
                                  : 'bg-amber-500/10 text-amber-500'
                                }`}
                            >
                              {t.priority === 'high' ? 'KRİTİK' : 'NORMAL'}
                            </span>

                            {t.subject && (
                              <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest truncate max-w-[150px]">
                                {t.subject}
                              </span>
                            )}
                          </div>

                          <h4 className="font-black text-sm text-[#4A443C] dark:text-zinc-100 leading-snug">
                            {t.title}
                          </h4>
                        </div>

                        <CircleDashed className="w-4 h-4 text-[#C17767] animate-pulse shrink-0" />
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed line-clamp-3">
                        {t.action}
                      </p>

                      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                        <button
                          onClick={() => completeCoachTask(t.recordId, t.taskIndex)}
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-green-600/10 hover:bg-green-600 hover:text-white text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <CheckCircle2 size={13} />
                          Tamamla
                        </button>

                        <button
                          onClick={() => deferCoachTask(t.recordId, t.taskIndex)}
                          className="p-2.5 bg-amber-600/10 hover:bg-amber-600 hover:text-white text-amber-600 rounded-xl transition-all"
                          title="Ertele"
                        >
                          <Timer size={15} />
                        </button>

                        <button
                          onClick={() => failCoachTask(t.recordId, t.taskIndex)}
                          className="p-2.5 bg-rose-600/10 hover:bg-rose-600 hover:text-white text-rose-600 rounded-xl transition-all"
                          title="Yapamadım"
                        >
                          <XCircle size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#C17767] mb-1">
                    Kayıt geçmişi
                  </div>
                  <h3 className="text-lg font-display italic font-bold text-[#4A443C] dark:text-zinc-100">
                    Ajanda akışı
                  </h3>
                </div>

                <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">
                  {dashboardStats.totalEntries} kayıt
                </div>
              </div>

              {entries.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-950 border border-dashed border-[#EAE6DF] dark:border-zinc-800 rounded-[1.75rem]">
                  <CalendarDays className="mx-auto mb-4 text-[#C17767]/60" size={32} />
                  <div className="text-xs uppercase tracking-widest font-bold text-[#4A443C] dark:text-zinc-400 opacity-50">
                    Henüz ajanda kaydı yok.
                  </div>
                </div>
              ) : (
                entries.map((e) => {
                  const isAnalyzing = analyzingEntryId === e.id;
                  const entryDate = parseFlexibleDate(e.date) ?? new Date();

                  return (
                    <article
                      key={e.id}
                      className="bg-white dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-[1.75rem] p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-6 mb-4">
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-widest opacity-50 text-[#4A443C] dark:text-zinc-400">
                            {entryDate.toLocaleString('tr-TR')}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {e.parsedExam && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#C17767]/10 border border-[#C17767]/20 text-[10px] uppercase tracking-widest font-black text-[#C17767] dark:text-rose-400">
                                <Target size={12} />
                                {e.parsedExam.type} {e.parsedExam.totalNet} net
                              </span>
                            )}

                            {e.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="px-2.5 py-1 rounded-lg bg-[#F5F2EB] dark:bg-zinc-900 text-[9px] uppercase tracking-widest font-bold text-zinc-500"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => analyzeEntry(e)}
                            disabled={Boolean(analyzingEntryId)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-900/10 text-blue-400 border border-blue-900/30 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-900/20 transition-colors disabled:opacity-40"
                            aria-label="AI ile Girişi Analiz Et"
                          >
                            {isAnalyzing ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Wand2 size={14} />
                            )}
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

                      <div className="text-sm leading-relaxed text-[#4A443C] dark:text-zinc-200 whitespace-pre-wrap bg-[#FBFAF7] dark:bg-zinc-900/60 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl p-4">
                        {e.content}
                      </div>

                      {e.aiAnalysis && (
                        <div className="mt-4 p-4 rounded-2xl bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800">
                          <div className="text-[10px] uppercase tracking-widest font-bold opacity-50 text-[#4A443C] dark:text-zinc-400 mb-2">
                            AI Koç Özeti
                          </div>
                          <ReactMarkdown components={markdownComponents}>
                            {e.aiAnalysis}
                          </ReactMarkdown>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </section>
          </main>

          <aside className="lg:col-span-5 space-y-6">
            <div className="sticky top-6 space-y-6">
              <section className="bg-white dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-[1.75rem] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#C17767] mb-1">
                      Takvim
                    </div>
                    <h3 className="text-lg font-display italic font-bold text-[#4A443C] dark:text-zinc-100">
                      Çalışma ritmi
                    </h3>
                  </div>
                  <CalendarDays size={20} className="text-[#C17767]" />
                </div>

                <div className="h-[610px]">
                  <InteractiveCalendar />
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3">
                <MiniMetric
                  label="Tamamlanan"
                  value={dashboardStats.completedTasks}
                  tone="green"
                />
                <MiniMetric
                  label="Kaçırılan"
                  value={dashboardStats.failedTasks}
                  tone="rose"
                />
              </section>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[#EAE6DF] dark:border-zinc-800 bg-[#FBFAF7] dark:bg-zinc-900/70 p-4">
      <div className="flex items-center justify-between text-[#C17767] mb-3">
        {icon}
        <span className="text-[9px] uppercase tracking-widest font-bold opacity-60">
          {hint}
        </span>
      </div>
      <div className="text-2xl font-black text-[#4A443C] dark:text-zinc-100">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mt-1">
        {label}
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'green' | 'rose';
}) {
  const toneClass =
    tone === 'green'
      ? 'text-green-600 bg-green-600/10 border-green-600/20'
      : 'text-rose-600 bg-rose-600/10 border-rose-600/20';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">
        {label}
      </div>
    </div>
  );
}