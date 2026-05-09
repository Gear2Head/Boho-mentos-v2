import type { CoachIntent } from '../types/coach';

export const STRUCTURED_DIRECTIVE_INTENTS = new Set<CoachIntent>([
  'daily_plan',
  'log_analysis',
  'exam_analysis',
  'exam_debrief',
  'war_room_analysis',
  'weekly_review',
  'micro_feedback',
  'daily_quest',
  'generate_weekly_strategy',
  'forgetting_curve_reminder',
]);

export const JSON_ONLY_INTENTS = new Set<CoachIntent>([
  'flashcard_generation',
  'quiz_generation',
]);

export const NO_CACHE_INTENTS = new Set<CoachIntent>([
  'free_chat',
  'daily_plan',
  'log_analysis',
  'exam_analysis',
  'exam_debrief',
  'war_room_analysis',
  'weekly_review',
  'micro_feedback',
  'daily_quest',
  'generate_weekly_strategy',
  'forgetting_curve_reminder',
  'inverse_coaching',
  'intervention',
  'socratic_force',
  'vision_archive_parse',
]);

export function shouldRequestDirective(intent: CoachIntent, explicit?: boolean): boolean {
  return Boolean(explicit) || STRUCTURED_DIRECTIVE_INTENTS.has(intent);
}

export function shouldForceJson(intent: CoachIntent, wantsDirective: boolean): boolean {
  return wantsDirective || JSON_ONLY_INTENTS.has(intent);
}

export function isCacheableCoachIntent(intent: CoachIntent): boolean {
  return !NO_CACHE_INTENTS.has(intent);
}
