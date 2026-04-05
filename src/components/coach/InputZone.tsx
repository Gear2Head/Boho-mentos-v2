/**
 * AMAÇ: Gelişmiş input zone — auto-resize, slash commands, pill suggestions, send animasyonu.
 * MANTIK: Textarea ile multiline destek, / prefix ile komut dropdown, karakter sayacı.
 * UX-TODO §4: Input zone tam yeniden tasarım.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, X } from 'lucide-react';
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
];

// ─── Quick Pill Suggestions ────────────────────────────────────────────────────

const PILL_SUGGESTIONS: Array<{ label: string; value: string; intent: CoachIntent }> = [
  { label: '📋 PLAN', value: 'PLAN', intent: 'daily_plan' },
  { label: '🔬 ANALİZ', value: 'ANALİZ ET', intent: 'log_analysis' },
  { label: '📅 HAFTALIK', value: 'HAFTALIK RAPOR', intent: 'weekly_review' },
  { label: '📖 ANLA', value: 'ANLA', intent: 'topic_explain' },
];

const MAX_CHARS = 500;

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
    <div className="border-t border-[#2A2A2A] bg-[#111111]">
      {/* Pill suggestions (göster: input boşken) */}
      {isEmpty && !isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 px-4 pt-3 pb-0 flex-wrap"
        >
          {PILL_SUGGESTIONS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => handlePill(pill)}
              className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:border-[#C17767]/50 hover:text-[#C17767] transition-all"
            >
              {pill.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Slash command dropdown */}
      <AnimatePresence>
        {slashOpen && filteredSlash.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-4 mb-0 mt-2 bg-[#1A1A1A] border border-[#333] rounded-xl overflow-hidden shadow-2xl"
          >
            {filteredSlash.map((cmd, idx) => (
              <button
                key={cmd.cmd}
                onClick={() => applySlashCommand(cmd)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                  idx === selectedSlash ? 'bg-[#C17767]/10' : 'hover:bg-white/3'
                }`}
              >
                <span className="font-mono text-[11px] text-[#C17767] font-bold w-20 shrink-0">
                  {cmd.cmd}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-zinc-200">{cmd.label}</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">{cmd.desc}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input row */}
      <div className="flex items-end gap-3 p-4">
        {/* Action buttons (+ menü) */}
        <div className="flex gap-1.5 shrink-0 mb-1">
          <ActionBtn
            label="Log Ekle"
            onClick={onLogClick}
            icon={<span className="text-base">📋</span>}
            color="hover:bg-green-900/40 hover:border-green-700/50 hover:text-green-400"
          />
          <ActionBtn
            label="Deneme Gir"
            onClick={onExamClick}
            icon={<span className="text-base">📝</span>}
            color="hover:bg-orange-900/40 hover:border-orange-700/50 hover:text-orange-400"
          />
        </div>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Komut gir veya yaz... (/ ile komutlar)"
            rows={1}
            aria-label="Koça mesaj yaz"
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-zinc-200 px-4 py-3 rounded-xl text-sm resize-none font-mono leading-relaxed focus:outline-none focus:border-[#C17767] focus:shadow-[0_0_0_2px_rgba(193,119,103,0.15)] transition-all placeholder:text-zinc-700 pr-16"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          {/* Char counter */}
          <span
            className={`absolute right-3 bottom-3 text-[9px] font-mono transition-colors ${
              charCount > MAX_CHARS * 0.8 ? 'text-amber-500' : 'text-zinc-700'
            }`}
          >
            {charCount > 0 ? `${charCount}/${MAX_CHARS}` : ''}
          </span>
          {/* Clear btn */}
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-8 bottom-3 text-zinc-600 hover:text-zinc-400 transition-colors"
              aria-label="Temizle"
            >
              <X size={10} />
            </button>
          )}
        </div>

        {/* Send button */}
        <motion.button
          onClick={handleSend}
          disabled={isEmpty || isTyping}
          aria-label="Mesaj gönder"
          whileHover={!isEmpty && !isTyping ? { scale: 1.08, rotate: -5 } : {}}
          whileTap={!isEmpty && !isTyping ? { scale: 0.92 } : {}}
          animate={isSending ? { scale: 0.7, opacity: 0.5 } : {}}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 mb-1 ${
            isEmpty || isTyping
              ? 'bg-[#1A1A1A] border border-[#2A2A2A] text-zinc-700 cursor-not-allowed opacity-40'
              : 'bg-[#C17767] border border-[#C17767] text-white shadow-lg shadow-[#C17767]/20 hover:bg-[#A56253]'
          }`}
        >
          <Send size={15} className="transform -translate-y-px translate-x-px" />
        </motion.button>
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
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-10 h-10 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl flex items-center justify-center transition-all ${color}`}
    >
      {icon}
    </button>
  );
}
