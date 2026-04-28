import React from 'react';
import { AlertTriangle, Crosshair } from 'lucide-react';
import { DailyLog } from '../../types';
import { motion } from 'motion/react';

interface Props {
  logs: DailyLog[];
}

export function WeakLinkWidget({ logs }: Props) {
  // Zayıf Halka Algoritması
  // En az 50 soru çözülmüş ve başarı oranı en düşük olan dersi bulur.
  
  const getWeakLink = () => {
    if (!logs || logs.length === 0) return null;

    const subjectStats = new Map<string, { q: number; c: number }>();

    logs.forEach(log => {
      const existing = subjectStats.get(log.subject) || { q: 0, c: 0 };
      subjectStats.set(log.subject, {
        q: existing.q + log.questions,
        c: existing.c + log.correct
      });
    });

    let weakestSubject = null;
    let lowestRate = 1.0;

    subjectStats.forEach((stats, subject) => {
      // Anlamlı bir veri olması için en az 50 soru çözülmüş olmalı
      if (stats.q < 50) return;
      
      const rate = stats.c / stats.q;
      if (rate < lowestRate) {
        lowestRate = rate;
        weakestSubject = { subject, stats, rate };
      }
    });

    if (lowestRate > 0.75) return null; // All subjects are doing well
    return weakestSubject;
  };

  const weakLink = getWeakLink();

  if (!weakLink) {
    return (
      <div className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-3">
        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
           <Crosshair size={24} />
        </div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black text-center">
          RADAR TEMİZ
        </p>
        <p className="text-[9px] text-zinc-400 italic text-center">
          Tüm cephelerde %75+ başarı yakaladın. Zayıf halka bulunamadı.
        </p>
      </div>
    );
  }

  const ratePercent = Math.round(weakLink.rate * 100);
  const isCritical = ratePercent < 50;

  return (
    <div className={`glass-card p-6 rounded-3xl relative overflow-hidden group ${isCritical ? 'border-red-900/30' : 'border-[#C17767]/30'}`}>
      <div className={`absolute -right-8 -bottom-8 w-32 h-32 blur-3xl rounded-full transition-colors ${isCritical ? 'bg-red-500/10 group-hover:bg-red-500/20' : 'bg-[#C17767]/10 group-hover:bg-[#C17767]/20'}`} />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl transition-transform group-hover:scale-110 ${isCritical ? 'bg-red-500/10 text-red-500' : 'bg-[#C17767]/10 text-[#C17767]'}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <span className={`text-[10px] uppercase tracking-widest font-black ${isCritical ? 'text-red-500' : 'text-[#C17767]'}`}>
              Zayıf Halka
            </span>
            <p className="text-[9px] text-zinc-500 tracking-wider">NET KAYBI MERKEZİ</p>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <h4 className="text-lg font-display italic font-bold text-zinc-100 mb-1">{weakLink.subject}</h4>
        
        <div className="flex justify-between items-end mt-4 mb-2">
          <div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Başarı Oranı</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold font-mono ${isCritical ? 'text-red-500' : 'text-[#C17767]'}`}>%{ratePercent}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Analiz Edilen Soru</p>
            <span className="text-sm font-bold text-zinc-300">{weakLink.stats.q}</span>
          </div>
        </div>

        <div className="h-1.5 w-full bg-[#121212] rounded-full overflow-hidden mt-3">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${ratePercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${isCritical ? 'bg-red-500' : 'bg-[#C17767]'}`} 
          />
        </div>
        
        <div className="mt-4 flex items-start gap-2 bg-[#121212] p-3 rounded-xl border border-white/5">
          <Crosshair size={14} className="text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-400 leading-relaxed italic">
            Bu dersteki hata oranın çok yüksek. AI Koç, yeni programda bu konuya ağırlık verecek.
          </p>
        </div>
      </div>
    </div>
  );
}
