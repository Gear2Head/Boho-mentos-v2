import type { DailyLog, ExamResult, FocusSessionRecord, StudentProfile } from '../types';
import type { PredictiveNetProjection } from '../types/coach';

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function monthLabel(date = new Date()): string {
  return new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(date);
}

function recentExamTrend(exams: ExamResult[], examType: 'TYT' | 'AYT'): number {
  const nets = exams
    .filter((exam) => exam.type === examType)
    .slice(-5)
    .map((exam) => exam.totalNet);
  if (nets.length < 2) return 0;
  return (nets[nets.length - 1] - nets[0]) / Math.max(1, nets.length - 1);
}

function weeklyQuestionLoad(logs: DailyLog[]): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return logs
    .filter((log) => new Date(log.date).getTime() >= cutoff)
    .reduce((sum, log) => sum + log.questions, 0);
}

function weeklyFocusHours(focusSessions: FocusSessionRecord[]): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const seconds = focusSessions
    .filter((session) => new Date(session.startTime).getTime() >= cutoff)
    .reduce((sum, session) => sum + session.durationSeconds, 0);
  return seconds / 3600;
}

export function buildNetProjection(input: {
  profile: StudentProfile | null;
  logs: DailyLog[];
  exams: ExamResult[];
  focusSessions: FocusSessionRecord[];
  eloScore: number;
}): PredictiveNetProjection[] {
  const { profile, logs, exams, focusSessions, eloScore } = input;
  const questionLoad = weeklyQuestionLoad(logs);
  const focusHours = weeklyFocusHours(focusSessions);
  const consistencyBoost = clamp(questionLoad / 700 + focusHours / 20 + eloScore / 5000, 0, 2.8);

  return (['TYT', 'AYT'] as const).map((examType) => {
    const target = examType === 'TYT' ? profile?.tytTarget ?? 0 : profile?.aytTarget ?? 0;
    const latest = exams.filter((exam) => exam.type === examType).at(-1)?.totalNet ?? 0;
    const trend = recentExamTrend(exams, examType);
    const projectedNet = clamp(latest + trend * 4 + consistencyBoost, 0, examType === 'TYT' ? 120 : 80);
    const confidence =
      exams.filter((exam) => exam.type === examType).length >= 4 && logs.length >= 12
        ? 'high'
        : logs.length >= 6
          ? 'medium'
          : 'low';

    const blockers: string[] = [];
    if (questionLoad < 350) blockers.push('Haftalık soru hacmi düşük');
    if (focusHours < 8) blockers.push('Derin çalışma süresi yetersiz');
    if (target > 0 && projectedNet < target) blockers.push(`${examType} hedefinden ${(target - projectedNet).toFixed(1)} net geride`);

    return {
      examType,
      projectedMonth: monthLabel(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)),
      projectedNet: Number(projectedNet.toFixed(1)),
      confidence,
      rationale: `${examType} projeksiyonu son deneme trendi, haftalık ${questionLoad} soru, ${focusHours.toFixed(1)} saat odak ve ${eloScore} ELO ile hesaplandı.`,
      blockers,
    };
  });
}
