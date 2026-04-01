import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ExamResult } from '../../types';

interface ExamEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exam: ExamResult) => void;
  track: 'Sayısal' | 'Eşit Ağırlık' | 'Sözel' | 'Dil';
}

const TYT_SECTIONS = [
  { id: 'turkish', name: 'Türkçe', qCount: 40 },
  { id: 'social', name: 'Sosyal', qCount: 20 },
  { id: 'math', name: 'Matematik', qCount: 40 },
  { id: 'science', name: 'Fen Bilimleri', qCount: 20 }
];

const AYT_SECTIONS: Record<string, { id: string, name: string, qCount: number }[]> = {
  'Sayısal': [
    { id: 'math', name: 'Matematik', qCount: 40 },
    { id: 'physics', name: 'Fizik', qCount: 14 },
    { id: 'chemistry', name: 'Kimya', qCount: 13 },
    { id: 'biology', name: 'Biyoloji', qCount: 13 }
  ],
  'Eşit Ağırlık': [
    { id: 'math', name: 'Matematik', qCount: 40 },
    { id: 'literature', name: 'Edebiyat', qCount: 24 },
    { id: 'history1', name: 'Tarih-1', qCount: 10 },
    { id: 'geo1', name: 'Coğrafya-1', qCount: 6 }
  ],
  'Sözel': [
    { id: 'literature', name: 'Edebiyat', qCount: 24 },
    { id: 'history1', name: 'Tarih-1', qCount: 10 },
    { id: 'geo1', name: 'Coğrafya-1', qCount: 6 },
    { id: 'history2', name: 'Tarih-2', qCount: 11 },
    { id: 'geo2', name: 'Coğrafya-2', qCount: 11 },
    { id: 'philosophy', name: 'Felsefe Grb.', qCount: 12 },
    { id: 'religion', name: 'Din Kültürü', qCount: 6 }
  ],
  'Dil': [
    { id: 'language', name: 'Yabancı Dil', qCount: 80 }
  ]
};

