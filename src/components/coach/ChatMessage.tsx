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
  Link as LinkIcon,
  Play,
  Target,
} from 'lucide-react';

import { getResourcesForSubject } from '../../utils/resourceEngine';
import { CoachParser } from './CoachParser';
import { FlashcardBubble } from './FlashcardBubble';
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
        className="flex justify-end items-end gap-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: Math.min(index * 0.01, 0.08) }}
      >
        <div className="max-w-[82%] md:max-w-[62%]">
          {!isGrouped && (
            <div className="flex justify-end items-center gap-2 mb-1.5">
              <span className="text-[10px] text-zinc-600 font-medium">{time}</span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">
                {profileName}
              </span>
            </div>
          )}

          <div className="relative overflow-hidden rounded-2xl rounded-br-md border border-zinc-800 bg-[#1B1B20] px-5 py-4 text-sm leading-relaxed text-zinc-100 shadow-sm">
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
          <div className="w-8 h-8 shrink-0 rounded-xl overflow-hidden border border-zinc-800 shadow-sm mb-1 relative">
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
          <div className="w-8 shrink-0" />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex items-end gap-3"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.08) }}
    >
      {!isGrouped ? (
        <div
          className="w-8 h-8 rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden shrink-0 mb-1 relative"
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
        <div className="w-8 shrink-0" />
      )}

      <div className="max-w-[86%] md:max-w-[68%]">
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C17767]">
              Kübra
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.55)]" />
            <span className="text-[10px] text-zinc-600 font-medium">{time}</span>
          </div>
        )}

        <div className="relative overflow-hidden rounded-2xl rounded-bl-md border border-zinc-800 bg-[#111114] shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#C17767]/70" />

          <div className="pl-5 pr-5 py-4">
            <div className="text-sm leading-[1.75] text-zinc-200 font-medium">
              <CoachParser content={message.content} />
            </div>

            {flashcardNode && <div className="mt-4">{flashcardNode}</div>}

            {message.directive && (
              <DirectivePreview directive={message.directive} />
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

  return (
    <div className="mt-4 border-t border-zinc-800 pt-4">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-left hover:border-[#C17767]/35 transition-all"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#C17767]/10 text-[#C17767] flex items-center justify-center shrink-0">
            <Target size={15} />
          </div>

          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] font-black text-zinc-500">
              Aksiyon notu
            </div>
            <div className="truncate text-sm font-bold text-zinc-200">
              {directive.headline || 'Önerilen çalışma adımı'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
                    className={`rounded-xl border p-3 transition-all ${isDone
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
                            className={`text-sm font-semibold leading-relaxed ${isDone ? 'line-through text-zinc-500' : 'text-zinc-200'
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}