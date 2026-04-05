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
  // COACH-CORE-002: 'skipped' kaldırıldı — deferred/cancelled/failed tümü resolved sayılır
  const resolvedCount = tasks.filter((t) =>
    t.status === 'deferred' || t.status === 'cancelled' || t.status === 'failed'
  ).length;
  const isResolved = completedCount + resolvedCount >= tasks.length;

  return {
    ...record,
    directive: { ...record.directive, tasks },
    completedTaskCount: completedCount,
    skippedTaskCount: resolvedCount,
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
    // COACH-CORE-002: 'skipped' kaldırıldı — 'deferred' kullan
    status: 'deferred',
    failureReason: 'other',
    failureNote: reason ?? 'Kullanıcı atlandı',
    updatedAt: new Date().toISOString(),
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  // deferred/cancelled/failed tümü „atlandı“ sayılır (resolved için)
  const resolvedCount = tasks.filter((t) =>
    t.status === 'deferred' || t.status === 'cancelled' || t.status === 'failed'
  ).length;
  const isResolved = completedCount + resolvedCount >= tasks.length;

  return {
    ...record,
    directive: { ...record.directive, tasks },
    completedTaskCount: completedCount,
    skippedTaskCount: resolvedCount,
    isResolved,
  };
}

export function failTask(
  record: DirectiveRecord,
  taskIndex: number,
  reason: CoachTask['failureReason'] = 'other',
  note?: string
): DirectiveRecord {
  const tasks = [...record.directive.tasks];
  if (!tasks[taskIndex]) return record;

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    status: 'failed',
    failureReason: reason,
    failureNote: note,
    updatedAt: new Date().toISOString(),
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const resolvedCount = tasks.filter((t) =>
    t.status === 'deferred' || t.status === 'cancelled' || t.status === 'failed'
  ).length;
  const isResolved = completedCount + resolvedCount >= tasks.length;

  return {
    ...record,
    directive: { ...record.directive, tasks },
    completedTaskCount: completedCount,
    skippedTaskCount: resolvedCount,
    isResolved,
  };
}

// ─── Recovery & Analysis Logic ────────────────────────────────────────────────

export function generateRecoveryTasks(history: DirectiveRecord[]): CoachTask[] {
  const recoveryTasks: CoachTask[] = [];
  
  // Son 3 kayıttaki başarısız veya ertelenen görevleri bul
  const recentRecords = history.slice(-3);
  for (const record of recentRecords) {
    for (const task of record.directive.tasks) {
      if ((task.status === 'failed' || task.status === 'deferred') && !task.id.startsWith('recovered-')) {
        recoveryTasks.push({
          ...task,
          id: `recovered-${task.id}`,
          title: `[TELAFi] ${task.title}`,
          status: 'pending',
          priority: 'high', // Telafi görevleri her zaman yüksek önceliklidir
          rationale: `Bu görev daha önce yapılamadığı için telafi listesine alındı.`,
          originSurface: 'strategy',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
  
  return recoveryTasks.slice(0, 3); // Max 3 telafi görevi ver
}

export function calculateWeeklyWorkload(history: DirectiveRecord[]) {
  const stats = {
    totalMinutes: 0,
    totalQuestions: 0,
    subjectDistribution: {} as Record<string, number>,
    pendingTaskCount: 0
  };

  const activeRecords = history.filter(r => !r.isResolved);
  for (const record of activeRecords) {
    for (const task of record.directive.tasks) {
      if (task.status === 'pending') {
        stats.pendingTaskCount++;
        stats.totalMinutes += task.targetMinutes || 0;
        stats.totalQuestions += task.targetQuestions || 0;
        if (task.subject) {
          stats.subjectDistribution[task.subject] = (stats.subjectDistribution[task.subject] || 0) + (task.targetMinutes || 30);
        }
      }
    }
  }

  return stats;
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
    recurringWeakTopics: [],
    recurringAvoidedSubjects: [],
    staleAdvicePatterns: [],
    interventionEffectiveness: 'unknown' as const,
    missedTaskReasons: [],
    strongSubjects: [],
    persistentNotes: [],
    netTrend: 'unknown',
    updatedAt: new Date().toISOString(),
    // backward compat
    recurringWeaknesses: [],
    strengths: [],
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
        (task.status === 'deferred' || task.status === 'failed' || task.status === 'cancelled' || !task.status || task.status === 'pending')
      ) {
        weaknessMap.set(task.subject, (weaknessMap.get(task.subject) ?? 0) + 1);
      }
      if (task.status === 'completed') {
        strengthMap.set(task.subject, (strengthMap.get(task.subject) ?? 0) + 1);
      }
      if (task.status === 'failed' && task.failureReason) {
        base.missedTaskReasons.push(`${task.subject}: ${task.failureReason}`);
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
    // COACH-MEM-001: Yeni CoachMemory alan yapısı
    recurringWeakTopics: weaknesses,
    recurringAvoidedSubjects: [],  // Gelecek: log/exam analizinden türetilecek
    staleAdvicePatterns: [],       // Gelecek: direktif tekrar tespitinden türetilecek
    interventionEffectiveness: 'unknown' as const,
    missedTaskReasons: [...new Set(base.missedTaskReasons)].slice(-10),
    strongSubjects: strengths,
    persistentNotes: base.persistentNotes.slice(0, 10),
    netTrend,
    updatedAt: new Date().toISOString(),
    // Backward compat (deprecated)
    recurringWeaknesses: weaknesses,
    strengths,
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
