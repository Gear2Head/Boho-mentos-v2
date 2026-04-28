import { DailyLog, ExamResult, StudentProfile, SubjectStatus } from '../types';
import { toDateMs } from './date';

/**
 * Recomputes the entire ELO score chronologically from logs and exams.
 * This is used to fix data integrity issues when data is imported manually
 * or when the calculation logic changes.
 */
export function calculateFinalElo(
  logs: DailyLog[], 
  exams: ExamResult[], 
  profile: StudentProfile | null,
  tytSubjects: SubjectStatus[] = [],
  aytSubjects: SubjectStatus[] = []
): number {
  let currentElo = 1200; // Base ELO

  // Combine and sort events chronologically
  const events: Array<{ type: 'log' | 'exam'; date: number; payload: any }> = [];

  logs.forEach(log => {
    const ms = toDateMs(log.date);
    if (ms) events.push({ type: 'log', date: ms, payload: log });
  });

  exams.forEach(exam => {
    const ms = toDateMs(exam.date);
    if (ms) events.push({ type: 'exam', date: ms, payload: exam });
  });

  events.sort((a, b) => a.date - b.date);

  for (const event of events) {
    if (event.type === 'log') {
      const log = event.payload as DailyLog;
      let K = 30;
      if (currentElo >= 15000) K = 10;
      else if (currentElo >= 7000) K = 15;
      else if (currentElo >= 2500) K = 20;

      const expectedNet = (log.questions || 1) * 0.60;
      const actualNet = log.correct - (log.wrong * 0.25);
      const netDiff = Math.max(-50, Math.min(50, actualNet - expectedNet));
      const eloDelta = Math.round(K * netDiff);

      currentElo = Math.max(0, currentElo + eloDelta);
    } else if (event.type === 'exam') {
      const exam = event.payload as ExamResult;
      let eloDelta = 100;
      if (profile) {
        const target = exam.type === 'TYT' ? profile.tytTarget : profile.aytTarget;
        if (exam.totalNet >= target) eloDelta += 150;
        else if (exam.totalNet < target * 0.5) eloDelta -= 50;
      }
      currentElo = Math.max(0, currentElo + eloDelta);
    }
  }
  
  // Add Curriculum Points (Mastered subjects)
  tytSubjects.forEach(s => {
    if (s.status === 'mastered') currentElo += 50;
    else if (s.status === 'in-progress') currentElo += 15;
  });
  aytSubjects.forEach(s => {
    if (s.status === 'mastered') currentElo += 50;
    else if (s.status === 'in-progress') currentElo += 15;
  });

  return currentElo;
}
