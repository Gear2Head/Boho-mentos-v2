/**
 * AMAÇ: Kaynak verimliliğini (ROI) analiz edip görselleştirmek
 * MANTIK: statistics.ts -> calcSourceROI fonksiyonunu kullanır
 */

import React from 'react';
import { Target, TrendingUp, BarChart3, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { calcSourceROI } from '../utils/statistics';

export function SourceROIPanel() {
  const store = useAppStore();
  const roiData = calcSourceROI(store.logs);

  return (
    <div className="bg-[#121212] border border-[#2A2A2A] rounded-3xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#E09F3E]/5 to-transparent rounded-bl-full pointer-events-none" />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#E09F3E]/10 rounded-xl text-[#E09F3E]">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="font-serif italic text-xl text-zinc-200">Kaynak Verimliliği (ROI)</h3>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Gerçektİnvestment / Net Kazancı</p>
          </div>
        </div>
      </div>

      {roiData.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-3xl">
          <BarChart3 size={48} className="mx-auto mb-4 text-zinc-700 stroke-1" />
          <p className="text-sm text-zinc-500 italic tracking-wide">Analiz yapılacak yeterli log verisi bulunamadı.</p>
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mt-2">Çalışmalarını LOG komutuyla kaydet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {roiData.map((source, index) => (
            <div
              key={source.sourceName}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 hover:border-[#E09F3E]/40 transition-all group"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[#E09F3E] mb-1">
                    <span className="w-5 h-5 bg-[#E09F3E]/10 rounded-full flex items-center justify-center">#{index + 1}</span>
                    {source.totalQuestions} SORU ÇÖZÜLDÜ
                  </div>
                  <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-tight">{source.sourceName}</h4>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">ROI SKORU</div>
                  <div className="text-xl font-serif italic font-bold text-[#E09F3E]">{source.roiScore}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-zinc-800/50">
                <div>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-widest text-zinc-500 mb-1">
                    <CheckCircle2 size={10} className="text-green-500" /> Doğruluk
                  </div>
                  <div className="text-sm font-mono text-zinc-300">%{source.avgAccuracy}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-widest text-zinc-500 mb-1">
                    <Clock size={10} className="text-blue-500" /> Hız (Soru/Sn)
                  </div>
                  <div className="text-sm font-mono text-zinc-300">{source.avgSecondsPerQ}s</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-widest text-zinc-500 mb-1">
                    <AlertCircle size={10} className="text-yellow-500" /> Durum
                  </div>
                  <div className={`text-xs font-bold ${source.roiScore >= 70 ? 'text-green-400' : source.roiScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {source.roiScore >= 70 ? 'Mükemmel' : source.roiScore >= 40 ? 'Stabil' : 'Riskli'}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-8 p-4 bg-[#E09F3E]/5 border border-[#E09F3E]/20 rounded-2xl">
            <p className="text-[10px] text-[#E09F3E] uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
              <Target size={12} /> Kübra Stratejİ Tavsİyesİ
            </p>
            <p className="text-xs italic text-zinc-400 leading-relaxed">
              ROI skoru <strong className="text-red-400">40'ın altında</strong> olan kaynaklar ya senin için çok zor ya da çözüm süreleri çok uzun.
              Bu kaynakları bir süreliğine rafa kaldırıp %70+ doğruluk yakaladığın kaynaklara odaklanarak "Net Ivmesi" oluşturmalısın.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
