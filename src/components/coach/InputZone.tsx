/**
 * AMAÇ: Gelişmiş input zone — auto-resize, slash commands, pill suggestions, OCR, dosya ekleme.
 * T-003: IconButton pattern, Tooltip, emoji → ikon.
 * T-005: OCR entegrasyonu (kamera ikonu → file pick → vision_archive_parse).
 * T-008: Dosya ekleme + attachment preview.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, X, Paperclip, ScanLine, ClipboardList, BarChart3, CalendarDays, BookOpen, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CoachIntent } from '../../types/coach';
import { imageFileToBase64 } from '../../utils/imageToBase64';
import { toast as toastAPI } from '../../contexts/ToastContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface InputZoneProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (msg: string, intent?: CoachIntent, attachment?: { base64: string; mediaType: string; name: string }) => void;
  isTyping: boolean;
  onLogClick: () => void;
  onExamClick: () => void;
}

// ─── Slash Commands ─────────────────────────────────────────────────────────────

const SLASH_COMMANDS: Array<{ cmd: string; label: string; desc: string; intent: CoachIntent }> = [
  { cmd: '/plan',      label: 'Günlük Plan',    desc: 'Bugünkü çalışma planını oluştur',  intent: 'daily_plan' },
  { cmd: '/analiz',   label: 'Analiz Et',      desc: 'Son logları analiz et',            intent: 'log_analysis' },
  { cmd: '/haftalik', label: 'Haftalık Rapor', desc: 'Haftalık performans özeti',        intent: 'weekly_review' },
  { cmd: '/anla',     label: 'Konu Anlat',     desc: 'Bir konuyu derinlemesine anlat',  intent: 'topic_explain' },
  { cmd: '/savaş',   label: 'Savaş Analizi',  desc: 'War Room sonrası analiz',          intent: 'war_room_analysis' },
  { cmd: '/flashcard',label: 'Flashcard Üret', desc: 'PDF/Metinden soru kartları üret', intent: 'flashcard_generation' },
];

// ─── Quick Pills ────────────────────────────────────────────────────────────────

const QUICK_REPLIES: Array<{ label: string; icon: React.ReactNode; value: string; intent: CoachIntent }> = [
  { label: '🎯 Hedefe ne kadar uzağım?', icon: <BarChart3 size={12} />, value: 'Hedeflerime kalan net ihtiyacım ve durumum nedir?', intent: 'log_analysis' },
  { label: '🔥 Zayıf konularım?', icon: <ClipboardList size={12} />, value: 'Son netlere göre en çok hata yaptığım konular hangileri?', intent: 'log_analysis' },
  { label: '📅 Bugünün programı', icon: <CalendarDays size={12} />, value: 'Bana bugünün çalışma programını oluşturur musun?', intent: 'daily_plan' },
  { label: '💡 Hızlı deneme özeti', icon: <BookOpen size={12} />, value: 'Girdiğim son denemelerin kısa bir de-briefing (özet) analizini yapar mısın?', intent: 'exam_debrief' },
];

const MAX_CHARS = 10000;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

// ─── Component ─────────────────────────────────────────────────────────────────

export function InputZone({ value, onChange, onSubmit, isTyping, onLogClick, onExamClick }: InputZoneProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef  = useRef<HTMLInputElement>(null);

  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedSlash, setSelectedSlash] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isOCRLoading, setIsOCRLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ base64: string; mediaType: string; name: string } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    toastAPI[type](msg);
  }, []);

  const isEmpty = !value.trim() && !attachment;
  const charCount = value.length;

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > MAX_CHARS) return;
    onChange(val);
    if (val.startsWith('/') && !val.includes(' ')) {
      setSlashFilter(val.slice(1).toLowerCase());
      setSlashOpen(true);
      setSelectedSlash(0);
    } else {
      setSlashOpen(false);
    }
  }, [onChange]);

  const filteredSlash = SLASH_COMMANDS.filter(
    c => c.cmd.includes(slashFilter) || c.label.toLowerCase().includes(slashFilter)
  );

  const applySlashCommand = useCallback((cmd: typeof SLASH_COMMANDS[0]) => {
    onChange(cmd.label);
    setSlashOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedSlash(p => (p + 1) % filteredSlash.length); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedSlash(p => (p - 1 + filteredSlash.length) % filteredSlash.length); return; }
      if (e.key === 'Enter' && filteredSlash[selectedSlash]) { e.preventDefault(); applySlashCommand(filteredSlash[selectedSlash]); return; }
      if (e.key === 'Escape') { setSlashOpen(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') { onChange(''); textareaRef.current?.blur(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slashOpen, slashFilter, selectedSlash, filteredSlash, value]);

  const handleSend = useCallback(async () => {
    if (isEmpty || isTyping) return;
    setIsSending(true);
    
    import('../../utils/audioEngine').then(({ AudioEngine }) => {
      AudioEngine.playSend();
    });

    onSubmit(value, undefined, attachment ?? undefined);
    onChange('');
    setAttachment(null);
    await new Promise(r => setTimeout(r, 300));
    setIsSending(false);
  }, [isEmpty, isTyping, value, attachment, onSubmit, onChange]);

  const handlePill = useCallback((pill: typeof QUICK_REPLIES[0]) => {
    onSubmit(pill.value, pill.intent);
  }, [onSubmit]);

  // ─── File Attachment ──────────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { showToast("Dosya boyutu 5MB'ı aşamaz", 'warning'); return; }
    try {
      const { base64, mediaType } = await imageFileToBase64(file);
      setAttachment({ base64, mediaType, name: file.name });
    } catch {
      showToast('Dosya yüklenemedi.', 'error');
    }
    e.target.value = '';
  }, [showToast]);

  // ─── OCR ──────────────────────────────────────────────────────────────────

  const handleOCR = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { showToast("Dosya boyutu 5MB'ı aşamaz", 'warning'); return; }

    setIsOCRLoading(true);
    try {
      const { base64, mediaType } = await imageFileToBase64(file);
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'vision_archive_parse',
          userMessage: 'Bu görüntüdeki soruyu veya içeriği analiz et',
          imageBase64: base64,
          imageMediaType: mediaType,
          forceJson: true,
        }),
      });
      const data = await res.json();
      const parsed = typeof data.text === 'string' ? JSON.parse(data.text) : data.text;
      const summary = [parsed.subject, parsed.topic, parsed.difficulty].filter(Boolean).join(' · ');
      onChange(`[OCR Sonucu] ${summary}\n${parsed.reason || ''}`);
      showToast('Soru OCR ile tarandı!', 'success');
    } catch {
      showToast('OCR taraması başarısız. Lütfen tekrar deneyin.', 'error');
    } finally {
      setIsOCRLoading(false);
      e.target.value = '';
    }
  }, [onChange, showToast]);

  return (
    <div className="bg-app flex flex-col p-3 w-full">
      <div className="relative max-w-4xl mx-auto w-full flex flex-col gap-2">

        {/* Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {QUICK_REPLIES.map(chip => (
            <button
              key={chip.label}
              onClick={() => handlePill(chip)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-app rounded-full text-[11px] font-medium text-ink-muted hover:border-[#C17767]/40 hover:bg-[#C17767]/5 hover:text-[#C17767] transition-all whitespace-nowrap shadow-sm"
            >
              <span className="opacity-70">{chip.icon}</span> {chip.label}
            </button>
          ))}
        </div>

        {/* Slash dropdown */}
        <AnimatePresence>
          {slashOpen && filteredSlash.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 mb-3 w-[min(480px,calc(100vw-32px))] bg-surface border border-app rounded-xl overflow-hidden shadow-2xl z-50"
            >
              <div className="p-1.5 grid grid-cols-1 md:grid-cols-2 gap-1 max-h-60 overflow-y-auto">
                {filteredSlash.map((cmd, idx) => (
                  <button
                    key={cmd.cmd}
                    onClick={() => applySlashCommand(cmd)}
                    className={`w-full flex flex-col items-start px-3 py-2.5 rounded-lg text-left transition-all ${
                      idx === selectedSlash ? 'bg-[#C17767]/10 border border-[#C17767]/20' : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[11px] text-[#C17767] font-bold">{cmd.cmd}</span>
                      <span className="text-[11px] font-semibold text-ink">{cmd.label}</span>
                    </div>
                    <span className="text-[10px] text-ink-muted">{cmd.desc}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attachment preview */}
        {attachment && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex items-center gap-2 bg-surface-2 border border-app rounded-lg px-3 py-1.5 text-xs">
              <Paperclip size={12} className="text-[#C17767]" />
              <span className="text-ink truncate max-w-[200px]">{attachment.name}</span>
              <button onClick={() => setAttachment(null)}>
                <X size={12} className="text-ink-muted hover:text-red-400 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* Input field */}
        <div className="relative flex items-end bg-surface-2 border border-app rounded-2xl shadow-inner focus-within:border-[#C17767]/30 transition-all p-1.5">

          {/* Left buttons */}
          <div className="flex items-center shrink-0 self-end mb-1 ml-1 gap-0.5">
            {/* Log */}
            <IconBtn label="Log Ekle" onClick={onLogClick}>
              <ClipboardList size={16} />
            </IconBtn>
            {/* Dosya */}
            <label title="Dosya Ekle">
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} />
              <span className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-ink-muted hover:bg-[#C17767]/10 hover:text-[#C17767] cursor-pointer">
                <Paperclip size={16} />
              </span>
            </label>
            {/* OCR */}
            <label title="OCR — Görsel tara">
              <input ref={ocrInputRef} type="file" accept="image/*" className="hidden" onChange={handleOCR} />
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isOCRLoading ? 'text-[#C17767] animate-pulse' : 'text-ink-muted hover:bg-[#C17767]/10 hover:text-[#C17767]'} cursor-pointer`}>
                <ScanLine size={16} />
              </span>
            </label>
          </div>

          <div className="w-px h-7 bg-app mx-1.5 self-end mb-2" />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isOCRLoading ? 'OCR taranıyor...' : 'Mesaj yaz veya / ile araçları kullan...'}
            rows={1}
            className="flex-1 bg-transparent text-ink px-2 py-3 text-sm resize-none focus:outline-none placeholder:text-ink-muted no-scrollbar self-center"
            style={{ minHeight: '44px', maxHeight: '160px' }}
          />

          {/* Clear */}
          {value && (
            <button onClick={() => onChange('')} className="absolute right-16 bottom-5 text-ink-muted/30 hover:text-[#C17767] transition-colors hidden md:block">
              <X size={14} />
            </button>
          )}

          {/* Char counter + send */}
          <div className="flex items-center px-1 shrink-0 self-end mb-1 gap-1">
            {charCount > MAX_CHARS * 0.8 && (
              <span className="text-[10px] font-mono text-red-500">{charCount}</span>
            )}
            <button
              onClick={handleSend}
              disabled={isSending || isEmpty}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                !isEmpty && !isSending
                  ? 'bg-[#C17767] text-white hover:scale-105 shadow-lg shadow-[#C17767]/20'
                  : 'bg-surface text-ink-muted cursor-not-allowed opacity-40'
              }`}
              title="Gönder (Enter)"
            >
              {isSending ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Plus size={16} className="rotate-45" />
                </motion.div>
              ) : (
                <ArrowUp size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Icon Button ───────────────────────────────────────────────────────────────

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-ink-muted hover:bg-[#C17767]/10 hover:text-[#C17767]"
    >
      {children}
    </button>
  );
}
