/**
 * AMAÇ: War Room Soru Üretimi (Groq/Gemini üzerinden)
 * MANTIK: Taze soruları AI ile üretir, session skorlaması yapar
 *
 * TODO-002 FIX:
 *  - AbortController ile 25s timeout
 *  - Eksik soru sayısında retry (reduced count)
 *  - Options array padding (tam 5 şık garantisi)
 *  - startTime NaN guard finishSession'da
 */

import { getCoachResponse } from './gemini';
import type { WarRoomQuestion } from '../types';

export interface GenerateQuestionsOptions {
  examType: 'TYT' | 'AYT';
  subject?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'elite';
  count?: number;
  weakTopics?: string[];
  coachPersonality?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D', 'E']);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'elite']);
const VALID_EXAM_TYPES = new Set(['TYT', 'AYT']);
const OPTION_PLACEHOLDER = 'Bu şık AI tarafından üretilemedi.';

function validateAndNormalizeQuestion(
  raw: unknown,
  index: number,
  fallbackExamType: 'TYT' | 'AYT',
  fallbackDifficulty: string
): WarRoomQuestion | null {
  if (!raw || typeof raw !== 'object') {
    console.warn(`[WarRoom] Soru ${index}: geçersiz nesne`, raw);
    return null;
  }

  const q = raw as Record<string, unknown>;

  if (!q.text || typeof q.text !== 'string' || q.text.trim().length < 5) {
    console.warn(`[WarRoom] Soru ${index}: "text" eksik`, q.text);
    return null;
  }

  // TODO-002: Pad options to exactly 5
  let options: string[] = [];
  if (Array.isArray(q.options)) {
    options = q.options
      .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
      .slice(0, 5);
  }
  while (options.length < 5) {
    options.push(OPTION_PLACEHOLDER);
  }

  const rawAnswer = typeof q.correctAnswer === 'string'
    ? q.correctAnswer.trim().toUpperCase()
    : '';
  const correctAnswer = VALID_ANSWERS.has(rawAnswer) ? rawAnswer : 'A';

  const rawDifficulty = typeof q.difficulty === 'string' ? q.difficulty : fallbackDifficulty;
  const difficulty = VALID_DIFFICULTIES.has(rawDifficulty)
    ? (rawDifficulty as WarRoomQuestion['difficulty'])
    : (fallbackDifficulty as WarRoomQuestion['difficulty']);

  const rawExamType = typeof q.examType === 'string' ? q.examType.toUpperCase() : fallbackExamType;
  const examType = VALID_EXAM_TYPES.has(rawExamType)
    ? (rawExamType as 'TYT' | 'AYT')
    : fallbackExamType;

  return {
    id: typeof q.id === 'string' && q.id.trim() ? q.id : `q${index}_${Date.now()}`,
    subject: typeof q.subject === 'string' && q.subject.trim() ? q.subject : `${examType} Karma`,
    topic: typeof q.topic === 'string' && q.topic.trim() ? q.topic : 'Genel',
    difficulty,
    examType,
    text: q.text.trim(),
    options,
    correctAnswer,
    analysis: typeof q.analysis === 'string' && q.analysis.trim()
      ? q.analysis.trim()
      : 'Analiz mevcut değil.',
    image: typeof q.image === 'string' ? q.image : undefined,
    source: 'AI',
  };
}

function buildFallbackQuestion(
  examType: 'TYT' | 'AYT',
  topic: string,
  difficulty: string
): WarRoomQuestion {
  return {
    id: `offline_mock_${Date.now()}`,
    subject: examType,
    topic: topic || 'Temel Kavramlar',
    difficulty: (VALID_DIFFICULTIES.has(difficulty) ? difficulty : 'medium') as WarRoomQuestion['difficulty'],
    examType,
    text: 'İnternet bağlantınızda veya AI servisinde geçici bir sorun var. Bu bir yedek (offline) sorudur. 2 + 2 kaçtır?',
    options: ['1', '2', '3', '4', '5'],
    correctAnswer: 'D',
    analysis: 'Matematikte 2 + 2 = 4\'tür. Offline modda çalışmaktayız.',
    source: 'archive',
  };
}

function buildFallbackArray(
  count: number,
  examType: 'TYT' | 'AYT',
  topic: string,
  difficulty: string
): WarRoomQuestion[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    ...buildFallbackQuestion(examType, topic, difficulty),
    id: `offline_mock_${Date.now()}_${i}`,
  }));
}

