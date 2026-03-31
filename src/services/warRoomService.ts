/**
 * AMAÇ: War Room Soru Üretimi (Groq/Gemini üzerinden)
 * MANTIK: Taze soruları AI ile üretir, session skorlaması yapar
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
    "subject": "${subject || 'TYT Karma'}",
    "topic": "Problemler",
    "difficulty": "medium",
    "examType": "TYT",
    "text": "Soru metni burada",
    "options": ["Şık A", "Şık B", "Şık C", "Şık D", "Şık E"],
    "correctAnswer": "B",
    "analysis": "Çözüm açıklaması burada. Neden C değil B vs."
  }
]

UYARI: Başka hiçbir metin yazma, sadece JSON formatında array döndür ve syntax olarak hatasız olsun.
`.trim();

  try {
    const raw = await getCoachResponse(
      prompt,
      `${examType} Savaş Simülasyonu Soru Üretimi`,
      [],
      { forceJson: true, maxTokens: 3000, coachPersonality }
    );

    const match = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!match) throw new Error('YKS Koçu geçerli bir JSON liste döndüremedi.');

    const parsedData = JSON.parse(match[0]);
    if (!Array.isArray(parsedData)) throw new Error('JSON formatı hatalı');

    const questions: WarRoomQuestion[] = parsedData.map(
      (q: Partial<WarRoomQuestion>, i: number) => ({
        id: q.id ?? `q${i + 1}_${Date.now()}`,
        subject: q.subject ?? `${examType} ${subject ?? 'Karma'}`,
        topic: q.topic ?? topic ?? 'Genel',
        difficulty: q.difficulty ?? difficulty,
        examType: q.examType ?? examType,
        text: q.text ?? 'Soru verisi okunamadı.',
        options: Array.isArray(q.options) ? q.options : ['A','B','C','D','E'],
        correctAnswer: q.correctAnswer ?? 'A',
        analysis: q.analysis ?? 'Analiz bulunamadı.',
        source: 'AI',
      })
    );
    return questions;
  } catch (error) {
    console.error("War room question gen error", error);
    // Fallback Mock Datası
    return [
      {
         id: "mock_q1",
         subject: examType,
         topic: topic || "Temel Kavramlar",
         difficulty: difficulty,
         examType: examType,
         text: "İnternet bağlantınız veya API erişiminizde bir sorun var. Bu bir yedek (offline) sorudur. 2+2 kaçtır?",
         options: ["1", "2", "3", "4", "5"],
         correctAnswer: "D",
         analysis: "Matematikte 2+2 her zaman 4'tür. Offline modda çalışmaktayız.",
         source: "archive"
      }
    ];
  }
}

export function scoreWarRoomSession(
  questions: WarRoomQuestion[],
  answers: Record<string, string>
) {
  let correct = 0;
  let wrong = 0;
  let empty = 0;

  questions.forEach((q) => {
    const ans = answers[q.id];
    if (!ans) {
      empty++;
    } else if (ans === q.correctAnswer) {
      correct++;
    } else {
      wrong++;
    }
  });

  const net = correct - wrong * 0.25;
  const accuracy = questions.length > 0
    ? Math.round((correct / questions.length) * 100)
    : 0;

  return { correct, wrong, empty, net, accuracy };
}
