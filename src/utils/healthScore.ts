/**
 * TODO-013: User Health Score — kullanıcı sağlık skoru hesaplama
 * Consistency + Accuracy + Velocity + Goal Progress = 0-100
 */

import type { DailyLog, ExamResult, StudentProfile } from '../types';

export interface HealthScore {
  total: number;
  breakdown: {
    consistency: number;  // 0-25
    accuracy: number;     // 0-25
    velocity: number;     // 0-25
    goalProgress: number; // 0-25
  };
  label: 'Kritik' | 'Düşük' | 'Orta' | 'İyi' | 'Mükemmel';
}

function getLast14DayStreak(logs: DailyLog[]): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    if (logs.some((l) => l.date?.startsWith(iso))) streak++;
  }
  return streak;
}

function getRecentAccuracy(logs: DailyLog[], days = 30): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = logs.filter((l) => new Date(l.date) >= cutoff && l.questions > 0);
  if (recent.length === 0) return 0;
  const totalQ = recent.reduce((s, l) => s + l.questions, 0);
  const totalC = recent.reduce((s, l) => s + l.correct, 0);
  return totalQ > 0 ? (totalC / totalQ) * 100 : 0;
}

function getVelocityScore(logs: DailyLog[], days = 14): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = logs.filter((l) => new Date(l.date) >= cutoff);
  if (recent.length === 0) return 0;

  const totalQ = recent.reduce((s, l) => s + l.questions, 0);
  const avgPerDay = totalQ / days;

  // 100 soru/gün = max puan
  return Math.min(25, Math.round((avgPerDay / 100) * 25));
}

function getGoalProgress(exams: ExamResult[], profile: StudentProfile): number {
  if (!exams.length || !profile) return 0;

  const lastExam = [...exams].sort((a, b) => b.date.localeCompare(a.date))[0];
  const targetNet = (profile.tytTarget + profile.aytTarget) / 2;
  if (targetNet === 0) return 12; // No target set → neutral

  const achievedNet = lastExam.totalNet;
  const ratio = achievedNet / targetNet;

  return Math.min(25, Math.round(ratio * 25));
}

function getHealthLabel(total: number): HealthScore['label'] {
  if (total < 25) return 'Kritik';
  if (total < 45) return 'Düşük';
  if (total < 65) return 'Orta';
  if (total < 85) return 'İyi';
  return 'Mükemmel';
}

export function computeHealthScore(
  logs: DailyLog[],
  exams: ExamResult[],
  profile: StudentProfile,
  streakDays: number
): HealthScore {
  // Consistency: streak continuity last 14 days
  const activeDays = getLast14DayStreak(logs);
  const consistency = Math.min(25, Math.round((activeDays / 14) * 25));

  // Accuracy: average correct/total last 30 logs
  const rawAccuracy = getRecentAccuracy(logs, 30);
  const accuracy = Math.min(25, Math.round((rawAccuracy / 100) * 25));

  // Velocity: question count trend
  const velocity = getVelocityScore(logs, 14);

  // Goal progress: last exam vs target
  const goalProgress = getGoalProgress(exams, profile);

  const total = consistency + accuracy + velocity + goalProgress;

  return {
    total,
    breakdown: { consistency, accuracy, velocity, goalProgress },
    label: getHealthLabel(total),
  };
}
