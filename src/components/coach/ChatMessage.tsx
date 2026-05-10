/**
 * AMAÇ: Sakin, doğal, okunabilir chat mesaj balonu.
 * V2:
 * - Toxic/sert badge kaldırıldı
 * - Koç cevabı daha az yapay görünüyor
 * - Direktif kartları varsayılan kapalı geliyor
 * - Mesaj genişliği ve tipografi daha doğal
 */

import React, { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  Link as LinkIcon,
  Play,
  Target,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

import { getResourcesForSubject } from '../../utils/resourceEngine';
import { CoachParser } from './CoachParser';
import { FlashcardBubble } from './FlashcardBubble';
import { DetectedLogCard } from './DetectedLogCard';
import type { FlashcardBubbleData } from './FlashcardBubble';
import type { ChatMessage as ChatMessageType } from '../../types';
import { useAppStore } from '../../store/appStore';

interface ChatMessageProps {
  message: ChatMessageType;
  index: number;
  profileName: string;
  coachPersonality?: string;
  isGrouped?: boolean;
}

const COACH_AVATAR_SRC = '/assets/coach/kubra_main.jpg';

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const ChatMessage = memo(function ChatMessage({
  message,
  index,
  profileName,
  isGrouped = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const time = formatTime(message.timestamp);

  const flashcardNode = useMemo(() => {
    try {
      const match = message.content.match(/`(?:json)?\s*([\s\S]*?)`/);
      if (!match) return null;

      const parsed = JSON.parse(match[1]);
      const cards: FlashcardBubbleData[] = Array.isArray(parsed?.flashcards)
        ? parsed.flashcards
        : Array.isArray(parsed)
          ? parsed
          : [];

      if (cards.length > 0 && cards[0].front && cards[0].back) {
        return <FlashcardBubble cards={cards} />;
      }
    } catch {
      return null;
    }

    return null;
  }, [message.content]);

  const userAvatarUrl =
    useAppStore((s) => s.profile?.avatar) ||
    `https://api.dicebear.com/7.x/notionists/svg?seed=${profileName}`;

  if (isUser) {
    return (
      <motion.div
        className="flex items-end justify-end gap-2.5 py-1"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: Math.min(index * 0.01, 0.08) }}
      >
        <div className="max-w-[88%] md:max-w-[58%]">
          {!isGrouped && (
            <div className="flex justify-end items-center gap-2 mb-1.5">
              <span className="text-[10px] text-zinc-600 font-medium">{time}</span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">
                {profileName}
              </span>
            </div>
          )}

          <div className="relative overflow-hidden rounded-xl rounded-br-md border border-zinc-800 bg-[#1B1B20] px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-100 shadow-sm">
            {message.imageUrl && (
              <div className="mb-3 rounded-xl overflow-hidden border border-zinc-800 relative">
                <div className="absolute inset-0 z-20" />
                <img
                  src={message.imageUrl}
                  alt="User attachment"
                  className="w-full max-w-sm h-auto img-protected pointer-events-none"
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                />
              </div>
            )}

            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        </div>

        {!isGrouped ? (
          <div className="mb-1 h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-zinc-800 shadow-sm relative">
            <div className="absolute inset-0 z-20" />
            <img
              src={userAvatarUrl}
              alt={profileName}
              className="w-full h-full object-cover img-protected"
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
            />
          </div>
        ) : (
          <div className="w-7 shrink-0" />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex items-end gap-2.5 py-1"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.08) }}
    >
      {!isGrouped ? (
        <div
          className="mb-1 h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 relative"
          aria-hidden="true"
        >
          <div className="absolute inset-0 z-20" />
          <img
            src={COACH_AVATAR_SRC}
            alt="Koç Kübra"
            className="w-full h-full object-cover img-protected"
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
          />
        </div>
      ) : (
        <div className="w-7 shrink-0" />
      )}

      <div className="max-w-[90%] md:max-w-[64%]">
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C17767]">
              Kübra
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.55)]" />
            <span className="text-[10px] text-zinc-600 font-medium">{time}</span>
          </div>
        )}

        <div className="relative overflow-hidden rounded-xl rounded-bl-md border border-zinc-800 bg-[#111114] shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#C17767]/70" />

          <div className="py-3 pl-4 pr-4">
            <div className="text-[13px] font-medium leading-[1.65] text-zinc-200">
              <CoachParser content={message.content} />
            </div>

            {flashcardNode && <div className="mt-4">{flashcardNode}</div>}

            {message.directive && (
              <DirectivePreview directive={message.directive} />
            )}

            {message.directive?.detectedLogs && message.directive.detectedLogs.length > 0 && (
              <div className="mt-3">
                <DetectedLogCard
                  detectedLogs={message.directive.detectedLogs}
                  onDismiss={() => {/* Card hides itself when all confirmed */}}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

function DirectivePreview({
  directive,
}: {
  directive: NonNullable<ChatMessageType['directive']>;
}) {
  const [open, setOpen] = useState(false);

  const completedCount = directive.tasks.filter((task) => task.status === 'completed').length;
  const taskCount = directive.tasks.length;
  const previewTasks = directive.tasks.slice(0, 3);

  return (
    <div className="mt-3 border-t border-zinc-800/80 pt-3">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-left transition-all hover:border-[#C17767]/35"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#C17767]/10 text-[#C17767]">
            <Target size={13} />
          </div>

          <div className="min-w-0">
            <div className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Plan
            </div>
            <div className="truncate text-[13px] font-bold text-zinc-200">
              {directive.headline || 'Önerilen çalışma adımı'}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[10px] font-black text-zinc-500">
            {completedCount}/{taskCount}
          </span>
          {open ? (
            <ChevronDown size={16} className="text-zinc-500" />
          ) : (
            <ChevronRight size={16} className="text-zinc-500" />
          )}
        </div>
      </button>

      {previewTasks.length > 0 && (
        <div className="mt-2 grid gap-1.5">
          {previewTasks.map((task, idx) => (
            <div
              key={`preview-${task.id || task.action}-${idx}`}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-zinc-800/70 bg-zinc-950/35 px-2.5 py-2"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  task.priority === 'high'
                    ? 'bg-rose-500'
                    : task.priority === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                }`}
              />
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-zinc-300">
                {task.subject ? `${task.subject}${task.topic ? ` / ${task.topic}` : ''}: ` : ''}
                {task.targetQuestions ? `${task.targetQuestions} soru ` : ''}
                {task.targetMinutes ? `${task.targetMinutes} dk` : task.action}
              </span>
              {task.successCriteria && (
                <span className="hidden shrink-0 rounded-md border border-emerald-500/15 bg-emerald-500/5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400 sm:inline">
                  hedef
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {directive.summary && (
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                {directive.summary}
              </p>
            )}

            <div className="mt-3 space-y-2">
              {directive.tasks.map((task, idx) => {
                const resc = task.subject ? getResourcesForSubject(task.subject) : [];
                const history = useAppStore.getState().directiveHistory;

                const record = history.find(
                  (r) =>
                    r.directive.headline === directive.headline &&
                    r.directive.createdAt === directive.createdAt,
                );

                const taskStatus = record?.directive.tasks[idx]?.status ?? 'pending';
                const isDone = taskStatus === 'completed';

                return (
                  <div
                    key={`${task.action}-${idx}`}
                    className={`rounded-lg border p-2.5 transition-all ${isDone
                        ? 'border-emerald-500/20 bg-emerald-500/5 opacity-70'
                        : 'border-zinc-800 bg-zinc-950/40'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isDone
                              ? 'bg-emerald-500'
                              : task.priority === 'high'
                                ? 'bg-rose-500'
                                : task.priority === 'medium'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                            }`}
                        />

                        <div className="min-w-0">
                          <div
                            className={`text-[12px] font-semibold leading-relaxed ${isDone ? 'line-through text-zinc-500' : 'text-zinc-200'
                              }`}
                          >
                            {task.action}
                          </div>

                          {task.subject && !isDone && (
                            <div className="mt-2 inline-flex items-center rounded-full border border-[#C17767]/15 bg-[#C17767]/5 px-3 py-1 text-[9px] uppercase tracking-[0.16em] font-black text-[#C17767]">
                              {task.subject}
                              {task.targetMinutes ? ` • ${task.targetMinutes}dk` : ''}
                            </div>
                          )}

                          {/* Source Evidence — neden bu görev verildi */}
                          {task.sourceEvidence && !isDone && (
                            <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-blue-500/10 bg-blue-500/5 px-3 py-2">
                              <Info size={11} className="text-blue-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="text-[8px] uppercase tracking-widest font-black text-blue-400/70 block mb-0.5">Kanıt</span>
                                <span className="text-[10px] text-blue-300/80 leading-relaxed">{task.sourceEvidence}</span>
                              </div>
                              {task.evidenceLevel && (
                                <span className={`shrink-0 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                                  task.evidenceLevel === 'high' ? 'bg-emerald-500/15 text-emerald-400' :
                                  task.evidenceLevel === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                                  'bg-zinc-500/15 text-zinc-400'
                                }`}>{task.evidenceLevel}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {record && !isDone && (
                        <button
                          onClick={() =>
                            useAppStore.getState().completeCoachTask(record.id, idx)
                          }
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
                          title="Tamamla"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}

                      {isDone && (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      )}
                    </div>

                    {resc.length > 0 && !isDone && (
                      <div className="mt-3 flex flex-wrap gap-2 pl-5">
                        {resc.map((r) => (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            key={r.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[9px] uppercase tracking-widest font-black text-zinc-500 hover:border-[#C17767]/30 hover:text-[#C17767] transition-all"
                          >
                            {r.type === 'video' || r.type === 'playlist' ? (
                              <Play size={10} className="text-rose-400" />
                            ) : r.type === 'pdf' ? (
                              <FileText size={10} className="text-orange-400" />
                            ) : (
                              <LinkIcon size={10} className="text-blue-400" />
                            )}
                            <span>
                              {r.provider}: {r.title}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Warnings Section */}
            {directive.warnings && directive.warnings.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-[8px] uppercase tracking-widest font-black text-rose-400/70 flex items-center gap-1.5">
                  <ShieldAlert size={10} />
                  Uyarılar
                </div>
                {directive.warnings.map((warning, wIdx) => (
                  <div
                    key={`warning-${wIdx}`}
                    className={`flex items-start gap-2 rounded-lg border p-2.5 text-[10px] leading-relaxed ${
                      warning.severity === 'critical' || warning.severity === 'high'
                        ? 'border-rose-500/20 bg-rose-500/5 text-rose-300'
                        : warning.severity === 'warning' || warning.severity === 'medium'
                          ? 'border-amber-500/20 bg-amber-500/5 text-amber-300'
                          : 'border-blue-500/20 bg-blue-500/5 text-blue-300'
                    }`}
                  >
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    <span>{warning.message}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
