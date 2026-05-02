import type { DailyLog, ExamResult, FocusSessionRecord, StudentProfile } from '../types';
import type { GeneratedFlashcard, VisionOcrLogCandidate, WeeklyGuardianReport } from '../types/coach';
import { buildNetProjection } from './predictiveAnalytics';

function normalizeLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?\n]+/)
    .map(normalizeLine)
    .filter((line) => line.length > 18);
}

export function generateFallbackFlashcards(input: {
  text: string;
  subject: string;
  topic?: string;
  limit?: number;
}): GeneratedFlashcard[] {
  const sentences = splitSentences(input.text).slice(0, input.limit ?? 20);
  return sentences.map((sentence, index) => ({
    front: `${input.topic || input.subject} için kritik bilgi ${index + 1} nedir?`,
    back: sentence,
    difficulty: sentence.length > 140 ? 'hard' : sentence.length > 80 ? 'medium' : 'easy',
    subject: input.subject,
    topic: input.topic,
    sourceEvidence: sentence,
  }));
}

export function buildVisionOcrPrompt(imageContext: string): string {
  return [
    'Fiziksel test kitabı veya deneme sayfasını oku.',
    'Doğru, yanlış ve boş işaretlerini ayır.',
    'Ders, konu, toplam soru, doğru, yanlış, boş ve güven skorunu çıkar.',
    'Sadece JSON dizi döndür: [{"subject":"","topic":"","questions":0,"correct":0,"wrong":0,"empty":0,"confidence":0,"evidence":""}]',
    `Ek bağlam: ${imageContext}`,
  ].join('\n');
}

export function sanitizeVisionCandidates(raw: unknown): VisionOcrLogCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): VisionOcrLogCandidate[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const questions = Number(record.questions);
    const correct = Number(record.correct);
    const wrong = Number(record.wrong);
    const empty = Number(record.empty);
    const subject = String(record.subject || '').trim();
    if (!subject || !Number.isFinite(questions) || questions <= 0) return [];
    if (correct + wrong + empty > questions) return [];
    return [{
      subject,
      topic: String(record.topic || 'Genel').trim(),
      questions,
      correct: Math.max(0, correct),
      wrong: Math.max(0, wrong),
      empty: Math.max(0, empty),
      confidence: Math.max(0, Math.min(100, Number(record.confidence) || 0)),
      evidence: String(record.evidence || '').slice(0, 240),
    }];
  });
}

export function buildWeeklyGuardianReport(input: {
  profile: StudentProfile | null;
  logs: DailyLog[];
  exams: ExamResult[];
  focusSessions: FocusSessionRecord[];
  eloScore: number;
  weekStart: string;
  weekEnd: string;
}): WeeklyGuardianReport {
  const projections = buildNetProjection(input);
  const recentLogs = input.logs.slice(-20);
  const subjectTotals = new Map<string, { questions: number; correct: number }>();
  recentLogs.forEach((log) => {
    const current = subjectTotals.get(log.subject) ?? { questions: 0, correct: 0 };
    current.questions += log.questions;
    current.correct += log.correct;
    subjectTotals.set(log.subject, current);
  });

  const rankedSubjects = Array.from(subjectTotals.entries())
    .map(([subject, data]) => ({ subject, accuracy: data.questions ? data.correct / data.questions : 0, questions: data.questions }))
    .sort((a, b) => b.questions - a.questions);

  const strengths = rankedSubjects
    .filter((entry) => entry.accuracy >= 0.72)
    .slice(0, 3)
    .map((entry) => `${entry.subject}: %${Math.round(entry.accuracy * 100)} doğruluk`);

  const risks = rankedSubjects
    .filter((entry) => entry.accuracy < 0.55)
    .slice(0, 3)
    .map((entry) => `${entry.subject}: %${Math.round(entry.accuracy * 100)} doğruluk`);

  return {
    studentName: input.profile?.name || 'Öğrenci',
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    summary: `${recentLogs.length} log, ${input.exams.slice(-3).length} son deneme ve ${input.eloScore} ELO üzerinden haftalık rapor hazırlandı.`,
    strengths: strengths.length ? strengths : ['Bu hafta güçlü alan için yeterli veri yok.'],
    risks: risks.length ? risks : ['Bu hafta kritik risk için yeterli veri yok.'],
    nextWeekActions: projections.flatMap((projection) => projection.blockers.slice(0, 1)).slice(0, 3),
    projections,
  };
}
