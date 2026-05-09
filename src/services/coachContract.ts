import type {
  CoachDecision,
  CoachDecisionKind,
  CoachIntent,
  CoachIntentPolicy,
  CoachResponseDepth,
  CoachSystemContext,
} from '../types/coach';

export const STRUCTURED_DIRECTIVE_INTENTS = new Set<CoachIntent>([
  'daily_plan',
  'log_analysis',
  'exam_analysis',
  'exam_debrief',
  'war_room_analysis',
  'weekly_review',
  'micro_feedback',
  'daily_quest',
  'generate_weekly_strategy',
  'forgetting_curve_reminder',
]);

export const JSON_ONLY_INTENTS = new Set<CoachIntent>([
  'flashcard_generation',
  'quiz_generation',
]);

export const NO_CACHE_INTENTS = new Set<CoachIntent>([
  'free_chat',
  'daily_plan',
  'log_analysis',
  'exam_analysis',
  'exam_debrief',
  'war_room_analysis',
  'weekly_review',
  'micro_feedback',
  'daily_quest',
  'generate_weekly_strategy',
  'forgetting_curve_reminder',
  'inverse_coaching',
  'intervention',
  'socratic_force',
  'vision_archive_parse',
]);

const PLAN_REQUEST_TOKENS = [
  'plan',
  'program',
  'gorev',
  'görev',
  'ne calis',
  'ne çalış',
  'bugun ne',
  'bugün ne',
  'todo',
  'yol haritasi',
  'yol haritası',
  'aksiyon',
  'bana gorev',
  'bana görev',
] as const;

const RESOURCE_REQUEST_TOKENS = [
  'kaynak',
  'kitap',
  'video',
  'pdf',
  'meb',
  'eba',
  'soru bankasi',
  'soru bankası',
] as const;

const LOG_CONFIRMATION_TOKENS = [
  'cozdum',
  'çözdüm',
  'calistim',
  'çalıştım',
  'bitirdim',
  'soru',
  'dogru',
  'doğru',
] as const;

export const COACH_INTENT_POLICIES: Record<CoachIntent, CoachIntentPolicy> = {
  daily_plan: policy('daily_plan', 'generate_plan', true, false, false, 'operational', true),
  log_analysis: policy('log_analysis', 'analyze_performance', true, false, false, 'deep', true),
  exam_analysis: policy('exam_analysis', 'analyze_performance', true, false, false, 'deep', true),
  exam_debrief: policy('exam_debrief', 'analyze_performance', true, false, false, 'deep', true),
  topic_explain: policy('topic_explain', 'teach_concept', false, false, true, 'deep', false),
  intervention: policy('intervention', 'critical_intervention', true, false, false, 'operational', true),
  qa_mode: policy('qa_mode', 'natural_chat', false, false, true, 'standard', false),
  free_chat: policy('free_chat', 'natural_chat', false, false, false, 'standard', false),
  war_room_analysis: policy('war_room_analysis', 'analyze_performance', true, false, false, 'deep', true),
  weekly_review: policy('weekly_review', 'analyze_performance', true, false, false, 'deep', true),
  micro_feedback: policy('micro_feedback', 'analyze_performance', false, false, false, 'quick', true),
  inverse_coaching: policy('inverse_coaching', 'teach_concept', false, false, false, 'standard', true),
  flashcard_generation: policy('flashcard_generation', 'resource_guidance', false, true, true, 'standard', false),
  forgetting_curve_reminder: policy('forgetting_curve_reminder', 'generate_plan', true, false, false, 'standard', true),
  daily_quest: policy('daily_quest', 'generate_plan', true, false, false, 'operational', true),
  vision_archive_parse: policy('vision_archive_parse', 'log_confirmation', false, false, false, 'standard', true),
  generate_weekly_strategy: policy('generate_weekly_strategy', 'generate_plan', true, false, false, 'operational', true),
  quiz_generation: policy('quiz_generation', 'resource_guidance', false, true, true, 'standard', false),
  socratic_force: policy('socratic_force', 'teach_concept', false, false, false, 'deep', true),
};

