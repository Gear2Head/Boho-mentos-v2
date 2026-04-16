/**
 * AMAÇ: Koç Domain Tip Sistemi — tüm AI yüzeyleri bu kontrat üzerinden çalışır.
 * MANTIK: Intent → Directive → Task → Memory hiyerarşisi. any kullanımı yasaktır.
 * UYARI: COACH-CORE-002 + COACH-MEM-001 — CoachTask yürütülebilir görev nesnesi;
 *         CoachMemory gerçek performans verisinden besleniyor.
 *
 * Değişiklikler (Sprint-1):
 *  - CoachTask: id, title, dueDate, targetQuestions, successCriteria, expectedOutcome,
 *               linkedLogIds, linkedExamIds, sourceEvidence, failureReason eklendi
 *  - TaskStatus: deferred, cancelled, blocked eklendi
 *  - CoachMemory: recurringWeakTopics, recurringAvoidedSubjects, staleAdvicePatterns,
 *                 interventionEffectiveness, missedTaskReasons, strongSubjects eklendi
 */

// ─── Intent ──────────────────────────────────────────────────────────────────

/** Tüm AI yüzeylerinin kullandığı merkezi intent enum */
export type CoachIntent =
  | 'daily_plan'
  | 'log_analysis'
  | 'exam_analysis'
  | 'exam_debrief'
  | 'topic_explain'
  | 'intervention'
  | 'qa_mode'
  | 'free_chat'
  | 'war_room_analysis'
  | 'weekly_review'
  | 'micro_feedback'
  // TODO-007: Kübra v2 intent'leri
  | 'inverse_coaching'
  | 'flashcard_generation'
  | 'forgetting_curve_reminder'
  | 'daily_quest';

// ─── Task (Görev Nesnesi) ────────────────────────────────────────────────────

/** COACH-CORE-002: Tam görev yaşam döngüsü — pending → completed/failed/cancelled/deferred/blocked */
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'deferred'
  | 'failed'
  | 'cancelled'
  | 'blocked';
  // Legacy: 'skipped' → 'deferred' ile eşanlamlı; yeni kodda deferred kullan

export type TaskPriority = 'high' | 'medium' | 'low';

/** Bir görevin başarısız/atlanma nedeni — KOÇ'un sonraki kararını etkiler */
export type TaskFailureReason =
  | 'time_shortage'
  | 'topic_too_hard'
  | 'low_motivation'
  | 'forgot'
  | 'technical_issue'
  | 'external_factor'
  | 'dependency_blocked'
  | 'other';

/**
 * CoachTask: Direktiften doğan, bağımsız yaşam döngüsüne sahip yürütülebilir görev.
 * Sadece chat'te görünen bir madde değil; agenda, focus ve review akışlarına bağlanır.
 */
export interface CoachTask {
  /** UUID — directive kapansa bile görev yaşamaya devam eder */
  id: string;
  /** Kısa, eyleme geçilebilir başlık */
  title: string;
  /** Detaylı görev açıklaması */
  action: string;
  /** Öncelik seviyesi */
  priority: TaskPriority;
  /** İlgili ders */
  subject?: string;
  /** İlgili konu */
  topic?: string;
  /** Tahmini çalışma süresi (dakika) */
  targetMinutes?: number;
  /** Hedef soru sayısı */
  targetQuestions?: number;
  /** Son tamamlanma tarihi (ISO string) */
  dueDate?: string;
  /** Genel zaman penceresi */
  dueWindow?: 'today' | 'tomorrow' | 'this_week';
  /** Görev neden belirlendi — 1 satır veri temelli gerekçe */
  rationale?: string;
  /** Başarı ölçütü — KOÇ bunu okuyarak kararını verir */
  successCriteria?: string;
  /** Tamamlanınca ne kazanılır */
  expectedOutcome?: string;
  /** Hangi yüzeyden üretildi */
  originSurface?: 'coach' | 'strategy' | 'warroom' | 'agenda' | 'system';
  /** Görev durumu */
  status?: TaskStatus;
  /** Tamamlanma zamanı */
  completedAt?: string;
  /** Neden başarısız/atlandı — KOÇ sonraki mud gelenekte bunu okur */
  failureReason?: TaskFailureReason;
  /** Gerekirse ek açıklama */
  failureNote?: string;
  /** Bağlantılı log ID'leri */
  linkedLogIds?: string[];
  /** Bağlantılı sınav ID'leri */
  linkedExamIds?: string[];
  /** Bu göreve yol açan kanıt özeti (KOÇ context'i için) */
  sourceEvidence?: string;
  /** Oluşturulma tarihi */
  createdAt?: string;
  /** Son güncellenme tarihi */
  updatedAt?: string;
}

// ─── Warning ─────────────────────────────────────────────────────────────────

export type WarningType =
  | 'avoidance'
  | 'memorization_risk'
  | 'time_loss'
  | 'low_accuracy'
  | 'streak_break'
  | 'burnout_risk'
  | 'target_gap';

export type WarningSeverity = 'info' | 'warning' | 'critical';

export interface CoachWarning {
  type: WarningType;
  message: string;
  severity: WarningSeverity;
}

// ─── Directive ───────────────────────────────────────────────────────────────

/** Koç'un bir yanıtının yapılandırılmış çıktısı */
export interface CoachDirective {
  /** Tek cümlelik genel değerlendirme */
  headline: string;
  /** 2-3 cümlelik özet */
  summary: string;
  /** Aksiyon listesi — max 5 */
  tasks: CoachTask[];
  /** Kritik uyarılar */
  warnings?: CoachWarning[];
  /** Sonraki sefer sorulacak soru */
  followUpQuestion?: string;
  /** Ham metin — UI render için */
  text?: string;
  /** Oluşturulma tarihi */
  createdAt: string;
  /** Hangi intent ile üretildi */
  intent: CoachIntent;
  /** Güven skoru: 0-100 */
  confidence?: number;
}

