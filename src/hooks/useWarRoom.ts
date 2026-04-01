/**
 * AMAÇ: War Room Oturum Yönetimi
 * MANTIK: Timer app-wide Zustand store'da tutulur — hook yeniden mount edilse bile state sıfırlanmaz.
 * UYARI: timeLeft yerel useState YOKTUR. Her mount'ta 0'dan başlama sorununu ortadan kaldırır.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { generateWarRoomQuestions, scoreWarRoomSession, type GenerateQuestionsOptions } from '../services/warRoomService';
import type { WarRoomSession, WarRoomQuestion } from '../types';
import { useToast } from '../components/ToastContext';

export function useWarRoom() {
  const store = useAppStore();
  const { confirm } = useToast();
  const { warRoomSession, warRoomMode, warRoomTimeLeft, setWarRoomSession, setWarRoomMode, setWarRoomTimeLeft } = store;

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishSession = useCallback(() => {
    if (!warRoomSession) return;

    const { correct, wrong, empty, net, accuracy } = scoreWarRoomSession(
      warRoomSession.questions,
      store.warRoomAnswers
    );

    const timeSpentSeconds = Math.max(0, Math.round((Date.now() - warRoomSession.startTime) / 1000));
    const endedSession: WarRoomSession = {
      ...warRoomSession,
      status: 'completed',
      result: { correct, wrong, empty, net, accuracy, timeSpentSeconds }
    };

    setWarRoomTimeLeft(0);
    setWarRoomSession(endedSession);
    setWarRoomMode('result');

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
      avgTime: 1,
      tags: ['#SAVAŞ_ODASI'],
      notes: 'War Room simülasyonu.',
      sourceName: 'War Room',
    });
  }, [warRoomSession, store, setWarRoomTimeLeft, setWarRoomSession, setWarRoomMode]);

  useEffect(() => {
    const shouldTick =
      warRoomMode === 'solve' &&
      warRoomSession?.status === 'active' &&
      warRoomTimeLeft > 0;

    if (!shouldTick) return;

    const interval = setInterval(() => {
      setWarRoomTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => finishSession(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [warRoomSession?.status, warRoomMode, warRoomTimeLeft, finishSession]);

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
      setWarRoomTimeLeft(timeLimitSeconds);
      setWarRoomMode('solve');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Savaş odası başlatılamadı.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [setWarRoomSession, setWarRoomTimeLeft, setWarRoomMode]);

  const quitSession = useCallback(async () => {
    if (await confirm('Savaştan kaçıyor musun? Geri dönüşü yok.')) {
      setWarRoomTimeLeft(0);
      setWarRoomSession(null);
      setWarRoomMode('setup');
    }
  }, [confirm, setWarRoomTimeLeft, setWarRoomSession, setWarRoomMode]);

  return {
    isGenerating,
    error,
    timeLeft: warRoomTimeLeft,
    startSession,
    finishSession,
    quitSession
  };
}
