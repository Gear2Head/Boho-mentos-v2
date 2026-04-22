/**
 * AMAÇ: Gelişmiş input zone — auto-resize, slash commands, pill suggestions, send animasyonu.
 * MANTIK: Textarea ile multiline destek, / prefix ile komut dropdown, karakter sayacı.
 * UX-TODO §4: Input zone tam yeniden tasarım.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CoachIntent } from '../../types/coach';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface InputZoneProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (msg: string, intent?: CoachIntent) => void;
  isTyping: boolean;
  onLogClick: () => void;
  onExamClick: () => void;
}

// ─── Slash Commands ─────────────────────────────────────────────────────────────

const SLASH_COMMANDS: Array<{ cmd: string; label: string; desc: string; intent: CoachIntent }> = [
  { cmd: '/plan', label: 'Günlük Plan', desc: 'Bugünkü çalışma planını oluştur', intent: 'daily_plan' },
  { cmd: '/analiz', label: 'Analiz Et', desc: 'Son logları analiz et', intent: 'log_analysis' },
  { cmd: '/haftalik', label: 'Haftalık Rapor', desc: 'Haftalık performans özeti', intent: 'weekly_review' },
  { cmd: '/anla', label: 'Konu Anlat', desc: 'Bir konuyu derinlemesine anlat', intent: 'topic_explain' },
  { cmd: '/savaş', label: 'Savaş Analizi', desc: 'War Room sonrası analiz', intent: 'war_room_analysis' },
  { cmd: '/flashcard', label: 'Flashcard Üret', desc: 'PDF/Metinden soru kartları oluştur', intent: 'flashcard_generation' },
];

// ─── Quick Pill Suggestions ────────────────────────────────────────────────────

const PILL_SUGGESTIONS: Array<{ label: string; value: string; intent: CoachIntent }> = [
  { label: '📋 PLAN', value: 'PLAN', intent: 'daily_plan' },
  { label: '🔬 ANALİZ', value: 'ANALİZ ET', intent: 'log_analysis' },
  { label: '📅 HAFTALIK', value: 'HAFTALIK RAPOR', intent: 'weekly_review' },
  { label: '🃏 KART ÜRET', value: 'FLASHCARD YAZ', intent: 'flashcard_generation' },
];

const MAX_CHARS = 10000; // Increased characters for PDF texts

// ─── Component ─────────────────────────────────────────────────────────────────

export function InputZone({
  value,
  onChange,
  onSubmit,
  isTyping,
  onLogClick,
  onExamClick,
}: InputZoneProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedSlash, setSelectedSlash] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const isEmpty = !value.trim();
  const charCount = value.length;

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      if (val.length > MAX_CHARS) return;
      onChange(val);

      // Slash command detection
      if (val.startsWith('/') && !val.includes(' ')) {
        setSlashFilter(val.slice(1).toLowerCase());
        setSlashOpen(true);
        setSelectedSlash(0);
      } else {
        setSlashOpen(false);
      }
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (slashOpen) {
        const filtered = SLASH_COMMANDS.filter((c) =>
          c.cmd.includes(slashFilter) || c.label.toLowerCase().includes(slashFilter)
        );
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedSlash((prev) => (prev + 1) % filtered.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedSlash((prev) => (prev - 1 + filtered.length) % filtered.length);
          return;
        }
        if (e.key === 'Enter' && filtered[selectedSlash]) {
          e.preventDefault();
          applySlashCommand(filtered[selectedSlash]);
          return;
        }
        if (e.key === 'Escape') {
          setSlashOpen(false);
          return;
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === 'Escape') {
        onChange('');
        textareaRef.current?.blur();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slashOpen, slashFilter, selectedSlash, value]
  );

  const applySlashCommand = useCallback(
    (cmd: (typeof SLASH_COMMANDS)[0]) => {
      onChange(cmd.label);
      setSlashOpen(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    },
    [onChange]
  );

  const handleSend = useCallback(async () => {
    if (isEmpty || isTyping) return;
    setIsSending(true);
    onSubmit(value);
    onChange('');
    await new Promise((r) => setTimeout(r, 300));
    setIsSending(false);
  }, [isEmpty, isTyping, value, onSubmit, onChange]);

  const handlePill = useCallback(
    (pill: (typeof PILL_SUGGESTIONS)[0]) => {
      onSubmit(pill.value, pill.intent);
    },
    [onSubmit]
  );

  const filteredSlash = SLASH_COMMANDS.filter(
    (c) => c.cmd.includes(slashFilter) || c.label.toLowerCase().includes(slashFilter)
  );

  return (
    <div className="bg-app flex flex-col p-4 w-full">
      {/* Search/Command Container */}
      <div className="relative max-w-4xl mx-auto w-full flex flex-col gap-2">
        
        {/* Suggested Actions (Pills) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {PILL_SUGGESTIONS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => handlePill(pill)}
              title={pill.label}
              className="flex items-center gap-2 px-4 py-2 bg-surface-2 border border-app rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-ink-muted hover:border-accent/40 hover:bg-accent/5 hover:text-accent transition-all whitespace-nowrap shadow-sm"
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Slash command dropdown */}
        <AnimatePresence>
          {slashOpen && filteredSlash.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="absolute bottom-full left-0 mb-3 w-[min(480px,calc(100vw-32px))] bg-surface border border-app rounded-2xl overflow-hidden shadow-2xl z-50 text-sm"
            >
              <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-1 max-h-68 overflow-y-auto custom-scrollbar">
                {filteredSlash.map((cmd, idx) => (
                  <button
                    key={cmd.cmd}
                    onClick={() => applySlashCommand(cmd)}
                    className={`w-full flex flex-col items-start px-4 py-3 rounded-xl text-left transition-all ${
                      idx === selectedSlash ? 'bg-accent/10 border border-accent/20' : 'hover:bg-ink/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] text-accent font-black tracking-widest">{cmd.cmd}</span>
                      <span className={`text-[11px] font-black uppercase tracking-tight ${idx === selectedSlash ? 'text-accent' : 'text-ink'}`}>{cmd.label}</span>
                    </div>
                    <span className="text-[10px] text-ink-muted line-clamp-1 font-medium italic opacity-80">{cmd.desc}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Field */}
        <div className="relative flex items-end bg-surface-2 border border-app rounded-[2rem] shadow-inner focus-within:border-accent/30 focus-within:bg-surface transition-all p-1.5 md:p-2">
          
          {/* Prefix Actions */}
          <div className="flex items-center text-ink-muted shrink-0 self-end mb-1 md:mb-0 ml-1">
             <ActionBtn
              label="Log Ekle"
              onClick={onLogClick}
              icon={<span className="text-base">📋</span>}
            />
            <ActionBtn
              label="Deneme Ekle"
              onClick={onExamClick}
              icon={<span className="text-base">📝</span>}
            />
            <ActionBtn
              label="Resim Yükle"
              onClick={() => alert("Multimodal Optik Analiz yakında eklenecek!")}
              icon={<ImageIcon size={18} />}
            />
          </div>

          <div className="w-px h-8 bg-app-subtle mx-1 md:mx-2 self-end mb-2" />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Mesaj yaz veya / ile araçları kullan..."
            rows={1}
            className="flex-1 bg-transparent text-ink px-3 py-3 md:py-4 text-[13px] md:text-sm tracking-wide resize-none font-mono leading-relaxed focus:outline-none placeholder:text-ink-muted no-scrollbar self-center font-semibold"
            style={{ minHeight: '52px', maxHeight: '160px' }}
          />

          {/* Clear btn */}
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-20 bottom-7 text-ink-muted/30 hover:text-accent transition-colors hidden md:block"
              aria-label="Temizle"
            >
              <X size={16} />
            </button>
          )}

          {/* Postfix Actions */}
          <div className="flex items-center px-1 shrink-0 self-end mb-1 md:mb-1">
            <span
              className={`mr-3 text-[10px] pr-2 font-mono transition-colors hidden md:block font-black ${
                charCount > MAX_CHARS * 0.8 ? 'text-red-500' : 'text-ink-muted'
              }`}
            >
              {charCount > 0 ? charCount : ''}
            </span>
            <button
              onClick={handleSend}
              disabled={isSending || isEmpty}
              className={`w-11 h-11 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all ${
                !isEmpty && !isSending 
                  ? 'bg-accent text-white hover:scale-105 shadow-xl shadow-accent/20 border border-white/10' 
                  : 'bg-surface text-ink-muted cursor-not-allowed border border-app shadow-inner opacity-40'
              }`}
              title="Gönder (Enter)"
            >
              {isSending ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Plus size={18} className="rotate-45" />
                </motion.div>
              ) : (
                <Send size={18} className={!isEmpty ? 'translate-x-0.5 transform -translate-y-[0.5px]' : ''} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Action Button ──────────────────────────────────────────────────────────────

function ActionBtn({
  label,
  onClick,
  icon,
  color,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-ink-muted hover:bg-accent/10 hover:text-accent ${color}`}
    >
      {icon}
    </button>
  );
}