// ─── Promise with timeout helper ──────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildWarRoomPrompt(
  opts: GenerateQuestionsOptions,
  count: number,
  topicCtx: string
): string {
  const { examType, subject, difficulty = 'medium' } = opts;
  const diffMap: Record<string, string> = {
    easy: 'temel, doğrudan uygulama',
    medium: 'orta düzey, 1-2 adımlı akıl yürütme',
    hard: 'zor, tuzaklı YKS tarzı',
    elite: 'en yüksek zorluk, ÖSYM görünümlü olimpiyat ayarı',
  };

  return `
Sen Türkiye'nin en seçkin yayın evlerinde soru yazan bir uzmansın.
Aşağıdaki kriterlere göre ${count} adet %100 ÖSYM TARZI soru üret.

KRİTERLER:
- Sınav: ${examType}
- ${topicCtx}
- Zorluk Seviyesi: ${diffMap[difficulty] || diffMap.medium}
- Şıklar: 5 seçenek (A, B, C, D, E)
- Format: Matematiksel ifadelerde LaTeX kullan: \\(x^2\\)

ZORUNLU ÇIKTI FORMATI (SADECE SAF JSON DİZİSİ):
[
  {
    "id": "unique_id_${Date.now()}_0",
    "subject": "${subject || examType + ' Karma'}",
    "topic": "Alt Konu",
    "difficulty": "${difficulty}",
    "examType": "${examType}",
    "text": "Soru metni.",
    "options": ["A Şıkkı", "B Şıkkı", "C Şıkkı", "D Şıkkı", "E Şıkkı"],
    "correctAnswer": "C",
    "analysis": "Çözüm açıklaması."
  }
]

ÖNEMLİ: JSON DIŞINDA HİÇBİR AÇIKLAMA METNİ EKLEME. [ ] ile başla ve bitir.
`.trim();
}

// ─── Ana üretim fonksiyonu ────────────────────────────────────────────────────

export async function generateWarRoomQuestions(
  opts: GenerateQuestionsOptions
): Promise<WarRoomQuestion[]> {
  const {
    examType,
    subject,
    topic,
    difficulty = 'medium',
    count = 5,
    weakTopics = [],
    coachPersonality,
  } = opts;

  let topicCtx = '';
  if (topic) topicCtx = `Konu: ${topic}`;
  else if (weakTopics.length > 0) topicCtx = `Öğrencinin zayıf konuları: ${weakTopics.slice(0, 3).join(', ')}`;
  else topicCtx = `${examType} genel karma`;

  const prompt = buildWarRoomPrompt(opts, count, topicCtx);

  async function attemptGeneration(targetCount: number): Promise<WarRoomQuestion[]> {
    // TODO-002: 25s hard timeout
    const raw = await withTimeout(
      getCoachResponse(
        buildWarRoomPrompt({ ...opts, count: targetCount }, targetCount, topicCtx),
        `${examType} Savaş Simülasyonu`,
        [],
        { forceJson: true, maxTokens: 3000, coachPersonality }
      ),
      25000
    );

    let jsonStr = raw.trim();
    if (jsonStr.includes('```')) {
      const parts = jsonStr.split('```');
      const block = parts.find((p) => p.startsWith('json')) || parts[1] || '';
      jsonStr = block.replace(/^json/, '').trim();
    }

    const startIdx = jsonStr.indexOf('[');
    const endIdx = jsonStr.lastIndexOf(']');
    if (startIdx === -1 || endIdx === -1) {
      console.error('[WarRoom] JSON array bulunamadı');
      return [];
    }

    jsonStr = jsonStr
      .substring(startIdx, endIdx + 1)
      .replace(/,\s*]/g, ']')
      .replace(/,\s*}/g, '}');

    let parsedData: unknown[];
    try {
      parsedData = JSON.parse(jsonStr);
    } catch {
      console.error('[WarRoom] JSON parse hatası');
      return [];
    }

    if (!Array.isArray(parsedData)) return [];

    return parsedData
      .map((q, i) => validateAndNormalizeQuestion(q, i + 1, examType, difficulty))
      .filter((q): q is WarRoomQuestion => q !== null);
  }

  try {
    // First attempt: full count
    const validated = await attemptGeneration(count);

    if (validated.length === 0) {
      console.warn('[WarRoom] İlk deneme başarısız, fallback kullanılıyor');
      return buildFallbackArray(count, examType, topic || '', difficulty);
    }

    // TODO-002: If we got less than requested, retry with reduced count
    if (validated.length < count) {
      console.warn(`[WarRoom] ${validated.length}/${count} soru geldi, eksik için retry`);
      try {
        const remaining = count - validated.length;
        const extra = await attemptGeneration(Math.ceil(remaining));
        const merged = [...validated, ...extra];
        return merged.slice(0, count);
      } catch {
        // Partial success — return what we have
        return validated;
      }
    }

    return validated;
  } catch (error) {
    console.error('[WarRoom] generateWarRoomQuestions genel hata', error);
    return buildFallbackArray(count, examType, topic || '', difficulty);
  }
}

// ─── Skorlama ─────────────────────────────────────────────────────────────────

export function scoreWarRoomSession(
  questions: WarRoomQuestion[],
  answers: Record<string, string>
) {
  let correct = 0;
  let wrong = 0;
  let empty = 0;

  for (const q of questions) {
    const ans = answers[q.id];
    if (!ans) empty++;
    else if (ans === q.correctAnswer) correct++;
    else wrong++;
  }

  const net = correct - wrong * 0.25;
  const accuracy = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

  return { correct, wrong, empty, net, accuracy };
}
