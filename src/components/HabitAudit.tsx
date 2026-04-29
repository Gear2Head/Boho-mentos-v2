import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Activity, AlertCircle, CheckCircle2, TrendingUp, Clock, Calendar, Brain, Zap } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { detectHabitAlerts } from '../utils/statistics';

export function HabitAudit() {
  const logs = useAppStore(s => s.logs);
  const profile = useAppStore(s => s.profile);

  const audits = useMemo(() => {
    if (logs.length < 5) return null;
    return detectHabitAlerts(logs);
  }, [logs]);

  if (!audits) {
    return (
      <div className="p-8 text-center bg-surface border border-dashed border-app rounded-[32px]">
        <Activity size={40} className="mx-auto text-zinc-600 mb-4" />
        <h3 className="font-display italic text-xl text-zinc-400">ANALİZ İÇİN VERİ BEKLENİYOR</h3>
        <p className="text-xs text-zinc-500 mt-2 max-w-xs mx-auto">Alışkanlıklarını analiz edebilmemiz için en az 5 günlük çalışma kaydın olmalı.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-app rounded-[40px] p-8 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Brain size={120} />
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-[#C17767]/10 rounded-2xl border border-[#C17767]/20">
          <Activity size={24} className="text-[#C17767]" />
        </div>
        <div>
          <h2 className="font-display italic text-2xl text-zinc-100">ALIŞKANLIK ANALİZİ (HABIT AUDIT)</h2>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-black mt-1">Davranış Bilimi Destekli Performans Raporu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {audits.map((audit, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-6 rounded-[28px] border ${
              audit.type === 'danger' ? 'bg-red-500/5 border-red-500/20' :
              audit.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
              'bg-emerald-500/5 border-emerald-500/20'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`mt-1 ${
                audit.type === 'danger' ? 'text-red-500' :
                audit.type === 'warning' ? 'text-amber-500' :
                'text-emerald-500'
              }`}>
                {audit.type === 'danger' ? <AlertCircle size={20} /> : audit.type === 'warning' ? <Zap size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div>
                <h4 className="font-bold text-zinc-100 mb-1">{audit.title}</h4>
                <p className="text-sm text-zinc-500 leading-relaxed">{audit.description}</p>
                
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-white/5 rounded-lg text-zinc-400">ETKİ: {audit.impact}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-app flex items-center justify-between">
         <div className="flex items-center gap-3">
            <Clock size={16} className="text-zinc-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Son Güncelleme: Bugün</span>
         </div>
         <button className="text-[10px] font-black uppercase tracking-widest text-[#C17767] hover:underline">DETAYLI RAPOR İNDİR</button>
      </div>
    </div>
  );
}