export function ExamEntryModal({ isOpen, onClose, onSave, track }: ExamEntryModalProps) {
  const [examType, setExamType] = useState<'TYT' | 'AYT'>('TYT');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState<Record<string, { correct: number, wrong: number }>>({});

  const sections = examType === 'TYT' ? TYT_SECTIONS : (AYT_SECTIONS[track] || []);

  const handleScoreChange = (sectionId: string, type: 'correct' | 'wrong', value: string) => {
    let num = parseInt(value);
    if (isNaN(num)) num = 0;
    
    // Güvenlik sınırları
    const sectionData = sections.find(s => s.id === sectionId);
    if (!sectionData) return;
    
    setScores(prev => {
      const existing = prev[sectionId] || { correct: 0, wrong: 0 };
      const updated = { ...existing, [type]: num };
      
      // Toplam limitini aşmasın
      if (updated.correct + updated.wrong > sectionData.qCount) return prev;
      
      return { ...prev, [sectionId]: updated };
    });
  };

  const chartData = useMemo(() => {
    return sections.map(sec => {
      const s = scores[sec.id];
      let net = 0;
      if (s) {
        net = s.correct - (s.wrong * 0.25);
      }
      return {
        name: sec.name.substring(0, 4), // Kısa isim grafikte
        fullName: sec.name,
        net: parseFloat(Math.max(0, net).toFixed(2)),
        max: sec.qCount
      };
    });
  }, [scores, sections]);

  const totalNet = useMemo(() => chartData.reduce((acc, curr) => acc + curr.net, 0), [chartData]);

  const handleSubmit = () => {
    if (!sections.length) return;

    const processedScores: Record<string, { correct: number, wrong: number, net: number }> = {};
    sections.forEach(sec => {
      const s = scores[sec.id];
      const correct = s?.correct ?? 0;
      const wrong = s?.wrong ?? 0;
      const net = correct - (wrong * 0.25);
      processedScores[sec.name] = {
        correct,
        wrong,
        net: isFinite(net) ? net : 0,
      };
    });

    const safeTotal = isFinite(totalNet) && !isNaN(totalNet) ? parseFloat(totalNet.toFixed(2)) : 0;

    onSave({
      id: Date.now().toString(),
      date,
      type: examType,
      totalNet: safeTotal,
      scores: processedScores
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[99] overflow-y-auto">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-8 rounded-3xl max-w-4xl w-full shadow-2xl relative my-8">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors bg-[#2A2A2A] rounded-full p-2"><X size={20}/></button>
        
        <h2 className="font-serif italic text-3xl mb-2 text-[#C17767]">Deneme Sonucu Gir</h2>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-8 border-b border-[#2A2A2A] pb-4">Netlerini detaylı işle, analiz zenginlessin.</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form Alanı */}
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex gap-4">
               <div className="flex-1">
                 <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] block mb-2">Sınav Tipi</label>
                 <div className="flex bg-[#121212] rounded-xl p-1 border border-[#2A2A2A]">
                    <button 
                      onClick={() => { setExamType('TYT'); setScores({}); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors ${examType === 'TYT' ? 'bg-[#C17767] text-white' : 'text-zinc-500 hover:text-white'}`}
                    >TYT</button>
                    <button 
                      onClick={() => { setExamType('AYT'); setScores({}); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors ${examType === 'AYT' ? 'bg-[#C17767] text-white' : 'text-zinc-500 hover:text-white'}`}
                    >AYT</button>
                 </div>
               </div>
               <div className="flex-1">
                 <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] block mb-2">Tarih</label>
                 <input 
                   type="date" 
                   value={date} 
                   onChange={e => setDate(e.target.value)} 
                   className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-[#C17767] transition-colors"
                 />
               </div>
            </div>

            <div className="flex-1 space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {sections.map(sec => {
                const maxQ = sec.qCount;
                const c = scores[sec.id]?.correct || 0;
                const w = scores[sec.id]?.wrong || 0;
                const b = maxQ - (c + w);
                const n = c - (w * 0.25);
                
                return (
                  <div key={sec.id} className="bg-[#121212] border border-[#2A2A2A] rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-[#EAE6DF] text-sm uppercase tracking-wider">{sec.name}</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{maxQ} Soru</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-xs uppercase opacity-70">D</span>
                        <input 
                          type="number" min="0" max={maxQ} 
                          value={scores[sec.id]?.correct === undefined ? '' : scores[sec.id]?.correct} 
                          onChange={e => handleScoreChange(sec.id, 'correct', e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-[#333] text-zinc-200 p-2 pl-8 rounded-lg text-sm focus:outline-none focus:border-green-500 transition-colors"
                        />
                      </div>
                      <div className="flex-1 relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 font-bold text-xs uppercase opacity-70">Y</span>
                        <input 
                          type="number" min="0" max={maxQ} 
                          value={scores[sec.id]?.wrong === undefined ? '' : scores[sec.id]?.wrong} 
                          onChange={e => handleScoreChange(sec.id, 'wrong', e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-[#333] text-zinc-200 p-2 pl-8 rounded-lg text-sm focus:outline-none focus:border-red-500 transition-colors"
                        />
                      </div>
                      <div className="w-16 text-center border-l border-[#333] pl-3">
                        <span className="block text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Net</span>
                        <span className={`font-mono font-bold text-sm ${n >= 0 ? 'text-[#C17767]' : 'text-red-500'}`}>{n.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Grafik ve Sonuç */}
          <div className="flex flex-col h-full bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6">
            <h3 className="font-serif italic text-lg text-zinc-300 uppercase tracking-widest border-b border-[#2A2A2A] pb-2 mb-6">Deneme Sinerjisi</h3>
            
            <div className="flex-1 w-full min-h-[300px]">
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#8C857B', fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip 
                      cursor={{fill: '#2A2A2A'}} 
                      contentStyle={{backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px', color: '#EAE6DF', fontSize: '12px'}} 
                    />
                    <Bar dataKey="net" fill="#C17767" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#2A2A2A]">
              <div className="flex justify-between items-end mb-6">
                <span className="text-[10px] uppercase tracking-widest text-[#C17767] font-bold">Toplam Başarı ({examType})</span>
                <span className="text-4xl font-serif italic text-white leading-none">{totalNet.toFixed(2)} <span className="text-sm font-sans font-bold text-zinc-600">NET</span></span>
              </div>
              
              <button 
                onClick={handleSubmit} 
                className="w-full py-4 bg-[#C17767] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#A56253] transition-colors shadow-[0_0_20px_rgba(193,119,103,0.2)] flex justify-center items-center gap-2"
              >
                <CheckCircle2 size={16} /> Analizi Kaydet ve Sisteme Aktar
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
