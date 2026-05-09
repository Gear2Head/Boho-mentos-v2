import React, { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FilterX,
  Flame,
  ListChecks,
  Search,
  Tag,
  Target,
  TimerReset,
  XCircle,
  CircleDashed,
} from 'lucide-react';
import { DailyLog } from '../types';
import { parseFlexibleDate } from '../utils/date';

interface LogHistoryProps {
  logs: DailyLog[];
  onLogClick: (log: DailyLog) => void;
}

const parseDateMs = (d: string) => {
  const parsed = parseFlexibleDate(d);
  if (!parsed) return null;
  const ms = parsed.getTime();
  return Number.isFinite(ms) ? ms : null;
};

const getDate = (date: string) => parseFlexibleDate(date) ?? new Date();

const formatDateTime = (date: string) => {
  const d = getDate(date);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMinutes = (minutes: number) => {
  const safe = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  if (safe <= 0) return '0dk';

  const h = Math.floor(safe / 60);
  const m = Math.round(safe % 60);

  if (h <= 0) return `${m}dk`;
  if (m <= 0) return `${h}s`;
  return `${h}s ${m}dk`;
};

const getAccuracy = (log: DailyLog) => {
  return Math.round((log.correct / (log.questions || 1)) * 100);
};

const getSpeed = (log: DailyLog) => {
  return Math.max(1, Math.round(((log.avgTime || 0) * 60) / (log.questions || 1)));
};

const getPerformanceBadge = (accuracy: number, questions: number) => {
  if (!questions) {
    return {
      label: 'Veri Eksik',
      className: 'bg-zinc-700/40 text-zinc-300 border-zinc-700',
    };
  }

  if (accuracy >= 80) {
    return {
      label: 'İyi',
      className: 'bg-green-500/10 text-green-400 border-green-500/25',
    };
  }

  if (accuracy >= 55) {
    return {
      label: 'Orta',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    };
  }

  return {
    label: 'Tekrar Gerekli',
    className: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
  };
};

function LogHistoryBase({ logs, onLogClick }: LogHistoryProps) {
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  const allTags = useMemo(() => {
    return Array.from(new Set(logs.flatMap((log) => log.tags || []))).filter(Boolean);
  }, [logs]);

  const allSubjects = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.subject))).filter(Boolean);
  }, [logs]);

  const fromMs = fromDate ? new Date(fromDate).getTime() : null;
  const toMs = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');

    return logs
      .filter((log) => {
        if (filterSubject && log.subject !== filterSubject) return false;
        if (filterTag && (!log.tags || !log.tags.includes(filterTag))) return false;

        const ms = parseDateMs(log.date);
        if (fromMs !== null && ms !== null && ms < fromMs) return false;
        if (toMs !== null && ms !== null && ms > toMs) return false;

        if (q) {
          const haystack = [
            log.subject,
            log.topic,
            log.notes,
            ...(log.tags || []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('tr-TR');

          if (!haystack.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => (parseDateMs(b.date) ?? 0) - (parseDateMs(a.date) ?? 0));
  }, [logs, filterSubject, filterTag, fromMs, toMs, search]);

  const tagDistribution = useMemo(() => {
    const map = new Map<string, number>();

    filteredLogs.forEach((log) => {
      (log.tags || []).forEach((tag) => {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      });
    });

    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filteredLogs]);

  const stats = useMemo(() => {
    const totalQuestions = filteredLogs.reduce((sum, log) => sum + (log.questions || 0), 0);
    const totalCorrect = filteredLogs.reduce((sum, log) => sum + (log.correct || 0), 0);
    const totalMinutes = filteredLogs.reduce((sum, log) => sum + (log.avgTime || 0), 0);

    const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    const subjectMap = new Map<string, number>();
    filteredLogs.forEach((log) => {
      subjectMap.set(log.subject, (subjectMap.get(log.subject) || 0) + 1);
    });

    const mostActiveSubject =
      Array.from(subjectMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const weekLogs = logs.filter((log) => {
      const ms = parseDateMs(log.date);
      return ms !== null && ms >= weekStart.getTime();
    });

    const weekQuestions = weekLogs.reduce((sum, log) => sum + (log.questions || 0), 0);
    const weekCorrect = weekLogs.reduce((sum, log) => sum + (log.correct || 0), 0);
    const weekMinutes = weekLogs.reduce((sum, log) => sum + (log.avgTime || 0), 0);
    const weekAccuracy = weekQuestions > 0 ? Math.round((weekCorrect / weekQuestions) * 100) : 0;

    return {
      totalQuestions,
      totalMinutes,
      avgAccuracy,
      mostActiveSubject,
      weekCount: weekLogs.length,
      weekQuestions,
      weekMinutes,
      weekAccuracy,
    };
  }, [filteredLogs, logs]);

  const riskSignal = useMemo(() => {
    if (logs.length === 0) {
      return {
        title: 'Kayıt yok',
        text: 'İlk çalışma kaydını girerek performans arşivini başlat.',
        tone: 'neutral' as const,
      };
    }

    const latest = logs
      .slice()
      .sort((a, b) => (parseDateMs(b.date) ?? 0) - (parseDateMs(a.date) ?? 0))
      .slice(0, 3);

    const questions = latest.reduce((sum, log) => sum + (log.questions || 0), 0);
    const correct = latest.reduce((sum, log) => sum + (log.correct || 0), 0);
    const fatigue =
      latest.length > 0
        ? latest.reduce((sum, log) => sum + (log.fatigue || 0), 0) / latest.length
        : 0;

    const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;

    if (fatigue >= 7) {
      return {
        title: 'Yorgunluk artıyor',
        text: 'Son kayıtlarda yorgunluk yüksek. Çalışma bloklarını kısaltmak daha verimli olur.',
        tone: 'warning' as const,
      };
    }

    if (questions > 0 && accuracy < 55) {
      return {
        title: 'Tekrar sinyali',
        text: 'Son kayıtlarda doğruluk düşük. Yeni konu yerine hata analizi daha mantıklı.',
        tone: 'danger' as const,
      };
    }

    return {
      title: 'Ritim stabil',
      text: 'Kayıt akışı korunuyor. Şimdi önemli olan süreyi değil, doğru tekrar yoğunluğunu artırmak.',
      tone: 'good' as const,
    };
  }, [logs]);

  const latestLog = useMemo(() => {
    return logs
      .slice()
      .sort((a, b) => (parseDateMs(b.date) ?? 0) - (parseDateMs(a.date) ?? 0))[0];
  }, [logs]);

  const clearFilters = () => {
    setFilterSubject('');
    setFilterTag('');
    setFromDate('');
    setToDate('');
    setSearch('');
  };

  const hasActiveFilter =
    Boolean(filterSubject) ||
    Boolean(filterTag) ||
    Boolean(fromDate) ||
    Boolean(toDate) ||
    Boolean(search.trim());

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 168,
    overscan: 6,
  });

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock3 size={18} />}
          label="Toplam Süre"
          value={formatMinutes(stats.totalMinutes)}
          helper={`${filteredLogs.length} kayıt`}
        />
        <StatCard
          icon={<ListChecks size={18} />}
          label="Toplam Soru"
          value={stats.totalQuestions.toLocaleString('tr-TR')}
          helper="Filtrelenen kayıtlar"
        />
        <StatCard
          icon={<Target size={18} />}
          label="Ortalama Doğruluk"
          value={`%${stats.avgAccuracy}`}
          helper="Doğru / toplam soru"
        />
        <StatCard
          icon={<BookOpen size={18} />}
          label="En Aktif Ders"
          value={stats.mostActiveSubject}
          helper="En çok kayıt girilen"
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <main className="xl:col-span-8 space-y-5">
          <section className="bg-[#141416] border border-zinc-800 rounded-[1.4rem] p-4 shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Search size={15} className="text-[#C17767]" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400">
                  Filtrele ve ara
                </span>
              </div>

              {hasActiveFilter && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/20 border border-zinc-800 text-[10px] uppercase tracking-widest font-black text-zinc-400 hover:text-[#C17767] hover:border-[#C17767]/40 transition-all"
                >
                  <FilterX size={13} />
                  Temizle
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-5 gap-3">
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="bg-black/30 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold text-zinc-200 outline-none focus:border-[#C17767] focus:ring-4 focus:ring-[#C17767]/10 transition-all"
              />

              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="bg-black/30 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold text-zinc-200 outline-none focus:border-[#C17767] focus:ring-4 focus:ring-[#C17767]/10 transition-all"
              />

              <select
                value={filterSubject}
                onChange={(event) => setFilterSubject(event.target.value)}
                className="bg-black/30 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold text-zinc-200 outline-none focus:border-[#C17767] focus:ring-4 focus:ring-[#C17767]/10 transition-all"
              >
                <option value="">Tüm Dersler</option>
                {allSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>

              <select
                value={filterTag}
                onChange={(event) => setFilterTag(event.target.value)}
                className="bg-black/30 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold text-zinc-200 outline-none focus:border-[#C17767] focus:ring-4 focus:ring-[#C17767]/10 transition-all"
              >
                <option value="">Tüm Etiketler</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Konu, etiket, not ara"
                className="bg-black/30 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[#C17767] focus:ring-4 focus:ring-[#C17767]/10 transition-all"
              />
            </div>

            {tagDistribution.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {tagDistribution.map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(tag)}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] uppercase tracking-widest font-black transition-all ${filterTag === tag
                        ? 'bg-[#C17767]/15 border-[#C17767]/40 text-[#C17767]'
                        : 'bg-black/20 border-zinc-800 text-zinc-500 hover:text-[#C17767] hover:border-[#C17767]/35'
                      }`}
                    title={`${count} kez`}
                  >
                    #{tag} <span className="opacity-60 ml-1">({count})</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="bg-[#141416] border border-zinc-800 rounded-[1.4rem] p-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-black text-[#C17767]">
                  Kayıt Akışı
                </div>
                <h3 className="mt-1 font-display italic text-xl font-black text-zinc-100">
                  Seans timeline
                </h3>
              </div>

              <div className="px-3 py-2 rounded-xl bg-black/25 border border-zinc-800 text-[10px] uppercase tracking-widest font-black text-zinc-500">
                {filteredLogs.length} kayıt
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <EmptyState />
            ) : (
              <div ref={parentRef} className="max-h-[610px] overflow-y-auto custom-scrollbar relative pr-2">
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  <div className="absolute left-[5px] top-0 bottom-0 w-px bg-zinc-800" />

                  {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                    const log = filteredLogs[virtualItem.index];

                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                          paddingBottom: '1rem',
                        }}
                      >
                        <LogCard log={log} onClick={() => onLogClick(log)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </main>

        <aside className="xl:col-span-4">
          <div className="sticky top-6 space-y-5">
            <section className="bg-[#141416] border border-zinc-800 rounded-[1.4rem] p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-black text-[#C17767]">
                    Haftalık Özet
                  </div>
                  <h3 className="mt-1 font-display italic text-lg font-black text-zinc-100">
                    Son 7 gün
                  </h3>
                </div>
                <CalendarDays size={19} className="text-[#C17767]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SideMetric label="Kayıt" value={stats.weekCount} />
                <SideMetric label="Soru" value={stats.weekQuestions} />
                <SideMetric label="Süre" value={formatMinutes(stats.weekMinutes)} />
                <SideMetric label="Doğruluk" value={`%${stats.weekAccuracy}`} />
              </div>
            </section>

            <section className="bg-[#141416] border border-zinc-800 rounded-[1.4rem] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Tag size={15} className="text-[#C17767]" />
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400">
                  Etiket yoğunluğu
                </h3>
              </div>

              {tagDistribution.length === 0 ? (
                <p className="text-xs leading-relaxed text-zinc-500">
                  Etiket verisi yok. Kayıtlara etiket eklendikçe burada yoğunluk görünür.
                </p>
              ) : (
                <div className="space-y-3">
                  {tagDistribution.map(([tag, count]) => {
                    const max = tagDistribution[0]?.[1] || 1;
                    const width = Math.max(12, Math.round((count / max) * 100));

                    return (
                      <div key={tag}>
                        <div className="flex justify-between items-center mb-1.5 text-[11px]">
                          <span className="font-black uppercase tracking-wider text-zinc-300">
                            #{tag}
                          </span>
                          <span className="font-bold text-zinc-500">{count}</span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C17767] rounded-full"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section
              className={`rounded-[1.4rem] border p-5 ${riskSignal.tone === 'danger'
                  ? 'bg-rose-500/10 border-rose-500/25'
                  : riskSignal.tone === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/25'
                    : riskSignal.tone === 'good'
                      ? 'bg-green-500/10 border-green-500/25'
                      : 'bg-[#141416] border-zinc-800'
                }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle
                  size={16}
                  className={
                    riskSignal.tone === 'danger'
                      ? 'text-rose-400'
                      : riskSignal.tone === 'warning'
                        ? 'text-amber-400'
                        : riskSignal.tone === 'good'
                          ? 'text-green-400'
                          : 'text-zinc-400'
                  }
                />
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-300">
                  Risk Sinyali
                </h3>
              </div>

              <div className="text-base font-black text-zinc-100">{riskSignal.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{riskSignal.text}</p>
            </section>

            <section className="bg-[#141416] border border-zinc-800 rounded-[1.4rem] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Flame size={15} className="text-[#C17767]" />
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400">
                  Son kayıt
                </h3>
              </div>

              {!latestLog ? (
                <p className="text-xs text-zinc-500">Henüz kayıt yok.</p>
              ) : (
                <button
                  onClick={() => onLogClick(latestLog)}
                  className="w-full text-left rounded-2xl border border-zinc-800 bg-black/25 p-4 hover:border-[#C17767]/40 transition-all"
                >
                  <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                    {formatDateTime(latestLog.date)}
                  </div>
                  <div className="mt-2 font-black text-zinc-100">
                    {latestLog.subject} — {latestLog.topic}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <SmallResult label="Soru" value={latestLog.questions} />
                    <SmallResult label="Doğru" value={latestLog.correct} />
                    <SmallResult label="%" value={getAccuracy(latestLog)} />
                  </div>
                </button>
              )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  helper: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[1.4rem] border border-zinc-800 bg-[#141416] p-5 shadow-2xl shadow-black/10 hover:border-[#C17767]/35 hover:-translate-y-0.5 transition-all">
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#C17767]/10 blur-2xl group-hover:bg-[#C17767]/20 transition-all" />

      <div className="relative z-10 flex items-center justify-between mb-5">
        <div className="p-2.5 rounded-xl bg-[#C17767]/10 border border-[#C17767]/20 text-[#C17767]">
          {icon}
        </div>
        <div className="text-[9px] uppercase tracking-[0.2em] font-black text-zinc-600">
          LOG
        </div>
      </div>

      <div className="relative z-10">
        <div className="truncate text-2xl font-black text-zinc-100">{value}</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] font-black text-zinc-500">
          {label}
        </div>
        <p className="mt-3 text-xs text-zinc-500">{helper}</p>
      </div>
    </article>
  );
}

function LogCard({ log, onClick }: { log: DailyLog; onClick: () => void }) {
  const accuracy = getAccuracy(log);
  const badge = getPerformanceBadge(accuracy, log.questions);

  return (
    <button
      onClick={onClick}
      className="relative ml-5 w-[calc(100%-1.25rem)] text-left rounded-[1.35rem] border border-zinc-800 bg-[#0D0D10] p-5 hover:bg-[#111114] hover:border-[#C17767]/40 active:scale-[0.99] transition-all"
    >
      <div className="absolute -left-[26px] top-7 h-3 w-3 rounded-full bg-[#C17767] border-2 border-[#141416] shadow-[0_0_0_4px_rgba(193,119,103,0.12)]" />

      <div className="grid gap-5 2xl:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
              {formatDateTime(log.date)}
            </span>

            <span className={`px-2 py-1 rounded-lg border text-[9px] uppercase tracking-widest font-black ${badge.className}`}>
              {badge.label}
            </span>

            {(log.tags || []).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/15 text-[9px] uppercase tracking-widest font-black text-rose-300"
              >
                #{tag}
              </span>
            ))}
          </div>

          <h4 className="truncate font-black text-zinc-100">
            {log.subject} — {log.topic}
          </h4>

          {log.notes && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">
              {log.notes}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            <MetricPill icon={<Clock3 size={12} />} label="Süre" value={formatMinutes(log.avgTime)} />
            <MetricPill icon={<Target size={12} />} label="Doğruluk" value={`%${accuracy}`} />
            <MetricPill icon={<TimerReset size={12} />} label="Hız" value={`${getSpeed(log)} sn/soru`} />
            <MetricPill icon={<Activity size={12} />} label="Yorgunluk" value={`${log.fatigue}/10`} />
          </div>
        </div>

        <div className="min-w-[150px] flex flex-col justify-center items-start 2xl:items-end bg-black/25 border border-zinc-800 rounded-2xl p-4">
          <div className="text-2xl font-black text-rose-300">
            {log.questions}
            <span className="ml-1 text-xs uppercase tracking-widest font-black text-zinc-500">
              Soru
            </span>
          </div>

          <div className="flex items-center gap-2 mt-3 text-[11px] uppercase tracking-wider font-black">
            <span className="inline-flex items-center gap-1 text-green-400">
              <CheckCircle2 size={12} />
              {log.correct}D
            </span>
            <span className="inline-flex items-center gap-1 text-rose-400">
              <XCircle size={12} />
              {log.wrong}Y
            </span>
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <CircleDashed size={12} />
              {log.empty}B
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2">
      <span className="text-[#C17767]">{icon}</span>
      <span className="text-[9px] uppercase tracking-widest font-black text-zinc-500">
        {label}:
      </span>
      <span className="text-[10px] uppercase tracking-wider font-black text-zinc-300">
        {value}
      </span>
    </span>
  );
}

function SideMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/25 p-4">
      <div className="text-xl font-black text-zinc-100">{value}</div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.18em] font-black text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function SmallResult({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/25 p-3 text-center">
      <div className="text-lg font-black text-zinc-100">{value}</div>
      <div className="mt-1 text-[9px] uppercase tracking-widest font-black text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="min-h-[320px] flex flex-col items-center justify-center text-center rounded-[1.2rem] border border-dashed border-zinc-800 bg-black/20 p-8">
      <div className="mb-5 p-5 rounded-3xl bg-[#C17767]/10 border border-[#C17767]/20 text-[#C17767]">
        <BookOpen size={34} />
      </div>

      <h3 className="text-xl font-black text-zinc-100">Kriterlere uygun log bulunamadı</h3>

      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        Filtreleri gevşet veya yeni bir çalışma kaydı ekleyerek performans arşivini genişlet.
      </p>
    </div>
  );
}

export const LogHistory = React.memo(LogHistoryBase);