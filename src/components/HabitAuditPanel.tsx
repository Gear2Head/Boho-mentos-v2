/**
 * AMAÇ: Öğrenci çalışma alışkanlıklarını analiz edip risk uyarısı vermek ve rapor indirmek
 * MANTIK: statistics.ts içindeki detectHabitAlerts fonksiyonunu kullanır
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, BookOpen, Zap, Download, FileText } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { detectHabitAlerts } from '../utils/statistics';
import { motion } from 'motion/react';

function generateReportText(
  alerts: ReturnType<typeof detectHabitAlerts>,
  totalFocusHours: number,
  totalQuestions: number,
  generatedAt: string
): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════',
    '  BOHO MENTOS — ALİŞKANLIK DENETİM RAPORU',
    '═══════════════════════════════════════════════',
    `  Oluşturulma: ${generatedAt}`,
    '',
    `  ÖZET`,
    `  ─────────────────────────────────────────────`,
    `  Toplam Odak Süresi : ${totalFocusHours} saat`,
    `  Toplam Soru Hacmi  : ${totalQuestions.toLocaleString('tr-TR')} soru`,
    `  Tespit Edilen Uyarı: ${alerts.length}`,
    '',
  ];

  if (alerts.length === 0) {
    lines.push('  ✔ RADAR TEMİZ — Çalışma disiplinin şu an stabil.');
  } else {
    lines.push('  UYARILAR');
    lines.push('  ─────────────────────────────────────────────');
    alerts.forEach((a, i) => {
      const severity = a.type === 'danger' ? '🔴 KRİTİK' : a.type === 'warning' ? '🟡 UYARI' : '🟢 BİLGİ';
      lines.push(`  ${i + 1}. [${severity}] ${a.title}`);
      lines.push(`     ${a.description}`);
      lines.push(`     ETKİ: ${a.impact}`);
      lines.push('');
    });
  }

  lines.push('═══════════════════════════════════════════════');
  lines.push('  Bu rapor Boho Mentos AI Koç sistemi tarafından');
  lines.push('  otomatik olarak oluşturulmuştur.');
  lines.push('═══════════════════════════════════════════════');

  return lines.join('\n');
}

export function HabitAuditPanel() {
  const logs = useAppStore(s => s.logs);
  const alerts = detectHabitAlerts(logs);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const totalFocusHours = Math.round(logs.reduce((acc, l) => acc + (l.avgTime || 0), 0) / 60);
  const totalQuestions = logs.reduce((acc, l) => acc + (l.questions || 0), 0);

  const handleDownload = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 600)); // UX pause

    const now = new Date();
    const generatedAt = now.toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' });
    const fileName = `habit-audit-${now.toISOString().slice(0, 10)}.txt`;

    const reportText = generateReportText(alerts, totalFocusHours, totalQuestions, generatedAt);

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setLastGenerated(generatedAt);
    setIsGenerating(false);
  };

  return (
    <div className="bg-[#121212] border border-[#2A2A2A] rounded-3xl p-6 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#C17767]/5 to-transparent rounded-bl-full pointer-events-none" />

      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#C17767]/10 rounded-xl text-[#C17767]">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="font-serif italic text-xl text-zinc-200">Alışkanlık Analizi (Habit Audit)</h3>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Kübra Derin Analiz Modu</p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-[#C17767]/10 text-[#C17767] border border-[#C17767]/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#C17767]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          aria-label="Habit Audit Raporu İndir"
        >
          {isGenerating ? (
            <>
              <FileText size={14} className="animate-pulse" />
              Hazırlanıyor...
            </>
          ) : (
            <>
              <Download size={14} />
              Rapor İndir
            </>
          )}
        </button>
      </div>

      {lastGenerated && (
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-4 italic">
          Son rapor: {lastGenerated}
        </p>
      )}

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
          {alerts.map((alert, idx) => (
            <motion.div
              key={idx}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className={`p-5 rounded-2xl border flex gap-4 ${alert.type === 'danger'
                  ? 'bg-red-500/5 border-red-500/20 text-red-400'
                  : alert.type === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                }`}
            >
              <div className={`p-2 rounded-xl shrink-0 h-fit ${alert.type === 'danger' ? 'bg-red-500/20' : alert.type === 'warning' ? 'bg-yellow-500/20' : 'bg-emerald-500/20'
                }`}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wide mb-1">
                  {alert.title}
                </h4>
                <p className="text-xs leading-relaxed text-zinc-300 italic">{alert.description}</p>
                <div className="mt-2 text-[8px] font-black tracking-widest opacity-40">ETKİ: {alert.impact}</div>
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
            {totalFocusHours} <span className="text-xs non-italic opacity-40 uppercase">Saat</span>
          </div>
        </div>
        <div className="p-4 bg-[#1A1A1A] rounded-2xl border border-zinc-800/50 group hover:border-[#C17767]/30 transition-colors">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">
            <BookOpen size={12} /> Soru Hacmi
          </div>
          <div className="text-lg font-serif italic text-zinc-200">
            {totalQuestions.toLocaleString('tr-TR')} <span className="text-xs non-italic opacity-40 uppercase">Soru</span>
          </div>
        </div>
      </div>
    </div>
  );
}
