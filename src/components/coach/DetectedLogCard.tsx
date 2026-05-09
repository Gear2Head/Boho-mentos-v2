/**
 * AMAÇ: AI'ın sohbetten yakaladığı çalışma loglarını onaya sunan kart bileşeni.
 * P1.2: Coach otomatik log kaydetmemeli; kullanıcı onaylayana kadar hiçbir veri yazılmaz.
 * V2: Validation guard, loading/success micro-state, double-submit prevention.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, X, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

interface DetectedLog {
  subject: string;
  topic: string;
  questions: number;
  duration: number;
}

interface DetectedLogCardProps {
  detectedLogs: DetectedLog[];
  onDismiss: () => void;
}

interface EditableEntry extends DetectedLog {
  correct: number;
  wrong: number;
  empty: number;
  confirmed: boolean;
  submitting: boolean;
}

export function DetectedLogCard({ detectedLogs, onDismiss }: DetectedLogCardProps) {
  const addLog = useAppStore(s => s.addLog);
  const [editableEntries, setEditableEntries] = useState<EditableEntry[]>(
    detectedLogs.map(dl => ({
      ...dl,
      correct: 0,
      wrong: 0,
      empty: 0,
      confirmed: false,
      submitting: false,
    }))
  );

  const updateEntry = useCallback((idx: number, field: string, value: number) => {
    setEditableEntries(prev =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: Math.max(0, value) } : e))
    );
  }, []);

  const confirmEntry = useCallback((idx: number) => {
    const entry = editableEntries[idx];
    // GUARD: Prevent double-submit
    if (entry.submitting || entry.confirmed) return;

    const totalQuestions = entry.correct + entry.wrong + entry.empty;
    // GUARD: At least one question must be filled
    if (totalQuestions <= 0) return;

    // Mark submitting to block double-click
    setEditableEntries(prev =>
      prev.map((e, i) => (i === idx ? { ...e, submitting: true } : e))
    );

    // Small delay for UX feedback before committing
    setTimeout(() => {
      addLog({
        id: `detected_${Date.now()}_${idx}`,
        date: new Date().toISOString(),
        subject: entry.subject,
        topic: entry.topic,
        questions: totalQuestions,
        correct: entry.correct,
        wrong: entry.wrong,
        empty: entry.empty,
        avgTime: Math.round(entry.duration / totalQuestions),
        fatigue: 3,
        notes: '🤖 Kübra: Sohbetten yakalanan ve onaylanan çalışma kaydı.',
        source: 'coach',
      });

      setEditableEntries(prev =>
        prev.map((e, i) => (i === idx ? { ...e, confirmed: true, submitting: false } : e))
      );
    }, 300);
  }, [editableEntries, addLog]);

  const allConfirmedOrEmpty = editableEntries.every(e => e.confirmed);

  if (allConfirmedOrEmpty) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-auto max-w-[86%] md:max-w-[68%] ml-11"
    >
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 rounded-lg">
              <BookOpen size={14} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-amber-500">
                Tespit Edilen Çalışma
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Doğru/yanlış/boş bilgisi girerek onayla
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-300"
            aria-label="Kapat"
          >
            <X size={14} />
          </button>
        </div>

        {/* Entries */}
        <AnimatePresence mode="popLayout">
          {editableEntries.map((entry, idx) => {
            if (entry.confirmed) return (
              <motion.div
                key={`confirmed-${idx}`}
                initial={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 overflow-hidden"
              >
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-300 font-bold">{entry.subject} – {entry.topic}</span>
                <span className="text-[9px] text-emerald-400/70 ml-auto font-mono">Kaydedildi ✓</span>
              </motion.div>
            );

            const totalQuestions = entry.correct + entry.wrong + entry.empty;
            const isValid = totalQuestions > 0;

            return (
              <motion.div
                key={idx}
                layout
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-3"
              >
                {/* Subject/Topic Info */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] uppercase tracking-widest font-black text-[#C17767]">
                    {entry.subject}
                  </span>
                  <span className="text-zinc-700">•</span>
                  <span className="text-xs text-zinc-400">{entry.topic}</span>
                  <span className="text-zinc-700">•</span>
                  <span className="text-[9px] text-zinc-500 font-mono">
                    {entry.questions} soru, {entry.duration}dk
                  </span>
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[8px] uppercase tracking-widest font-black text-emerald-500/70 block mb-1">
                      Doğru
                    </label>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={entry.correct}
                      onChange={e => updateEntry(idx, 'correct', parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase tracking-widest font-black text-rose-500/70 block mb-1">
                      Yanlış
                    </label>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={entry.wrong}
                      onChange={e => updateEntry(idx, 'wrong', parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-zinc-200 focus:outline-none focus:border-rose-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase tracking-widest font-black text-zinc-500/70 block mb-1">
                      Boş
                    </label>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={entry.empty}
                      onChange={e => updateEntry(idx, 'empty', parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Validation hint */}
                {!isValid && (
                  <div className="flex items-center gap-1.5 text-[9px] text-amber-400/80">
                    <AlertCircle size={10} />
                    <span>En az bir soru alanını doldur</span>
                  </div>
                )}

                {/* Confirm Button */}
                <button
                  onClick={() => confirmEntry(idx)}
                  disabled={!isValid || entry.submitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/10 disabled:hover:text-emerald-400"
                >
                  {entry.submitting ? (
                    <><Loader2 size={12} className="animate-spin" /> KAYDEDİLİYOR...</>
                  ) : (
                    <><CheckCircle2 size={12} /> ONAYLA VE KAYDET</>
                  )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
