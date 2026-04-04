/**
 * AMAÇ: Tüm AI yüzeylerinin kullandığı merkezi koç hook'u.
 * MANTIK: Intent bazlı, directive-first, context builder kullanır.
 *
 * V19 (COACH-001, COACH-009, COACH-PRODUCT-005):
 *  - sendMessage: tek entry point, intent ile çalışır
 *  - triggerAutoAnalysis: log/exam/warroom sonrası otomatik tetikler
 *  - directive parse + history kayıt otomatik
 *  - tüm yüzeyler aynı retry/error davranışını gösterir
 */

import { useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { getCoachResponse } from '../services/gemini';
import { buildCoachContext, hashContext } from '../services/coachContext';
import { parseStructuredDirective } from '../services/promptBuilder';
import {
  createDirectiveRecord,
  addToHistory,
  updateCoachMemory,
} from '../services/directiveHistory';
import type { CoachIntent, CoachDirective } from '../types/coach';
import type { DailyLog, ExamResult } from '../types';

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseCoachCoreReturn {
  isTyping: boolean;
  sendMessage: (params: {
    userMessage: string;
    intent?: CoachIntent;
    wantDirective?: boolean;
    callerSurface?: CoachIntent;
  }) => Promise<{ text: string; directive?: CoachDirective }>;
  triggerLogAnalysis: (log: DailyLog) => Promise<void>;
  triggerExamDebrief: (exam: ExamResult) => Promise<void>;
  triggerWarRoomAnalysis: (params: {
    examType: string;
    correct: number;
    wrong: number;
    accuracy: number;
    topics: string[];
  }) => Promise<void>;
}

export function useCoachCore(): UseCoachCoreReturn {
  const [isTyping, setIsTyping] = useState(false);

  // Store selectors
  const profile = useAppStore((s) => s.profile);
  const logs = useAppStore((s) => s.logs);
  const exams = useAppStore((s) => s.exams);
  const eloScore = useAppStore((s) => s.eloScore);
  const streakDays = useAppStore((s) => s.streakDays);
  const tytSubjects = useAppStore((s) => s.tytSubjects);
  const aytSubjects = useAppStore((s) => s.aytSubjects);
  const activeAlerts = useAppStore((s) => s.activeAlerts);
  const chatHistory = useAppStore((s) => s.chatHistory);
  const lastCoachDirective = useAppStore((s) => s.lastCoachDirective);
  const directiveHistory = useAppStore((s) => s.directiveHistory ?? []);

  // Store actions
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const setLastCoachDirective = useAppStore((s) => s.setLastCoachDirective);

  // ─── Core sender ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async ({
      userMessage,
      intent = 'free_chat',
      wantDirective = false,
      callerSurface,
    }: {
      userMessage: string;
      intent?: CoachIntent;
      wantDirective?: boolean;
      callerSurface?: CoachIntent;
    }): Promise<{ text: string; directive?: CoachDirective }> => {
      if (!userMessage.trim() || isTyping) return { text: '' };

      setIsTyping(true);

      try {
        // 1. Merkezi context builder (COACH-004)
        const { contextString, userState } = buildCoachContext({
          profile,
          logs,
          exams,
          eloScore,
          streakDays,
          tytSubjects,
          aytSubjects,
          activeAlerts,
          lastDirective: lastCoachDirective,
          callerSurface: callerSurface ?? intent,
        });

        // 2. AI çağrısı — intent bazlı (BUILD-001, COACH-003)
        const rawText = await getCoachResponse(
          userMessage,
          contextString,
          chatHistory,
          {
            intent,
            coachPersonality: profile?.coachPersonality,
            forceJson: wantDirective,
            wantDirective,
            userState,
          }
        );

        // 3. Parse — structured directive mi yoksa free text mi?
        const parsed = parseStructuredDirective(rawText ?? '', intent);

        let directive: CoachDirective | undefined;
        let cleanText = rawText ?? 'Yanıt alınamadı.';

        if (parsed.isStructured) {
          directive = parsed.directive;
          // JSON bloğunu chat'ten temizle
          cleanText = (directive.text ?? rawText ?? '').replace(/```json[\s\S]*?```/g, '').trim();

          // 4. Directive history'e kaydet (COACH-006)
          const ctxHash = hashContext(userState);
          const record = createDirectiveRecord(directive, ctxHash);
          const newHistory = addToHistory(directiveHistory, record);

          // 5. Coach memory güncelle (COACH-008)
          const newMemory = updateCoachMemory(newHistory, null);

          // Store'a yaz
          useAppStore.setState({
            lastCoachDirective: directive,
            directiveHistory: newHistory,
            coachMemory: newMemory,
          });
          setLastCoachDirective(directive);
        }

        // 6. Chat'e ekle
        addChatMessage({
          role: 'coach',
          content: cleanText,
          timestamp: new Date().toISOString(),
        });

        return { text: cleanText, directive };
      } catch (err) {
        console.error('[CoachCore] sendMessage error:', err);
        const errText = 'Bağlantı hatası oluştu. Tekrar dene.';
        addChatMessage({
          role: 'coach',
          content: errText,
          timestamp: new Date().toISOString(),
        });
        return { text: errText };
      } finally {
        setIsTyping(false);
      }
    },
    [
      isTyping,
      profile,
      logs,
      exams,
      eloScore,
      streakDays,
      tytSubjects,
      aytSubjects,
      activeAlerts,
      chatHistory,
      lastCoachDirective,
      directiveHistory,
      addChatMessage,
      setLastCoachDirective,
    ]
  );

  // ─── Auto triggers ─────────────────────────────────────────────────────────

  /**
   * triggerLogAnalysis: log kaydedildikten sonra micro_feedback üretir.
   * COACH-PRODUCT-005
   */
  const triggerLogAnalysis = useCallback(
    async (log: DailyLog): Promise<void> => {
      const acc = Math.round((log.correct / (log.questions || 1)) * 100);
      const prompt = `LOG KAYDEDİLDİ: ${log.subject}/${log.topic} — ${log.questions} soru, %${acc} başarı, ${log.avgTime}dk. Hızlı mikro analiz yap.`;

      await sendMessage({
        userMessage: prompt,
        intent: 'micro_feedback',
        callerSurface: 'micro_feedback',
      });
    },
    [sendMessage]
  );

  /**
   * triggerExamDebrief: deneme eklendikten sonra otomatik savaş raporu üretir.
   * COACH-PRODUCT-004
   */
  const triggerExamDebrief = useCallback(
    async (exam: ExamResult): Promise<void> => {
      const prompt = `DENEME SAVAŞ RAPORU: ${exam.type} denemesi ${exam.totalNet.toFixed(2)} net ile tamamlandı. Konu bazlı hata analizi yap ve 48 saatlik telafi planı çıkar.`;

      await sendMessage({
        userMessage: prompt,
        intent: 'exam_debrief',
        wantDirective: true,
        callerSurface: 'exam_debrief',
      });
    },
    [sendMessage]
  );

  /**
   * triggerWarRoomAnalysis: War Room bitince otomatik analiz üretir.
   * WAR-003
   */
  const triggerWarRoomAnalysis = useCallback(
    async (params: {
      examType: string;
      correct: number;
      wrong: number;
      accuracy: number;
      topics: string[];
    }): Promise<void> => {
      const { examType, correct, wrong, accuracy, topics } = params;
      const prompt = `WAR ROOM BİTTİ: ${examType} — ${correct}D/${wrong}Y, %${accuracy} başarı. Konular: ${topics.join(', ')}. Soru bazlı hata analizi ve 3 aksiyon ver.`;

      await sendMessage({
        userMessage: prompt,
        intent: 'war_room_analysis',
        wantDirective: true,
        callerSurface: 'war_room_analysis',
      });
    },
    [sendMessage]
  );

  return {
    isTyping,
    sendMessage,
    triggerLogAnalysis,
    triggerExamDebrief,
    triggerWarRoomAnalysis,
  };
}
