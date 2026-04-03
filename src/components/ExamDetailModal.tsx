/**
 * AMAÇ: Deneme detay modalı — görüntüleme, düzenleme ve silme
 * [UX-001 FIX]: window.confirm → confirmDialog (ToastContext)
 */

import React, { useMemo, useState } from 'react';
import { X, Trash2, Save, Pencil } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { ExamResult } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { confirmDialog } from '../contexts/ToastContext';
import { parseFlexibleDate } from '../utils/date';

interface ExamDetailModalProps {
  exam: ExamResult | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export function ExamDetailModal({ exam, isOpen, onClose, isAdmin }: ExamDetailModalProps) {
  const store = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [draftScores, setDraftScores] = useState<ExamResult['scores']>({});

  if (!isOpen || !exam) return null;

  const scores = isEditing ? draftScores : exam.scores;

  const calcNet = (correct: number, wrong: number) => {
    const c = Number.isFinite(correct) ? correct : 0;
    const w = Number.isFinite(wrong) ? wrong : 0;
    return c - w * 0.25;
  };

  const totalNet = useMemo(() => {
    return Object.values(scores).reduce((acc: number, s: any) => acc + (s?.net || 0), 0);
  }, [scores]);

  // [UX-001 FIX]: window.confirm → confirmDialog
  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Denemeyi Sil',
      message: 'Bu deneme kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      confirmLabel: 'Evet, Sil',
      cancelLabel: 'İptal',
      variant: 'danger',
    });
    if (ok) {
      store.removeExam(exam.id);
      onClose();
    }
  };

  const chartData = Object.entries(scores).map(([subject, data]: [string, any]) => ({
    name: subject,
    value: data.net > 0 ? data.net : 0,
    color:
      subject === 'Türkçe'
        ? '#C17767'
        : subject === 'Matematik'
        ? '#3B82F6'
        : subject.includes('Fen')
        ? '#10B981'
        : '#F59E0B',
  }));

  const startEdit = () => {
    setDraftScores(JSON.parse(JSON.stringify(exam.scores)));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraftScores({});
  };

  const saveEdit = () => {
    const normalized: ExamResult['scores'] = Object.fromEntries(
      Object.entries(draftScores).map(([subject, s]: [string, any]) => {
        const correct = Math.max(0, Number(s.correct) || 0);
        const wrong = Math.max(0, Number(s.wrong) || 0);
        const net = calcNet(correct, wrong);
        return [subject, { correct, wrong, net }];
      })
    );
    const newTotalNet = Object.values(normalized).reduce((acc, s) => acc + s.net, 0);
    store.updateExam(exam.id, { scores: normalized, totalNet: newTotalNet });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-8 rounded-3xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X size={24} className="text-zinc-400 hover:text-white" />
        </button>

        <header className="mb-8 border-b border-[#2A2A2A] pb-6 flex justify-between items-end">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#C17767] mb-2 block">
              {exam.type} DENEMESİ
            </span>
            <h2 className="font-serif italic text-3xl text-zinc-200">Deneme Raporu</h2>
            <p className="text-xs uppercase tracking-widest opacity-40 mt-1 font-mono text-zinc-400">
              {(parseFlexibleDate(exam.date) ?? new Date()).toLocaleDateString('tr-TR')} Tarihli Kayıt
            </p>
          </div>
          <div className="text-right">
            <span className="text-5xl font-serif italic text-zinc-200">
              {(isEditing ? totalNet : exam.totalNet).toFixed(2)}
            </span>
            <span className="text-[10px] uppercase tracking-widest opacity-50 font-bold ml-1 text-zinc-500">
              NET
            </span>
          </div>
        </header>

        {isAdmin && (
          <div className="mb-6 flex items-center justify-end gap-2">
            {!isEditing ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-900/20 text-blue-300 border border-blue-900/40 rounded-xl hover:bg-blue-900/35 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <Pencil size={16} /> Ders Bazlı Düzenle
              </button>
            ) : (
              <>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-zinc-900/40 text-zinc-200 border border-zinc-700/50 rounded-xl hover:bg-zinc-900/70 transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  İptal
                </button>
                <button
                  onClick={saveEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-green-900/20 text-green-300 border border-green-900/40 rounded-xl hover:bg-green-900/35 transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  <Save size={16} /> Kaydet
                </button>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6">
            <h3 className="font-serif italic text-[#C17767] text-lg mb-4 border-b border-[#2A2A2A] pb-2">
              Net Dağılımı
            </h3>
            <div className="h-48 w-full relative">
              <div style={{ width: '100%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#1A1A1A',
                        borderRadius: '8px',
                        border: '1px solid #2A2A2A',
                        color: '#fff',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: 'bold',
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 space-y-3 overflow-y-auto">
            <h3 className="font-serif italic text-zinc-300 text-lg mb-4 border-b border-[#2A2A2A] pb-2">
              Ders Detayları
            </h3>
            {Object.entries(scores).map(([subject, data]: [string, any]) => (
              <div
                key={subject}
                className="flex justify-between items-center border-b border-[#2A2A2A]/50 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0"
              >
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {subject}
                </span>
                {!isEditing ? (
                  <div className="text-right flex gap-3 text-[10px] font-mono opacity-80">
                    <span className="text-green-500">{data.correct} D</span>
                    <span className="text-red-500">{data.wrong} Y</span>
                    <span className="text-zinc-200 font-bold ml-2">{data.net.toFixed(2)} N</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={data.correct}
                      onChange={(e) => {
                        const correct = Math.max(0, Number(e.target.value) || 0);
                        setDraftScores((prev: any) => {
                          const cur = prev[subject] ?? { correct: 0, wrong: 0, net: 0 };
                          return {
                            ...prev,
                            [subject]: { correct, wrong: cur.wrong, net: calcNet(correct, cur.wrong) },
                          };
                        });
                      }}
                      className="w-20 bg-black/30 border border-[#2A2A2A] rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-[#C17767]"
                    />
                    <span className="text-[10px] uppercase tracking-widest opacity-50 text-zinc-400">D</span>
                    <input
                      type="number"
                      min={0}
                      value={data.wrong}
                      onChange={(e) => {
                        const wrong = Math.max(0, Number(e.target.value) || 0);
                        setDraftScores((prev: any) => {
                          const cur = prev[subject] ?? { correct: 0, wrong: 0, net: 0 };
                          return {
                            ...prev,
                            [subject]: { correct: cur.correct, wrong, net: calcNet(cur.correct, wrong) },
                          };
                        });
                      }}
                      className="w-20 bg-black/30 border border-[#2A2A2A] rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-[#C17767]"
                    />
                    <span className="text-[10px] uppercase tracking-widest opacity-50 text-zinc-400">Y</span>
                    <div className="w-20 text-right text-xs font-mono text-zinc-200 font-bold">
                      {data.net.toFixed(2)}N
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div className="pt-6 border-t border-red-900/30 flex justify-end">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-950/30 text-red-500 border border-red-900/50 rounded-xl hover:bg-red-900/50 transition-colors text-xs font-bold uppercase tracking-widest"
            >
              <Trash2 size={16} /> Denemeyi Sil
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
