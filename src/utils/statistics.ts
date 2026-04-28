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

  const studiedNames = new Set(logs.map(l => l.topic));
  const completedTopics = allSubjects.filter(
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
  const recentLogs = logs.filter((l) => {
    const ms = toDateMs(l.date);
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

  logs.forEach(log => {
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

export function detectHabitAlerts(logs: DailyLog[]): HabitAuditAlert[] {
  if (logs.length === 0) return [];
  const alerts: HabitAuditAlert[] = [];
  const now = Date.now();
  
  // 1. Subject Ghosting (10+ days)
  const last10Days = logs.filter(l => now - (toDateMs(l.date) ?? 0) <= 10 * 24 * 60 * 60 * 1000);
  const studiedSubjects = new Set(last10Days.map(l => l.subject));
  const coreSubjects = ['Matematik', 'Fizik', 'Edebiyat', 'Tarih']; // Basic check
  coreSubjects.forEach(s => {
    if (!studiedSubjects.has(s)) {
      alerts.push({
        id: `ghosting-${s}`,
        severity: 'high',
        message: `${s} dersini 10 gündür tamamen boşladın. Zihin bu boşluğu unutkanlıkla doldurur. Acil dönüş yap.`
      });
    }
  });

  // 2. Burnout Warning (High hours + Low Accuracy)
  const last3Days = logs.filter(l => now - (toDateMs(l.date) ?? 0) <= 3 * 24 * 60 * 60 * 1000);
  const totalHours = last3Days.reduce((acc, l) => acc + (l.avgTime || 0), 0) / 60;
  const avgAccuracy = last3Days.reduce((acc, l) => acc + (l.correct / (l.questions || 1)), 0) / (last3Days.length || 1);
  
  if (totalHours > 24 && avgAccuracy < 0.6) {
    alerts.push({
      id: 'burnout-risk',
      severity: 'high',
      message: 'Sinyaller Tehlikeli: Çok çalışıyorsun ama verim (accuracy) çöküşte. Bu burnout (tükenmişlik) başlangıcıdır. 1 gün tam mola ver.'
    });
  }

  // 3. Accuracy Spiral (Decreasing performance)
  if (logs.length >= 10) {
    const recent5 = logs.slice(-5);
    const prev5 = logs.slice(-10, -5);
    const recentAcc = recent5.reduce((acc, l) => acc + (l.correct / (l.questions || 1)), 0) / 5;
    const prevAcc = prev5.reduce((acc, l) => acc + (l.correct / (l.questions || 1)), 0) / 5;
    
    if (recentAcc < prevAcc - 0.15) {
      alerts.push({
        id: 'accuracy-spiral',
        severity: 'medium',
        message: 'Doğruluk oranında düşüş trendi saptadım. Konu eksiklerin birikiyor olabilir, temel tekrarı şart.'
      });
    }
  }

  // 4. No Math Check (Standard)
  const last3DaysMath = last3Days.filter((l) => l.subject.toLowerCase().includes('matematik'));
  if (last3DaysMath.length === 0) {
    alerts.push({
      id: 'no-math-3-days',
      severity: 'high',
      message: 'Sinyalleri görüyorum. 3 gündür Matematik çalışmıyorsun. Yarın sabah ilk işin 2 saat Mat olacak.',
    });
  }

  return alerts;
}
