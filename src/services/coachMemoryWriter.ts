/**
 * AMAÇ: CoachMemory güncelleme döngüsü — log, deneme ve direktif olaylarından hafızayı besler.
 * MANTIK: CoachMemory tipi mükemmel tanımlı ama hiçbir yerde yazılmıyordu. Bu servis onu yazar.
 */

import type { CoachMemory } from '../types/coach';
import type { DailyLog, ExamResult, StudentProfile } from '../types';

// ─── Defaults ──────────────────────────────────────────────────────────────────

export function createDefaultMemory(): CoachMemory {
  return {
    recurringWeakTopics: [],
    recurringAvoidedSubjects: [],
    staleAdvicePatterns: [],
    interventionEffectiveness: 'unknown',
    missedTaskReasons: [],
    strongSubjects: [],
    persistentNotes: [],
    netTrend: 'unknown',
    updatedAt: new Date().toISOString(),
  };
}

// ─── Memory Updater ────────────────────────────────────────────────────────────

/**
 * updateCoachMemory: Mevcut hafızayı log ve sınav verileriyle güncelleyen ana fonksiyon.
 * Store.setState ile profil güncellenir.
 */
export function updateCoachMemory(
  currentMemory: CoachMemory | undefined,
  logs: DailyLog[],
  exams: ExamResult[],
  _profile: StudentProfile
): CoachMemory {
  const mem = currentMemory ? { ...currentMemory } : createDefaultMemory();

  // ─── 1. Recurring Weak Topics (son 14 gündeki düşük doğruluk konuları) ──────
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentLogs = logs.filter(l => new Date(l.date).getTime() >= twoWeeksAgo);

  const topicAccuracy = new Map<string, { correct: number; total: number; count: number }>();
  recentLogs.forEach(l => {
    if (l.questions <= 0) return;
    const key = `${l.subject}/${l.topic}`;
    const existing = topicAccuracy.get(key) || { correct: 0, total: 0, count: 0 };
    existing.correct += l.correct;
    existing.total += l.questions;
    existing.count += 1;
    topicAccuracy.set(key, existing);
  });

  // ASSUME: Accuracy < 50% ve en az 2 ayrı oturum → recurring weak
  mem.recurringWeakTopics = Array.from(topicAccuracy.entries())
    .filter(([, v]) => v.count >= 2 && (v.correct / v.total) < 0.5)
    .map(([key]) => key)
    .slice(0, 8);

  // ─── 2. Strong Subjects (tutarlı yüksek doğruluk) ──────────────────────────
  const subjectAcc = new Map<string, { correct: number; total: number }>();
  recentLogs.forEach(l => {
    if (l.questions <= 0) return;
    const existing = subjectAcc.get(l.subject) || { correct: 0, total: 0 };
    existing.correct += l.correct;
    existing.total += l.questions;
    subjectAcc.set(l.subject, existing);
  });

  mem.strongSubjects = Array.from(subjectAcc.entries())
    .filter(([, v]) => v.total >= 10 && (v.correct / v.total) >= 0.75)
    .map(([subject]) => subject);

  // ─── 3. Avoided Subjects (son 3 gün hiç çalışılmayan dersler) ──────────────
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const veryRecentLogs = logs.filter(l => new Date(l.date).getTime() >= threeDaysAgo);
  const recentSubjects = new Set(veryRecentLogs.map(l => l.subject));
  const allSubjects = new Set(logs.slice(-30).map(l => l.subject));

  mem.recurringAvoidedSubjects = Array.from(allSubjects)
    .filter(s => !recentSubjects.has(s))
    .slice(0, 5);

  // ─── 4. Net Trend (son 3 deneme karşılaştırması) ───────────────────────────
  if (exams.length >= 2) {
    const sorted = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const last = sorted[sorted.length - 1].totalNet;
    const prev = sorted[sorted.length - 2].totalNet;
    const delta = last - prev;
    mem.netTrend = delta > 2 ? 'rising' : delta < -2 ? 'falling' : 'stable';
  }

  mem.updatedAt = new Date().toISOString();
  return mem;
}

// ─── Stale Advice Detection ────────────────────────────────────────────────────

/**
 * detectStaleAdvice: Koçun tekrar tekrar verdiği tavsiyeleri tespit eder.
 * Son N mesajda aynı kelime kalıbı 3+ kez geçiyorsa "stale" olarak işaretler.
 */
export function detectStaleAdvice(
  coachMessages: string[],
  existingPatterns: string[]
): string[] {
  const patternCounts = new Map<string, number>();

  // ASSUME: Son 20 koç mesajındaki ortak ifadeleri sayıyoruz
  const recent = coachMessages.slice(-20);
  const keyPhrases = [
    'türev', 'integral', 'limit', 'fonksiyon', 'geometri', 'olasılık',
    'daha fazla soru çöz', 'tekrar et', 'zaman yönetimi', 'odaklan',
    'hedefine ulaş', 'deneme çöz', 'zayıf konuları', 'pratik yap',
  ];

  recent.forEach(msg => {
    const lower = msg.toLowerCase();
    keyPhrases.forEach(phrase => {
      if (lower.includes(phrase)) {
        patternCounts.set(phrase, (patternCounts.get(phrase) || 0) + 1);
      }
    });
  });

  const stale = Array.from(patternCounts.entries())
    .filter(([, count]) => count >= 3)
    .map(([phrase]) => phrase);

  // Mevcut stale pattern'lere yenileri ekle, tekrarı önle
  const combined = new Set([...existingPatterns, ...stale]);
  return Array.from(combined).slice(0, 10);
}
