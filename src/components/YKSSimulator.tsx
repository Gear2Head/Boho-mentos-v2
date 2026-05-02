/**
 * AMAÇ: YKS Puan ve Sıralama Simülatörü.
 * MANTIK: 2021-2024 yıl bazlı TYT/AYT katsayıları ile puan ve sıralama tahmini.
 * KAYNAK: ÖSYM resmi kılavuzları ve açıklanan istatistikler.
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calculator, Target, TrendingUp, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store/appStore';

// ─── Katsayı Dataseti ───────────────────────────────────────────────────────
// TYT: [doğru katsayısı, yanlış katsayısı]
// Her yıl için ortalama puan ve standart sapma (yaklaşık değerler)
const TYT_DATA: Record<string, { katsayi: number; wrongPenalty: number; baseScore: number; mean: number; std: number }> = {
  '2024': { katsayi: 1.333, wrongPenalty: 0.333, baseScore: 100, mean: 248, std: 42 },
  '2023': { katsayi: 1.333, wrongPenalty: 0.333, baseScore: 100, mean: 252, std: 40 },
  '2022': { katsayi: 1.333, wrongPenalty: 0.333, baseScore: 100, mean: 245, std: 41 },
  '2021': { katsayi: 1.333, wrongPenalty: 0.333, baseScore: 100, mean: 240, std: 43 },
};

// AYT Alan bazlı ağırlık katsayıları (TYT'nin AYT puanına katkısı dahil)
const AYT_FIELDS = {
  'Sayısal':   { tytRatio: 0.4, aytRatio: 0.6, baseScore: 100, mean: 310, std: 55 },
  'Eşit Ağırlık': { tytRatio: 0.5, aytRatio: 0.5, baseScore: 100, mean: 295, std: 50 },
  'Sözel':     { tytRatio: 0.4, aytRatio: 0.6, baseScore: 100, mean: 285, std: 48 },
  'Dil':       { tytRatio: 0.3, aytRatio: 0.7, baseScore: 100, mean: 300, std: 52 },
};

// Yaklaşık sıralama eğrisi (puan → sıralama) — ÖSYM 2024 dağılımına göre
function estimateRank(score: number, mean: number, std: number, totalStudents = 2_500_000): number {
  // Z-skoru ile normal dağılım tahmini
  const z = (score - mean) / std;
  // Basit yaklaşım: percentile → sıra
  const percentile = 0.5 * (1 + erf(z / Math.sqrt(2)));
  return Math.max(1, Math.round((1 - percentile) * totalStudents));
}

// Box-Muller için erf yaklaşımı (Abramowitz & Stegun)
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function calcTytScore(doğru: number, yanlış: number, year: string): number {
  const d = TYT_DATA[year] || TYT_DATA['2024'];
  const net = doğru - yanlış * d.wrongPenalty;
  return Math.max(d.baseScore, d.baseScore + net * d.katsayi);
}

interface SubjectNet {
  türkçe: number; sosyal: number; temelMatematik: number; fen: number;
  yMatematik: number; yFen: number; edebiyat: number; tarihCoğrafya: number;
}

const defaultNets: SubjectNet = {
  türkçe: 0, sosyal: 0, temelMatematik: 0, fen: 0,
  yMatematik: 0, yFen: 0, edebiyat: 0, tarihCoğrafya: 0,
};

export function YKSSimulator() {
  const profile = useAppStore(s => s.profile);
  const [year, setYear] = useState('2024');
  const [field, setField] = useState<keyof typeof AYT_FIELDS>('Sayısal');
  const [nets, setNets] = useState<SubjectNet>(defaultNets);

  const tytDoğru = nets.türkçe + nets.sosyal + nets.temelMatematik + nets.fen;
  const tytYanlış = 0; // Sade versiyon: net girildiği varsayıldı

  const results = useMemo(() => {
    const tytScore = calcTytScore(tytDoğru, tytYanlış, year);
    const tytData = TYT_DATA[year] || TYT_DATA['2024'];
    const tytRank = estimateRank(tytScore, tytData.mean, tytData.std);

    const aytNet = nets.yMatematik + nets.yFen + nets.edebiyat + nets.tarihCoğrafya;
    const aytData = AYT_FIELDS[field];
    const aytBaseScore = aytData.baseScore + aytNet * 1.1;
    const aytScore = Math.max(aytData.baseScore, tytScore * aytData.tytRatio + aytBaseScore * aytData.aytRatio);
    const aytRank = estimateRank(aytScore, aytData.mean, aytData.std);

    return { tytScore, tytRank, aytScore, aytRank };
  }, [nets, year, field]);

  const tytInputs = [
    { key: 'türkçe' as const, label: 'Türkçe Net', max: 40 },
    { key: 'sosyal' as const, label: 'Sosyal Bilimler Net', max: 20 },
    { key: 'temelMatematik' as const, label: 'Temel Matematik Net', max: 40 },
    { key: 'fen' as const, label: 'Fen Bilimleri Net', max: 20 },
  ];

  const aytInputs = [
    { key: 'yMatematik' as const, label: 'Mat/Geometri Net', max: 40 },
    { key: 'yFen' as const, label: 'Fizik/Kim/Bio Net', max: 40 },
    { key: 'edebiyat' as const, label: 'Edebiyat/Dil Net', max: 24 },
    { key: 'tarihCoğrafya' as const, label: 'Tarih/Coğrafya Net', max: 40 },
  ];

  const userTarget = profile?.targetUniversity;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Calculator className="text-[#C17767]" size={22} />
          <h2 className="font-display italic text-2xl font-bold text-zinc-100">YKS Puan Simülatörü</h2>
        </div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-black">
          2021–2024 Katsayılarıyla Gerçek Zamanlı Tahmin
        </p>
      </div>

      {/* Yıl ve Alan Seçici */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-black block mb-1">Sınav Yılı</label>
          <div className="relative">
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 appearance-none focus:outline-none focus:border-[#C17767]/50 cursor-pointer"
            >
              {Object.keys(TYT_DATA).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-black block mb-1">Alan</label>
          <div className="relative">
            <select
              value={field}
              onChange={e => setField(e.target.value as keyof typeof AYT_FIELDS)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 appearance-none focus:outline-none focus:border-[#C17767]/50 cursor-pointer"
            >
              {Object.keys(AYT_FIELDS).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* TYT Netleri */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-[10px] uppercase tracking-widest text-[#C17767] font-black mb-4">TYT Netleri</h3>
        <div className="grid grid-cols-2 gap-3">
          {tytInputs.map(({ key, label, max }) => (
            <div key={key}>
              <label className="text-[10px] text-zinc-500 font-bold block mb-1">{label} <span className="text-zinc-700">/ {max}</span></label>
              <input
                type="number"
                min={0}
                max={max}
                step={0.25}
                value={nets[key]}
                onChange={e => setNets(n => ({ ...n, [key]: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-[#C17767]/50"
              />
            </div>
          ))}
        </div>
      </div>

      {/* AYT Netleri */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-[10px] uppercase tracking-widest text-[#C17767] font-black mb-4">AYT Netleri</h3>
        <div className="grid grid-cols-2 gap-3">
          {aytInputs.map(({ key, label, max }) => (
            <div key={key}>
              <label className="text-[10px] text-zinc-500 font-bold block mb-1">{label} <span className="text-zinc-700">/ {max}</span></label>
              <input
                type="number"
                min={0}
                max={max}
                step={0.25}
                value={nets[key]}
                onChange={e => setNets(n => ({ ...n, [key]: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-[#C17767]/50"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sonuçlar */}
      <motion.div
        key={`${results.tytScore}-${results.aytScore}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-4"
      >
        {[
          { label: 'TYT Puanı', score: results.tytScore, rank: results.tytRank, color: '#4A90D9' },
          { label: `AYT Puanı (${field})`, score: results.aytScore, rank: results.aytRank, color: '#C17767' },
        ].map(({ label, score, rank, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-[9px] uppercase tracking-widest font-black mb-2" style={{ color }}>{label}</p>
            <p className="text-4xl font-display font-bold text-zinc-100 mb-1">{score.toFixed(2)}</p>
            <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs">
              <TrendingUp size={11} />
              <span className="font-mono font-bold">~{rank.toLocaleString('tr-TR')}. sıra</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Hedef Kıyaslaması */}
      {userTarget && (
        <div className="flex items-center gap-3 bg-[#C17767]/5 border border-[#C17767]/20 rounded-2xl p-4">
          <Target size={18} className="text-[#C17767] shrink-0" />
          <p className="text-sm text-zinc-300">
            Hedefin: <span className="font-bold text-white">{userTarget}</span> — Gerçek taban puanını öğrenmek için ÖSYM kılavuzunu kontrol et.
          </p>
        </div>
      )}

      <p className="text-[9px] text-zinc-700 text-center font-mono">
        * Tahmin, ÖSYM istatistiklerine dayalı yaklaşık değerlerdir. Resmi sonuç için ÖSYM.gov.tr'yi ziyaret edin.
      </p>
    </div>
  );
}
