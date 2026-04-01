/**
 * AMAÇ: Günlük çalışma logu giriş formu
 * MANTIK: sourceName alanı eklenerek kaynak ROI takibi destekleniyor
 */

import React, { useState } from 'react';
import { X, Mic, Camera, BookOpen } from 'lucide-react';
import { TYT_SUBJECTS, AYT_SUBJECTS } from '../../constants';
import type { DailyLog } from '../../types';
import { useToast } from '../ToastContext';

interface LogEntryWidgetProps {
  onSubmit: (log: DailyLog) => void;
  onCancel: () => void;
}

export function LogEntryWidget({ onSubmit, onCancel }: LogEntryWidgetProps) {
  const { toast } = useToast();
  const [examType, setExamType] = useState<'TYT' | 'AYT'>('TYT');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [correct, setCorrect] = useState<number | ''>('');
  const [wrong, setWrong] = useState<number | ''>('');
  const [empty, setEmpty] = useState<number | ''>('');
  const [time, setTime] = useState<number | ''>('');
  const [fatigue, setFatigue] = useState<number>(5);
  const [tags, setTags] = useState('');
  const [sourceName, setSourceName] = useState('');

  const subjectsMap = examType === 'TYT' ? TYT_SUBJECTS : AYT_SUBJECTS;
  const availableSubjects = Object.keys(subjectsMap);
  const availableTopics = subject ? subjectsMap[subject] || [] : [];

  const handleManualSubmit = () => {
    if (!subject || !topic || correct === '' || wrong === '' || empty === '' || time === '') {
      toast.warning('Lütfen zorunlu alanları (Ders, Konu, Soru Dağılımı ve Süre) doldurunuz.');
      return;
    }

    const log: DailyLog = {
      date: new Date().toISOString(),
      subject: `${examType} ${subject}`,
      topic,
      questions: Number(correct) + Number(wrong) + Number(empty),
      correct: Number(correct),
      wrong: Number(wrong),
      empty: Number(empty),
      avgTime: Number(time),
      fatigue,
      tags: tags.split(',').map(t => t.trim().startsWith('#') ? t.trim() : `#${t.trim()}`).filter(t => t !== '#'),
      sourceName: sourceName.trim() || undefined,
    };

    onSubmit(log);
  };

  const handleVoiceLog = () => {
    toast.info('Sesli Log Özelliği (Whisper API Entegrasyonu) çok yakında aktif edilecek.');
  };

  const handleOcrLog = () => {
    toast.info('Fotoğraftan Test Okuma (OCR) çok yakında aktif edilecek.');
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-6 shadow-2xl relative">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#2A2A2A]">
        <h4 className="font-serif italic text-xl text-[#C17767]">Günlük Çalışma Logu</h4>
        <div className="flex items-center gap-2">
          <button onClick={handleVoiceLog} className="flex items-center gap-2 px-3 py-1.5 bg-[#2A2A2A] text-[#C17767] rounded hover:bg-[#333] transition-colors text-[10px] font-bold tracking-widest uppercase">
            <Mic size={14} /> Sesli Log
          </button>
          <button onClick={handleOcrLog} className="flex items-center gap-2 px-3 py-1.5 bg-[#2A2A2A] text-zinc-300 rounded hover:bg-[#333] transition-colors text-[10px] font-bold tracking-widest uppercase">
            <Camera size={14} /> OCR
          </button>
          <button onClick={onCancel} className="p-1.5 ml-2 text-zinc-500 hover:text-white transition-colors">
            <X size={18}/>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Sınav Tipi */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] md:w-48">Q: Hangi sınava çalıştın?</label>
          <div className="flex flex-1 gap-2">
            <button 
              onClick={() => { setExamType('TYT'); setSubject(''); setTopic(''); }}
              className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors ${examType === 'TYT' ? 'bg-[#C17767] text-white' : 'bg-[#2A2A2A] text-zinc-400 hover:bg-[#333]'}`}
            >
              TYT
            </button>
            <button 
              onClick={() => { setExamType('AYT'); setSubject(''); setTopic(''); }}
              className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors ${examType === 'AYT' ? 'bg-[#C17767] text-white' : 'bg-[#2A2A2A] text-zinc-400 hover:bg-[#333]'}`}
            >
              AYT
            </button>
          </div>
        </div>

        {/* Ders ve Konu */}
        <div className="flex flex-col md:flex-row gap-4">
          <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] md:w-48 pt-3">Q: Ders ve Konu nedir?</label>
          <div className="flex flex-1 gap-2">
            <select 
              value={subject} 
              onChange={e => { setSubject(e.target.value); setTopic(''); }}
              className="flex-1 bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl text-sm focus:outline-none focus:border-[#C17767] transition-colors"
            >
              <option value="" disabled>Ders Seç...</option>
              {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={topic} 
              onChange={e => setTopic(e.target.value)}
              disabled={!subject}
              className="flex-1 bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl text-sm focus:outline-none focus:border-[#C17767] transition-colors disabled:opacity-50"
            >
              <option value="" disabled>Konu Seç...</option>
              {availableTopics.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Kaynak */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] md:w-48">Q: Kaynak nedir?</label>
          <div className="flex flex-1 gap-2 items-center">
            <div className="relative flex-1">
              <BookOpen size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Kitap / YouTube kanalı / Hoca adı (opsiyonel)"
                value={sourceName}
                onChange={e => setSourceName(e.target.value)}
                className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 pl-10 rounded-xl text-sm focus:outline-none focus:border-[#C17767] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Dağılım */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] block">Q: Soru Dağılımı (D/Y/B)?</label>
            <span className="text-[8px] opacity-40 uppercase">Top: {(Number(correct) || 0) + (Number(wrong) || 0) + (Number(empty) || 0)}</span>
          </div>
          <div className="flex flex-1 gap-2 md:ml-[54px]">
             <div className="flex-1 relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 font-bold text-xs font-mono">D</span>
               <input type="number" min="0" value={correct} onChange={e => setCorrect(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 pl-10 rounded-xl text-sm focus:outline-none focus:border-green-500 transition-colors" />
             </div>
             <div className="flex-1 relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 font-bold text-xs font-mono">Y</span>
               <input type="number" min="0" value={wrong} onChange={e => setWrong(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 pl-10 rounded-xl text-sm focus:outline-none focus:border-red-500 transition-colors" />
             </div>
             <div className="flex-1 relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs font-mono">B</span>
               <input type="number" min="0" value={empty} onChange={e => setEmpty(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 pl-10 rounded-xl text-sm focus:outline-none focus:border-gray-500 transition-colors" />
             </div>
          </div>
        </div>

        {/* Süre ve Yorgunluk */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] md:w-48">Q: Toplam Süre (dk) ve Yorgunluk?</label>
          <div className="flex flex-1 gap-4 items-center">
            <input 
              type="number" 
              placeholder="Süre (dk)" 
              value={time} 
              onChange={e => setTime(e.target.value === '' ? '' : parseInt(e.target.value))} 
              className="flex-1 bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl text-sm focus:outline-none focus:border-[#C17767] transition-colors" 
            />
            <div className="flex-1 flex items-center gap-4">
              <input 
                type="range" 
                min="1" max="10" 
                value={fatigue} 
                onChange={e => setFatigue(parseInt(e.target.value))}
                className="w-full accent-[#C17767]" 
              />
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${fatigue > 7 ? 'text-red-500 border-red-500/50 bg-red-500/10' : 'text-[#C17767] border-[#C17767]/50 bg-[#C17767]/10'}`}>
                {fatigue}
              </span>
            </div>
          </div>
        </div>

        {/* Etiketler */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="text-[10px] uppercase font-bold tracking-widest text-[#C17767] md:w-48">Q: Hata Etiketleri?</label>
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="#HESAP, #DİKKAT, #SÜRE" 
              value={tags} 
              onChange={e => setTags(e.target.value)} 
              className="w-full bg-[#121212] border border-[#2A2A2A] text-zinc-200 p-3 rounded-xl text-sm focus:outline-none focus:border-[#C17767] transition-colors" 
            />
          </div>
        </div>

        <button 
          onClick={handleManualSubmit}
          className="w-full mt-2 py-4 bg-[#C17767] text-[#FDFBF7] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#A56253] transition-colors shadow-lg shadow-[#C17767]/20"
        >
          LOG KAYDET VE ANALİZ ET
        </button>
      </div>
    </div>
  );
}
