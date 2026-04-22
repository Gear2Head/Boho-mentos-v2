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
  const setLastWarRoomSummary = useAppStore(s => s.setLastWarRoomSummary);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── finishSession ────────────────────────────────────────────────────────

  const finishSession = useCallback(() => {
    if (!warRoomSession) return;

    const { correct, wrong, empty, net, accuracy } = scoreWarRoomSession(
      warRoomSession.questions,
      warRoomAnswers
    );

    // [A2 FIX]: IDB rehydration'da startTime string gelebilir — Number() ile cast et
    const rawStart = warRoomSession.startTime;
    const startTs = typeof rawStart === 'number' ? rawStart : Number(rawStart);
    const elapsed = Number.isFinite(startTs) ? Math.round((Date.now() - startTs) / 1000) : 0;
    const timeSpentSeconds = Math.max(1, elapsed);


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
    
    setLastWarRoomSummary({
      examType: warRoomSession.examType,
      score: net,
      completedAt: new Date().toISOString(),
      status: 'completed'
    });

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

  // [TIMER-FIX]: Recalculate remaining time from absolute endTime on every tick.
  // Prevents drift when the browser throttles setInterval in background tabs.
  useEffect(() => {
    const shouldTick =
      warRoomMode === 'solve' &&
      warRoomSession?.status === 'active' &&
      warRoomSession?.endTime != null;

    if (!shouldTick) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((warRoomSession!.endTime - Date.now()) / 1000));
      setWarRoomTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeout(() => finishSession(), 0);
      }
    }, 500); // 500ms for snappier display without meaningful overhead

    return () => clearInterval(interval);
  }, [warRoomSession?.status, warRoomSession?.endTime, warRoomMode, finishSession]);

  // ─── startSession ─────────────────────────────────────────────────────────

  const startSession = useCallback(
    async (opts: GenerateQuestionsOptions, timeLimitSeconds: number) => {
      try {
        setIsGenerating(true);
        setError(null);

        const qs: WarRoomQuestion[] = await generateWarRoomQuestions(opts);
        const now = Date.now();

        const newSession: WarRoomSession = {
          id: `sess_${now}`,
          startTime: now,
          endTime: now + timeLimitSeconds * 1000, // [TIMER-FIX]: absolute wall-clock deadline
          examType: opts.examType,
          difficulty: opts.difficulty || 'medium',
          questions: qs,
          status: 'active',
        };

        setWarRoomSession(newSession);
        setWarRoomTimeLeft(timeLimitSeconds); // initial display value
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
        if (warRoomSession) {
          setLastWarRoomSummary({
            examType: warRoomSession.examType,
            score: 0,
            completedAt: new Date().toISOString(),
            status: 'quit'
          });
        }
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
