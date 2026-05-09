import React from 'react';
import { Brain, Flame } from 'lucide-react';
import { DailyLog } from '../../types';
import { parseFlexibleDate } from '../../utils/date';
import { motion } from 'motion/react';

interface Props {
  logs: DailyLog[];
}

interface DecayItem {
  topic: string;
  daysAgo: number;
  risk: 'critical' | 'high' | 'moderate';
  color: string;
}

export function MemoryDecayWidget({ logs }: Props) {
  // Hafıza Kaybı Algoritması (Ebbinghaus Forgetting Curve)
  // Son çalışılma üzerinden geçen zamana ve başarı oranına göre risk hesaplar.
  
  const getDecayRisks = (): DecayItem[] => {
    if (!logs || logs.length === 0) return [];
    
    const now = new Date().getTime();
    const topicMap = new Map<string, { lastDate: Date, totalQuestions: number, totalCorrect: number }>();
    
    // Konulara göre grupla ve en son çalışılma tarihini bul
    logs.forEach(log => {
      const logDate = parseFlexibleDate(log.date);
      if (!logDate) return;
      
      const existing = topicMap.get(log.topic);
      if (!existing || logDate > existing.lastDate) {
        topicMap.set(log.topic, {
          lastDate: logDate,
          totalQuestions: (existing?.totalQuestions || 0) + log.questions,
          totalCorrect: (existing?.totalCorrect || 0) + log.correct
        });
      } else if (existing) {
        existing.totalQuestions += log.questions;
        existing.totalCorrect += log.correct;
      }
    });

    const risks: DecayItem[] = [];

    topicMap.forEach((data, topic) => {
      const daysAgo = Math.floor((now - data.lastDate.getTime()) / (1000 * 60 * 60 * 24));
      const successRate = data.totalQuestions > 0 ? (data.totalCorrect / data.totalQuestions) : 0;
      
      // Sadece 3 günden eski konuları değerlendir
      if (daysAgo < 3) return;

      let risk: 'critical' | 'high' | 'moderate' | null = null;
      let color = '';

      if (daysAgo > 14 || (daysAgo > 7 && successRate < 0.6)) {
        risk = 'critical';
        color = 'text-red-500 bg-red-500/10 border-red-500/20';
      } else if (daysAgo > 7 || (daysAgo > 4 && successRate < 0.7)) {
        risk = 'high';
        color = 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      } else if (daysAgo > 4) {
        risk = 'moderate';
        color = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      }

      if (risk) {
        risks.push({ topic, daysAgo, risk, color });
      }
    });

    // En risklileri başa al (Critical > High > Moderate, sonra gün sayısına göre)
    const riskWeight = { critical: 3, high: 2, moderate: 1 };
    return risks.sort((a, b) => {
      if (riskWeight[a.risk] !== riskWeight[b.risk]) {
        return riskWeight[b.risk] - riskWeight[a.risk];
      }
      return b.daysAgo - a.daysAgo;
    }).slice(0, 4); // Sadece top 4 göster
  };

  const decayList = getDecayRisks();

  return (
    <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
      <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full group-hover:bg-purple-500/20 transition-colors" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
            <Brain size={18} />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest font-black text-purple-400">Hafıza Kaybı</span>
            <p className="text-[9px] text-zinc-500 tracking-wider">UNUTMA RİSKİ OLAN KONULAR</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 relative z-10">
        {decayList.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl bg-white/5">
            <p className="text-xs text-zinc-400 italic">Şu an riskli konu görünmüyor. Düzenli tekrara devam!</p>
          </div>
        ) : (
          decayList.map((item, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="flex items-center justify-between p-3 bg-[#121212] rounded-xl border border-[#2A2A2A] hover:border-white/10 transition-colors"
            >
              <div className="truncate pr-2">
                <span className="text-xs font-bold text-zinc-200 block truncate" title={item.topic}>{item.topic}</span>
                <span className="text-[9px] text-zinc-500 flex items-center gap-1 mt-0.5">
                  <Flame size={10} className={item.risk === 'critical' ? 'text-red-500' : 'text-orange-500'} /> 
                  {item.daysAgo} gün önce
                </span>
              </div>
              <div className={`px-2 py-1 rounded border shrink-0 ${item.color}`}>
                <span className="text-[9px] font-black uppercase tracking-widest">{item.risk}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
