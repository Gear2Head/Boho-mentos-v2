/**
 * AMAÇ: Öğrenci çalışma alışkanlıklarını analiz edip risk uyarısı vermek
 * MANTIK: statistics.ts içindeki detectHabitAlerts fonksiyonunu kullanır
 */

import React from 'react';
import { AlertTriangle, CheckCircle2, TrendingDown, Clock, BookOpen, Zap } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { detectHabitAlerts } from '../utils/statistics';
import { motion } from 'motion/react';

export function HabitAuditPanel() {
  const logs = useAppStore(s => s.logs);
  const alerts = detectHabitAlerts(logs);

  return (
    <div className="bg-[#121212] border border-[#2A2A2A] rounded-3xl p-6 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#C17767]/5 to-transparent rounded-bl-full pointer-events-none" />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#C17767]/10 rounded-xl text-[#C17767]">
          <Zap size={20} />
        </div>
        <div>
          <h3 className="font-serif italic text-xl text-zinc-200">Alışkanlık Analizi (Habit Audit)</h3>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Kübra Derin Analiz Modu</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center gap-4 p-5 bg-green-500/5 border border-green-500/20 rounded-2xl">
          <div className="p-2 bg-green-500/20 rounded-full text-green-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-green-400 uppercase tracking-wide">Radar Temiz</h4>
            <p className="text-xs text-zinc-400 italic">Çalışma disiplinin şu an stabil. Denge korunuyor.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className={`p-5 rounded-2xl border flex gap-4 ${alert.severity === 'high'
                  ? 'bg-red-500/5 border-red-500/20 text-red-400'
                  : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400'
                }`}
            >
              <div className={`p-2 rounded-xl shrink-0 h-fit ${alert.severity === 'high' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                }`}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wide mb-1">
                  {alert.severity === 'high' ? 'Kritik Müdahale' : 'Dikkat Kayması'}
                </h4>
                <p className="text-xs leading-relaxed text-zinc-300 italic">{alert.message}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Ek Analitik Widget'lar */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-zinc-800/50">
        <div className="p-4 bg-[#1A1A1A] rounded-2xl border border-zinc-800/50 group hover:border-[#C17767]/30 transition-colors">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">
            <Clock size={12} /> Odak Süresi
          </div>
          <div className="text-lg font-serif italic text-zinc-200">
            {Math.round(logs.reduce((acc, l) => acc + (l.avgTime || 0), 0) / 60)} <span className="text-xs non-italic opacity-40 uppercase">Saat</span>
          </div>
        </div>
        <div className="p-4 bg-[#1A1A1A] rounded-2xl border border-zinc-800/50 group hover:border-[#C17767]/30 transition-colors">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">
            <BookOpen size={12} /> Soru Hacmi
          </div>
          <div className="text-lg font-serif italic text-zinc-200">
            {logs.reduce((acc, l) => acc + (l.questions || 0), 0).toLocaleString()} <span className="text-xs non-italic opacity-40 uppercase">Soru</span>
          </div>
        </div>
      </div>
    </div>
  );
}
