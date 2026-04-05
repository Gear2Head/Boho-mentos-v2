/**
 * AMAÇ: Premium chat mesaj baloonu — kullanıcı ve koç mesajları.
 * MANTIK: Sol şerit rengi (mesaj tipi), koç avatarı, timestamp, markdown render.
 * UX-TODO §2: Koç header briefing şeridi, mesaj tipi badge, animasyonlu slide-in.
 */

import React, { memo } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Target, CheckCircle2 } from 'lucide-react';
import { classifyMessage } from '../../utils/classifyMessage';
import type { ChatMessage as ChatMessageType } from '../../types';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessageProps {
  message: ChatMessageType;
  index: number;
  profileName: string;
  coachPersonality?: string;
  isGrouped?: boolean; // Aynı kişiden ardışık mesaj mı?
}

// ─── Coach Avatar ──────────────────────────────────────────────────────────────

const COACH_AVATAR: Record<string, { emoji: string; color: string; name: string }> = {
  harsh: { emoji: '💀', color: 'bg-red-900/60 border-red-700/40', name: 'GEAR_HEAD.ALFA' },
  motivational: { emoji: '🔥', color: 'bg-orange-900/60 border-orange-700/40', name: 'GEAR_HEAD.PHOENIX' },
  analytical: { emoji: '📊', color: 'bg-blue-900/60 border-blue-700/40', name: 'GEAR_HEAD.SIGMA' },
};

const DEFAULT_AVATAR = { emoji: '⚡', color: 'bg-zinc-800 border-zinc-700/50', name: 'GEAR_HEAD.' };

// ─── Markdown Components ───────────────────────────────────────────────────────

