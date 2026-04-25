/**
 * AMAÇ: War Room soru üretimi ve skorlaması.
 * MANTIK: AI çıktısını doğrular, eksik durumlarda güvenli fallback döner.
 */

import { getCoachResponse } from './gemini';
import type { WarRoomQuestion } from '../types';
import { parseAiArray } from '../utils/aiJson';

export interface GenerateQuestionsOptions {
  examType: 'TYT' | 'AYT';
  subject?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'elite';
  count?: number;
  weakTopics?: string[];
  coachPersonality?: string;
}

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
    return buildFallbackQuestion(fallbackExamType, 'Geçersiz Obje', fallbackDifficulty);
  }

  const q = raw as Record<string, unknown>;

  if (!q.text || typeof q.text !== 'string' || q.text.trim().length < 5) {
    console.warn(`[WarRoom] Soru ${index}: "text" eksik`, q.text);
    return buildFallbackQuestion(fallbackExamType, 'Geçersiz Soru', fallbackDifficulty);
  }

  let options: string[] = [];
  if (Array.isArray(q.options)) {
    options = q.options
      .filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
      .slice(0, 5);
  }
  while (options.length < 5) options.push(OPTION_PLACEHOLDER);

  const rawAnswer = typeof q.correctAnswer === 'string' ? q.correctAnswer.trim().toUpperCase() : '';
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
    text: 'İnternet bağlantınızda veya AI servisinde geçici bir sorun var. Bu bir yedek sorudur. 2 + 2 kaçtır?',
    options: ['1', '2', '3', '4', '5'],
    correctAnswer: 'D',
    analysis: 'Matematikte 2 + 2 = 4’tür. Offline modda çalışmaktayız.',
    source: 'archive',
  };
}

function buildFallbackArray(
  count: number,
  examType: 'TYT' | 'AYT',
  topic: string,
  difficulty: string
): WarRoomQuestion[] {
  return Array.from({ length: Math.max(1, count) }, (_, index) => ({
    ...buildFallbackQuestion(examType, topic, difficulty),
    id: `offline_mock_${Date.now()}_${index}`,
  }));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

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
Aşağıdaki kriterlere göre ${count} adet %100 ÖSYM tarzı soru üret.

KRİTERLER:
- Sınav: ${examType}
- ${topicCtx}
- Zorluk Seviyesi: ${diffMap[difficulty] || diffMap.medium}
- Şıklar: 5 seçenek (A, B, C, D, E)
- Format: Matematiksel ifadelerde LaTeX kullan: \\(x^2\\)
- ÇOK ÖNEMLİ: Tüm JSON içi LaTeX kodları ÇİFT TERS BÖLÜ (\\\\) ile yazılmalıdır! (Örn: \\\\frac, \\\\begin, \\\\Rightarrow, \\\\mu) Tek bölü (\f, \n, \r) JSON syntax hatası yaratır!

ZORUNLU ÇIKTI FORMATI (SADECE SAF JSON OBJESİ):
{
  "questions": [
    {
      "id": "unique_id_${Date.now()}_0",
      "subject": "${subject || `${examType} Karma`}",
      "topic": "Alt Konu",
      "difficulty": "${difficulty}",
      "examType": "${examType}",
      "text": "Soru metni.",
      "options": ["Gerçek Seçenek 1", "Gerçek Seçenek 2", "Gerçek Seçenek 3", "Gerçek Seçenek 4", "Gerçek Seçenek 5"],
      "correctAnswer": "C",
      "analysis": "Çözüm açıklaması."
    }
  ]
}

ÖNEMLİ: {"questions": [...]} formatında yanıt ver. Başka hiçbir metin ekleme.
`.trim();
}

export async function generateWarRoomQuestions(
  opts: GenerateQuestionsOptions
): Promise<WarRoomQuestion[]> {
  const {
    examType,
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

  async function attemptGeneration(targetCount: number): Promise<WarRoomQuestion[]> {
    const raw = await withTimeout(
      getCoachResponse(
        buildWarRoomPrompt({ ...opts, count: targetCount }, targetCount, topicCtx),
        `${examType} Savaş Simülasyonu`,
        [],
        { forceJson: true, maxTokens: 3000, coachPersonality }
      ),
      30000
    );

    // Radikal JSON Kuratarıcı (Groq text / markdown / double-escape bypass)
    let jsonString = raw;
    try {
      jsonString = jsonString.replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = jsonString.match(/\[\s*\{.*\}\s*\]/s) || jsonString.match(/\{\s*"questions"\s*:\s*(\[.*\])\s*\}/s);
      if (match) {
        jsonString = match[1] || match[0];
      }
    } catch (e) { console.warn('[WarRoom] JSON regex fallback failed:', e); }

    console.log('[WarRoom] Raw AI response:', raw.substring(0, 500));

    const parsedData = parseAiArray(jsonString, (question) =>
      validateAndNormalizeQuestion(question, 1, examType, difficulty)
    );

    console.log('[WarRoom] Parsed questions count:', parsedData?.length || 0);
    if (parsedData && parsedData.length > 0) {
      console.log('[WarRoom] First question:', parsedData[0]);
    }

    if (!parsedData || parsedData.length === 0) {
      console.error('[WarRoom] JSON parse/validation hatası. Raw:', raw.substring(0, 50) + '...');
      return [];
    }

    return parsedData.map((question, index) => ({
      ...question,
      id: question.id || `q${index + 1}_${Date.now()}`,
    }));
  }

  try {
    const validated = await attemptGeneration(count);

    if (validated.length === 0) {
      console.warn('[WarRoom] İlk deneme başarısız, fallback kullanılıyor');
      return buildFallbackArray(count, examType, topic || '', difficulty);
    }

    if (validated.length < count) {
      console.warn(`[WarRoom] ${validated.length}/${count} soru geldi, eksik için retry`);
      try {
        const remaining = count - validated.length;
        const extra = await attemptGeneration(Math.ceil(remaining));
        return [...validated, ...extra].slice(0, count);
      } catch {
        return validated;
      }
    }

    return validated;
  } catch (error) {
    console.error('[WarRoom] generateWarRoomQuestions genel hata', error);
    return buildFallbackArray(count, examType, topic || '', difficulty);
  }
}

export function scoreWarRoomSession(
  questions: WarRoomQuestion[],
  answers: Record<string, string>
) {
  let correct = 0;
  let wrong = 0;
  let empty = 0;

  for (const question of questions) {
    const answer = answers[question.id];
    if (!answer) empty += 1;
    else if (answer === question.correctAnswer) correct += 1;
    else wrong += 1;
  }

  const net = correct - wrong * 0.25;
  const accuracy = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

  return { correct, wrong, empty, net, accuracy };
}
