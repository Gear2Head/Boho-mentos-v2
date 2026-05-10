/**
 * AMAÇ: Koç ekranının tamamını yöneten ana container bileşeni.
 * V2:
 * - Daha güçlü mentor cockpit layout
 * - Daha iyi desktop/mobile oranlama
 * - Mobilde conversation sidebar varsayılan kapalı
 * - Chat alanında premium odak yüzeyi
 * - Sağ panel / sol panel / input dengesi iyileştirildi
 * - Scroll ve yeni mesaj davranışı korundu
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  BrainCircuit,
  CalendarDays,
  Command,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { useAppStore } from '../../store/appStore';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { InputZone } from './InputZone';
import { ConversationSidebar } from './ConversationSidebar';
import { ContextBar } from './ContextBar';
import type { CoachIntent } from '../../types/coach';
import { CoachBriefing } from '../CoachBriefing';

interface CoachScreenProps {
  isTyping: boolean;
  inputMessage: string;
  setInputMessage: (val: string) => void;
  onSendMessage: (
    msg: string,
    intent?: CoachIntent,
    attachment?: { base64: string; mediaType: string; name: string },
  ) => void;
  onLogClick: () => void;
  onExamClick: () => void;
}

const getInitialSidebarState = () => {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(min-width: 768px)').matches;
};

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

  const activeConversation = conversations.find((c) => c.id === activeId);
  const messages = activeConversation?.messages || [];

  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(messages.length);
  const silenceInterventionsRef = useRef<Set<string>>(new Set());

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [isSidebarOpen, setSidebarOpen] = useState(getInitialSidebarState);

  useEffect(() => {
    migrate();
  }, [migrate]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');

    const handleChange = () => {
      setSidebarOpen(mq.matches);
    };

    handleChange();

    if (mq.addEventListener) {
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }

    mq.addListener(handleChange);
    return () => mq.removeListener(handleChange);
  }, []);

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [messages]);

  const messageStats = useMemo(() => {
    const userCount = sortedMessages.filter((m) => m.role !== 'coach').length;
    const coachCount = sortedMessages.filter((m) => m.role === 'coach').length;

    return {
      total: sortedMessages.length,
      userCount,
      coachCount,
      hasMessages: sortedMessages.length > 0,
    };
  }, [sortedMessages]);

  const virtualizer = useVirtualizer({
    count: sortedMessages.length,
    getScrollElement: () => scrollAreaRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior,
      });
    }
    setNewMsgCount(0);
    setShowScrollBtn(false);
  }, []);

  useEffect(() => {
    const el = scrollAreaRef.current;
    const isAtBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 100;

    if (messages.length > prevLengthRef.current) {
      if (isAtBottom) {
        const raf = requestAnimationFrame(() => scrollToBottom('smooth'));
        prevLengthRef.current = messages.length;
        return () => cancelAnimationFrame(raf);
      }

      setNewMsgCount((prev) => prev + 1);
      setShowScrollBtn(true);
    }

    prevLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (!isTyping) return;

    const raf = requestAnimationFrame(() => scrollToBottom('smooth'));
    return () => cancelAnimationFrame(raf);
  }, [isTyping, scrollToBottom]);

  useEffect(() => {
    if (messages.length === 0 || isTyping) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'coach') return;

    const lastTime = new Date(lastMsg.timestamp).getTime();
    const diffHours = (Date.now() - lastTime) / (1000 * 60 * 60);

    if (diffHours > 48) {
      const silenceKey = `${activeId || 'default'}:${lastMsg.id || lastMsg.timestamp}`;

      if (silenceInterventionsRef.current.has(silenceKey)) return;

      silenceInterventionsRef.current.add(silenceKey);

      const timer = setTimeout(() => {
        onSendMessage(
          'Sessizlik... 48 saattir sesin çıkmıyor. Neredesin? Bu sınav kendi kendine mi kazanılacak? Derhal durum raporu ver.',
          'intervention',
        );
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [activeId, messages, isTyping, onSendMessage]);

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
  const activeTitle =
    (activeConversation as any)?.title ||
    (activeConversation as any)?.name ||
    'Kübra Mentor';

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-[#08080A] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(193,119,103,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(120,113,108,0.08),transparent_30%)]" />

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          x: isSidebarOpen ? 0 : -300,
          width: isSidebarOpen ? 248 : 0,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="fixed left-0 top-0 z-[101] h-full overflow-hidden border-r border-zinc-800 bg-[#0B0B0D] md:relative md:z-10 md:block"
      >
        <ConversationSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
        />
      </motion.aside>

      <section className="relative z-10 flex min-w-0 flex-1 flex-col border-x border-zinc-900/80 bg-[#09090B]/70">
        <header className="shrink-0 border-b border-zinc-800/90 bg-[#0B0B0D]/92 px-3 py-2 backdrop-blur-2xl md:px-5">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 transition-all hover:border-[#C17767]/40 hover:text-[#C17767]"
                title={isSidebarOpen ? 'Geçmişi gizle' : 'Geçmişi göster'}
                aria-label={isSidebarOpen ? 'Geçmişi gizle' : 'Geçmişi göster'}
              >
                {isSidebarOpen ? (
                  <PanelLeftClose size={17} />
                ) : (
                  <PanelLeftOpen size={17} />
                )}
              </button>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#C17767]/20 bg-[#C17767]/10 text-[#C17767]">
                <BrainCircuit size={16} />
              </div>

              <div className="min-w-0">
                <div className="truncate text-[10px] font-black uppercase tracking-[0.24em] text-[#C17767]">
                  {activeTitle}
                </div>
                <p className="truncate text-[11px] text-zinc-500">
                  Sakin muhakeme, net aksiyon, kontrollü hafıza.
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <StatusPill icon={<Radio size={12} />} label="Canlı" tone="green" />
              <StatusPill
                icon={<ShieldCheck size={12} />}
                label={`${messageStats.total} mesaj`}
                tone="neutral"
              />
            </div>
          </div>
        </header>

        <div className="shrink-0 border-b border-zinc-900 bg-[#09090B]/80 px-3 py-2 backdrop-blur-xl md:px-5">
          <div className="mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto no-scrollbar">
            <QuickChip
              icon={<Sparkles size={13} />}
              label="Hedefe ne kadar uzağım?"
              onClick={() => onSendMessage('Hedefime göre şu an ne kadar gerideyim? Net, konu ve süre açısından sert ama net analiz yap.', 'log_analysis')}
            />
            <QuickChip
              icon={<Command size={13} />}
              label="Zayıf konularım?"
              onClick={() => onSendMessage('Son verilerime göre en kritik zayıf konularımı çıkar ve bugün için aksiyon planı ver.', 'log_analysis')}
            />
            <QuickChip
              icon={<CalendarDays size={13} />}
              label="Bugünün programı"
              onClick={() => onSendMessage('Bugün için mikro plan çıkar. Ne çalışacağım, nasıl çalışacağım, kaç dakika sürecek ve hedef soru sayısı ne olacak?', 'daily_plan')}
            />
            <QuickChip
              icon={<MessageSquare size={13} />}
              label="Hızlı deneme özeti"
              onClick={() => onSendMessage('Son deneme performansımı kısa ve net özetle. Net artışı, risk ve sonraki hamleyi söyle.', 'exam_debrief')}
            />
          </div>
        </div>

        <div
          ref={scrollAreaRef}
          className="relative min-h-0 flex-1 overflow-y-auto custom-scrollbar"
          role="log"
          aria-live="polite"
          aria-label="Koç sohbet geçmişi"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#09090B] to-transparent" />

          <div className="mx-auto w-full max-w-4xl px-3 py-4 pb-6 md:px-5 md:py-5">
            {isEmpty ? (
              <div className="mx-auto max-w-3xl">
                <CoachBriefing onSendMessage={onSendMessage} isTyping={isTyping} />
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-zinc-800/70" />
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.28em] text-[#C17767] shadow-sm">
                    {new Date().toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <div className="h-px flex-1 bg-zinc-800/70" />
                </div>

                <div
                  className="relative w-full"
                  style={{ height: `${virtualizer.getTotalSize()}px` }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const msg = sortedMessages[virtualItem.index];
                    const prev = sortedMessages[virtualItem.index - 1];
                    const isGrouped = Boolean(prev && prev.role === msg.role);

                    return (
                      <div
                        key={virtualItem.key}
                        data-index={virtualItem.index}
                        ref={virtualizer.measureElement}
                        className="absolute left-0 top-0 w-full"
                        style={{ transform: `translateY(${virtualItem.start}px)` }}
                      >
                        <ChatMessage
                          message={msg}
                          index={virtualItem.index}
                          profileName={profile?.name ?? 'Sen'}
                          coachPersonality={profile?.coachPersonality}
                          isGrouped={isGrouped}
                        />
                      </div>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    className="mt-3"
                    >
                      <TypingIndicator coachPersonality={profile?.coachPersonality} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            <div ref={chatEndRef} aria-hidden="true" />
          </div>
        </div>

        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.92 }}
              onClick={() => scrollToBottom()}
              className="absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-[#C17767] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-[#C17767]/20 transition-all hover:bg-[#D68A78] active:scale-95"
            >
              <ArrowDown size={12} />
              {newMsgCount > 0 ? `${newMsgCount} yeni mesaj` : 'Aşağı kaydır'}
            </motion.button>
          )}
        </AnimatePresence>

        <div className="shrink-0 border-t border-zinc-800/90 bg-[#0B0B0D]/95 px-3 py-2 backdrop-blur-2xl md:px-5">
          <div className="mx-auto max-w-4xl">
            <InputZone
              value={inputMessage}
              onChange={setInputMessage}
              onSubmit={onSendMessage}
              isTyping={isTyping}
              onLogClick={onLogClick}
              onExamClick={onExamClick}
            />
          </div>
        </div>
      </section>

      <aside className="relative z-10 hidden min-w-[260px] max-w-[280px] border-l border-zinc-800 bg-[#0B0B0D]/92 2xl:block">
        <ContextBar onQuickAction={onSendMessage} />
      </aside>
    </div>
  );
}

function StatusPill({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'green' | 'neutral';
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${tone === 'green'
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
        : 'border-zinc-800 bg-zinc-950 text-zinc-500'
        }`}
    >
      {icon}
      {label}
    </div>
  );
}

function QuickChip({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/80 px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 transition-all hover:border-[#C17767]/40 hover:bg-[#C17767]/10 hover:text-[#C17767] active:scale-[0.98]"
    >
      <span className="text-[#C17767]">{icon}</span>
      {label}
    </button>
  );
}
