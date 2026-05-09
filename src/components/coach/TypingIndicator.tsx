/**
 * AMAÇ: Koç yazarken sakin, doğal ve az dikkat çeken durum göstergesi.
 * V2:
 * - Agresif/toxic metinler kaldırıldı
 * - Sarsma/pulse abartısı kaldırıldı
 * - Daha doğal "düşünüyor" hissi
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface TypingIndicatorProps {
  coachPersonality?: string;
}

const TYPING_MESSAGES_BY_PERSONALITY: Record<string, string[]> = {
  hardcore: [
    'Cevabı netleştiriyorum...',
    'Veriyi kontrol ediyorum...',
    'Gereksiz kısmı ayıklıyorum...',
  ],
  enforcer: [
    'Aksiyonları sadeleştiriyorum...',
    'Öncelikleri kontrol ediyorum...',
    'Planı netleştiriyorum...',
  ],
  harsh: [
    'Durumu okuyorum...',
    'En kısa yolu çıkarıyorum...',
    'Yanıtı netleştiriyorum...',
  ],
  motivational: [
    'Sana uygun tonu ayarlıyorum...',
    'Planı toparlıyorum...',
    'Bir sonraki adımı seçiyorum...',
  ],
  analytical: [
    'Verileri karşılaştırıyorum...',
    'Örüntüleri kontrol ediyorum...',
    'Sonucu sadeleştiriyorum...',
  ],
  default: [
    'Düşünüyorum...',
    'Verileri kontrol ediyorum...',
    'Yanıtı toparlıyorum...',
  ],
};

export function TypingIndicator({ coachPersonality }: TypingIndicatorProps) {
  const personality = coachPersonality || 'default';
  const messages =
    TYPING_MESSAGES_BY_PERSONALITY[personality] ||
    TYPING_MESSAGES_BY_PERSONALITY.default;

  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % messages.length);
    }, 1700);

    return () => clearInterval(msgTimer);
  }, [messages.length]);

  return (
    <div className="flex items-end gap-3 max-w-md">
      <div
        className="w-8 h-8 rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden shrink-0 opacity-90"
        aria-hidden="true"
      >
        <img
          src="/assets/coach/kubra_main.jpg"
          alt=""
          className="w-full h-full object-cover img-protected"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-zinc-800 bg-[#111114] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-3 shadow-sm"
      >
        <div className="flex gap-1.5 items-center" aria-label="Koç yazıyor">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1.1,
                delay: dot * 0.14,
                ease: 'easeInOut',
              }}
              className="w-1.5 h-1.5 rounded-full bg-[#C17767]"
            />
          ))}
        </div>

        <span className="text-[11px] font-medium text-zinc-500">
          {messages[msgIdx]}
        </span>
      </motion.div>
    </div>
  );
}