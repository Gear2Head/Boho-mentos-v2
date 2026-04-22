/**
 * AMAÇ: Günlük çalışma logu giriş formu
 * MANTIK: 4 zorunlu alan (Ders, Konu, D/Y/B, Süre) her zaman görünür.
 *         Kaynak, Yorgunluk, Etiketler → opsiyonel "Detaylar" accordion altında.
 */

import React, { useState, useEffect } from 'react';
import { X, Mic, Camera, BookOpen, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TYT_SUBJECTS, AYT_SUBJECTS } from '../../constants';
import type { DailyLog } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import confetti from 'canvas-confetti';

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
  // Optional details — hidden by default to reduce friction
  const [fatigue, setFatigue] = useState<number>(5);
  const [tags, setTags] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const subjectsMap = examType === 'TYT' ? TYT_SUBJECTS : AYT_SUBJECTS;
  const availableSubjects = Object.keys(subjectsMap);
  const availableTopics = subject ? subjectsMap[subject] || [] : [];

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

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

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['var(--color-accent)', 'var(--color-accent-subtle)', '#ffffff']
    });

    onSubmit(log);
  };

  const handleVoiceLog = () => {
    toast.info('Sesli Log Özelliği (Whisper API Entegrasyonu) çok yakında aktif edilecek.');
  };

  const handleOcrLog = () => {
    toast.info('Fotoğraftan Test Okuma (OCR) çok yakında aktif edilecek.');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      {/* Bottom Sheet */}
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, { offset, velocity }) => {
          if (offset.y > 150 || velocity.y > 500) {
            onCancel();
          }
        }}
        className="relative bg-surface border-t border-app rounded-t-[3rem] p-8 pb-safe w-full max-w-3xl mx-auto shadow-2xl max-h-[95vh] overflow-y-auto"
      >
        {/* Drag handle line */}
        <div className="w-16 h-1.5 bg-ink-muted/20 rounded-full mx-auto mb-8 opacity-50 cursor-grab active:cursor-grabbing" />
        
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-app">
          <h4 className="font-serif italic text-2xl text-accent">Günlük Çalışma Logu</h4>
          <div className="flex items-center gap-3">
            <button onClick={handleVoiceLog} className="flex items-center gap-2 px-4 py-2 bg-surface-2 text-accent rounded-xl hover:bg-accent/10 transition-all text-[10px] font-black tracking-widest uppercase border border-app shadow-sm">
              <Mic size={14} /> Sesli Log
            </button>
            <button onClick={handleOcrLog} className="hidden md:flex items-center gap-2 px-4 py-2 bg-surface-2 text-ink-muted rounded-xl hover:bg-ink/5 transition-all text-[10px] font-black tracking-widest uppercase border border-app shadow-sm">
              <Camera size={14} /> OCR
            </button>
            <button onClick={onCancel} className="p-2 ml-2 text-ink-muted hover:text-accent transition-all bg-surface-2 rounded-full border border-app">
              <X size={20}/>
            </button>
          </div>
        </div>

      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="text-[10px] uppercase font-black tracking-[0.3em] text-accent md:w-32">Sınav Tipi</label>
          <div className="flex flex-1 gap-3">
            <button 
              onClick={() => { setExamType('TYT'); setSubject(''); setTopic(''); }}
              className={`flex-1 py-4 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-sm ${examType === 'TYT' ? 'bg-accent text-white shadow-accent/20' : 'bg-surface-2 text-ink-muted border border-app hover:bg-ink/5'}`}
            >
              TYT
            </button>
            <button 
              onClick={() => { setExamType('AYT'); setSubject(''); setTopic(''); }}
              className={`flex-1 py-4 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-sm ${examType === 'AYT' ? 'bg-accent text-white shadow-accent/20' : 'bg-surface-2 text-ink-muted border border-app hover:bg-ink/5'}`}
            >
              AYT
            </button>
          </div>
        </div>

        {/* Ders ve Konu */}
        <div className="flex flex-col md:flex-row gap-4">
          <label className="text-[10px] uppercase font-black tracking-[0.3em] text-accent md:w-32 pt-4">Ders / Konu</label>
          <div className="flex flex-1 gap-3">
            <select 
              value={subject} 
              onChange={e => { setSubject(e.target.value); setTopic(''); }}
              className="flex-1 bg-surface-2 border border-app text-ink p-4 rounded-xl text-sm focus:outline-none focus:border-accent transition-all shadow-sm"
            >
              <option value="" disabled>Ders Seç...</option>
              {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={topic} 
              onChange={e => setTopic(e.target.value)}
              disabled={!subject}
              className="flex-1 bg-surface-2 border border-app text-ink p-4 rounded-xl text-sm focus:outline-none focus:border-accent transition-all disabled:opacity-30 shadow-sm"
            >
              <option value="" disabled>Konu Seç...</option>
              {availableTopics.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Dağılım */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="md:w-32">
            <label className="text-[10px] uppercase font-black tracking-[0.3em] text-accent block">D / Y / B</label>
            <span className="text-[9px] uppercase tracking-widest text-ink-muted/50 font-black">Top: {(Number(correct) || 0) + (Number(wrong) || 0) + (Number(empty) || 0)}</span>
          </div>
          <div className="flex flex-1 gap-3">
             <div className="flex-1 relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-xs font-mono">D</span>
               <input type="number" min="0" value={correct} onChange={e => setCorrect(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-surface-2 border border-app text-ink p-4 pl-10 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all font-mono font-bold shadow-sm" />
             </div>
             <div className="flex-1 relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 font-black text-xs font-mono">Y</span>
               <input type="number" min="0" value={wrong} onChange={e => setWrong(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-surface-2 border border-app text-ink p-4 pl-10 rounded-xl text-sm focus:outline-none focus:border-rose-500 transition-all font-mono font-bold shadow-sm" />
             </div>
             <div className="flex-1 relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted/40 font-black text-xs font-mono">B</span>
               <input type="number" min="0" value={empty} onChange={e => setEmpty(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-surface-2 border border-app text-ink p-4 pl-10 rounded-xl text-sm focus:outline-none focus:border-ink-muted/40 transition-all font-mono font-bold shadow-sm" />
             </div>
          </div>
        </div>

        {/* Süre */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="text-[10px] uppercase font-black tracking-[0.3em] text-accent md:w-32">Süre (dk)</label>
          <input 
            type="number" 
            placeholder="Kaç dakika çalıştın?" 
            value={time} 
            onChange={e => setTime(e.target.value === '' ? '' : parseInt(e.target.value))} 
            className="flex-1 bg-surface-2 border border-app text-ink p-4 rounded-xl text-sm focus:outline-none focus:border-accent transition-all font-mono font-bold shadow-sm" 
          />
        </div>

        {/* Optional Details Accordion */}
        <div className="border border-app rounded-2xl overflow-hidden bg-surface-2 shadow-sm">
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-[10px] uppercase font-black tracking-[0.2em] text-ink-muted hover:text-ink hover:bg-ink/5 transition-all"
          >
            <span className="flex items-center gap-3"><Plus size={14} className={`transition-transform duration-300 ${showDetails ? 'rotate-45' : ''}`} /> Detaylar (Kaynak, Yorgunluk, Etiket)</span>
            <span className={`transition-transform text-lg leading-none ${showDetails ? 'rotate-180' : ''}`}>▾</span>
          </button>

          <AnimatePresence initial={false}>
            {showDetails && (
              <motion.div
                key="details"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-6 space-y-5 border-t border-app bg-surface/50">
                  {/* Kaynak */}
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <label className="text-[10px] uppercase font-black tracking-widest text-ink-muted md:w-32">Kaynak</label>
                    <div className="relative flex-1">
                      <BookOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted/50" />
                      <input
                        type="text"
                        placeholder="Kitap / Kanal / Hoca adı"
                        value={sourceName}
                        onChange={e => setSourceName(e.target.value)}
                        className="w-full bg-surface-2 border border-app text-ink p-4 pl-12 rounded-xl text-sm focus:outline-none focus:border-accent transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Yorgunluk */}
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <label className="text-[10px] uppercase font-black tracking-widest text-ink-muted md:w-32">Yorgunluk</label>
                    <div className="flex flex-1 items-center gap-6">
                      <input 
                        type="range" 
                        min="1" max="10" 
                        value={fatigue} 
                        onChange={e => setFatigue(parseInt(e.target.value))}
                        className="w-full accent-accent h-1.5 rounded-full bg-app-subtle cursor-pointer transition-all" 
                      />
                      <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs border-2 shrink-0 shadow-sm transition-all ${fatigue > 7 ? 'text-rose-500 border-rose-500/30 bg-rose-500/5 shadow-rose-500/10' : 'text-accent border-accent/30 bg-accent/5 shadow-accent/10'}`}>
                        {fatigue}
                      </span>
                    </div>
                  </div>

                  {/* Etiketler */}
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <label className="text-[10px] uppercase font-black tracking-widest text-ink-muted md:w-32">Etiketler</label>
                    <input 
                      type="text" 
                      placeholder="#HESAP, #DİKKAT, #SÜRE" 
                      value={tags} 
                      onChange={e => setTags(e.target.value)} 
                      className="flex-1 bg-surface-2 border border-app text-ink p-4 rounded-xl text-sm focus:outline-none focus:border-accent transition-all font-mono font-black placeholder:font-sans placeholder:font-medium shadow-sm" 
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={handleManualSubmit}
          className="w-full mt-6 py-5 bg-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 border border-white/10 active:scale-[0.98]"
        >
          LOG KAYDET VE ANALİZ ET
        </button>
      </div>
      </motion.div>
    </div>
  );
}
