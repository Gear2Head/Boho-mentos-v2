/**
 * AMAÇ: Tüm uygulamanın tip tanımlamaları
 * MANTIK: Merkezi tip yönetimi ile temiz tip bağımlılıkları oluşturmak
 */

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
  subject: string;
  topic: string;
  questions: number;
  correct: number;
  wrong: number;
  empty: number;
  avgTime: number;
  fatigue: number;
  tags: string[];
  sessionId?: string;
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

export interface ChatMessage {
  role: 'user' | 'coach';
  content: string;
  timestamp: string;
}

export type RankTitle = 'Bronz' | 'Gümüş' | 'Altın' | 'Platin' | 'Elmas' | 'Usta' | 'Şampiyon';

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
}

export interface SubjectExamNet {
  subject: string;
  nets: number[];
  avgNet: number;
  lastUpdated: string;
}
