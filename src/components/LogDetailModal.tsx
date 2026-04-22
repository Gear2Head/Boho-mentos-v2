/**
 * AMAÇ: Günlük log detay modalı — görüntüleme, düzenleme ve silme
 * MANTIK: ExamDetailModal ile tutarlı premium UI, edit/delete desteği
 */

import React, { useState } from 'react';
import { X, Trash2, Save, Pencil, Clock, Target, BookOpen } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { DailyLog } from '../types';
import { confirmDialog } from '../contexts/ToastContext';
import { parseFlexibleDate } from '../utils/date';

interface LogDetailModalProps {
  log: DailyLog | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export function LogDetailModal({ log, isOpen, onClose, isAdmin }: LogDetailModalProps) {
  const removeLog = useAppStore(s => s.removeLog);
  const updateLog = useAppStore(s => s.updateLog);
  
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<DailyLog>>({});

  if (!isOpen || !log) return null;

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Log Kaydını Sil',
      message: 'Bu çalışma kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      confirmLabel: 'Evet, Sil',
      cancelLabel: 'İptal',
      variant: 'danger',
    });
    if (ok) {
      removeLog(log.id);
      onClose();
    }
  };

  const startEdit = () => {
    setDraft({ ...log });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft({});
  };

  const saveEdit = () => {
    updateLog(log.id, draft);
    setIsEditing(false);
  };

  const accuracy = (log.correct / (log.questions || 1)) * 100;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-8 rounded-3xl max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 opacity-30 hover:opacity-100 transition-opacity"
          aria-label="Modalı Kapat"
        >
          <X size={24} className="text-zinc-400 hover:text-white" />
        </button>

        <header className="mb-8 border-b border-[#2A2A2A] pb-6 flex justify-between items-end">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#C17767] mb-2 block">
              ÇALIŞMA KAYDI
            </span>
            <h2 className="font-serif italic text-3xl text-zinc-200">{log.subject}</h2>
            <p className="text-xs uppercase tracking-widest opacity-40 mt-1 font-mono text-zinc-400">
              {(parseFlexibleDate(log.date) ?? new Date()).toLocaleDateString('tr-TR')} • {log.topic}
            </p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-serif italic text-zinc-200">
              %{accuracy.toFixed(0)}
            </span>
            <span className="text-[10px] uppercase tracking-widest opacity-50 font-bold ml-1 text-zinc-500">
              VERİM
            </span>
          </div>
        </header>

        {isAdmin && (
          <div className="mb-6 flex items-center justify-end gap-2">
            {!isEditing ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-900/10 text-blue-400 border border-blue-900/30 rounded-xl hover:bg-blue-900/20 transition-colors text-[10px] font-bold uppercase tracking-widest"
              >
                <Pencil size={14} /> Düzenle
              </button>
            ) : (
              <>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-zinc-900/40 text-zinc-400 border border-zinc-800 rounded-xl hover:bg-zinc-900/70 transition-colors text-[10px] font-bold uppercase tracking-widest"
                >
                  İptal
                </button>
                <button
                  onClick={saveEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-green-900/20 text-green-400 border border-green-900/30 rounded-xl hover:bg-green-900/30 transition-colors text-[10px] font-bold uppercase tracking-widest"
                >
                  <Save size={14} /> Kaydet
                </button>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <Clock className="text-[#C17767] mb-2 opacity-60" size={20} />
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Süre</span>
            {!isEditing ? (
              <span className="text-xl text-zinc-200 mt-1">{log.avgTime} dk</span>
            ) : (
              <input 
                type="number"
                value={draft.avgTime || 0}
                onChange={e => setDraft({...draft, avgTime: Number(e.target.value)})}
                className="mt-1 w-20 bg-black/40 border border-[#3A3A3A] rounded-lg text-center py-1 text-zinc-200"
              />
            )}
          </div>
          <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <Target className="text-blue-500 mb-2 opacity-60" size={20} />
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Soru</span>
            {!isEditing ? (
              <span className="text-xl text-zinc-200 mt-1">{log.questions}</span>
            ) : (
              <input 
                type="number"
                value={draft.questions || 0}
                onChange={e => setDraft({...draft, questions: Number(e.target.value)})}
                className="mt-1 w-20 bg-black/40 border border-[#3A3A3A] rounded-lg text-center py-1 text-zinc-200"
              />
            )}
          </div>
        </div>

        <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 mb-8">
          <h3 className="font-serif italic text-zinc-400 mb-4 border-b border-[#2A2A2A] pb-2 text-sm flex items-center gap-2">
            <Target size={14} className="opacity-50" /> Soru Detayları
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-[#2A2A2A]/40">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Doğru</span>
              {!isEditing ? (
                <span className="text-lg font-serif italic text-green-500">{log.correct}</span>
              ) : (
                <input 
                  type="number"
                  value={draft.correct || 0}
                  onChange={e => setDraft({...draft, correct: Number(e.target.value)})}
                  className="w-16 bg-black/60 border border-green-900/30 rounded-lg text-center py-1 text-green-400"
                />
              )}
            </div>
            <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-[#2A2A2A]/40">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Yanlış</span>
              {!isEditing ? (
                <span className="text-lg font-serif italic text-red-500">{log.wrong}</span>
              ) : (
                <input 
                  type="number"
                  value={draft.wrong || 0}
                  onChange={e => setDraft({...draft, wrong: Number(e.target.value)})}
                  className="w-16 bg-black/60 border border-red-900/30 rounded-lg text-center py-1 text-red-400"
                />
              )}
            </div>
            <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-[#2A2A2A]/40">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Boş</span>
              {!isEditing ? (
                <span className="text-lg font-serif italic text-zinc-400">{log.empty}</span>
              ) : (
                <input 
                  type="number"
                  value={draft.empty || 0}
                  onChange={e => setDraft({...draft, empty: Number(e.target.value)})}
                  className="w-16 bg-black/60 border border-zinc-700/30 rounded-lg text-center py-1 text-zinc-400"
                />
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="pt-6 border-t border-red-900/20 flex justify-end">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-950/10 text-red-500/80 border border-red-950/20 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all text-[10px] font-bold uppercase tracking-widest"
            >
              <Trash2 size={14} /> Kaydı Sil
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
