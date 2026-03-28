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
}

export type SubjectStatusType = 'not-started' | 'in-progress' | 'mastered';

export interface SubjectStatus {
  subject: string;
  name: string;
  status: SubjectStatusType;
  notes: string;
}

export interface DailyLog {
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
}

export interface ExamResult {
  id: string;
  date: string;
  type: 'TYT' | 'AYT';
  totalNet: number;
  scores: Record<string, { correct: number; wrong: number; net: number }>;
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

// Yeni: Sıralama
export type RankTitle = 'Bronz' | 'Gümüş' | 'Altın' | 'Platin' | 'Elmas' | 'Usta' | 'Şampiyon';

// Yeni: Oyunlaştırma
export interface Trophy {
  id: string;
  title: string;
  description: string;
  unlockedAt: string | null;
  icon: string; // lucide-react icon isme referans
}
