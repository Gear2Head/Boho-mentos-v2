import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { ExamResult } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface ExamDetailModalProps {
  exam: ExamResult | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export function ExamDetailModal({ exam, isOpen, onClose, isAdmin }: ExamDetailModalProps) {
  const store = useAppStore();

  if (!isOpen || !exam) return null;

  const handleDelete = () => {
    if (window.confirm('Bu denemeyi kalıcı olarak silmek istediğinize emin misiniz?')) {
      store.removeExam(exam.id);
      onClose();
    }
  };

  const chartData = Object.entries(exam.scores).map(([subject, data]) => ({
    name: subject,
    value: data.net > 0 ? data.net : 0, 
    color: subject === 'Türkçe' ? '#C17767' : subject === 'Matematik' ? '#3B82F6' : subject.includes('Fen') ? '#10B981' : '#F59E0B'
  }));

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-8 rounded-3xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onClick={onClose} className="absolute top-6 right-6 opacity-50 hover:opacity-100 transition-opacity">
          <X size={24} className="text-zinc-400 hover:text-white" />
        </button>
        
        <header className="mb-8 border-b border-[#2A2A2A] pb-6 flex justify-between items-end">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#C17767] mb-2 block">{exam.type} DENEMESİ</span>
            <h2 className="font-serif italic text-3xl text-zinc-200">Deneme Raporu</h2>
            <p className="text-xs uppercase tracking-widest opacity-40 mt-1 font-mono text-zinc-400">{new Date(exam.date).toLocaleDateString('tr-TR')} Tarihli Kayıt</p>
          </div>
          <div className="text-right">
            <span className="text-5xl font-serif italic text-zinc-200">{exam.totalNet.toFixed(2)}</span>
            <span className="text-[10px] uppercase tracking-widest opacity-50 font-bold ml-1 text-zinc-500">NET</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6">
             <h3 className="font-serif italic text-[#C17767] text-lg mb-4 border-b border-[#2A2A2A] pb-2">Net Dağılımı</h3>
             <div className="h-48 w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                     {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                   </Pie>
                   <RechartsTooltip contentStyle={{ backgroundColor: '#1A1A1A', borderRadius: '8px', border: '1px solid #2A2A2A', color: '#fff', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }} itemStyle={{ color: '#fff' }} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 space-y-3 overflow-y-auto">
             <h3 className="font-serif italic text-zinc-300 text-lg mb-4 border-b border-[#2A2A2A] pb-2">Ders Detayları</h3>
             {Object.entries(exam.scores).map(([subject, data]) => (
               <div key={subject} className="flex justify-between items-center border-b border-[#2A2A2A]/50 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0">
                 <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{subject}</span>
                 <div className="text-right flex gap-3 text-[10px] font-mono opacity-80">
                   <span className="text-green-500">{data.correct} D</span>
                   <span className="text-red-500">{data.wrong} Y</span>
                   <span className="text-zinc-200 font-bold ml-2">{data.net.toFixed(2)} N</span>
                 </div>
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
