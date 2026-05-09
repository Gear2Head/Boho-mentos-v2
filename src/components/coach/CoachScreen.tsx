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
import { ConversationSidebar } from './ConversationSidebar';
import { ContextBar } from './ContextBar';
import { PanelLeftOpen } from 'lucide-react';
import type { CoachIntent } from '../../types/coach';
import { CoachBriefing } from '../CoachBriefing';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CoachScreenProps {
  isTyping: boolean;
  inputMessage: string;
  setInputMessage: (val: string) => void;
  onSendMessage: (msg: string, intent?: CoachIntent, attachment?: { base64: string; mediaType: string; name: string }) => void;
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
  const conversations = useAppStore((s) => s.conversations);
  const activeId = useAppStore((s) => s.activeConversationId);
  const migrate = useAppStore((s) => s.migrateLegacyChat);
  const profile = useAppStore((s) => s.profile);
  const activeConversation = conversations.find(c => c.id === activeId);
  const messages = activeConversation?.messages || [];

  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const prevLengthRef = useRef(messages.length);
  const silenceInterventionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    migrate();
  }, [migrate]);

  // Sıralı mesajlar
  const sortedMessages = [...messages].sort(
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

    if (messages.length > prevLengthRef.current) {
      if (isAtBottom) {
        const raf = requestAnimationFrame(() => scrollToBottom('smooth'));
        
        return () => cancelAnimationFrame(raf);
      } else {
        setNewMsgCount((prev) => prev + 1);
        setShowScrollBtn(true);
      }
    }
    prevLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (isTyping) {
      const raf = requestAnimationFrame(() => scrollToBottom('smooth'));
      return () => cancelAnimationFrame(raf);
    }
  }, [isTyping, scrollToBottom]);

  // ─── Proactive Silence Trigger ──────────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0 || isTyping) return;
    
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'coach') return; // Zaten koç konuştuysa tekrar etme

    const lastTime = new Date(lastMsg.timestamp).getTime();
    const now = Date.now();
    const diffHours = (now - lastTime) / (1000 * 60 * 60);

    // Eğer 48 saatten fazla olduysa (veya test için 24 saat)
    if (diffHours > 48) {
      const silenceKey = `${activeId || 'default'}:${lastMsg.id || lastMsg.timestamp}`;
      if (silenceInterventionsRef.current.has(silenceKey)) return;
      silenceInterventionsRef.current.add(silenceKey);
      const timer = setTimeout(() => {
        onSendMessage("Sessizlik... 48 saattir sesin çıkmıyor. Neredesin? Bu sınav kendi kendine mi kazanılacak? Derhal durum raporu ver.", "intervention");
      }, 5000); // Ekran açıldıktan 5 sn sonra tetikle
      return () => clearTimeout(timer);
    }
  }, [activeId, messages, isTyping, onSendMessage]);

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
    <div className="flex h-full overflow-hidden bg-app relative">
      {/* Sidebar - Desktop & Mobile overlay */}
      <div className={`
        fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden
        ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `} onClick={() => setSidebarOpen(false)} />
      
      <div className={`
        fixed md:relative z-[101] h-full transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <ConversationSidebar isOpen={isSidebarOpen} onToggle={() => setSidebarOpen(!isSidebarOpen)} />
      </div>

      {/* ── Main Chat Area ──────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 relative bg-app">
        <header className="shrink-0 border-b border-app bg-app/90 backdrop-blur-xl px-4 md:px-6 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {!isSidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 bg-surface border border-app text-ink-muted hover:text-ink transition-all rounded-lg shadow-sm"
                  title="Gecmisi goster"
                  aria-label="Gecmisi goster"
                >
                  <PanelLeftOpen size={16} />
                </button>
              )}
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.24em] text-accent font-black">Kubra Mentor</div>
                <p className="text-xs text-ink-muted truncate">Sakin muhakeme, net aksiyon, kontrollu hafiza.</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-ink-muted font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              Canli
            </div>
          </div>
        </header>
        {/* Sticky Header Actions */}
        <div className="absolute top-4 left-4 z-20 hidden">
          {!isSidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 bg-surface/80 backdrop-blur-md border border-app text-zinc-400 hover:text-ink transition-all rounded-xl shadow-sm"
              title="Geçmişi Göster"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
        </div>

        {/* Scroll area */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto custom-scrollbar"
          role="log"
          aria-live="polite"
          aria-label="Koç sohbet geçmişi"
        >
          <div className="p-4 md:p-8 space-y-6 pb-4 max-w-3xl mx-auto w-full">
            {isEmpty ? (
              /* Empty state — CoachBriefing */
              <CoachBriefing
                onSendMessage={onSendMessage}
                isTyping={isTyping}
              />
            ) : (
              <>
                {/* Date separator — "Bugün" */}
                <div className="flex items-center gap-3 py-4 relative">
                  <div className="flex-1 h-px bg-app-subtle/50" />
                  <span className="text-[9px] uppercase tracking-[0.3em] text-accent font-black bg-surface px-4 py-1.5 rounded-full border border-app shadow-sm">
                    {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <div className="flex-1 h-px bg-app-subtle/50" />
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
              className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:bg-accent/90 active:scale-95 transition-all z-10 border border-white/10"
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
