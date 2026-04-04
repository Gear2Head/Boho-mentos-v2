/**
 * AMAÇ: Merkezi Koç Context Builder — tüm AI yüzeyleri bu modülü kullanır.
 * MANTIK: String concat'i UI katmanından çıkarır; tip-güvenli, memoize edilebilir.
 *
 * Kural: Hiçbir AI yüzeyi (App.tsx, StrategyHub, AgendaPage, etc.) kendi
 * context string'ini elle oluşturmaz. Hepsi bu builder'ı çağırır.
 *
 * V19 COACH-004 fix: string concat → typed selector pattern
 */

import type { CoachSystemContext, CoachIntent, CoachDirective } from '../types/coach';
import type { StudentProfile, DailyLog, ExamResult, HabitAlert } from '../types';
import { toISODateOnly, toDateMs } from '../utils/date';

// ─── Context Builder ──────────────────────────────────────────────────────────

interface ContextInput {
  profile: StudentProfile | null;
  logs: DailyLog[];
  exams: ExamResult[];
  eloScore: number;
  streakDays: number;
  tytSubjects: Array<{ status: string }>;
  aytSubjects: Array<{ status: string; subject: string }>;
  activeAlerts: HabitAlert[];
  lastDirective?: CoachDirective | null;
  callerSurface?: CoachIntent;
}

interface BuiltContext {
  /** Tek string sistem bağlamı — prompt'a eklenir */
  contextString: string;
  /** Tip-güvenli nesne — API userState'e gönderilir */
  userState: CoachSystemContext;
}

/**
 * buildCoachContext: tüm AI çağrıları için merkezi context üretici.
 * Memoize edilebilir — dışarıda useMemo ile sarılmalı.
 */
