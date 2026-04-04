/**
 * AMAÇ: Direktif geçmişi yönetimi — chat'ten bağımsız, kalıcı.
 * MANTIK: Son direktifler, tamamlanma durumları ve coach hafızası burada tutulur.
 *
 * V19 (COACH-006, COACH-007, COACH-008):
 *  - DirectiveRecord: intent, surface, contextHash, completion tracking
 *  - CoachMemory: persistent weaknesses, strengths, trend
 *  - Task completion / skip / fail lifecycle
 */

import type {
  DirectiveRecord,
  CoachDirective,
  CoachTask,
  TaskStatus,
  CoachMemory,
  CoachIntent,
} from '../types/coach';

const HISTORY_MAX = 30;

// ─── Directive Record Builder ─────────────────────────────────────────────────

export function createDirectiveRecord(
  directive: CoachDirective,
  contextHash: string
): DirectiveRecord {
  return {
    id: `dir_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    directive: {
      ...directive,
      tasks: directive.tasks.map((t) => ({ ...t, status: 'pending' as TaskStatus })),
    },
    contextHash,
    completedTaskCount: 0,
    skippedTaskCount: 0,
    isResolved: false,
  };
}

// ─── Task Lifecycle ───────────────────────────────────────────────────────────

export function completeTask(
  record: DirectiveRecord,
  taskIndex: number
): DirectiveRecord {
  const tasks = [...record.directive.tasks];
  if (!tasks[taskIndex]) return record;

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    status: 'completed',
    completedAt: new Date().toISOString(),
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const skippedCount = tasks.filter((t) => t.status === 'skipped').length;
  const isResolved =
    completedCount + skippedCount >= tasks.length;

  return {
    ...record,
    directive: { ...record.directive, tasks },
    completedTaskCount: completedCount,
    skippedTaskCount: skippedCount,
    isResolved,
  };
}

export function skipTask(
  record: DirectiveRecord,
  taskIndex: number,
  reason?: string
): DirectiveRecord {
  const tasks = [...record.directive.tasks];
  if (!tasks[taskIndex]) return record;

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    status: 'skipped',
    skipReason: reason ?? 'Kullanıcı atladı',
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const skippedCount = tasks.filter((t) => t.status === 'skipped').length;
  const isResolved = completedCount + skippedCount >= tasks.length;

  return {
    ...record,
    directive: { ...record.directive, tasks },
    completedTaskCount: completedCount,
    skippedTaskCount: skippedCount,
    isResolved,
  };
}

// ─── History Management ───────────────────────────────────────────────────────

export function addToHistory(
  history: DirectiveRecord[],
  record: DirectiveRecord
): DirectiveRecord[] {
  const updated = [record, ...history];
  return updated.slice(0, HISTORY_MAX);
}

export function updateInHistory(
  history: DirectiveRecord[],
  updatedRecord: DirectiveRecord
): DirectiveRecord[] {
  return history.map((r) => (r.id === updatedRecord.id ? updatedRecord : r));
}

export function getLatestByIntent(
  history: DirectiveRecord[],
  intent: CoachIntent
): DirectiveRecord | null {
  return history.find((r) => r.directive.intent === intent) ?? null;
}

// ─── Coach Memory Builder ─────────────────────────────────────────────────────

/**
 * updateCoachMemory: directive geçmişinden kalıcı hafıza çıkarır.
 * Chat temizlense bile koç öğrenciyi tanımaya devam eder (COACH-008).
 */
export function updateCoachMemory(
  history: DirectiveRecord[],
  current: CoachMemory | null
): CoachMemory {
  const base: CoachMemory = current ?? {
    recurringWeaknesses: [],
    strengths: [],
    persistentNotes: [],
    netTrend: 'unknown',
    updatedAt: new Date().toISOString(),
  };

  // Son 10 direktiften zayıflık ve güçlü yönleri çıkar
  const recent = history.slice(0, 10);
  const weaknessMap = new Map<string, number>();
  const strengthMap = new Map<string, number>();

  for (const record of recent) {
    // Tamamlanmayan yüksek öncelikli görevler zayıflık sinyali
    for (const task of record.directive.tasks) {
      if (!task.subject) continue;
      if (
        task.priority === 'high' &&
        (task.status === 'skipped' || task.status === 'failed' || !task.status || task.status === 'pending')
      ) {
        weaknessMap.set(task.subject, (weaknessMap.get(task.subject) ?? 0) + 1);
      }
      if (task.status === 'completed') {
        strengthMap.set(task.subject, (strengthMap.get(task.subject) ?? 0) + 1);
      }
    }

    // Uyarılar
    for (const warning of record.directive.warnings ?? []) {
      if (warning.severity === 'critical') {
        const note = warning.message.slice(0, 80);
        if (!base.persistentNotes.includes(note)) {
          base.persistentNotes.unshift(note);
        }
      }
    }
  }

  // En çok tekrar eden zayıflıklar (en az 2 kez)
  const weaknesses = [...weaknessMap.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([subject]) => subject);

  const strengths = [...strengthMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([subject]) => subject);

  // Net trend: son 5 exam_analysis direktifinden çıkar
  const examDirectives = recent
    .filter((r) => r.directive.intent === 'exam_analysis' || r.directive.intent === 'exam_debrief')
    .slice(0, 5);

  let netTrend: CoachMemory['netTrend'] = base.netTrend;
  if (examDirectives.length >= 2) {
    const firstCompleted = examDirectives[examDirectives.length - 1].completedTaskCount;
    const lastCompleted = examDirectives[0].completedTaskCount;
    if (lastCompleted > firstCompleted) netTrend = 'rising';
    else if (lastCompleted < firstCompleted) netTrend = 'falling';
    else netTrend = 'stable';
  }

  return {
    recurringWeaknesses: weaknesses,
    strengths,
    persistentNotes: base.persistentNotes.slice(0, 10),
    netTrend,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Compliance Rate ──────────────────────────────────────────────────────────

/**
 * Task completion rate — COACH-PRODUCT-010 KPI
 */
export function calcComplianceRate(history: DirectiveRecord[]): number {
  const recent = history.slice(0, 7);
  if (recent.length === 0) return 0;

  let total = 0;
  let completed = 0;
  for (const r of recent) {
    total += r.directive.tasks.length;
    completed += r.completedTaskCount;
  }
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
