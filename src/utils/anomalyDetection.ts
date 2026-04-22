/**
 * TODO-014: Anomaly Detection — Burnout ve sahte veri tespiti
 * Öğrenci log verilerinde şüpheli örüntüleri bayraklar.
 */

import type { DailyLog } from '../types';

export type AnomalyType =
  | 'impossible_speed'          // Soru başı <10 saniye
  | 'perfect_accuracy_streak'   // 5+ ardışık log %100 doğruluk
  | 'no_wrong_answers'          // 10+ logda hiç yanlış yok
  | 'burnout_pattern';          // 3+ gün ardışık fatigue >= 8

export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface AnomalyAlert {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  logIds: string[];
  detectedAt: string;
}

export function detectAnomalies(logs: DailyLog[]): AnomalyAlert[] {
  if (!logs.length) return [];

  const alerts: AnomalyAlert[] = [];
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  // ─── 1. Impossible Speed ────────────────────────────────────────────────────
  const speedOffenders = sorted.filter(
    (l) => l.questions > 0 && l.avgTime > 0 && l.avgTime < 10
  );
  if (speedOffenders.length >= 3) {
    alerts.push({
      type: 'impossible_speed',
      severity: 'high',
      message: `${speedOffenders.length} log kayıtında soru başına süre 10 saniyenin altında. Veri girişi hatası veya sahte log olabilir.`,
      logIds: speedOffenders.map((l) => l.id ?? '').filter(Boolean),
      detectedAt: new Date().toISOString(),
    });
  }

  // ─── 2. Perfect Accuracy Streak ─────────────────────────────────────────────
  let perfectStreak = 0;
  const perfectLogs: DailyLog[] = [];
  for (const l of sorted) {
    if (l.questions > 0 && l.wrong === 0 && l.empty === 0) {
      perfectStreak++;
      perfectLogs.push(l);
      if (perfectStreak >= 5) break;
    } else {
      perfectStreak = 0;
      perfectLogs.length = 0;
    }
  }
  if (perfectStreak >= 5) {
    alerts.push({
      type: 'perfect_accuracy_streak',
      severity: 'medium',
      message: `${perfectStreak} ardışık log kaydında %100 doğruluk. Gerçekçi olmayan bir örüntü.`,
      logIds: perfectLogs.map((l) => l.id ?? '').filter(Boolean),
      detectedAt: new Date().toISOString(),
    });
  }

  // ─── 3. No Wrong Answers ────────────────────────────────────────────────────
  const noWrongRecent = sorted.slice(-10).filter((l) => l.questions > 5 && l.wrong === 0);
  if (noWrongRecent.length >= 10) {
    alerts.push({
      type: 'no_wrong_answers',
      severity: 'medium',
      message: 'Son 10 logda hiç yanlış yokken soru sayısı anlamlı. Yanlışları kaydetmiyor olabilirsin.',
      logIds: noWrongRecent.map((l) => l.id ?? '').filter(Boolean),
      detectedAt: new Date().toISOString(),
    });
  }

  // ─── 4. Burnout Pattern ─────────────────────────────────────────────────────
  let burnoutStreak = 0;
  const burnoutLogs: DailyLog[] = [];
  for (const l of sorted.slice(-14)) {
    if (l.fatigue >= 8) {
      burnoutStreak++;
      burnoutLogs.push(l);
    } else {
      burnoutStreak = 0;
      burnoutLogs.length = 0;
    }
  }
  if (burnoutStreak >= 3) {
    alerts.push({
      type: 'burnout_pattern',
      severity: burnoutStreak >= 5 ? 'high' : 'medium',
      message: `${burnoutStreak} gün ardışık yüksek yorgunluk (≥8). Burnout riski.`,
      logIds: burnoutLogs.map((l) => l.id ?? '').filter(Boolean),
      detectedAt: new Date().toISOString(),
    });
  }

  return alerts;
}
