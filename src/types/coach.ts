/**
 * AMAÇ: Koç V2 Structured Directive tip sistemi
 * MANTIK: Serbest metin yerine makine okunabilir direktif şeması. Her AI yüzeyinde tip-güvenli.
 * UYARI: CoachDirective.text geriye dönük uyumluluk için korunur; yeni yüzeyler fields kullanmalı.
 */

/** [COACH-003 FIX]: Merkezi intent enum — her AI yüzeyinde ayrım request seviyesinde görünür */
export type CoachIntent =
  | 'daily_plan'
  | 'log_analysis'
  | 'exam_analysis'
  | 'topic_explain'
  | 'intervention'
  | 'qa_mode'
  | 'free_chat';

/** [COACH-001 FIX]: Structured Directive çıktı şeması */
export interface CoachDirective {
  /** Tek cümlelik genel değerlendirme */
  headline: string;
  /** Kısa 2-3 cümlelik özet */
  summary: string;
  /** Aksiyon listesi — max 3 */
  tasks: CoachTask[];
  /** Kritik uyarılar — opsiyonel */
  warnings?: CoachWarning[];
  /** Sonraki sefer sorulacak soru */
  followUpQuestion?: string;
  /** Ham metin — geriye dönük uyumluluk ve serbest akış için */
  text?: string;
  /** Oluşturulma tarihi */
  createdAt: string;
  /** Hangi intent ile üretildi */
  intent: CoachIntent;
}

export interface CoachTask {
  priority: 'high' | 'medium' | 'low';
  subject?: string;
  topic?: string;
  action: string;
  targetMinutes?: number;
}

export interface CoachWarning {
  type: 'avoidance' | 'memorization_risk' | 'time_loss' | 'low_accuracy' | 'streak_break';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

/** [COACH-002 FIX]: Tip-güvenli CoachSystemContext — any kullanımı yasak */
export interface CoachSystemContext {
  /** Öğrencinin adı */
  name: string;
  /** Alan: Sayısal, EA, Sözel, Dil */
  track: string;
  /** Hedef üniversite */
  targetUniversity?: string;
  /** Hedef bölüm */
  targetMajor?: string;
  /** TYT hedef net */
  tytTarget: number;
  /** AYT hedef net */
  aytTarget: number;
  /** Son TYT net (son deneme) */
  lastTytNet?: number;
  /** Son AYT net (son deneme) */
  lastAytNet?: number;
  /** ELO puanı */
  eloScore: number;
  /** Gün serisi */
  streakDays: number;
  /** Son 3 log özeti */
  lastLogs: string[];
  /** Son 1 deneme özeti */
  lastExams: string[];
  /** Aktif uyarı sayısı */
  alertCount: number;
  /** Müfredat tamamlanma yüzdesi TYT */
  tytProgressPercent: number;
  /** Müfredat tamamlanma yüzdesi AYT */
  aytProgressPercent: number;
  /** Kişisel koçluk tarzı tercihi */
  coachPersonality?: string;
}

/** API'ye gönderilecek request gövdesi */
export interface CoachApiRequest {
  action?: CoachIntent;
  userMessage: string;
  context: string;
  chatHistory?: Array<{ role: 'user' | 'coach'; content: string }>;
  coachPersonality?: string;
  forceJson?: boolean;
  maxTokens?: number;
  userState?: Partial<CoachSystemContext>;
}
