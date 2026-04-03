/**
 * AMAÇ: War Room Soru Üretimi (Groq/Gemini üzerinden)
 * MANTIK: Taze soruları AI ile üretir, session skorlaması yapar
 *
 * [BUG-005 FIX]: AI halüsinasyonlarından kaynaklanan eksik JSON field'ları artık
 * guard clause tabanlı validation katmanıyla tespit edilip normalize ediliyor.
 * Hatalı/eksik sorular atılıp kalan geçerli sorularla devam ediliyor.
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

/**
 * [BUG-005] Guard clause validation.
 * Eksik veya hatalı field'ları düzeltir ya da soruyu atar.
 * Throw etmek yerine null döndürür — caller invalid soruları filtreler.
 */
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

  // text: zorunlu, string olmalı
  if (!q.text || typeof q.text !== 'string' || q.text.trim().length < 5) {
    console.warn(`[WarRoom] Soru ${index}: "text" eksik veya çok kısa`, q.text);
    return null;
  }

  // options: zorunlu, en az 4 şık, string dizisi
  if (!Array.isArray(q.options) || q.options.length < 4) {
    console.warn(`[WarRoom] Soru ${index}: "options" eksik veya yetersiz`, q.options);
    return null;
  }
  const options = q.options
    .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
    .slice(0, 5);
  if (options.length < 4) {
    console.warn(`[WarRoom] Soru ${index}: geçerli şık sayısı yetersiz`);
    return null;
  }

  // correctAnswer: A-E arası olmalı
  const rawAnswer = typeof q.correctAnswer === 'string'
    ? q.correctAnswer.trim().toUpperCase()
    : '';
  const correctAnswer = VALID_ANSWERS.has(rawAnswer) ? rawAnswer : 'A';
  if (!VALID_ANSWERS.has(rawAnswer)) {
    console.warn(`[WarRoom] Soru ${index}: "correctAnswer" geçersiz, A kullanılıyor`, q.correctAnswer);
  }

  // difficulty: normalize
  const rawDifficulty = typeof q.difficulty === 'string' ? q.difficulty : fallbackDifficulty;
  const difficulty = VALID_DIFFICULTIES.has(rawDifficulty)
    ? (rawDifficulty as WarRoomQuestion['difficulty'])
    : (fallbackDifficulty as WarRoomQuestion['difficulty']);

  // examType: normalize
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

// ─── Fallback mock soru ────────────────────────────────────────────────────────

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
  if (topic) {
    topicCtx = `Konu: ${topic}`;
  } else if (weakTopics.length > 0) {
    topicCtx = `Öğrencinin zayıf konuları: ${weakTopics.slice(0, 3).join(', ')}`;
  } else {
    topicCtx = `${examType} genel karma`;
  }

  const diffMap = {
    easy: 'temel, doğrudan uygulama',
    medium: 'orta düzey, 1-2 adımlı akıl yürütme',
    hard: 'zor, tuzaklı YKS tarzı',
    elite: 'en yüksek zorluk, ÖSYM görünümlü olimpiyat ayarı',
  };

  const prompt = `
Sen YKS soru yazarısın. Aşağıdaki kriterlere göre ${count} adet çoktan seçmeli soru üret.

KRİTERLER:
- Sınav: ${examType}
- ${topicCtx}
- Zorluk: ${diffMap[difficulty]}
- Her sorunun 5 şıkkı olsun (A, B, C, D, E)
- Türkçe olsun
- Sadece TYT ve AYT formatına uygun müfredat içi özgün sorular olsun

ZORUNLU ÇIKTI FORMATI (SADECE JSON DİZİSİ):
[
  {
    "id": "q1",
    "subject": "${subject || examType + ' Karma'}",
    "topic": "Örnek Konu",
    "difficulty": "${difficulty}",
    "examType": "${examType}",
    "text": "Soru metni burada",
    "options": ["Şık A", "Şık B", "Şık C", "Şık D", "Şık E"],
    "correctAnswer": "B",
    "analysis": "Çözüm açıklaması burada."
  }
]

UYARI: Başka hiçbir metin yazma. Sadece geçerli JSON array döndür.
`.trim();

  try {
    const raw = await getCoachResponse(
      prompt,
      `${examType} Savaş Simülasyonu Soru Üretimi`,
      [],
      { forceJson: true, maxTokens: 3000, coachPersonality }
    );

    // JSON array'i bul
    const match = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!match) {
      console.error('[WarRoom] AI geçerli JSON array döndürmedi');
      return [buildFallbackQuestion(examType, topic || '', difficulty)];
    }

    let parsedData: unknown[];
    try {
      parsedData = JSON.parse(match[0]);
    } catch (parseErr) {
      console.error('[WarRoom] JSON parse hatası', parseErr);
      return [buildFallbackQuestion(examType, topic || '', difficulty)];
    }

    if (!Array.isArray(parsedData)) {
      console.error('[WarRoom] Parse edilen veri array değil');
      return [buildFallbackQuestion(examType, topic || '', difficulty)];
    }

    // [BUG-005] Her soruyu validate et, geçersizleri filtrele
    const validated = parsedData
      .map((q, i) => validateAndNormalizeQuestion(q, i + 1, examType, difficulty))
      .filter((q): q is WarRoomQuestion => q !== null);

    if (validated.length === 0) {
      console.warn('[WarRoom] Tüm sorular validation\'dan geçemedi, fallback kullanılıyor');
      return [buildFallbackQuestion(examType, topic || '', difficulty)];
    }

    if (validated.length < parsedData.length) {
      console.warn(
        `[WarRoom] ${parsedData.length - validated.length} soru validation'dan geçemedi, ` +
        `${validated.length} soru kullanılıyor`
      );
    }

    return validated;
  } catch (error) {
    console.error('[WarRoom] generateWarRoomQuestions genel hata', error);
    return [buildFallbackQuestion(examType, topic || '', difficulty)];
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
    if (!ans) {
      empty++;
    } else if (ans === q.correctAnswer) {
      correct++;
    } else {
      wrong++;
    }
  }

  const net = correct - wrong * 0.25;
  const accuracy =
    questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

  return { correct, wrong, empty, net, accuracy };
}
