/**
 * AMAÇ: İstatistiksel hesaplama fonksiyonları — projeksiyon, iş yükü, bitiş tahmini
 * MANTIK: Linear regression + log/mastery verisi birleştirme
 */

import type { ExamResult, DailyLog, SubjectStatus } from '../types';
import { toDateMs, toISODateOnly } from './date';

export interface RegressionResult {
  slope: number;
  intercept: number;
}

export interface ProjectionResult {
  predictedNet: number;
  hasEnoughData: boolean;
  dataPoints: number;
}

export interface WorkloadResult {
  completedPercent: number;
  remainingTopics: number;
  totalTopics: number;
  completedTopics: number;
}

export interface CompletionEstimate {
  estimatedDate: Date | null;
  daysRemaining: number | null;
  isAlreadyDone: boolean;
}

export interface SourceROI {
  sourceName: string;
  totalQuestions: number;
  avgAccuracy: number;
  avgSecondsPerQ: number;
  roiScore: number;
}

export interface HabitAuditAlert {
  id: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  if (points.length < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };

  const n = points.length;
  const sumX = points.reduce((acc, p) => acc + (p.x || 0), 0);
  const sumY = points.reduce((acc, p) => acc + (p.y || 0), 0);
  const sumXY = points.reduce((acc, p) => acc + (p.x || 0) * (p.y || 0), 0);
  const sumX2 = points.reduce((acc, p) => acc + (p.x || 0) * (p.x || 0), 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 0.0001) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope: slope || 0, intercept: intercept || 0 };
}

export function predictNetAtDate(
  exams: ExamResult[],
  targetDate: Date,
  examType?: 'TYT' | 'AYT'
): ProjectionResult {
  const filtered = examType ? exams.filter(e => e.type === examType) : exams;
  const MIN_EXAMS = 3;

  if (!filtered || filtered.length < MIN_EXAMS) {
    return { predictedNet: 0, hasEnoughData: false, dataPoints: (filtered?.length || 0) };
  }

  const firstDate = toDateMs(filtered[0].date);
  if (!Number.isFinite(firstDate)) return { predictedNet: 0, hasEnoughData: false, dataPoints: filtered.length };

  const points = filtered.map(e => ({
    x: (((toDateMs(e.date) ?? 0) - firstDate) / (1000 * 60 * 60 * 24)),
    y: e.totalNet || 0,
  })).filter(p => Number.isFinite(p.x));

  if (points.length < 2) return { predictedNet: 0, hasEnoughData: false, dataPoints: filtered.length };

  const { slope, intercept } = linearRegression(points);
  const targetDays = (targetDate.getTime() - firstDate) / (1000 * 60 * 60 * 24);
  const predictedNet = Math.max(0, slope * targetDays + intercept);

  return { predictedNet: Math.round(predictedNet * 10) / 10, hasEnoughData: true, dataPoints: filtered.length };
}

export function predictTYTAndAYT(
  exams: ExamResult[] | undefined,
  targetDate: Date
): { tyt: ProjectionResult; ayt: ProjectionResult } {
  const safeExams = exams || [];
  const tytExams = safeExams.filter(e => e.type === 'TYT').slice(-5);
  const aytExams = safeExams.filter(e => e.type === 'AYT').slice(-3);

  return {
    tyt: predictNetAtDate(tytExams, targetDate, 'TYT'),
    ayt: predictNetAtDate(aytExams, targetDate, 'AYT'),
  };
}

export function calcWorkloadRemaining(
  tytSubjects: SubjectStatus[],
  aytSubjects: SubjectStatus[],
  logs: DailyLog[]
): WorkloadResult {
  const allSubjects = [...tytSubjects, ...aytSubjects];
  const totalTopics = allSubjects.length;

  const studiedNames = new Set((logs || []).filter(Boolean).map(l => l.topic));
  const completedTopics = (allSubjects || []).filter(Boolean).filter(
    s => s.status === 'in-progress' || s.status === 'mastered' || studiedNames.has(s.name)
  ).length;

  const completedPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return {
    completedPercent,
    remainingTopics: totalTopics - completedTopics,
    totalTopics,
    completedTopics,
  };
}

export function estimateCompletionDate(
  dailyRate: number,
  remainingTopics: number
): CompletionEstimate {
  if (remainingTopics <= 0) {
    return { estimatedDate: null, daysRemaining: 0, isAlreadyDone: true };
  }
  if (dailyRate <= 0) {
    return { estimatedDate: null, daysRemaining: null, isAlreadyDone: false };
  }

  const daysRemaining = Math.ceil(remainingTopics / dailyRate);
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);

  return { estimatedDate, daysRemaining, isAlreadyDone: false };
}

