/**
 * AMAÇ: Koç V3 — Tip Sistemi, Directive Schema ve Coach Memory
 * MANTIK: Her AI yüzeyi bu kontrat üzerinden çalışır; any kullanımı yasaktır.
 *
 * Değişiklikler (V19):
 *  - CoachIntent genişletildi: war_room_analysis, exam_debrief, weekly_review
 *  - CoachTask: completion, dueWindow, originSurface, rationale alanları eklendi
 *  - DirectiveRecord: tarihsel direktif kaydı için yeni tip
 *  - CoachMemory: kalıcı koç hafızası (chat'ten bağımsız)
 *  - CoachApiRequest: legacy "coach" action kaldırıldı, intent bazlı model
 */

// ─── Intent ──────────────────────────────────────────────────────────────────

/** Tüm AI yüzeylerinin kullandığı merkezi intent enum */
export type CoachIntent =
  | 'daily_plan'
  | 'log_analysis'
  | 'exam_analysis'
  | 'exam_debrief'       // Yeni: deneme sonrası otomatik savaş raporu
  | 'topic_explain'
  | 'intervention'
  | 'qa_mode'
  | 'free_chat'
  | 'war_room_analysis'  // Yeni: War Room bittikten sonra
  | 'weekly_review'      // Yeni: haftalık retrospektif
  | 'micro_feedback';    // Yeni: log sonrası anlık mikro analiz

// ─── Task (Görev Nesnesi) ────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface CoachTask {
  /** Görevin içeriği */
  action: string;
  /** Öncelik seviyesi */
  priority: TaskPriority;
  /** İlgili ders */
  subject?: string;
  /** İlgili konu */
  topic?: string;
  /** Tahmini dakika */
  targetMinutes?: number;
  // V19: Yeni alanlar
  /** Görev neden bu şekilde belirlendi — 1 satır veri temelli gerekçe */
  rationale?: string;
  /** Hangi yüzeyden üretildi: coach/strategy/warroom/agenda */
  originSurface?: 'coach' | 'strategy' | 'warroom' | 'agenda' | 'system';
  /** Ne zaman tamamlanması bekleniyor */
  dueWindow?: 'today' | 'tomorrow' | 'this_week';
  /** Tamamlanma durumu (UI izleme için) */
  status?: TaskStatus;
  /** Tamamlanma zamanı */
  completedAt?: string;
  /** Neden atlıandı veya başarısız oldu */
  skipReason?: string;
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

/** Chat temizlense bile koç öğrenciyi tanımaya devam eder */
export interface CoachMemory {
  /** Son trendler: son 7 günde baskın zayıf konu(lar) */
  recurringWeaknesses: string[];
  /** Son trendler: güçlü alanlar */
  strengths: string[];
  /** Kalıcı direktif özeti: "Bu öğrenci X konusunda tekrar hata yapıyor" */
  persistentNotes: string[];
  /** Son haftalık net trend: artan / azalan / stabil */
  netTrend: 'rising' | 'falling' | 'stable' | 'unknown';
  /** Son güncellenme */
  updatedAt: string;
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
}

// ─── API Request ──────────────────────────────────────────────────────────────

/**
 * API'ye gönderilecek tek standarttaki request gövdesi.
 * NOT: legacy "coach" action tamamen kaldırıldı.
 * Tüm yüzeyler intent kullanır.
 */
export interface CoachApiRequest {
  /** Intent bazlı model — "coach" artık geçersiz */
  intent: CoachIntent;
  userMessage: string;
  context: string;
  chatHistory?: Array<{ role: 'user' | 'coach'; content: string }>;
  coachPersonality?: string;
  forceJson?: boolean;
  maxTokens?: number;
  userState?: Partial<CoachSystemContext>;
  /** Structured directive çıktısı isteniyorsa true */
  wantDirective?: boolean;
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
  /** pending / acknowledged / resolved / ignored */
  status: 'pending' | 'acknowledged' | 'resolved' | 'ignored';
}
