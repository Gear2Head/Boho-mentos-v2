/**
 * TODO-015: Churn Prediction — platformu bırakma riski hesaplama
 */

import type { DailyLog } from '../types';

export interface ChurnSignal {
  riskScore: number;       // 0-100
  signals: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  daysToChurn: number | null;
}

export function predictChurn(
  logs: DailyLog[],
  streakDays: number
): ChurnSignal {
  const signals: string[] = [];
  let riskScore = 0;

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const lastLog = sorted[0];
  const daysSinceLastLog = lastLog
    ? Math.floor((Date.now() - new Date(lastLog.date).getTime()) / 86400000)
    : 999;

  // Signal 1: No log for 3+ days
  if (daysSinceLastLog >= 3) {
    riskScore += 30;
    signals.push(`Son ${daysSinceLastLog} gündür kayıt yok`);
  }

  // Signal 2: Streak broken
  if (streakDays === 0) {
    riskScore += 20;
    signals.push('Çalışma serisi kırıldı');
  }

  // Signal 3: Declining accuracy last 7 days
  const recent7 = sorted.slice(0, 7).filter((l) => l.questions > 0);
  if (recent7.length >= 3) {
    const first3Acc = recent7.slice(-3).reduce((s, l) => s + l.correct / l.questions, 0) / 3;
    const last3Acc = recent7.slice(0, 3).reduce((s, l) => s + l.correct / l.questions, 0) / 3;
    if (last3Acc < first3Acc - 0.1) {
      riskScore += 25;
      signals.push('Doğruluk oranında düşüş trendi');
    }
  }

  // Signal 4: No exam in 2+ weeks
  const daysSinceActivity = daysSinceLastLog;
  if (daysSinceActivity >= 14) {
    riskScore += 25;
    signals.push('2+ haftadır aktivite yok');
  }

  riskScore = Math.min(100, riskScore);

  const riskLevel: ChurnSignal['riskLevel'] =
    riskScore >= 75 ? 'critical'
    : riskScore >= 50 ? 'high'
    : riskScore >= 25 ? 'medium'
    : 'low';

  // Linear extrapolation: how many more days until likely churn
  const daysToChurn = riskScore < 50 ? Math.max(1, Math.round((100 - riskScore) / 10)) : null;

  return { riskScore, signals, riskLevel, daysToChurn };
}