const markdownComponents = {
  p: ({ ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="leading-relaxed mb-3 last:mb-0 text-zinc-300 text-sm" {...props} />
  ),
  li: ({ ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="mb-1.5 leading-relaxed flex items-start gap-2 before:content-['▪'] before:text-[#C17767] before:shrink-0 before:mt-0.5" {...props} />
  ),
  ul: ({ ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-4 space-y-1 list-none pl-0" {...props} />
  ),
  ol: ({ ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-zinc-300" {...props} />
  ),
  strong: ({ ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-bold text-[#C17767]" {...props} />
  ),
  em: ({ ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic text-zinc-400" {...props} />
  ),
  h1: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-xl font-bold text-zinc-100 mt-4 mb-2 border-b border-zinc-700 pb-1" {...props} />
  ),
  h2: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-lg font-bold text-zinc-100 mt-4 mb-2 border-b border-zinc-800 pb-1" {...props} />
  ),
  h3: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-base font-bold text-[#C17767] mt-3 mb-1.5" {...props} />
  ),
  code: ({ inline, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) =>
    inline ? (
      <code className="font-mono text-[#C17767] bg-[#1A1A1A] px-1.5 py-0.5 rounded text-xs" {...props} />
    ) : (
      <code className="block font-mono text-xs bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-4 overflow-x-auto text-zinc-300 mb-3" {...props} />
    ),
  blockquote: ({ ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-4 border-[#C17767] pl-4 italic text-zinc-400 my-3" {...props} />
  ),
  table: ({ ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-xs border-collapse" {...props} />
    </div>
  ),
  th: ({ ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="border border-zinc-700 px-3 py-2 text-left font-bold text-[#C17767] bg-zinc-900 uppercase tracking-widest text-[9px]" {...props} />
  ),
  td: ({ ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border border-zinc-800 px-3 py-2 text-zinc-300 even:bg-zinc-900/50" {...props} />
  ),
};

// ─── Component ─────────────────────────────────────────────────────────────────

export const ChatMessage = memo(function ChatMessage({
  message,
  index,
  profileName,
  coachPersonality,
  isGrouped = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (isUser) {
    return (
      <motion.div
        className="flex justify-end"
        initial={{ opacity: 0, x: 20, y: 4 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.02 }}
      >
        <div
          className="max-w-[70%] md:max-w-[60%]"
          style={{ '--index': index } as React.CSSProperties}
        >
          {/* Name + time */}
          <div className="flex justify-end items-center gap-2 mb-1.5">
            <span className="text-[9px] text-zinc-600 italic">{time}</span>
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
              {profileName}
            </span>
          </div>

          {/* Bubble */}
          <div
            className="px-5 py-4 text-sm font-mono leading-relaxed text-[#F5F2EB]"
            style={{
              background: 'linear-gradient(135deg, #3D1F14 0%, #5C2E1A 100%)',
              borderRadius: '18px 18px 4px 18px',
              border: '1px solid rgba(193,119,103,0.3)',
              boxShadow: '0 4px 20px rgba(193,119,103,0.12)',
            }}
          >
            {message.content}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── COACH MESSAGE ──────────────────────────────────────────────────────────
  const classification = classifyMessage(message.content);
  const avatar = coachPersonality
    ? (COACH_AVATAR[coachPersonality] ?? DEFAULT_AVATAR)
    : DEFAULT_AVATAR;

  return (
    <motion.div
      className="flex items-end gap-3"
      initial={{ opacity: 0, x: -20, y: 4 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
    >
      {/* Avatar (gizle grouped mesajda) */}
      {!isGrouped ? (
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base shrink-0 mb-1 ${avatar.color}`}
          aria-hidden="true"
        >
          {avatar.emoji}
        </div>
      ) : (
        <div className="w-9 shrink-0" />
      )}

      {/* Bubble */}
      <div className="max-w-[75%] md:max-w-[65%]">
        {/* Coach header */}
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
              {avatar.name}
            </span>
            {/* Online dot */}
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
            {/* Badge */}
            <span
              className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
              style={{
                color: classification.type === 'directive' ? '#ef4444'
                  : classification.type === 'analysis' ? '#3b82f6'
                  : classification.type === 'explanation' ? '#a855f7'
                  : classification.type === 'praise' ? '#22c55e'
                  : classification.type === 'warning' ? '#f59e0b'
                  : '#6b7280',
                borderColor: 'currentColor',
                opacity: 0.7,
              }}
            >
              {classification.emoji} {classification.badge}
            </span>
            <span className="text-[9px] text-zinc-700 ml-auto">{time}</span>
          </div>
        )}

        {/* Message box */}
        <div
          className={`relative rounded-2xl rounded-tl-sm overflow-hidden border border-[#2A2A2A] shadow-sm ${classification.bgColor}`}
          style={{
            backgroundImage: 'radial-gradient(circle at 100% 100%, rgba(255,255,255,0.01) 0%, transparent 60%)',
          }}
        >
          {/* Left accent stripe */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-[3px] ${
              classification.type === 'directive' ? 'bg-red-500'
              : classification.type === 'analysis' ? 'bg-blue-500'
              : classification.type === 'explanation' ? 'bg-purple-500'
              : classification.type === 'praise' ? 'bg-green-500'
              : classification.type === 'warning' ? 'bg-amber-500'
              : 'bg-zinc-600'
            }`}
          />

          <div className="pl-5 pr-5 py-4">
            <div className="text-sm leading-relaxed">
              <ReactMarkdown components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
            
            {/* Inline Directive */}
            {message.directive && (
              <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className="text-[#C17767]" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#C17767]">DİREKTİF OLUŞTURULDU</span>
                </div>
                <h4 className="text-sm font-bold text-zinc-200 mb-1">{message.directive.headline}</h4>
                <p className="text-xs text-zinc-400 mb-4">{message.directive.summary}</p>
                
                <div className="space-y-2">
                  {message.directive.tasks.map((task, idx) => (
                    <div key={idx} className="flex flex-col gap-1 p-3 bg-[#111111] border border-[#2A2A2A] rounded-xl">
                      <div className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        <span className="text-xs text-zinc-200">{task.action}</span>
                      </div>
                      {task.subject && (
                        <div className="pl-3.5 text-[9px] uppercase tracking-widest text-zinc-500">
                          {task.subject} {task.targetMinutes ? `• ${task.targetMinutes}DK` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[9px] text-zinc-500 font-mono">Bu direktif ana panele eklendi.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
