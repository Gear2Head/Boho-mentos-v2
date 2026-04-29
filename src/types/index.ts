/**
 * AMAÇ: Tüm uygulamanın tip tanımlamaları
 * MANTIK: Merkezi tip yönetimi ile temiz tip bağımlılıkları oluşturmak
 */

export interface CoachMemory {
  majorMistakes: string[];
  commitments: string[];
  lastStrategyPlanId?: string;
  avoidedSubjects?: string[];
  weeklyStudyHours?: number;
}

export interface StudentProfile {
  name: string;
  exam: string;
  track: 'Sayısal' | 'Eşit Ağırlık' | 'Sözel' | 'Dil';
  targetUniversity: string;
  targetMajor: string;
  tytTarget: number;
  aytTarget: number;
  minHours: number;
  maxHours: number;
  dailyGoalHours: number;
  startTime: string;
  endTime: string;
  aytPriorities: string;
  weakSubjects: string;
  strongSubjects: string;
  resources: string;
  motivationQuote?: string;
  examYear?: string;
  minDailyQuestions: number;
  maxDailyQuestions: number;
  coachPersonality?: string;
  yokAtlasNet?: number;
  avatar?: string;
  targetGoals?: AtlasProgram[];
  lastSyncAt?: string; // [SYNC-FIX]: Son başarılı eşitleme zamanı
  coachMemory?: CoachMemory; // [Faz 2 - Hafıza]
  streakShields?: number; // [Faz 2 - Streak Freeze]
  usedStreakShieldDates?: string[];
  activeDays?: string[]; // [FAZ-3]: Sistem girişine göre seri takibi
  role?: import('../config/admin').UserRole;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'achievement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface AtlasProgram {
  id: string;
  universityName: string;
  programName: string;
  faculty: string;
  scoreType: string;
  baseScore?: number;
  successRank?: number;
  tytNet?: number;
  aytNet?: number;
  year?: number;
}

export type SubjectStatusType = 'not-started' | 'in-progress' | 'mastered';

export interface SubjectStatus {
  subject: string;
  name: string;
  status: SubjectStatusType;
  notes: string;
}

export interface DailyLog {
  id?: string;
  date: string;
  createdAt?: string;
  subject: string;
  topic: string;
  questions: number;
  correct: number;
  wrong: number;
  empty: number;
  avgTime: number;
  fatigue: number;
  tags?: string[];
  notes?: string;
  sessionId?: string;
  sourceName?: string;
  source?: 'manual' | 'coach' | 'agenda' | 'voice' | 'system';
}

export interface SourceROI {
  sourceName: string;
  totalQuestions: number;
  avgAccuracy: number;
  avgSecondsPerQ: number;
  roiScore: number;
}

export type HabitAlertType = 'avoiding_subject' | 'memorization_risk' | 'neglected_subject';

export interface HabitAlert {
  id: string;
  type: HabitAlertType;
  subject: string;
  message: string;
  createdAt: string;
}

export interface ExamResult {
  id: string;
  date: string;
  type: 'TYT' | 'AYT';
  totalNet: number;
  scores: Record<string, { correct: number; wrong: number; net: number }>;
  source?: 'manual' | 'agenda';
  note?: string;
}

export interface FailedQuestion {
  id: string;
  date: string;
  subject: string;
  topic: string;
  book: string;
  page: string;
  questionNumber: string;
  reason: string;
  status: 'active' | 'solved';
  solveCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  imageUrl?: string;
}

import type { CoachDirective } from './coach';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'coach' | 'system';
  content: string;
  timestamp: string;
  directive?: CoachDirective;
  imageUrl?: string;
  isSystemEvent?: boolean;
  senderId?: string;
}

export interface ConversationBrief {
  id: string;
  title: string;
  updatedAt: string;
  lastMessage?: string;
}

export interface Conversation extends ConversationBrief {
  messages: ChatMessage[];
}

export type RankTitle = 'Bronz' | 'Gümüş' | 'Altın' | 'Platin' | 'Elmas' | 'Usta' | 'Şampiyon';

export type RarityTier = 'iron' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';
export type AchievementCategory = 'streak' | 'volume' | 'performance' | 'focus' | 'hidden';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  tier: RarityTier;
  category: AchievementCategory;
  isHidden: boolean;
  icon: string;
  reward: {
    elo: number;
    themeUnlock?: string;
    personaUnlock?: string;
    badgeTitle?: string;
  };
  calculateProgress: (state: any) => { current: number; target: number };
}

export interface UserAchievement {
  id: string;
  unlockedAt: string;
  isViewed: boolean;
}

export interface Trophy {
  id: string;
  title: string;
  description: string;
  unlockedAt: string | null;
  icon: string;
  category?: 'streak' | 'performance' | 'milestone' | 'special';
}

export interface AgendaEntry {
  id: string;
  date: string;
  content: string;
  linkedLogIds?: string[];
  source?: 'manual' | 'coach' | 'log' | 'system';
  parsedExam?: {
    type: 'TYT' | 'AYT';
    totalNet: number;
  };
  mood?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  aiAnalysis?: string;
}

export interface FocusSessionRecord {
  id: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  label?: string;
  linkedLogId?: string;
  interruptions?: number;
  deepWorkScore?: number;
}

export interface SubjectExamNet {
  subject: string;
  nets: number[];
  avgNet: number;
  lastUpdated: string;
}


export interface WarRoomQuestion {
  id: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'elite';
  examType: 'TYT' | 'AYT';
  text: string;
  image?: string;
  options: string[];
  correctAnswer: string;
  analysis: string;
  source?: 'AI' | 'manual' | 'archive';
}

export interface WarRoomResult {
  questionId: string;
  selected: string | null;
  correct: boolean;
  eliminated: number[];
  timeSpent: number;
}

export type WarRoomMode = 'setup' | 'solve' | 'result';

export interface WarRoomSession {
  id: string;
  startTime: number;
  endTime: number; // [TIMER-FIX]: absolute epoch ms — used for drift-free countdown
  examType: 'TYT' | 'AYT' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard' | 'elite';
  questions: WarRoomQuestion[];
  status: 'active' | 'completed' | 'abandoned';
  result?: {
    correct: number;
    wrong: number;
    empty: number;
    net: number;
    accuracy: number;
    timeSpentSeconds: number;
  };
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  claims?: Record<string, unknown>;
}

export interface EconomyEvent {
  id: string;
  eventKey: string;
  type: 'elo_award' | 'coin_award' | 'coin_spend' | 'repair';
  source: string;
  eloDelta?: number;
  coinDelta?: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}


export interface QASession {
  scenario: 'plan' | 'log' | 'exam' | 'topic';
  currentQuestion: number;
  totalQuestions: number;
  answers: Record<number, string>;
  isComplete: boolean;
}