function policy(
  intent: CoachIntent,
  decisionKind: CoachDecisionKind,
  allowDirective: boolean,
  forceJson: boolean,
  cacheable: boolean,
  responseDepth: CoachResponseDepth,
  requiresFreshData: boolean
): CoachIntentPolicy {
  return {
    intent,
    decisionKind,
    allowDirective,
    forceJson,
    cacheable,
    responseDepth,
    requiresFreshData,
  };
}

export function userExplicitlyAskedForPlan(message = ''): boolean {
  const normalized = normalize(message);
  return PLAN_REQUEST_TOKENS.some((token) => normalized.includes(normalize(token)));
}

export function userAskedForResources(message = ''): boolean {
  const normalized = normalize(message);
  return RESOURCE_REQUEST_TOKENS.some((token) => normalized.includes(normalize(token)));
}

export function looksLikeLogConfirmation(message = ''): boolean {
  const normalized = normalize(message);
  const hasAction = LOG_CONFIRMATION_TOKENS.some((token) => normalized.includes(normalize(token)));
  return hasAction && /\d/.test(normalized);
}

export function getCoachIntentPolicy(intent: CoachIntent): CoachIntentPolicy {
  return COACH_INTENT_POLICIES[intent] ?? COACH_INTENT_POLICIES.free_chat;
}

export function resolveCoachDecision(
  intent: CoachIntent,
  params: {
    message?: string;
    explicitDirective?: boolean;
    userState?: Partial<CoachSystemContext>;
  } = {}
): CoachDecision {
  const base = getCoachIntentPolicy(intent);
  const message = params.message ?? '';
  const planRequested = userExplicitlyAskedForPlan(message);
  const resourceRequested = userAskedForResources(message);
  const logCandidate = looksLikeLogConfirmation(message);
  const explicitDirective = Boolean(params.explicitDirective);

  let decisionKind = base.decisionKind;
  if (resourceRequested && intent === 'free_chat') decisionKind = 'resource_guidance';
  if (logCandidate && intent === 'free_chat') decisionKind = 'log_confirmation';
  if (planRequested && intent === 'free_chat') decisionKind = 'generate_plan';

  const shouldAttachDirective =
    base.allowDirective &&
    (explicitDirective || planRequested || intent === 'daily_plan' || intent === 'daily_quest' || intent === 'generate_weekly_strategy');

  const forceJson = base.forceJson || shouldAttachDirective;
  const cacheable = base.cacheable && !base.requiresFreshData && !shouldAttachDirective;

  return {
    intent,
    decisionKind,
    shouldAttachDirective,
    forceJson,
    cacheable,
    responseDepth: base.responseDepth,
    reason: buildDecisionReason(decisionKind, shouldAttachDirective, params.userState),
  };
}

export function shouldRequestDirective(intent: CoachIntent, explicit?: boolean, message?: string): boolean {
  return resolveCoachDecision(intent, { explicitDirective: explicit, message }).shouldAttachDirective;
}

export function shouldForceJson(intent: CoachIntent, wantsDirective: boolean): boolean {
  return resolveCoachDecision(intent, { explicitDirective: wantsDirective }).forceJson || JSON_ONLY_INTENTS.has(intent);
}

export function isCacheableCoachIntent(intent: CoachIntent): boolean {
  return getCoachIntentPolicy(intent).cacheable && !NO_CACHE_INTENTS.has(intent);
}

export function getExamPhase(daysToExam?: number): NonNullable<CoachSystemContext['examPhase']> {
  if (typeof daysToExam !== 'number') return 'balanced';
  if (daysToExam > 90) return 'foundation';
  if (daysToExam > 45) return 'balanced';
  if (daysToExam > 15) return 'quick_gains';
  return 'risk_reduction';
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('tr-TR');
}

function buildDecisionReason(
  decisionKind: CoachDecisionKind,
  shouldAttachDirective: boolean,
  userState?: Partial<CoachSystemContext>
): string {
  const parts = [`decision=${decisionKind}`, shouldAttachDirective ? 'directive=on' : 'directive=off'];
  if (userState?.lastDirectiveStatus) parts.push(`lastPlan=${userState.lastDirectiveStatus}`);
  if (typeof userState?.planComplianceScore === 'number') parts.push(`compliance=${userState.planComplianceScore}`);
  if (userState?.examPhase) parts.push(`examPhase=${userState.examPhase}`);
  return parts.join('; ');
}