export function calcDailyTopicRate(logs: DailyLog[], windowDays = 14): number {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const recentLogs = (logs || []).filter((l) => {
    if (!l) return false;
    const ms = toDateMs(l.date || '');
    if (ms === null) return false;
    return ms >= cutoff;
  });

  if (recentLogs.length === 0) return 0;

  const uniqueTopicDays = new Set(
    recentLogs
      .map((l) => {
        const ms = toDateMs(l.date);
        if (ms === null) return null;
        return `${l.topic}__${toISODateOnly(new Date(ms))}`;
      })
      .filter((x): x is string => typeof x === 'string')
  );
  return uniqueTopicDays.size / windowDays;
}

export function calcSourceROI(logs: DailyLog[]): SourceROI[] {
  const sourceMap = new Map<string, { questions: number; correct: number; totalSeconds: number; count: number }>();

  (logs || []).forEach(log => {
    if (!log) return;
    const name = log.sourceName?.trim() || 'Bilinmeyen Kaynak';
    if (!sourceMap.has(name)) {
      sourceMap.set(name, { questions: 0, correct: 0, totalSeconds: 0, count: 0 });
    }
    const entry = sourceMap.get(name)!;
    entry.questions += log.questions;
    entry.correct += log.correct;
    entry.totalSeconds += (log.avgTime * 60);
    entry.count += 1;
  });

  return Array.from(sourceMap.entries())
    .filter(([, v]) => v.questions > 0)
    .map(([sourceName, v]) => {
      const avgAccuracy = v.correct / v.questions;
      const avgSecondsPerQ = v.questions > 0 ? v.totalSeconds / v.questions : 999;
      const roiScore = (avgAccuracy * 100) / Math.max(1, avgSecondsPerQ / 10);

      return {
        sourceName,
        totalQuestions: v.questions,
        avgAccuracy: Math.round(avgAccuracy * 100),
        avgSecondsPerQ: Math.round(avgSecondsPerQ),
        roiScore: Math.round(roiScore * 10) / 10,
      };
    })
    .sort((a, b) => b.roiScore - a.roiScore);
}

export function calculatePredictedNet(
  exams: ExamResult[],
  logs: DailyLog[],
  targetDate: Date,
  examType: 'TYT' | 'AYT',
  currentElo: number,
  targetNet?: number
): { predictedNet: number; confidence: number } {
  const filteredExams = exams.filter(e => e.type === examType);
  const maxNet = examType === 'TYT' ? 120 : 80;
  
  // Fallback to target or a reasonable starting point if no exams exist
  if (filteredExams.length < 2) {
    const relatedLogs = logs.filter(l => l.questions > 0);
    let basePred = targetNet || (examType === 'TYT' ? 70 : 40); // Standard midpoint fallbacks
    
    if (relatedLogs.length > 0) {
      const avgScore = relatedLogs.reduce((acc, l) => acc + ((l.correct || 0) / (l.questions || 1)), 0) / relatedLogs.length;
      basePred = (basePred * 0.4) + (avgScore * maxNet * 0.6); // Blend target with log performance
    }
    
    basePred += (currentElo - 1000) / 100; // Small ELO alignment
    
    return { predictedNet: Math.round(Math.max(0, Math.min(basePred, maxNet)) * 10) / 10, confidence: 20 }; 
  }

  const sortedExams = [...filteredExams].sort((a,b) => (toDateMs(a.date) ?? 0) - (toDateMs(b.date) ?? 0));
  const baseDate = toDateMs(sortedExams[0].date) ?? Date.now();
  const points = sortedExams.map(e => ({
    x: (((toDateMs(e.date) ?? 0) - baseDate) / (1000 * 60 * 60 * 24)),
    y: e.totalNet,
  }));

  const { slope, intercept } = linearRegression(points);
  const targetDays = (targetDate.getTime() - baseDate) / (1000 * 60 * 60 * 24);
  
  const recentLogs = logs.slice(-20);
  const recentAccuracy = recentLogs.length > 0 
    ? recentLogs.reduce((acc, l) => acc + ((l.correct || 0) / (l.questions || 1)), 0) / recentLogs.length 
    : 0.5;
    
  const eloBonus = (currentElo - 1000) / 500; 

  let predictedNet = slope * targetDays + intercept + eloBonus;
  
  // Logical clamping based on recent trajectory
  if (slope > 0 && recentAccuracy < 0.45) predictedNet -= 5;
  if (slope < 0 && recentAccuracy > 0.75) predictedNet += 5;

  predictedNet = Math.max(0, Math.min(predictedNet, maxNet));
  const confidence = Math.min(95, filteredExams.length * 10 + 20); 
  
  return { 
    predictedNet: Math.round(predictedNet * 10) / 10,
    confidence: Math.round(confidence)
  };
}

export interface HabitAuditResult {
  title: string;
  description: string;
  type: 'danger' | 'warning' | 'success';
  impact: 'KRİTİK' | 'ORTA' | 'DÜŞÜK' | 'POZİTİF';
}

