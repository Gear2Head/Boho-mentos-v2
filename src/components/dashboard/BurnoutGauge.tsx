import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../../store/appStore';
import { AlertCircle, Zap } from 'lucide-react';

/**
 * BurnoutGauge: Öğrencinin tükenmişlik riskini veriye dayalı analiz eder.
 * MANTIK: Uzun seri + Düşen Başarı + Yüksek Soru Sayısı = Burnout Risk
 */
export function BurnoutGauge() {
  const logs = useAppStore((s) => s.logs);
  const streakDays = useAppStore((s) => s.streakDays);

  const riskData = useMemo(() => {
    if (logs.length < 5) return { score: 10, label: 'GÜVENLİ', color: '#10b981', desc: 'Veri toplanıyor.' };

    const last7Logs = logs.slice(-7);
    const avgQuestions = last7Logs.reduce((acc, l) => acc + (l.questions || 0), 0) / 7;
    
    // Başarı oranı trendi
    const accs = last7Logs.map(l => l.questions > 0 ? (l.correct / l.questions) : 1);
    const recentAcc = (accs[4] + accs[5] + accs[6]) / 3;
    const prevAcc = (accs[0] + accs[1] + accs[2]) / 3;
    const isFalling = recentAcc < prevAcc - 0.1;

    let score = 20;

    // Skor hesaplama logic
    if (streakDays > 10) score += 15;
    if (streakDays > 20) score += 20;
    if (avgQuestions > 150) score += 15;
    if (isFalling) score += 30; // En büyük burnout göstergesi

    score = Math.min(100, score);

    let label = 'DÜŞÜK';
    let color = '#10b981';
    let desc = 'Savaş kondisyonun harika, aynen devam.';

    if (score > 80) {
      label = 'KRİTİK';
      color = '#ef4444';
      desc = 'Acil mola! Hataların artıyor ve tükeniyorsun.';
    } else if (score > 50) {
      label = 'ORTA';
      color = '#f59e0b';
      desc = 'Hafif yorgunluk seziyorum, tempoyu stabilize et.';
    } else if (score > 30) {
      label = 'GÜVENLİ';
      color = '#3b82f6';
      desc = 'Stabil ilerliyorsun, risk yok.';
    }

    return { score, label, color, desc };
  }, [logs, streakDays]);

  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (riskData.score / 100) * circumference;

  return (
    <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
      <div className="flex items-center gap-2 mb-6">
        <Zap size={16} className="text-[#C17767]" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">BURNOUT ANALİZİ</span>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Background circle */}
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="64" cy="64" r="40"
              fill="none" stroke="currentColor"
              strokeWidth="8"
              className="text-zinc-800"
            />
            {/* Progress circle */}
            <motion.circle
              cx="64" cy="64" r="40"
              fill="none" stroke={riskData.color}
              strokeWidth="8"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-display font-bold text-zinc-100 italic">%{riskData.score}</span>
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: riskData.color }}>{riskData.label}</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[11px] text-zinc-400 font-medium leading-relaxed max-w-[180px]">
            {riskData.desc}
          </p>
        </div>
      </div>

      {riskData.score > 70 && (
        <div className="mt-4 p-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 animate-pulse">
           <AlertCircle size={14} className="text-red-500" />
           <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">KÜBRA: Mola Vermelisin!</span>
        </div>
      )}
    </div>
  );
}
