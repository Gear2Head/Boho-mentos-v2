/**
 * AMAÇ: Premium chat mesaj baloonu — kullanıcı ve koç mesajları.
 * MANTIK: Sol şerit rengi (mesaj tipi), koç avatarı, timestamp, markdown render.
 * UX-TODO §2: Koç header briefing şeridi, mesaj tipi badge, animasyonlu slide-in.
 */

import React, { memo, useMemo } from 'react';
import { motion } from 'motion/react';
import { Target, Play, FileText, Link as LinkIcon, Bot, Skull, Flame, BarChart3, CheckCircle2, Volume2 } from 'lucide-react';
import { classifyMessage } from '../../utils/classifyMessage';
import { getResourcesForSubject } from '../../utils/resourceEngine';
import { CoachParser } from './CoachParser';
import { FlashcardBubble } from './FlashcardBubble';
import type { FlashcardBubbleData } from './FlashcardBubble';
import type { ChatMessage as ChatMessageType } from '../../types';
import { useAppStore } from '../../store/appStore';
import { AudioEngine } from '../../utils/audioEngine';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessageProps {
  message: ChatMessageType;
  index: number;
  profileName: string;
  coachPersonality?: string;
  isGrouped?: boolean; // Aynı kişiden ardışık mesaj mı?
}

// ─── Coach Avatar ──────────────────────────────────────────────────────────────

const COACH_AVATAR: Record<string, { icon: React.ReactNode; color: string; name: string }> = {
  hardcore:     { icon: <Skull size={16} className="text-amber-400" />,      color: 'bg-amber-900/10 border-amber-500/20', name: 'Koç Kübra' },
  harsh:        { icon: <Skull size={16} className="text-red-400" />,       color: 'bg-red-900/10 border-red-500/20',    name: 'Koç Kübra' },
  enforcer:     { icon: <Skull size={16} className="text-red-400" />,       color: 'bg-red-900/10 border-red-500/20',    name: 'Koç Kübra' },
  motivational: { icon: <Flame size={16} className="text-orange-400" />,    color: 'bg-orange-900/10 border-orange-500/20',name: 'Koç Kübra' },
  analytical:   { icon: <BarChart3 size={16} className="text-blue-400" />,   color: 'bg-blue-900/10 border-blue-500/20',  name: 'Koç Kübra' },
};