export function detectHabitAlerts(logs: DailyLog[]): HabitAuditResult[] {
  if (logs.length === 0) return [];
  const audits: HabitAuditResult[] = [];
  const now = Date.now();
  
  // 1. Subject Ghosting (10+ days)
  const last10Days = (logs || []).filter(l => l && (now - (toDateMs(l.date || '') ?? 0) <= 10 * 24 * 60 * 60 * 1000));
  const studiedSubjects = new Set(last10Days.map(l => l.subject));
  const coreSubjects = ['Matematik', 'Fizik', 'Edebiyat', 'Tarih'];
  
  coreSubjects.forEach(s => {
    if (!studiedSubjects.has(s) && (logs || []).some(l => l?.subject === s)) {
      audits.push({
        title: `${s} Hayaleti`,
        description: `Bu dersi 10 gündür tamamen boşladın. Zihin bu boşluğu unutkanlıkla doldurur.`,
        type: 'danger',
        impact: 'KRİTİK'
      });
    }
  });

  // 2. Burnout Warning
  const last3Days = (logs || []).filter(l => l && (now - (toDateMs(l.date || '') ?? 0) <= 3 * 24 * 60 * 60 * 1000));
  const totalHours = last3Days.reduce((acc, l) => acc + (l.avgTime || 0), 0) / 60;
  const avgAccuracy = last3Days.reduce((acc, l) => acc + ((l.correct || 0) / (l.questions || 1)), 0) / (last3Days.length || 1);
  
  if (totalHours > 24 && avgAccuracy < 0.6) {
    audits.push({
      title: 'Tükenmişlik (Burnout) Riski',
      description: 'Çok çalışıyorsun ama verim çöküşte. Motor su kaynatmak üzere, 1 gün tam mola ver.',
      type: 'danger',
      impact: 'KRİTİK'
    });
  }

  // 3. Consistency Positive
  const studyDaysLastWeek = new Set((logs || []).filter(Boolean).slice(-14).map(l => l.date?.substring(0, 10))).size;
  if (studyDaysLastWeek >= 6) {
    audits.push({
      title: 'Disiplin Abidesi',
      description: 'Son 7 günün 6 gününde masadaydın. Bu süreklilik sınav kazandıran asıl güçtür.',
      type: 'success',
      impact: 'POZİTİF'
    });
  }

  // 4. Night Owl Detection
  const lateNightLogs = (logs || []).filter(l => {
    if (!l?.date) return false;
    const date = new Date(l.date);
    const hour = date.getHours();
    return hour >= 0 && hour <= 4;
  }).length;
  
  if (lateNightLogs > 3) {
    audits.push({
      title: 'Gece Kuşu Sendromu',
      description: 'Çalışmalarının çoğu gece yarısından sonra. Uyku kaliteni ve bilişsel hızını düşürüyor olabilirsin.',
      type: 'warning',
      impact: 'ORTA'
    });
  }

  // 5. Math Momentum
  const last3DaysMath = last3Days.filter((l) => l.subject?.toLowerCase().includes('matematik'));
  if (last3DaysMath.length === 0) {
    audits.push({
      title: 'Matematik Kopukluğu',
      description: '3 gündür Matematik ile bağın koptu. Paslanma başlamadan acil soru çözümü yapmalısın.',
      type: 'warning',
      impact: 'KRİTİK'
    });
  }

  return audits;
}

export function calculateBurnoutRisk(logs: DailyLog[]): { probability: number; reason: string; advice: string } {
  if (logs.length < 5) return { probability: 0, reason: 'Yeterli veri yok.', advice: 'Çalışmaya devam et.' };

  const recentLogs = logs.slice(-10);
  const avgFatigue = recentLogs.reduce((acc, l) => acc + (l.fatigue || 3), 0) / recentLogs.length;
  const recentAccuracy = recentLogs.reduce((acc, l) => acc + (l.correct / (l.questions || 1)), 0) / recentLogs.length;
  
  // Frequency check
  const dates = new Set(recentLogs.map(l => l.date.substring(0, 10)));
  const consistency = dates.size / Math.min(10, (Date.now() - (toDateMs(recentLogs[0].date) || Date.now())) / (1000 * 60 * 60 * 24) + 1);

  let prob = 0;
  let reason = 'Mental durumun stabil görünüyor.';
  let advice = 'Mevcut temponu koru.';

  if (avgFatigue > 4) {
    prob += 40;
    reason = 'Son çalışmalarda yüksek yorgunluk hissettin.';
    advice = 'Uyku düzenine odaklan.';
  }
  if (consistency > 0.8 && avgFatigue > 3.5) {
    prob += 30;
    reason = 'Hiç mola vermeden çok yüksek tempoda gidiyorsun.';
    advice = 'Yarın yarım gün mola ver.';
  }
  if (recentAccuracy < 0.55 && avgFatigue > 3) {
    prob += 20;
    reason = 'Yorgunluk netlerine yansımaya başladı, verimin düşüyor.';
    advice = 'Konu çalışmak yerine hafif tekrar yap.';
  }

  return { 
    probability: Math.min(100, prob), 
    reason, 
    advice 
  };
}
