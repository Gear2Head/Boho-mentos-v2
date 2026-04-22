/**
 * TODO-018: University Recommendation Engine
 * Öğrencinin mevcut netleri ve profil tercihlerine göre üniversite önerir.
 */

import type { StudentProfile, AtlasProgram } from '../types';

export type Reachability = 'safe' | 'target' | 'reach' | 'dream';

export interface UniversityRecommendation {
  program: AtlasProgram;
  matchScore: number;         // 0-100
  gap: number;                // Required - current net (negative = below target)
  reachability: Reachability;
  alternativeRoute: string | null;
}

// Reachability bands based on net gap
function getReachability(gap: number): Reachability {
  if (gap <= -15) return 'dream';
  if (gap < -5) return 'reach';
  if (gap <= 5) return 'target';
  return 'safe'; // gap > 5: student is above
}

// Compute match score (0-100)
function computeMatchScore(
  program: AtlasProgram,
  profile: StudentProfile,
  currentTytNet: number,
  currentAytNet: number
): number {
  let score = 0;

  // 1. Goal proximity (40%): how close is the student's net to the program's required net
  const programNet = program.aytNet ?? program.tytNet ?? 0;
  const studentNet = profile.track === 'Sayısal' || profile.track === 'Eşit Ağırlık'
    ? (currentTytNet + currentAytNet) / 2
    : currentTytNet;
  const gap = studentNet - programNet;
  const proximityScore = Math.max(0, Math.min(40, 40 - Math.abs(gap) * 2));
  score += proximityScore;

  // 2. Track match (20%): score type must match student's track
  const trackMap: Record<string, string[]> = {
    'Sayısal': ['SAY', 'MF', 'TM'],
    'Eşit Ağırlık': ['TM', 'EA'],
    'Sözel': ['SOZ', 'TS', 'TM'],
    'Dil': ['DIL', 'YDI'],
  };
  const validTypes = trackMap[profile.track] || [];
  const typeMatch = validTypes.some((t) => program.scoreType?.toUpperCase().includes(t));
  score += typeMatch ? 20 : 0;

  // 3. Difficulty alignment (20%): is the target challenge appropriate?
  if (Math.abs(gap) <= 10) score += 20;
  else if (Math.abs(gap) <= 20) score += 10;

  // 4. Target goal match (20%): does the program match targetUniversity/targetMajor?
  const targetUniMatch = profile.targetUniversity &&
    program.universityName.toLowerCase().includes(profile.targetUniversity.toLowerCase());
  const targetMajorMatch = profile.targetMajor &&
    program.programName.toLowerCase().includes(profile.targetMajor.toLowerCase());
  if (targetUniMatch) score += 10;
  if (targetMajorMatch) score += 10;

  return Math.min(100, Math.round(score));
}

function generateAlternativeRoute(
  program: AtlasProgram,
  gap: number,
  profile: StudentProfile
): string | null {
  if (gap >= 0) return null; // Already reachable
  const weeksNeeded = Math.ceil(Math.abs(gap) * 2); // rough estimate
  return `Hedef nete ulaşmak için yaklaşık ${weeksNeeded} haftalık yoğun çalışma gerekiyor. ${profile.weakSubjects || 'Zayıf konular'} önceliklendirilmeli.`;
}

export function getRecommendations(
  programs: AtlasProgram[],
  profile: StudentProfile,
  currentTytNet: number,
  currentAytNet: number
): UniversityRecommendation[] {
  const recommendations: UniversityRecommendation[] = programs
    .map((program) => {
      const programNet = program.aytNet ?? program.tytNet ?? 0;
      const studentNet = profile.track === 'Sayısal' || profile.track === 'Eşit Ağırlık'
        ? (currentTytNet + currentAytNet) / 2
        : currentTytNet;
      const gap = studentNet - programNet;

      return {
        program,
        matchScore: computeMatchScore(program, profile, currentTytNet, currentAytNet),
        gap,
        reachability: getReachability(gap),
        alternativeRoute: generateAlternativeRoute(program, gap, profile),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);

  return recommendations;
}
