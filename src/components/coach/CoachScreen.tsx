/**
 * AMAÇ: Koç ekranının tamamını yöneten ana container bileşeni.
 * MANTIK: ChatMessage + TypingIndicator + InputZone + ContextBar + EmptyState birleşimi.
 * UX-TODO §1,2,3,4,5,7,10: 3-dikey-bölge mimari, mesaj gruplaması, smooth scroll, "yeni mesaj" badge.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { InputZone } from './InputZone';
import { ContextBar } from './ContextBar';
import { CoachBriefing } from '../CoachBriefing';
import type { CoachIntent } from '../../types/coach';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CoachScreenProps {
  isTyping: boolean;
  inputMessage: string;
  setInputMessage: (val: string) => void;
  onSendMessage: (msg: string, intent?: CoachIntent) => void;
  onLogClick: () => void;
  onExamClick: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function CoachScreen({
  isTyping,
  inputMessage,
  setInputMessage,
  onSendMessage,
  onLogClick,
  onExamClick,
}: CoachScreenProps) {
  const chatHistory = useAppStore((s) => s.chatHistory);
  const profile = useAppStore((s) => s.profile);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const prevLengthRef = useRef(chatHistory.length);

  // Sıralı mesajlar
  const sortedMessages = [...chatHistory].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Smooth scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    setNewMsgCount(0);
    setShowScrollBtn(false);
  }, []);

  // Yeni mesaj gelince scroll et veya badge göster
  useEffect(() => {
    const isAtBottom = (() => {
      const el = scrollAreaRef.current;
      if (!el) return true;
      return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    })();

    if (chatHistory.length > prevLengthRef.current) {
      if (isAtBottom) {
        const raf = requestAnimationFrame(() => scrollToBottom('smooth'));
        return () => cancelAnimationFrame(raf);
      } else {
        setNewMsgCount((prev) => prev + 1);
        setShowScrollBtn(true);
      }
    }
    prevLengthRef.current = chatHistory.length;
  }, [chatHistory.length, scrollToBottom]);

  useEffect(() => {
    if (isTyping) {
      const raf = requestAnimationFrame(() => scrollToBottom('smooth'));
      return () => cancelAnimationFrame(raf);
    }
  }, [isTyping, scrollToBottom]);

  // Scroll event listener
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const handleScroll = () => {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (isAtBottom) {
        setShowScrollBtn(false);
        setNewMsgCount(0);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const isEmpty = sortedMessages.length === 0;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Main Chat Area ──────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 relative">

        {/* Scroll area */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto"
          role="log"
          aria-live="polite"
          aria-label="Koç sohbet geçmişi"
        >
          <div className="p-4 md:p-6 space-y-5 pb-4">
            {isEmpty ? (
              /* Empty state — CoachBriefing */
              <CoachBriefing
                onSendMessage={onSendMessage}
                isTyping={isTyping}
              />
            ) : (
              <>
                {/* Date separator — "Bugün" */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-[#2A2A2A]" />
                  <span className="text-[9px] uppercase tracking-widest text-zinc-700 font-bold">
                    {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <div className="flex-1 h-px bg-[#2A2A2A]" />
                </div>

                {/* Messages */}
                <AnimatePresence initial={false}>
                  {sortedMessages.map((msg, i) => {
                    const prev = sortedMessages[i - 1];
                    const isGrouped = !!prev && prev.role === msg.role;

                    return (
                      <ChatMessage
                        key={`${msg.timestamp}-${i}`}
                        message={msg}
                        index={i}
                        profileName={profile?.name ?? 'Sen'}
                        coachPersonality={profile?.coachPersonality}
                        isGrouped={isGrouped}
                      />
                    );
                  })}
                </AnimatePresence>

                {/* Typing indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <TypingIndicator coachPersonality={profile?.coachPersonality} />
                  </motion.div>
                )}
              </>
            )}

            <div ref={chatEndRef} aria-hidden="true" />
          </div>
        </div>

        {/* ── Scroll to bottom badge ─────────────────────────────────── */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
              onClick={() => scrollToBottom()}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-[#C17767] text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-[#C17767]/30 hover:bg-[#A56253] transition-colors z-10"
            >
              <ArrowDown size={12} />
              {newMsgCount > 0 ? `${newMsgCount} yeni mesaj` : 'Aşağı kaydır'}
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Input Zone ─────────────────────────────────────────────── */}
        <InputZone
          value={inputMessage}
          onChange={setInputMessage}
          onSubmit={onSendMessage}
          isTyping={isTyping}
          onLogClick={onLogClick}
          onExamClick={onExamClick}
        />
      </div>

      {/* ── Context Bar (sağ panel, sadece lg+) ────────────────────── */}
      <ContextBar onQuickAction={onSendMessage} />
    </div>
  );
}