// ─── Directive Record (Tarihsel Kayıt) ───────────────────────────────────────

/** Directive geçmişi için kayıt (chat'ten bağımsız) */
export interface DirectiveRecord {
  id: string;
  directive: CoachDirective;
  /** Hangi verilerle üretildi — özet */
  contextHash: string;
  /** Kaç görev tamamlandı */
  completedTaskCount: number;
  /** Kaç görev atlandı */
  skippedTaskCount: number;
  /** Tamamlandı mı (tüm görevler işlendi) */
  isResolved: boolean;
  /** Surface'e özel meta */
  meta?: Record<string, unknown>;
}

// ─── Coach Memory (Kalıcı Hafıza) ────────────────────────────────────────────

/**
 * CoachMemory: Kalıcı hafıza — chat silinse bile KOÇ öğrenciyi tanır.
 * COACH-MEM-001: Gerçek performans verisinden türetilir, görev tamamlama sayısından değil.
 */
export interface CoachMemory {
  /** Son 14 günde tekrar eden zayıf konular (log + exam verisiyle belirlenir) */
  recurringWeakTopics: string[];
  /** Öğrencinin sürekli kaçındığı dersler */
  recurringAvoidedSubjects: string[];
  /** Koçun tekrar verdiği tavsiyeler (bayan: stale_advice_count > 2 ise alarm) */
  staleAdvicePatterns: string[];
  /** Müdahale etkinliği: intervention sonrası iyileşme var mı? */
  interventionEffectiveness: 'effective' | 'partial' | 'none' | 'unknown';
  /** Başarısız görevlerin en yaygın nedenleri (Ders: Neden formatında) */
  missedTaskReasons: string[];
  /** Güçlü alanlar (tutarlı yüksek doğruluk) */
  strongSubjects: string[];
  /** Kalıcı koç notları — "Bu öğrenci X'te tekrar düşüyor" */
  persistentNotes: string[];
  /** Son haftalık net trend */
  netTrend: 'rising' | 'falling' | 'stable' | 'unknown';
  /** Son güncellenme */
  updatedAt: string;
  /**
   * @deprecated Eski alan — recurringWeakTopics ile karşılandı.
   * Geriye dönük uyumluluk için tutuldu; yeni kodda kullanma.
   */
  recurringWeaknesses?: string[];
  /** @deprecated strengths → strongSubjects */
  strengths?: string[];
}

// ─── System Context ───────────────────────────────────────────────────────────

/** Tüm AI çağrılarına gönderilecek tip-güvenli öğrenci bağlamı */
export interface CoachSystemContext {
  name: string;
  track: string;
  targetUniversity?: string;
  targetMajor?: string;
  tytTarget: number;
  aytTarget: number;
  lastTytNet?: number;
  lastAytNet?: number;
  eloScore: number;
  streakDays: number;
  /** Son 3 log — özet metin dizisi */
  lastLogs: string[];
  /** Son 1 deneme — özet metin dizisi */
  lastExams: string[];
  alertCount: number;
  tytProgressPercent: number;
  aytProgressPercent: number;
  coachPersonality?: string;
  // V19: Yeni alanlar
  /** Target gap: hedef net ile mevcut net farkı */
  tytGap?: number;
  aytGap?: number;
  /** Kalıcı hafıza özeti */
  memoryNotes?: string[];
  /** Son direktif görevlerinin tamamlanma durumu */
  lastDirectiveStatus?: 'resolved' | 'partial' | 'abandoned' | 'none';
  /** Hangi surface'ten çağrılıyor */
  callerSurface?: CoachIntent;
  /** [B5]: Koçun tekrarladığı tavsiyeler — prompt'ta TEKRARLAMA YASAK olarak geçer */
  staleAdvicePatterns?: string[];
}

// ─── API Request ──────────────────────────────────────────────────────────────

/**
 * API'ye gönderilecek tek standarttaki request gövdesi.
 * NOT: legacy "coach" action tamamen kaldırıldı.
 * Tüm yüzeyler intent kullanır.
 */
export interface CoachApiRequest {
  intent: CoachIntent;
  userMessage: string;
  context: string;
  chatHistory?: Array<{ role: 'user' | 'coach'; content: string }>;
  coachPersonality?: string;
  forceJson?: boolean;
  maxTokens?: number;
  userState?: Partial<CoachSystemContext>;
  wantDirective?: boolean;
  // TODO-010: Vision support
  imageBase64?: string;
  imageMediaType?: string;
}

// ─── Response ─────────────────────────────────────────────────────────────────

export interface CoachApiResponse {
  text: string;
  directive?: CoachDirective;
  error?: string;
  providerUsed?: string;
}

// ─── Intervention ─────────────────────────────────────────────────────────────

export interface InterventionRecord {
  id: string;
  alertId: string;
  alertType: string;
  subject: string;
  message: string;
  generatedPlan: string;
  createdAt: string;
  resolvedAt?: string;
  status: 'pending' | 'acknowledged' | 'resolved' | 'ignored';
}

// ─── TODO-008: Flashcard ─────────────────────────────────────────────────────

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
  createdAt: string;
  nextReviewAt: string;
  reviewCount: number;
  lastCorrect: boolean | null;
}

// ─── TODO-011: Ghost Rival ───────────────────────────────────────────────────

export interface GhostRival {
  id: string;
  name: string;
  eloScore: number;
  tytNet: number;
  aytNet: number;
  streakDays: number;
  source: 'self_past' | 'community_avg' | 'target_rank';
}