const DEFAULT_AVATAR = { icon: <Bot size={16} className="text-[#C17767]" />, color: 'bg-surface-2 border-app-subtle', name: 'BOHO.' };

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
        >
          {/* Name + time */}
          <div className="flex justify-end items-center gap-2 mb-1.5">
            <span className="text-[9px] text-ink-muted italic font-medium">{time}</span>
            <span className="text-[9px] uppercase tracking-widest text-accent font-black">
              {profileName}
            </span>
          </div>

          {/* Bubble */}
          <div
            className="px-5 py-4 text-sm font-black leading-relaxed text-ink shadow-sm relative overflow-hidden bg-surface-2 border border-app rounded-2xl rounded-br-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              {message.imageUrl && (
                <div className="mb-3 rounded-lg overflow-hidden border border-app">
                  <img src={message.imageUrl} alt="User attachment" className="w-full max-w-sm h-auto" />
                </div>
              )}
              {message.content}
            </div>
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

  const isHardcore = coachPersonality === 'hardcore';

  return (
    <motion.div
      className="flex items-end gap-3"
      initial={{ opacity: 0, x: -20, y: 4 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        y: 0,
        ...(isHardcore ? {
          rotate: [0, -1, 1, -1, 0],
        } : {})
      }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.02,
        ...(isHardcore ? {
          rotate: {
            repeat: Infinity,
            duration: 0.2,
            repeatDelay: 2
          }
        } : {})
      }}
    >
      {/* Avatar (gizle grouped mesajda) */}
      {!isGrouped ? (
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mb-1 ${avatar.color} ${isHardcore ? 'shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse' : ''}`}
          aria-hidden="true"
        >
          {avatar.icon}
        </div>
      ) : (
        <div className="w-9 shrink-0" />
      )}

      {/* Bubble */}
      <div className="max-w-[75%] md:max-w-[65%]">
        {/* Coach header */}
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-mono font-black uppercase tracking-[0.2em] ${isHardcore ? 'text-amber-500' : 'text-ink-muted'}`}>
              {avatar.name}
            </span>
            {/* Online dot */}
            <span className={`w-1.5 h-1.5 rounded-full ${isHardcore ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]' : 'bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]'}`} />
            {/* Badge */}
            <span
              className="text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full border shadow-sm"
              style={{
                color: isHardcore ? '#F59E0B' : classification.type === 'directive' ? 'var(--color-accent)'
                  : classification.type === 'analysis' ? '#3b82f6'
                    : classification.type === 'explanation' ? '#a855f7'
                      : classification.type === 'praise' ? '#10b981'
                        : classification.type === 'warning' ? '#f59e0b'
                          : 'var(--color-ink-muted)',
                borderColor: 'currentColor',
                opacity: 0.9,
              }}
            >
              {isHardcore ? '☣️ TOXIC' : `${classification.emoji} ${classification.badge}`}
            </span>
            
            {/* TTS Button */}
            <button 
              onClick={() => AudioEngine.playTts(message.content)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-ink-muted/60 hover:text-accent transition-all active:scale-90"
              title="Sesli Oku"
            >
              <Volume2 size={12} />
            </button>

            <span className="text-[9px] text-ink-muted/40 font-mono font-black ml-auto">{time}</span>
          </div>
        )}

        {/* Message box */}
        <div
          className={`relative rounded-2xl rounded-bl-sm overflow-hidden border shadow-sm transition-all duration-300 ${isHardcore ? 'border-amber-500/40 bg-amber-950/10 shadow-[0_8px_32px_rgba(245,158,11,0.1)] animate-shake' : 'border-app bg-surface'}`}
        >
          {/* Left accent stripe */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-[3px] ${isHardcore ? 'bg-amber-500' : (classification.type === 'directive' ? 'bg-rose-500'
              : classification.type === 'analysis' ? 'bg-blue-500'
                : classification.type === 'explanation' ? 'bg-purple-500'
                  : classification.type === 'praise' ? 'bg-emerald-500'
                    : classification.type === 'warning' ? 'bg-amber-500'
                      : 'bg-ink-muted')
              }`}
          />

          <div className="pl-6 pr-5 py-5">
            <div className={`text-sm leading-relaxed font-medium ${isHardcore ? 'text-amber-100/90 glitch-text' : 'text-ink'}`}>
              <CoachParser content={message.content} />
            </div>

            {/* Flashcard detection */}
            {useMemo(() => {
              try {
                const match = message.content.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (match) {
                  const parsed = JSON.parse(match[1]);
                  const cards: FlashcardBubbleData[] = Array.isArray(parsed?.flashcards) ? parsed.flashcards
                    : Array.isArray(parsed) ? parsed : [];
                  if (cards.length > 0 && cards[0].front && cards[0].back) {
                    return <FlashcardBubble cards={cards} />;
                  }
                }
              } catch { /* not flashcard json */ }
              return null;
            }, [message.content])}

            {/* Inline Directive */}
            {message.directive && (
              <div className="mt-6 pt-6 border-t border-app">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} className="text-accent" />
                  <span className="text-[10px] uppercase font-black tracking-[0.2em] text-accent">DİREKTİF OLUŞTURULDU</span>
                </div>
                <h4 className="text-base font-serif italic font-black text-ink mb-1.5 leading-tight">{message.directive.headline}</h4>
                <p className="text-xs text-ink-muted mb-6 leading-relaxed font-medium">{message.directive.summary}</p>

                <div className="space-y-3">
                  {message.directive.tasks.map((task, idx) => {
                    const resc = task.subject ? getResourcesForSubject(task.subject) : [];
                    // Find matching record in history to get status and handle completion
                    const history = useAppStore.getState().directiveHistory;
                    const record = history.find(r => 
                      r.directive.headline === message.directive?.headline && 
                      r.directive.createdAt === message.directive?.createdAt
                    );
                    const taskStatus = record?.directive.tasks[idx]?.status ?? 'pending';
                    const isDone = taskStatus === 'completed';

                    return (
                      <div key={idx} className={`flex flex-col gap-3 p-4 bg-surface-2 border rounded-2xl shadow-sm group/task transition-all ${isDone ? 'opacity-60 border-emerald-500/30' : 'border-app hover:border-accent/30'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 shadow-lg ${isDone ? 'bg-emerald-500 shadow-emerald-500/20' : task.priority === 'high' ? 'bg-rose-500 shadow-rose-500/20' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                            <span className={`text-sm font-black tracking-tight ${isDone ? 'line-through text-ink-muted' : 'text-ink'}`}>{task.action}</span>
                          </div>
                          
                          {record && !isDone && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => useAppStore.getState().completeCoachTask(record.id, idx)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                title="Tamamla"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            </div>
                          )}
                          {isDone && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                        </div>
                        
                        {!isDone && task.subject && (
                          <div className="pl-5 flex items-center">
                            <div className="text-[9px] uppercase tracking-[0.2em] text-accent font-black py-1 px-3 bg-accent/5 rounded-full border border-accent/10">
                              {task.subject} {task.targetMinutes ? `• ${task.targetMinutes}DK` : ''}
                            </div>
                          </div>
                        )}
                        
                        {resc.length > 0 && !isDone && (
                          <div className="pl-5 mt-1 flex flex-wrap gap-2">
                            {resc.map(r => (
                              <a href={r.url} target="_blank" rel="noopener noreferrer" key={r.id} className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-accent/5 border border-app hover:border-accent/30 transition-all rounded-xl text-[9px] font-black uppercase tracking-widest text-ink-muted hover:text-accent group/res shadow-sm">
                                {r.type === 'video' || r.type === 'playlist' ? <Play size={10} className="text-rose-500 group-hover/res:scale-110 transition-transform" /> : r.type === 'pdf' ? <FileText size={10} className="text-orange-500 group-hover/res:scale-110 transition-transform" /> : <LinkIcon size={10} className="text-blue-400" />}
                                <span>{r.provider}: {r.title}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[9px] text-ink-muted/40 font-mono font-black uppercase tracking-widest">GÜNCEL DURUM ANA PANELE YANSITILDI</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
