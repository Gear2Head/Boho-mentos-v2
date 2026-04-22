/**
 * TODO-009: Forgetting Curve — Ebbinghaus tabanlı spaced repetition
 */

import type { Flashcard } from '../types/coach';

/**
 * SM-2 lite: Compute next review date based on difficulty and review count.
 */
export function computeNextReview(
  difficulty: 'easy' | 'medium' | 'hard',
  reviewCount: number
): string {
  const base = reviewCount === 0 ? 1 : reviewCount;
  let daysAhead: number;

  switch (difficulty) {
    case 'easy':
      daysAhead = Math.min(30, base * 7);
      break;
    case 'medium':
      daysAhead = Math.min(14, base * 3);
      break;
    case 'hard':
      daysAhead = Math.min(7, base * 1);
      break;
  }

  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString();
}

/**
 * Returns cards that are due for review (nextReviewAt <= now).
 */
export function getCardsForReview(flashcards: Flashcard[]): Flashcard[] {
  const now = new Date().toISOString();
  return flashcards.filter((c) => c.nextReviewAt <= now);
}

/**
 * Forgetting score: 0-100 based on accuracy and time since last review.
 * Higher = more forgotten.
 */
export function getForgettingScore(
  card: Flashcard,
  daysSinceCreated: number
): number {
  if (!card.reviewCount) return Math.min(100, daysSinceCreated * 10);
  const accuracyPenalty = card.lastCorrect === false ? 40 : 0;
  const timePenalty = Math.min(60, daysSinceCreated * 5);
  return Math.min(100, accuracyPenalty + timePenalty);
}
