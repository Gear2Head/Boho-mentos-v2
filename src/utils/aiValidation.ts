/**
 * AMAÇ: Zod şemaları ile AI yanıtlarını doğrula — halüsinasyonları ve eksik alanları yakala.
 * MANTIK: Her intent tipi için ayrı şema. safeParse ile graceful degradation.
 */

import { z } from 'zod';

// ─── Directive Schema ──────────────────────────────────────────────────────────

const CoachTaskSchema = z.object({
  id: z.string().default(() => `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
  title: z.string().default(''),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  subject: z.string().optional(),
  topic: z.string().optional(),
  action: z.string().default('Görev detayı belirtilmedi'),
  targetMinutes: z.number().optional(),
  targetQuestions: z.number().optional(),
  dueWindow: z.enum(['today', 'tomorrow', 'this_week']).optional(),
  rationale: z.string().optional(),
  successCriteria: z.string().optional(),
  originSurface: z.enum(['coach', 'strategy', 'warroom', 'agenda', 'system']).default('coach'),
});

const CoachWarningSchema = z.object({
  type: z.string().default('avoidance'),
  message: z.string().default(''),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
});

export const DirectiveSchema = z.object({
  headline: z.string().default('Koç Analizi'),
  summary: z.string().default(''),
  tasks: z.array(CoachTaskSchema).default([]),
  warnings: z.array(CoachWarningSchema).default([]),
  followUpQuestion: z.string().optional(),
  confidence: z.number().min(0).max(100).default(70),
  detectedLogs: z.array(z.object({
    subject: z.string(),
    topic: z.string().default(''),
    questions: z.number().default(0),
    duration: z.number().default(0),
  })).default([]),
});

// ─── Micro Feedback Schema ─────────────────────────────────────────────────────

export const MicroFeedbackSchema = z.object({
  headline: z.string().default('Seans değerlendirmesi'),
  risk: z.string().default(''),
  nextStep: z.object({
    subject: z.string().default(''),
    topic: z.string().default(''),
    targetQuestions: z.number().default(15),
    dueWindow: z.enum(['today', 'tomorrow', 'this_week']).default('today'),
  }).default({ subject: '', topic: '', targetQuestions: 15, dueWindow: 'today' as const }),
  confidence: z.number().min(0).max(100).default(70),
});

// ─── Flashcard Schema ──────────────────────────────────────────────────────────

export const FlashcardItemSchema = z.object({
  front: z.string(),
  back: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  subject: z.string().default(''),
  topic: z.string().optional(),
});

export const FlashcardArraySchema = z.array(FlashcardItemSchema);

// ─── Quiz Question Schema ──────────────────────────────────────────────────────

export const QuizQuestionSchema = z.object({
  id: z.string().default(() => `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
  subject: z.string().default(''),
  topic: z.string().default(''),
  difficulty: z.string().default('medium'),
  examType: z.string().default('TYT'),
  text: z.string().default('Soru yüklenemedi'),
  options: z.array(z.string()).min(2).default(['A', 'B', 'C', 'D', 'E']),
  correctAnswer: z.string().default('A'),
  analysis: z.string().default(''),
});

export const QuizQuestionsSchema = z.object({
  questions: z.array(QuizQuestionSchema).default([]),
});

// ─── Intervention Schema ───────────────────────────────────────────────────────

export const InterventionSchema = z.object({
  headline: z.string().default('Müdahale'),
  diagnosis: z.string().default(''),
  immediateAction: z.object({
    subject: z.string().default(''),
    topic: z.string().default(''),
    action: z.string().default(''),
    targetMinutes: z.number().default(30),
    targetQuestions: z.number().default(10),
    dueWindow: z.enum(['today', 'tomorrow', 'this_week']).default('today'),
  }).default({ subject: '', topic: '', action: '', targetMinutes: 30, targetQuestions: 10, dueWindow: 'today' as const }),
  consequence: z.string().default(''),
  severity: z.enum(['warning', 'critical']).default('warning'),
});

// ─── God-Tier Schemas ──────────────────────────────────────────────────────────

export const SocraticValidationSchema = z.object({
  isAnswerSufficient: z.boolean().default(false),
  analysis: z.string().default(''),
  nextQuestion: z.string().optional(),
  unlocked: z.boolean().default(false),
});

export const OraclePredictionSchema = z.object({
  trajectoryAnalysis: z.string().default(''),
  predictedYksRankDrop: z.number().default(0),
  brutalTruth: z.string().default(''),
  suggestedAction: z.string().default(''),
});

// ─── Safe Parse Helper ─────────────────────────────────────────────────────────

type IntentSchemaMap = {
  [key: string]: z.ZodType;
};

const INTENT_SCHEMA_MAP: IntentSchemaMap = {
  daily_plan: DirectiveSchema,
  log_analysis: DirectiveSchema,
  exam_analysis: DirectiveSchema,
  exam_debrief: DirectiveSchema,
  weekly_review: DirectiveSchema,
  daily_quest: DirectiveSchema,
  generate_weekly_strategy: DirectiveSchema,
  war_room_analysis: DirectiveSchema,
  micro_feedback: MicroFeedbackSchema,
  flashcard_generation: FlashcardArraySchema,
  quiz_generation: QuizQuestionsSchema,
  intervention: InterventionSchema,
  socratic_validation: SocraticValidationSchema,
  oracle_prediction: OraclePredictionSchema,
};

/**
 * validateAiResponse: AI'dan gelen parsed JSON'ı intent'e göre Zod ile doğrular.
 * Başarısızsa orijinal veriyi olduğu gibi döndürür (graceful degradation).
 */
export function validateAiResponse(
  parsed: unknown,
  intent: string
): { valid: boolean; data: unknown; errors?: string[] } {
  const schema = INTENT_SCHEMA_MAP[intent];
  if (!schema) {
    // ASSUME: Bilinmeyen intent'ler için doğrulama atlanır
    return { valid: true, data: parsed };
  }

  const result = schema.safeParse(parsed);
  if (result.success) {
    return { valid: true, data: result.data };
  }

  // Zod hata detaylarını logla
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  );
  console.warn(`[AiValidation] ${intent} doğrulama hatası:`, errors);

  // Graceful degradation: orijinal veriyi döndür
  return { valid: false, data: parsed, errors };
}
