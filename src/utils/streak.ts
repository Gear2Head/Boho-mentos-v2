import type { DailyLog } from '../types';
import { addLocalDays, parseFlexibleDate, toLocalISODateOnly } from './date';

export interface StreakComputation {
  streakDays: number;
  usedShieldDates: string[];
}

export function computeStudyStreak(
  logs: DailyLog[],
  options: {
    availableShieldCount?: number;
    usedShieldDates?: string[];
    today?: Date;
    activityDays?: string[]; // [FAZ-3]
  } = {}
): StreakComputation {
  const daySet = new Set<string>(options.activityDays ?? []);
  for (const log of logs) {
    const parsed = parseFlexibleDate(log.date);
    if (!parsed) continue;
    daySet.add(toLocalISODateOnly(parsed));
  }

  if (daySet.size === 0) {
    return { streakDays: 0, usedShieldDates: options.usedShieldDates ?? [] };
  }

  const today = options.today ?? new Date();
  const todayKey = toLocalISODateOnly(today);
  let cursor = daySet.has(todayKey) ? today : addLocalDays(today, -1);
  const usedShieldDates = [...(options.usedShieldDates ?? [])];
  const usedSet = new Set(usedShieldDates);
  let availableShieldCount = Math.max(0, options.availableShieldCount ?? 0);
  let streakDays = 0;

  while (true) {
    const key = toLocalISODateOnly(cursor);
    if (daySet.has(key)) {
      streakDays += 1;
      cursor = addLocalDays(cursor, -1);
      continue;
    }

    if (availableShieldCount > 0 && !usedSet.has(key)) {
      availableShieldCount -= 1;
      usedSet.add(key);
      usedShieldDates.push(key);
      streakDays += 1;
      cursor = addLocalDays(cursor, -1);
      continue;
    }

    break;
  }

  return { streakDays, usedShieldDates };
}
