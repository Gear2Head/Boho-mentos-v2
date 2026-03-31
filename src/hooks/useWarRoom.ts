/**
 * AMAÇ: War Room Oturum Yönetimi
 * MANTIK: Timer, oturumu başlatma, bitirme, sonraki soruya geçme
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { generateWarRoomQuestions, scoreWarRoomSession, type GenerateQuestionsOptions } from '../services/warRoomService';
import type { WarRoomSession, WarRoomQuestion } from '../types';

export function useWarRoom() {
  const store = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const { warRoomSession, warRoomMode, setWarRoomSession, setWarRoomMode } = store;

  // Timer Effect
  useEffect(() => {
    // Sadece 'solve' modunda, aktif bir oturum varken ve süre henüz bitmemişken çalışmalı
    if (warRoomMode !== 'solve' || !warRoomSession || warRoomSession.status !== 'active' || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // finishSession'ı bir timeout ile çağırıyoruz ki state batching tamamlansın
          setTimeout(() => finishSession(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [warRoomSession?.status, warRoomMode, timeLeft > 0]);

  const startSession = useCallback(async (opts: GenerateQuestionsOptions, timeLimitSeconds: number) => {
    try {
      setIsGenerating(true);
      setError(null);

      const qs: WarRoomQuestion[] = await generateWarRoomQuestions(opts);

      const newSession: WarRoomSession = {
        id: `sess_${Date.now()}`,
        startTime: Date.now(),
        examType: opts.examType,
        difficulty: opts.difficulty || 'medium',
        questions: qs,
        status: 'active',
      };

      setWarRoomSession(newSession);
      setTimeLeft(timeLimitSeconds);
      setWarRoomMode('solve');
    } catch (err: any) {
      setError(err.message || 'Savaş odası başlatılamadı.');
    } finally {
      setIsGenerating(false);
    }
  }, [setWarRoomSession, setWarRoomMode]);

  const finishSession = useCallback(() => {
    if (!warRoomSession) return;

    const { correct, wrong, empty, net, accuracy } = scoreWarRoomSession(
      warRoomSession.questions,
      store.warRoomAnswers
    );

    const endedSession: WarRoomSession = {
      ...warRoomSession,
      status: 'completed',
      result: {
        correct, wrong, empty, net, accuracy, timeSpentSeconds: 0 //TODO total - timeLeft
      }
    };

    setWarRoomSession(endedSession);
    setWarRoomMode('result');
    
    // Log olarak kaydet
    store.addLog({
      id: `warroom_${Date.now()}`,
      date: new Date().toISOString(),
      subject: warRoomSession.examType + ' Savaş Odası',
      topic: warRoomSession.questions[0]?.topic || 'Karma',
      questions: warRoomSession.questions.length,
      correct,
      wrong,
      empty,
      fatigue: 0,
      avgTime: 1, // Savaş modunda şimdilik sabit
      tags: ['#SAVAŞ_ODASI'],
      notes: 'War Room simülasyonu.',
      sourceName: 'War Room',
    });

  }, [warRoomSession, store]);

  const quitSession = useCallback(() => {
    if (window.confirm('Savaştan kaçıyor musun? Geri dönüşü yok.')) {
      setWarRoomSession(null);
      setWarRoomMode('setup');
    }
  }, [setWarRoomSession, setWarRoomMode]);

  return {
    isGenerating,
    error,
    timeLeft,
    startSession,
    finishSession,
    quitSession
  };
}