export function buildCoachContext(input: ContextInput): BuiltContext {
  const {
    profile,
    logs,
    exams,
    eloScore,
    streakDays,
    tytSubjects,
    aytSubjects,
    activeAlerts,
    lastDirective,
    callerSurface = 'free_chat',
  } = input;

  if (!profile) {
    return {
      contextString: '[Profil yok]',
      userState: _emptyContext(eloScore, streakDays, callerSurface),
    };
  }

  // ─── Son loglar (son 5) ──────────────────────────────────────────────────
  const last5Logs = logs
    .slice(-5)
    .map((l) => {
      const acc = Math.round((l.correct / (l.questions || 1)) * 100);
      return `${l.subject}/${l.topic}: ${l.questions}s %${acc} başarı ${l.avgTime}dk`;
    });

  // ─── Son denemeler (son 3) ────────────────────────────────────────────────
  const last3Exams = exams
    .slice(-3)
    .map((e) => `${e.type}: ${e.totalNet.toFixed(1)} net`);

  const lastTytExam = [...exams].reverse().find((e) => e.type === 'TYT');
  const lastAytExam = [...exams].reverse().find((e) => e.type === 'AYT');

  // ─── Müfredat progress ────────────────────────────────────────────────────
  const tytMastered = tytSubjects.filter((s) => s.status === 'mastered').length;
  const tytTotal = tytSubjects.length || 1;
  const tytPct = Math.round((tytMastered / tytTotal) * 100);

  const relevantAyt = getAytSubjectsForTrack(aytSubjects, profile.track);
  const aytMastered = relevantAyt.filter((s) => s.status === 'mastered').length;
  const aytTotal = relevantAyt.length || 1;
  const aytPct = Math.round((aytMastered / aytTotal) * 100);

  // ─── Gap hesabı ──────────────────────────────────────────────────────────
  const lastTytNet = lastTytExam?.totalNet ?? 0;
  const lastAytNet = lastAytExam?.totalNet ?? 0;
  const tytGap = profile.tytTarget - lastTytNet;
  const aytGap = profile.aytTarget - lastAytNet;

  // ─── Son direktif durumu ──────────────────────────────────────────────────
  let lastDirectiveStatus: CoachSystemContext['lastDirectiveStatus'] = 'none';
  if (lastDirective) {
    const total = lastDirective.tasks.length;
    const completed = lastDirective.tasks.filter(
      (t) => t.status === 'completed'
    ).length;
    if (completed === total) lastDirectiveStatus = 'resolved';
    else if (completed > 0) lastDirectiveStatus = 'partial';
    else lastDirectiveStatus = 'abandoned';
  }

  // ─── UserState nesnesi ────────────────────────────────────────────────────
  const userState: CoachSystemContext = {
    name: profile.name,
    track: profile.track,
    targetUniversity: profile.targetUniversity,
    targetMajor: profile.targetMajor,
    tytTarget: profile.tytTarget,
    aytTarget: profile.aytTarget,
    lastTytNet,
    lastAytNet,
    eloScore,
    streakDays,
    lastLogs: last5Logs,
    lastExams: last3Exams,
    alertCount: activeAlerts.length,
    tytProgressPercent: tytPct,
    aytProgressPercent: aytPct,
    coachPersonality: profile.coachPersonality,
    tytGap,
    aytGap,
    lastDirectiveStatus,
    callerSurface,
  };

  // ─── Context string ───────────────────────────────────────────────────────
  const lines: string[] = [
    `[ÖĞRENCİ]`,
    `İsim: ${profile.name} | Alan: ${profile.track}`,
    `Hedef: ${profile.targetUniversity} / ${profile.targetMajor}`,
    `TYT Hedef: ${profile.tytTarget} | AYT Hedef: ${profile.aytTarget}`,
    `Mevcut: TYT ${lastTytNet.toFixed(1)} (${tytGap > 0 ? `-${tytGap.toFixed(1)} net geride` : `+${Math.abs(tytGap).toFixed(1)} net önde`})`,
    `        AYT ${lastAytNet.toFixed(1)} (${aytGap > 0 ? `-${aytGap.toFixed(1)} net geride` : `+${Math.abs(aytGap).toFixed(1)} net önde`})`,
    `ELO: ${eloScore} | Seri: ${streakDays} gün`,
    `Müfredat: TYT %${tytPct} / AYT %${aytPct}`,
    ``,
    `[SON LOGLAR]`,
    last5Logs.length > 0 ? last5Logs.join(' | ') : 'Log yok',
    ``,
    `[SON DENEMELER]`,
    last3Exams.length > 0 ? last3Exams.join(' | ') : 'Deneme yok',
    ``,
    `[UYARILAR]`,
    activeAlerts.length > 0
      ? activeAlerts.map((a) => a.message).join(' | ')
      : 'Aktif uyarı yok',
  ];

  if (lastDirective) {
    lines.push(``, `[SON PLAN DURUMU]`, `${lastDirectiveStatus}`);
  }

  return {
    contextString: lines.join('\n'),
    userState,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAytSubjectsForTrack(
  subjects: Array<{ status: string; subject: string }>,
  track: string
): Array<{ status: string; subject: string }> {
  const trackMap: Record<string, string[]> = {
    Sayısal: ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
    'Eşit Ağırlık': ['Matematik', 'Edebiyat', 'Tarih', 'Coğrafya'],
    Sözel: ['Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe Grubu'],
    Dil: ['Yabancı Dil'],
  };
  const allowed = trackMap[track] ?? [];
  return subjects.filter((s) => allowed.includes(s.subject));
}

function _emptyContext(
  eloScore: number,
  streakDays: number,
  callerSurface: CoachIntent
): CoachSystemContext {
  return {
    name: 'Anonim',
    track: 'Sayısal',
    tytTarget: 0,
    aytTarget: 0,
    eloScore,
    streakDays,
    lastLogs: [],
    lastExams: [],
    alertCount: 0,
    tytProgressPercent: 0,
    aytProgressPercent: 0,
    callerSurface,
  };
}

// ─── Context Hash ─────────────────────────────────────────────────────────────

/**
 * Directive kaydı için hafif context hash.
 * Aynı veri durumunda üretilen directive'leri deduplication için.
 */
export function hashContext(ctx: CoachSystemContext): string {
  const key = [
    ctx.lastTytNet ?? 0,
    ctx.lastAytNet ?? 0,
    ctx.eloScore,
    ctx.streakDays,
    ctx.tytProgressPercent,
    ctx.aytProgressPercent,
    ctx.alertCount,
    toISODateOnly(),
  ].join('|');
  return btoa(key).slice(0, 12);
}

// ─── Log Summary Helpers ──────────────────────────────────────────────────────

/**
 * Son N log'u insan okunabilir özete çevirir.
 * App.tsx'teki inline map'lerin yerine geçer.
 */
export function summarizeLogsForPrompt(logs: DailyLog[], count = 5): string {
  if (logs.length === 0) return 'Log yok';
  return logs
    .slice(-count)
    .map((l) => {
      const acc = Math.round((l.correct / (l.questions || 1)) * 100);
      return `${l.subject}(${l.topic}): ${l.questions}s %${acc} başarı`;
    })
    .join(' | ');
}

/**
 * Son N denemeyi insan okunabilir özete çevirir.
 */
export function summarizeExamsForPrompt(
  exams: ExamResult[],
  count = 3
): string {
  if (exams.length === 0) return 'Deneme yok';
  return exams
    .slice(-count)
    .map((e) => `${e.type}:${e.totalNet.toFixed(1)}N`)
    .join(' | ');
}
