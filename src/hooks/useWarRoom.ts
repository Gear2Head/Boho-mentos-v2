/**
 * AMAÇ: War Room Oturum Yönetimi
 * MANTIK: Timer app-wide Zustand store'da tutulur — hook yeniden mount edilse bile state sıfırlanmaz.
 *
 * [BUG-012 FIX]: timeSpentSeconds artık 0 hardcoded değil.
 *   session.startTime epoch timestamp'inden gerçek süre hesaplanıyor.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import {
  generateWarRoomQuestions,
  scoreWarRoomSession,
  type GenerateQuestionsOptions,
} from '../services/warRoomService';
import type { WarRoomSession, WarRoomQuestion } from '../types';

export function useWarRoom() {
  const warRoomSession = useAppStore(s => s.warRoomSession);
  const warRoomMode = useAppStore(s => s.warRoomMode);
  const warRoomTimeLeft = useAppStore(s => s.warRoomTimeLeft);
  const warRoomAnswers = useAppStore(s => s.warRoomAnswers);
  const addLog = useAppStore(s => s.addLog);
  const setWarRoomSession = useAppStore(s => s.setWarRoomSession);
  const setWarRoomMode = useAppStore(s => s.setWarRoomMode);
  const setWarRoomTimeLeft = useAppStore(s => s.setWarRoomTimeLeft);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── finishSession ────────────────────────────────────────────────────────

  const finishSession = useCallback(() => {
    if (!warRoomSession) return;

    const { correct, wrong, empty, net, accuracy } = scoreWarRoomSession(
      warRoomSession.questions,
      warRoomAnswers
    );

    // [BUG-012 FIX]: Gerçek geçen süreyi hesapla
    const timeSpentSeconds = Math.round(
      (Date.now() - warRoomSession.startTime) / 1000
    );

    const endedSession: WarRoomSession = {
      ...warRoomSession,
      status: 'completed',
      result: {
        correct,
        wrong,
        empty,
        net,
        accuracy,
        timeSpentSeconds, // artık gerçek değer
      },
    };

    setWarRoomTimeLeft(0);
    setWarRoomSession(endedSession);
    setWarRoomMode('result');

    // Log olarak kaydet
    addLog({
      id: `warroom_${Date.now()}`,
      date: new Date().toISOString(),
      subject: warRoomSession.examType + ' Savaş Odası',
      topic: warRoomSession.questions[0]?.topic || 'Karma',
      questions: warRoomSession.questions.length,
      correct,
      wrong,
      empty,
      fatigue: 0,
      avgTime: Math.round(timeSpentSeconds / 60), // dakika cinsinden
      tags: ['#SAVAŞ_ODASI'],
      notes: `War Room simülasyonu. Süre: ${Math.floor(timeSpentSeconds / 60)}dk ${timeSpentSeconds % 60}sn`,
      sourceName: 'War Room',
    });
  }, [warRoomSession, warRoomAnswers, addLog, setWarRoomTimeLeft, setWarRoomSession, setWarRoomMode]);

  // ─── Timer tick ───────────────────────────────────────────────────────────

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
          // Süre bitti → finishSession
          setTimeout(() => finishSession(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [warRoomSession?.status, warRoomMode, warRoomTimeLeft, finishSession]);

  // ─── startSession ─────────────────────────────────────────────────────────

  const startSession = useCallback(
    async (opts: GenerateQuestionsOptions, timeLimitSeconds: number) => {
      try {
        setIsGenerating(true);
        setError(null);

        const qs: WarRoomQuestion[] = await generateWarRoomQuestions(opts);

        const newSession: WarRoomSession = {
          id: `sess_${Date.now()}`,
          startTime: Date.now(), // epoch — finishSession'da kullanılır
          examType: opts.examType,
          difficulty: opts.difficulty || 'medium',
          questions: qs,
          status: 'active',
        };

        setWarRoomSession(newSession);
        setWarRoomTimeLeft(timeLimitSeconds);
        setWarRoomMode('solve');
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Savaş odası başlatılamadı.';
        setError(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [setWarRoomSession, setWarRoomTimeLeft, setWarRoomMode]
  );

  // ─── quitSession ──────────────────────────────────────────────────────────

  const quitSession = useCallback(
    async (confirmFn?: (opts: string) => Promise<boolean>) => {
      // confirmFn varsa tema uyumlu dialog kullan, yoksa window.confirm fallback
      const confirmed = confirmFn
        ? await confirmFn('Savaştan kaçıyor musun? Geri dönüşü yok.')
        : window.confirm('Savaştan kaçıyor musun? Geri dönüşü yok.');

      if (confirmed) {
        setWarRoomTimeLeft(0);
        setWarRoomSession(null);
        setWarRoomMode('setup');
      }
    },
    [setWarRoomTimeLeft, setWarRoomSession, setWarRoomMode]
  );

  return {
    isGenerating,
    error,
    timeLeft: warRoomTimeLeft,
    startSession,
    finishSession,
    quitSession,
  };
}
