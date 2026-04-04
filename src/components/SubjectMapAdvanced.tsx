/**
 * AMAÇ: Gelişmiş Müfredat Haritası Bileşeni
 * MANTIK:
 *  - Ders → Konu → Durum hiyerarşisi (üç katman)
 *  - İstatistik özeti (tamamlama yüzdesi, kazanım sayısı)
 *  - Arama & Filtre (ders/durum bazlı)
 *  - Toplu durum güncelleme
 *  - Log verisiyle bağlantı (hangi konular çalışıldı)
 *  - Konu bazlı not ve etiket sistemi
 *  - Firestore real-time sync bağlantılı
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  CheckCircle2, Circle, Clock, Search, ChevronDown, ChevronRight,
  BookOpen, Star, Flame, Filter, BarChart3, RefreshCw, Lock,
  Unlock, AlertTriangle, Trophy, Target, Zap, X, Check, Minus,
  Edit3, Tag, TrendingUp, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/appStore';
import type { SubjectStatus, SubjectStatusType, DailyLog } from '../types';

// ─── Sabitler ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SubjectStatusType, {
  label: string; color: string; bg: string; border: string;
  icon: React.ReactNode; ring: string; dot: string;
}> = {
  'not-started': {
    label: 'Başlanmadı',
    color: 'text-zinc-500',
    bg: 'bg-zinc-900/50',
    border: 'border-zinc-700/40',
    icon: <Circle size={13} />,
    ring: 'ring-zinc-700',
    dot: 'bg-zinc-600',
  },
  'in-progress': {
    label: 'Çalışılıyor',
    color: 'text-amber-400',
    bg: 'bg-amber-900/20',
    border: 'border-amber-600/40',
    icon: <Clock size={13} />,
    ring: 'ring-amber-500',
    dot: 'bg-amber-400',
  },
  'mastered': {
    label: 'Tamamlandı',
    color: 'text-emerald-400',
    bg: 'bg-emerald-900/20',
    border: 'border-emerald-600/40',
    icon: <CheckCircle2 size={13} />,
    ring: 'ring-emerald-500',
    dot: 'bg-emerald-400',
  },
};

const STATUS_CYCLE: SubjectStatusType[] = ['not-started', 'in-progress', 'mastered'];

// ─── Yardımcı: Logdan konu istatistiği ──────────────────────────────────────

function getTopicStats(subject: string, name: string, logs: DailyLog[]) {
  const relevant = logs.filter(
    l => l.subject === subject && l.topic.toLowerCase().includes(name.toLowerCase().split(' ')[0])
  );
  if (!relevant.length) return null;
  const totalQ = relevant.reduce((a, l) => a + l.questions, 0);
  const totalCorrect = relevant.reduce((a, l) => a + l.correct, 0);
  const lastLog = relevant[relevant.length - 1];
  return {
    sessions: relevant.length,
    questions: totalQ,
    accuracy: Math.round((totalCorrect / totalQ) * 100),
    lastDate: new Date(lastLog.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
  };
}

// ─── Konu Kartı ──────────────────────────────────────────────────────────────

interface TopicCardProps {
  key?: React.Key;
  sub: SubjectStatus & { originalIndex: number };
  logs: DailyLog[];
  onStatusChange: (idx: number, status: SubjectStatusType) => void;
  onNotesChange: (idx: number, notes: string) => void;
  searchQuery: string;
}

function TopicCard({ sub, logs, onStatusChange, onNotesChange, searchQuery }: TopicCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(sub.notes || '');
  const cfg = STATUS_CONFIG[sub.status];
  const stats = useMemo(() => getTopicStats(sub.subject, sub.name, logs), [sub.subject, sub.name, logs]);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const handleStatusClick = useCallback(() => {
    const curr = STATUS_CYCLE.indexOf(sub.status);
    const next = STATUS_CYCLE[(curr + 1) % STATUS_CYCLE.length];
    onStatusChange(sub.originalIndex, next);
  }, [sub.status, sub.originalIndex, onStatusChange]);

  const handleNoteSave = useCallback(() => {
    onNotesChange(sub.originalIndex, noteValue);
    setIsEditingNote(false);
  }, [noteValue, sub.originalIndex, onNotesChange]);

  // Arama vurgusu
  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const idx = text.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-[#C17767]/30 text-[#C17767] rounded px-0.5">{text.slice(idx, idx + searchQuery.length)}</mark>
        {text.slice(idx + searchQuery.length)}
      </>
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={`
        relative border rounded-xl transition-all duration-200 overflow-hidden group
        ${cfg.border} ${cfg.bg}
        hover:shadow-[0_0_16px_rgba(193,119,103,0.08)]
        ${sub.status === 'mastered' ? 'hover:border-emerald-500/60' : ''}
        ${sub.status === 'in-progress' ? 'hover:border-amber-500/60' : ''}
      `}
    >
      {/* Sol durum çizgisi */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-300
        ${sub.status === 'mastered' ? 'bg-emerald-400' : sub.status === 'in-progress' ? 'bg-amber-400' : 'bg-zinc-700'}`}
      />

      {/* Ana satır */}
      <div className="flex items-center gap-3 px-4 py-3 pl-5">
        {/* Durum butonu */}
        <button
          onClick={handleStatusClick}
          title={`Durum: ${cfg.label} → Sonraki`}
          className={`
            shrink-0 w-6 h-6 rounded-full flex items-center justify-center
            border-2 transition-all duration-200 hover:scale-110 active:scale-95
            ${cfg.color} ${cfg.border}
            ${sub.status === 'mastered' ? 'bg-emerald-900/40' : ''}
            ${sub.status === 'in-progress' ? 'bg-amber-900/40 animate-pulse' : ''}
          `}
        >
          {cfg.icon}
        </button>

        {/* Konu adı */}
        <span
          className={`flex-1 text-sm font-medium leading-snug cursor-pointer select-none
            ${sub.status === 'mastered' ? 'text-zinc-300 line-through decoration-emerald-500/40' : 'text-zinc-200'}
            ${sub.status === 'in-progress' ? 'text-amber-100' : ''}
          `}
          onClick={() => setIsExpanded(e => !e)}
        >
          {highlightText(sub.name)}
        </span>

        {/* Sağ: istatistik + genişlet */}
        <div className="flex items-center gap-2 shrink-0">
          {stats && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border
              ${stats.accuracy >= 75
                ? 'text-emerald-400 border-emerald-700/40 bg-emerald-900/20'
                : stats.accuracy >= 50
                ? 'text-amber-400 border-amber-700/40 bg-amber-900/20'
                : 'text-red-400 border-red-700/40 bg-red-900/20'
              }`}
              title={`${stats.sessions} seans, ${stats.questions} soru`}
            >
              %{stats.accuracy}
            </span>
          )}

          {sub.notes && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#C17767]/60" title="Not var" />
          )}

          <button
            onClick={() => setIsExpanded(e => !e)}
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Genişletilmiş bölüm */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-1 space-y-3 border-t border-zinc-800/60">
              {/* Log istatistikleri */}
              {stats ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-900/60 rounded-lg px-3 py-2 text-center border border-zinc-800/40">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Seans</div>
                    <div className="text-sm font-bold text-zinc-200">{stats.sessions}</div>
                  </div>
                  <div className="bg-zinc-900/60 rounded-lg px-3 py-2 text-center border border-zinc-800/40">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Soru</div>
                    <div className="text-sm font-bold text-zinc-200">{stats.questions}</div>
                  </div>
                  <div className="bg-zinc-900/60 rounded-lg px-3 py-2 text-center border border-zinc-800/40">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Son</div>
                    <div className="text-sm font-bold text-zinc-200">{stats.lastDate}</div>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-zinc-600 italic">Bu konu için henüz log girilmedi.</div>
              )}

              {/* Not alanı */}
              {isEditingNote ? (
                <div className="space-y-2">
                  <textarea
                    ref={noteRef}
                    value={noteValue}
                    onChange={e => setNoteValue(e.target.value)}
                    placeholder="Bu konu hakkında notlar, stratejiler, tuzaklar..."
                    autoFocus
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs
                      text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-[#C17767]
                      transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleNoteSave}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/40 border border-emerald-700/50
                        text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-800/40 transition-colors"
                    >
                      <Check size={11} /> Kaydet
                    </button>
                    <button
                      onClick={() => { setNoteValue(sub.notes || ''); setIsEditingNote(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700
                        text-zinc-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-700 transition-colors"
                    >
                      <X size={11} /> İptal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingNote(true)}
                  className="flex items-start gap-2 w-full text-left group/note"
                >
                  <Edit3 size={12} className="mt-0.5 text-zinc-600 group-hover/note:text-[#C17767] transition-colors shrink-0" />
                  <span className={`text-xs leading-relaxed ${sub.notes ? 'text-zinc-400' : 'text-zinc-600 italic'}`}>
                    {sub.notes || 'Not ekle...'}
                  </span>
                </button>
              )}

              {/* Hızlı durum değişim butonları */}
              <div className="flex gap-1.5">
                {STATUS_CYCLE.map(s => {
                  const c = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => onStatusChange(sub.originalIndex, s)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase
                        tracking-wider border transition-all duration-150
                        ${sub.status === s
                          ? `${c.bg} ${c.border} ${c.color} shadow-sm`
                          : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'
                        }`}
                    >
                      {c.icon}
                      <span className="hidden sm:inline">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Ders Grubu ──────────────────────────────────────────────────────────────

interface SubjectGroupProps {
  key?: React.Key;
  groupName: string;
  subjects: Array<SubjectStatus & { originalIndex: number }>;
  logs: DailyLog[];
  onStatusChange: (idx: number, status: SubjectStatusType) => void;
  onNotesChange: (idx: number, notes: string) => void;
  onBulkStatus: (indices: number[], status: SubjectStatusType) => void;
  searchQuery: string;
  filterStatus: SubjectStatusType | 'all';
  defaultOpen?: boolean;
}

function SubjectGroup({
  groupName, subjects, logs, onStatusChange, onNotesChange, onBulkStatus,
  searchQuery, filterStatus, defaultOpen = false
}: SubjectGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showBulk, setShowBulk] = useState(false);

  const filtered = useMemo(() => {
    let list = subjects;
    if (filterStatus !== 'all') list = list.filter(s => s.status === filterStatus);
    if (searchQuery) list = list.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return list;
  }, [subjects, filterStatus, searchQuery]);

  const mastered = subjects.filter(s => s.status === 'mastered').length;
  const inProgress = subjects.filter(s => s.status === 'in-progress').length;
  const total = subjects.length;
  const pct = Math.round((mastered / total) * 100);

  if (filtered.length === 0 && (searchQuery || filterStatus !== 'all')) return null;

  return (
    <div className="border border-zinc-800/60 rounded-2xl overflow-hidden bg-zinc-950/40 backdrop-blur-sm">
      {/* Grup başlığı */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-900/40 transition-colors text-left group"
      >
        {/* Progress ring (mini) */}
        <div className="relative shrink-0 w-10 h-10">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(39,39,42)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke={pct >= 80 ? '#34d399' : pct >= 40 ? '#f59e0b' : '#C17767'}
              strokeWidth="3"
              strokeDasharray={`${(pct / 100) * 94.25} 94.25`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-zinc-300">
            {pct}%
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-sm text-zinc-100 group-hover:text-white transition-colors truncate">
              {groupName}
            </h4>
            {inProgress > 0 && (
              <span className="text-[9px] bg-amber-900/40 border border-amber-700/40 text-amber-400
                px-1.5 py-0.5 rounded font-bold uppercase">
                {inProgress} aktif
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct >= 80
                    ? 'linear-gradient(90deg,#059669,#34d399)'
                    : pct >= 40
                    ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                    : 'linear-gradient(90deg,#9a3728,#C17767)',
                }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
              {mastered}/{total}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Toplu işlem */}
          <button
            onClick={e => { e.stopPropagation(); setShowBulk(b => !b); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-800 rounded-lg
              text-zinc-500 hover:text-zinc-300 transition-all text-[10px] font-bold uppercase"
            title="Toplu güncelle"
          >
            <Zap size={13} />
          </button>

          {isOpen ? (
            <ChevronDown size={16} className="text-zinc-500" />
          ) : (
            <ChevronRight size={16} className="text-zinc-500" />
          )}
        </div>
      </button>

      {/* Toplu işlem satırı */}
      <AnimatePresence>
        {showBulk && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-zinc-800/60"
          >
            <div className="px-5 py-3 bg-zinc-900/60 flex items-center gap-3 flex-wrap">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Tümünü:</span>
              {STATUS_CYCLE.map(s => {
                const c = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => {
                      onBulkStatus(subjects.map(sub => sub.originalIndex), s);
                      setShowBulk(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px]
                      font-bold uppercase tracking-wider transition-all hover:scale-105
                      ${c.bg} ${c.border} ${c.color}`}
                  >
                    {c.icon} {c.label} yap
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Konular */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-4 pt-2 space-y-1.5 border-t border-zinc-800/30"
          >
            <AnimatePresence>
              {filtered.map(sub => (
                <TopicCard
                  key={sub.originalIndex}
                  sub={sub}
                  logs={logs}
                  onStatusChange={onStatusChange}
                  onNotesChange={onNotesChange}
                  searchQuery={searchQuery}
                />
              ))}
            </AnimatePresence>

            {filtered.length === 0 && (
              <p className="text-center py-4 text-zinc-600 text-xs italic">Filtre ile eşleşen konu yok.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Özet İstatistik Kartı ────────────────────────────────────────────────────

function SummaryBar({ tytSubjects, aytSubjects, trackSubjects }: {
  tytSubjects: SubjectStatus[];
  aytSubjects: SubjectStatus[];
  trackSubjects: SubjectStatus[];
}) {
  const tytMastered = tytSubjects.filter(s => s.status === 'mastered').length;
  const aytMastered = trackSubjects.filter(s => s.status === 'mastered').length;
  const tytIP = tytSubjects.filter(s => s.status === 'in-progress').length;
  const aytIP = trackSubjects.filter(s => s.status === 'in-progress').length;

  const totalAll = tytSubjects.length + trackSubjects.length;
  const totalMastered = tytMastered + aytMastered;
  const overallPct = totalAll > 0 ? Math.round((totalMastered / totalAll) * 100) : 0;

  const stats = [
    { label: 'TYT Bitti', value: tytMastered, total: tytSubjects.length, color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-700/30' },
    { label: 'AYT Bitti', value: aytMastered, total: trackSubjects.length, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-700/30' },
    { label: 'Aktif', value: tytIP + aytIP, total: totalAll, color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-700/30' },
    { label: 'Genel', value: overallPct, isPercent: true, color: overallPct >= 70 ? 'text-emerald-400' : overallPct >= 40 ? 'text-amber-400' : 'text-[#C17767]', bg: 'bg-zinc-900 border-zinc-700/40' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.bg}`}>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-bold">{s.label}</div>
          <div className={`text-2xl font-black font-mono ${s.color}`}>
            {s.isPercent ? `%${s.value}` : s.value}
            {!s.isPercent && s.total && (
              <span className="text-sm font-normal text-zinc-600 ml-1">/ {s.total}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export function SubjectMapAdvanced() {
  const store = useAppStore();
  const profile = store.profile;
  const logs = store.logs;

  const [activePanel, setActivePanel] = useState<'TYT' | 'AYT'>('TYT');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<SubjectStatusType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // AYT konularını alan filtresi
  const trackAYT = useMemo(() => {
    const track = profile?.track ?? 'Sayısal';
    return store.aytSubjects.filter(s => {
      if (track === 'Sayısal') return ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'].includes(s.subject);
      if (track === 'Eşit Ağırlık') return ['Matematik', 'Edebiyat', 'Tarih', 'Coğrafya'].includes(s.subject);
      if (track === 'Sözel') return ['Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe Grubu'].includes(s.subject);
      if (track === 'Dil') return ['Yabancı Dil'].includes(s.subject);
      return true;
    });
  }, [store.aytSubjects, profile?.track]);

  const activeSubjects = activePanel === 'TYT' ? store.tytSubjects : trackAYT;

  // Gruplama
  const grouped = useMemo(() => {
    const map: Map<string, Array<SubjectStatus & { originalIndex: number }>> = new Map();
    activeSubjects.forEach((sub, idx) => {
      // Orijinal index'i hesapla
      const origIdx = activePanel === 'TYT'
        ? idx
        : store.aytSubjects.findIndex(a => a.name === sub.name && a.subject === sub.subject);
      if (!map.has(sub.subject)) map.set(sub.subject, []);
      map.get(sub.subject)!.push({ ...sub, originalIndex: origIdx });
    });
    return map;
  }, [activeSubjects, activePanel, store.aytSubjects]);

  // Flat liste (arama için)
  const flatList = useMemo(() => {
    return activeSubjects.map((sub, idx) => {
      const origIdx = activePanel === 'TYT'
        ? idx
        : store.aytSubjects.findIndex(a => a.name === sub.name && a.subject === sub.subject);
      return { ...sub, originalIndex: origIdx };
    }).filter(sub => {
      const qMatch = !searchQuery || sub.name.toLowerCase().includes(searchQuery.toLowerCase());
      const sMatch = filterStatus === 'all' || sub.status === filterStatus;
      return qMatch && sMatch;
    });
  }, [activeSubjects, searchQuery, filterStatus, activePanel, store.aytSubjects]);

  const handleTytStatusChange = useCallback((idx: number, status: SubjectStatusType) => {
    store.updateTytSubject(idx, { status });
  }, [store]);

  const handleAytStatusChange = useCallback((idx: number, status: SubjectStatusType) => {
    store.updateAytSubject(idx, { status });
  }, [store]);

  const handleTytNotesChange = useCallback((idx: number, notes: string) => {
    store.updateTytSubject(idx, { notes });
  }, [store]);

  const handleAytNotesChange = useCallback((idx: number, notes: string) => {
    store.updateAytSubject(idx, { notes });
  }, [store]);

  const onStatusChange = activePanel === 'TYT' ? handleTytStatusChange : handleAytStatusChange;
  const onNotesChange = activePanel === 'TYT' ? handleTytNotesChange : handleAytNotesChange;

  const onBulkStatus = useCallback((indices: number[], status: SubjectStatusType) => {
    indices.forEach(idx => onStatusChange(idx, status));
  }, [onStatusChange]);

  const filterCounts = useMemo(() => ({
    all: activeSubjects.length,
    'not-started': activeSubjects.filter(s => s.status === 'not-started').length,
    'in-progress': activeSubjects.filter(s => s.status === 'in-progress').length,
    'mastered': activeSubjects.filter(s => s.status === 'mastered').length,
  }), [activeSubjects]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">

      {/* Başlık */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-2">
        <div>
          <h2 className="font-display italic text-3xl md:text-4xl text-zinc-100">
            Müfredat Haritası
          </h2>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#C17767] mt-1 font-bold font-mono">
            {profile?.track ?? 'Sayısal'} Alanı — Konu Fetih Sistemi
          </p>
        </div>

        {/* View mode toggle */}
        <div className="md:ml-auto flex items-center gap-2">
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
            {(['grouped', 'flat'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all
                  ${viewMode === m ? 'bg-[#C17767] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {m === 'grouped' ? 'Gruplu' : 'Düz Liste'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Özet bar */}
      <SummaryBar
        tytSubjects={store.tytSubjects}
        aytSubjects={store.aytSubjects}
        trackSubjects={trackAYT}
      />

      {/* Panel seçici */}
      <div className="flex bg-zinc-900/80 border border-zinc-800 rounded-2xl p-1.5 gap-2">
        {(['TYT', 'AYT'] as const).map(panel => {
          const subs = panel === 'TYT' ? store.tytSubjects : trackAYT;
          const done = subs.filter(s => s.status === 'mastered').length;
          const pct = Math.round((done / (subs.length || 1)) * 100);
          return (
            <button
              key={panel}
              onClick={() => setActivePanel(panel)}
              className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl transition-all duration-200
                ${activePanel === panel
                  ? 'bg-[#1A0F0A] border border-[#C17767]/40 shadow-lg'
                  : 'hover:bg-zinc-800/60'
                }`}
            >
              <span className={`text-sm font-black uppercase tracking-widest
                ${activePanel === panel ? 'text-[#C17767]' : 'text-zinc-500'}`}>
                {panel}
              </span>
              <div className="hidden md:flex items-center gap-2">
                <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#C17767] transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">%{pct}</span>
              </div>
              <span className="text-[10px] text-zinc-600">
                {done}/{subs.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Arama & Filtre toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Arama */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Konu ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5
              text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#C17767]
              transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Durum filtresi */}
        <div className="flex gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5">
          {(['all', 'not-started', 'in-progress', 'mastered'] as const).map(f => {
            const cfg = f === 'all' ? null : STATUS_CONFIG[f];
            const count = filterCounts[f];
            return (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold
                  uppercase tracking-wider transition-all
                  ${filterStatus === f
                    ? f === 'all'
                      ? 'bg-zinc-700 text-zinc-200'
                      : `${cfg!.bg} ${cfg!.border} border ${cfg!.color}`
                    : 'text-zinc-600 hover:text-zinc-400'
                  }`}
              >
                {cfg?.icon}
                <span className="hidden md:inline">
                  {f === 'all' ? 'Tümü' : cfg!.label}
                </span>
                <span className="text-zinc-500">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* İçerik */}
      {viewMode === 'grouped' ? (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([groupName, subs], i) => (
            <SubjectGroup
              key={groupName}
              groupName={groupName}
              subjects={subs}
              logs={logs}
              onStatusChange={onStatusChange}
              onNotesChange={onNotesChange}
              onBulkStatus={onBulkStatus}
              searchQuery={searchQuery}
              filterStatus={filterStatus}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      ) : (
        /* Flat liste modu */
        <div className="space-y-1.5">
          <AnimatePresence>
            {flatList.map(sub => (
              <TopicCard
                key={sub.originalIndex}
                sub={sub}
                logs={logs}
                onStatusChange={onStatusChange}
                onNotesChange={onNotesChange}
                searchQuery={searchQuery}
              />
            ))}
          </AnimatePresence>
          {flatList.length === 0 && (
            <div className="text-center py-16 text-zinc-600">
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sonuç bulunamadı.</p>
            </div>
          )}
        </div>
      )}

      {/* Boş durum */}
      {activeSubjects.length === 0 && (
        <div className="text-center py-20 text-zinc-600">
          <BookOpen size={40} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm">Bu alan için konu bulunamadı.</p>
        </div>
      )}
    </div>
  );
}
