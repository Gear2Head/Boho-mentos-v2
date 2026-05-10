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
import { shouldRequestDirective } from '../services/coachContract';
import { compactChatHistory } from '../services/contextSummarizer';
import type { CoachIntent, CoachDirective } from '../types/coach';
import type { DailyLog, ExamResult } from '../types';
import { cleanForFirestore } from '../utils/firebaseHelpers';
import { toLocalISODateOnly } from '../utils/date';

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseCoachCoreReturn {
  isTyping: boolean;
  sendMessage: (params: {
    userMessage: string;
    intent?: CoachIntent;
    wantDirective?: boolean;
    callerSurface?: CoachIntent;
    imageBase64?: string;
    imageMediaType?: string;
  }) => Promise<{ text: string; directive?: CoachDirective }>;
  triggerLogAnalysis: (log: DailyLog) => Promise<void>;
  triggerExamDebrief: (exam: ExamResult) => Promise<void>;
  triggerWarRoomAnalysis: (params: {
    examType: string;
    correct: number;
    wrong: number;
    accuracy: number;
    topics: string[];
  }) => Promise<{ text: string } | null>;
}

function detectBackdatedLogPrompt(message: string): string | null {
  const lower = message.toLowerCase();
  if (!/(yapt[ıi]m|çözdüm|cozdum|çalıştım|calistim|bitirdim|log|ajanda)/i.test(lower)) return null;
  const match = lower.match(/\b(\d{1,2})(?:['’]?(?:unda|ünde|inde|ında|de|da|te|ta)|\.)\b/);
  if (!match) return null;
  const day = Number(match[1]);
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  const now = new Date();
  const candidate = new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0, 0);
  if (candidate.getTime() > now.getTime()) {
    candidate.setMonth(candidate.getMonth() - 1);
  }
  return toLocalISODateOnly(candidate);
}

function buildDirectiveChatText(directive: CoachDirective, fallback: string): string {
  const summary = directive.summary?.trim();
  const tasks = Array.isArray(directive.tasks) ? directive.tasks.slice(0, 3) : [];

  if (tasks.length === 0) {
    return summary || fallback;
  }

  const taskLines = tasks.map((task, index) => {
    const scope = [task.subject, task.topic].filter(Boolean).join(' / ');
    const target = [
      task.targetQuestions ? `${task.targetQuestions} soru` : null,
      task.targetMinutes ? `${task.targetMinutes} dk` : null,
    ].filter(Boolean).join(', ');
    const detail = target ? `${scope ? `${scope}: ` : ''}${target}` : task.action;
    const evidence = task.sourceEvidence || task.rationale;
    return `${index + 1}. ${detail}${evidence ? ` — ${evidence}` : ''}`;
  });

  const successLine = tasks[0]?.successCriteria
    ? `Başarı ölçütü: ${tasks[0].successCriteria}`
    : '';

  return [summary, 'Bugünkü net hamleler:', taskLines.join('\n'), successLine]
    .filter(Boolean)
    .join('\n\n');
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
      imageBase64,
      imageMediaType,
    }: {
      userMessage: string;
      intent?: CoachIntent;
      wantDirective?: boolean;
      callerSurface?: CoachIntent;
      imageBase64?: string;
      imageMediaType?: string;
    }): Promise<{ text: string; directive?: CoachDirective }> => {
      if (!userMessage.trim() && !imageBase64 || isTyping) return { text: '' };

      setIsTyping(true);

      try {
        const backdatedDate = detectBackdatedLogPrompt(userMessage);
        if (backdatedDate && intent === 'free_chat') {
          const text = `Anladım. Bu geçmiş tarihli bir çalışma kaydı gibi duruyor; veriyi doğru işleyebilmem için lütfen detaylandır: ders, konu, soru sayısı, doğru/yanlış/boş ve süre. [[OPEN:log_study:date=${backdatedDate}]]`;
          addChatMessage(cleanForFirestore({
            role: 'coach',
            content: text,
            timestamp: new Date().toISOString(),
          }));
          return { text };
        }

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

        // 2. AI çağrısı — intent bazlı (BUILD-001, COACH-003, AI-005)
        // [SOBET-MODE-FIX]: Eğer kullanıcı dertleşiyorsa veya soru soruyorsa forceJson (wantDirective) yapmıyoruz.
        const shouldForceDirective = shouldRequestDirective(intent, wantDirective);

        const rawText = await getCoachResponse(
          userMessage,
          contextString,
          compactChatHistory(chatHistory),
          {
            intent,
            coachPersonality: profile?.coachPersonality,
            forceJson: shouldForceDirective,
            wantDirective: shouldForceDirective,
            userState,
            imageBase64,
            imageMediaType: imageMediaType as 'image/jpeg' | 'image/png' | 'image/webp' | undefined,
          }
        );

        // 3. Parse — structured directive mi yoksa free text mi?
        const parsed = parseStructuredDirective(rawText ?? '', intent);

        let directive: CoachDirective | undefined;
        let cleanText = rawText ?? 'Yanıt alınamadı.';

        if (parsed.isStructured) {
          directive = parsed.directive;
          // [BUG-001 FIX]: JSON bloğunu ve markdown kod bloklarını chat'ten temizle
          let tempText = (directive.text ?? rawText ?? '')
            .replace(/```(?:json)?[\s\S]*?```/g, '') // Hem ``` hem de ```json bloklarını temizle
            .trim();
          
          // Eğer AI sadece raw JSON döndürdüyse veya temizlik sonrası metin boşsa summary'yi kullan
          if (tempText.startsWith('{') || tempText.startsWith('[') || !tempText) {
            tempText = buildDirectiveChatText(directive, rawText ?? '');
          }
          cleanText = tempText;

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

          // [AI-004] NLP Log Extraction: detected logs must be confirmed in the UI before persistence.
          if (directive.detectedLogs && directive.detectedLogs.length > 0) {
            console.info('[CoachCore] detectedLogs require user confirmation before persisting', directive.detectedLogs);
          }

          // [ST-003] Client Actions
          if (directive.clientActions && directive.clientActions.length > 0) {
            directive.clientActions.forEach(action => {
              switch (action.type) {
                case 'CELEBRATE':
                  import('canvas-confetti').then(confetti => confetti.default());
                  break;
                case 'OPEN_MARKET':
                  useAppStore.setState({ isCrateModalOpen: true });
                  break;
                
                case 'ADD_FAILED_QUESTION':
                  if (action.payload?.subject) {
                    useAppStore.getState().addFailedQuestion({
                      id: 'fq_' + Date.now(),
                      subject: String(action.payload.subject),
                      topic: String(action.payload.topic || 'Genel'),
                      difficulty: String(action.payload.difficulty || 'medium'),
                      createdAt: new Date().toISOString()
                    } as any);
                  }
                  break;
                case 'START_FOCUS':
                  useAppStore.setState({ isFocusSidePanelOpen: true });
                  break;
              }
            });
          }
        }

        // 6. Chat'e ekle
        addChatMessage(cleanForFirestore({
          role: 'coach',
          content: cleanText,
          timestamp: new Date().toISOString(),
          directive: directive || null
        }));

        import('../utils/audioEngine').then(({ AudioEngine }) => {
          if (profile?.coachPersonality === 'hardcore') {
            AudioEngine.playToxicAlert();
          } else {
            AudioEngine.playReceive();
          }
        });

        // Konuşma sentezi (TTS)
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
    }): Promise<{ text: string } | null> => {
      const { examType, correct, wrong, accuracy, topics } = params;
      const prompt = `WAR ROOM BİTTİ: ${examType} — ${correct}D/${wrong}Y, %${accuracy} başarı. Konular: ${topics.join(', ')}. Soru bazlı hata analizi ve 3 aksiyon ver.`;

      // [B3 FIX]: Return text so WarRoomResultScreen can render AI output
      const result = await sendMessage({
        userMessage: prompt,
        intent: 'war_room_analysis',
        wantDirective: true,
        callerSurface: 'war_room_analysis',
      });
      return result.text ? { text: result.text } : null;
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
