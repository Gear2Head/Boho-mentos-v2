/**
 * TODO-011: Ghost Rival Battle System
 * Öğrencinin kendi geçmişteki en iyi performansını veya hedef sıralamadan
 * üretilen hayalet rakibi hesaplar.
 */

import type { ExamResult, DailyLog, StudentProfile } from '../types';
import type { GhostRival } from '../types/coach';

// ─── Self Ghost (Best 7-day window) ──────────────────────────────────────────

export function computeSelfGhost(
  exams: ExamResult[],
  logs: DailyLog[],
  currentElo: number
): GhostRival {
  if (!exams.length && !logs.length) {
    return {
      id: 'ghost_self_empty',
      name: 'Geçmiş Senin (Yeni Başlayan)',
      eloScore: Math.max(1000, currentElo - 100),
      tytNet: 0,
      aytNet: 0,
      streakDays: 0,
      source: 'self_past',
    };
  }

  // Find best 7-day window by exam net
  const sortedExams = [...exams].sort((a, b) => b.totalNet - a.totalNet);
  const bestExam = sortedExams[0];

  // Best TYT and AYT separately
  const tytExams = exams.filter((e) => e.type === 'TYT').sort((a, b) => b.totalNet - a.totalNet);
  const aytExams = exams.filter((e) => e.type === 'AYT').sort((a, b) => b.totalNet - a.totalNet);

  const bestTyt = tytExams[0]?.totalNet ?? 0;
  const bestAyt = aytExams[0]?.totalNet ?? 0;

  // Best log streak
  const logDates = logs.map((l) => l.date).sort();
  let maxStreak = 0;
  let cur = 1;
  for (let i = 1; i < logDates.length; i++) {
    const prev = new Date(logDates[i - 1]);
    const curr = new Date(logDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff <= 1) { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 1;
  }

  return {
    id: 'ghost_self_best',
    name: '🏆 En İyi Geçmiş Senin',
    eloScore: Math.min(currentElo + 300, currentElo + (bestExam?.totalNet ?? 0) * 5),
    tytNet: bestTyt,
    aytNet: bestAyt,
    streakDays: maxStreak,
    source: 'self_past',
  };
}

// ─── Target Rank Ghost ────────────────────────────────────────────────────────

export function computeTargetRankGhost(profile: StudentProfile): GhostRival {
  const tytTarget = profile.tytTarget || 60;
  const aytTarget = profile.aytTarget || 40;
  const uni = profile.targetUniversity || 'Hedef Üniversite';

  // ELO estimate from target nets
  const estElo = Math.round(1200 + (tytTarget + aytTarget) * 8);

  return {
    id: 'ghost_target_rank',
    name: `👻 ${uni} Hayaleti`,
    eloScore: estElo,
    tytNet: tytTarget,
    aytNet: aytTarget,
    streakDays: 30, // Ideal student studies daily
    source: 'target_rank',
  };
}

// ─── Comparison ───────────────────────────────────────────────────────────────

export interface GhostComparison {
  tytDiff: number;
  aytDiff: number;
  eloDiff: number;
  isAhead: boolean;
  statusText: string;
}

export function compareWithGhost(
  current: { tytNet: number; aytNet: number; eloScore: number },
  ghost: GhostRival
): GhostComparison {
  const tytDiff = Math.round((current.tytNet - ghost.tytNet) * 10) / 10;
  const aytDiff = Math.round((current.aytNet - ghost.aytNet) * 10) / 10;
  const eloDiff = current.eloScore - ghost.eloScore;
  const isAhead = eloDiff > 0;

  const statusText = isAhead
    ? `${ghost.name}'nın ${eloDiff} ELO önündesin! 🔥`
    : `${ghost.name} senden ${Math.abs(eloDiff)} ELO ileride. Kapat!`;

  return { tytDiff, aytDiff, eloDiff, isAhead, statusText };
}
