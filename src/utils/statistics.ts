/**
 * AMAÇ: İstatistiksel hesaplama fonksiyonları — projeksiyon, iş yükü, bitiş tahmini
 * MANTIK: Linear regression + log/mastery verisi birleştirme
 */

import type { ExamResult, DailyLog, SubjectStatus } from '../types';

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

export function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  if (points.length < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };

  const n = points.length;
  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function predictNetAtDate(
  exams: ExamResult[],
  targetDate: Date,
  examType?: 'TYT' | 'AYT'
): ProjectionResult {
  const filtered = examType ? exams.filter(e => e.type === examType) : exams;
  const MIN_EXAMS = 3;

  if (filtered.length < MIN_EXAMS) {
    return { predictedNet: 0, hasEnoughData: false, dataPoints: filtered.length };
  }

  const baseDate = new Date(filtered[0].date).getTime();
  const points = filtered.map(e => ({
    x: (new Date(e.date).getTime() - baseDate) / (1000 * 60 * 60 * 24),
    y: e.totalNet,
  }));

  const { slope, intercept } = linearRegression(points);
  const targetDays = (targetDate.getTime() - baseDate) / (1000 * 60 * 60 * 24);
  const predictedNet = Math.max(0, slope * targetDays + intercept);

  return { predictedNet: Math.round(predictedNet * 10) / 10, hasEnoughData: true, dataPoints: filtered.length };
}

export function predictTYTAndAYT(
  exams: ExamResult[],
  targetDate: Date
): { tyt: ProjectionResult; ayt: ProjectionResult } {
  const tytExams = exams.filter(e => e.type === 'TYT').slice(-5);
  const aytExams = exams.filter(e => e.type === 'AYT').slice(-3);

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
  const recentLogs = logs.filter(l => new Date(l.date).getTime() >= cutoff);

  if (recentLogs.length === 0) return 0;

  const uniqueTopicDays = new Set(recentLogs.map(l => `${l.topic}__${new Date(l.date).toLocaleDateString('tr-TR')}`));
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
  currentElo: number
): { predictedNet: number; confidence: number } {
  const filteredExams = exams.filter(e => e.type === examType);
  const maxNet = examType === 'TYT' ? 120 : 80;
  
  if (filteredExams.length < 2) {
    const relatedLogs = logs.filter(l => l.questions > 0);
    if (relatedLogs.length === 0) return { predictedNet: 0, confidence: 0 };
    
    const avgScore = relatedLogs.reduce((acc, l) => acc + (l.correct / l.questions), 0) / relatedLogs.length;
    let basePred = avgScore * maxNet;
    basePred += (currentElo / 1000); 
    
    return { predictedNet: Math.round(basePred), confidence: 30 }; 
  }

  const baseDate = new Date(filteredExams[0].date).getTime();
  const points = filteredExams.map(e => ({
    x: (new Date(e.date).getTime() - baseDate) / (1000 * 60 * 60 * 24),
    y: e.totalNet,
  }));

  const { slope, intercept } = linearRegression(points);
  const targetDays = (targetDate.getTime() - baseDate) / (1000 * 60 * 60 * 24);
  
  const recentLogs = logs.slice(-14);
  const recentAccuracy = recentLogs.reduce((acc, l) => acc + ((l.correct || 0) / (l.questions || 1)), 0) / (recentLogs.length || 1);
  const logBonus = recentAccuracy > 0.70 ? 5 : (recentAccuracy < 0.40 ? -5 : 0);
  const eloBonus = (currentElo - 1000) / 1000; 

  let predictedNet = slope * targetDays + intercept + logBonus + eloBonus;
  
  if(slope < 0 && recentAccuracy > 0.75) {
     predictedNet += 10;
  }

  predictedNet = Math.max(0, Math.min(predictedNet, maxNet));
  const confidence = Math.min(95, filteredExams.length * 8 + 35); 
  
  return { 
    predictedNet: Math.round(predictedNet * 10) / 10,
    confidence: Math.round(confidence)
  };
}
