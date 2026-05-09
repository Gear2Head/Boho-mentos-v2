/**
 * AMAÇ: Kritik yollardaki `any` kullanımını type guard'larla replace eder.
 * MANTIK: Runtime tip doğrulaması + TypeScript type narrowing.
 *
 * V19 (BUILD-003): En çok kullanılan `any` pattern'leri buraya taşındı.
 */

import type { CoachDirective, CoachTask } from '../types/coach';
import type { DailyLog, ExamResult, WarRoomQuestion } from '../types';

// ─── Primitive guards ─────────────────────────────────────────────────────────

export function isString(v: unknown): v is string {
  return typeof v === 'string';
}

export function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

// ─── Domain guards ────────────────────────────────────────────────────────────

/**
 * CoachTask guard — AI'dan gelen veri için
 */
export function isCoachTask(v: unknown): v is CoachTask {
  if (!isRecord(v)) return false;
  return (
    isNonEmptyString(v['action']) &&
    (v['priority'] === 'high' || v['priority'] === 'medium' || v['priority'] === 'low')
  );
}

/**
 * CoachDirective guard — AI parse için
 */
export function isCoachDirective(v: unknown): v is CoachDirective {
  if (!isRecord(v)) return false;
  return (
    isNonEmptyString(v['headline']) &&
    isNonEmptyString(v['summary']) &&
    Array.isArray(v['tasks'])
  );
}

/**
 * DailyLog guard — Firestore'dan gelen veri için
 */
export function isDailyLog(v: unknown): v is DailyLog {
  if (!isRecord(v)) return false;
  return (
    isNonEmptyString(v['subject']) &&
    isNonEmptyString(v['topic']) &&
    isNonEmptyString(v['date']) &&
    isNumber(v['questions']) &&
    isNumber(v['correct']) &&
    isNumber(v['wrong'])
  );
}

/**
 * ExamResult guard
 */
export function isExamResult(v: unknown): v is ExamResult {
  if (!isRecord(v)) return false;
  return (
    isNonEmptyString(v['id']) &&
    isNonEmptyString(v['date']) &&
    (v['type'] === 'TYT' || v['type'] === 'AYT') &&
    isNumber(v['totalNet'])
  );
}

/**
 * WarRoomQuestion guard — AI soru üretimi için
 */
export function isWarRoomQuestion(v: unknown): v is WarRoomQuestion {
  if (!isRecord(v)) return false;
  return (
    isNonEmptyString(v['text']) &&
    Array.isArray(v['options']) &&
    (v['options'] as unknown[]).length >= 4 &&
    isNonEmptyString(v['correctAnswer'])
  );
}

// ─── Array guards ─────────────────────────────────────────────────────────────

export function filterDailyLogs(arr: unknown[]): DailyLog[] {
  return arr.filter(isDailyLog);
}

export function filterExamResults(arr: unknown[]): ExamResult[] {
  return arr.filter(isExamResult);
}

export function filterWarRoomQuestions(arr: unknown[]): WarRoomQuestion[] {
  return arr.filter(isWarRoomQuestion);
}

// ─── Safe parsers ─────────────────────────────────────────────────────────────

/**
 * safeParseFloat: Firestore vb. sayı alanları için NaN güvenceli parse.
 */
export function safeParseFloat(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * safeParseInt: Güvenceli integer parse.
 */
export function safeParseInt(v: unknown, fallback = 0): number {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * safeParseJSON: JSON.parse wrapperi — throw etmez.
 */
export function safeParseJSON<T = unknown>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * safeClamp: değeri [min, max] aralığına sıkıştırır, NaN → fallback.
 */
export function safeClamp(v: unknown, min: number, max: number, fallback = min): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
