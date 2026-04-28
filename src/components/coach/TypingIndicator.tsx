/**
 * AMAÇ: Koç yazdığında gösterilen animasyonlu typing indicator.
 * MANTIK: 3 nokta + dönen mesajlar, koçun kişiliğine göre farklı metinler.
 * UX-TODO §3: Her 1.5sn'de bir değişen durum mesajı.
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface TypingIndicatorProps {
  coachPersonality?: string;
}

const TYPING_MESSAGES_BY_PERSONALITY: Record<string, string[]> = {
  hardcore: [
    'Hataların taranıyor...',
    'Tembelliğin analiz ediliyor...',
    'Sövmek üzereyim...',
    'Gerçekler tokat gibi geliyor...',
  ],
  enforcer: [
    'Mazeretler reddediliyor...',
    'Disiplin kontrol ediliyor...',
    'Direktif hazırlanıyor...',
    'Sınırların zorlanıyor...',
  ],
  harsh: [
    'Direktif hazırlanıyor...',
    'Veriler taranıyor...',
    'Strateji hesaplanıyor...',
    'Zayıflıklar analiz ediliyor...',
  ],
  motivational: [
    'Seni analiz ediyorum...',
    'Başarı planı kuruyorum...',
    'Motivasyon yükleniyor...',
    'Potansiyelini hesaplıyorum...',
  ],
  analytical: [
    'Veri işleniyor...',
    'İstatistikler analiz ediliyor...',
    'Model çalıştırılıyor...',
    'Sonuçlar hesaplanıyor...',
  ],
  default: [
    'Veriler taranıyor...',
    'Strateji hesaplanıyor...',
    'Direktif hazırlanıyor...',
    'Analiz yürütülüyor...',
  ],
};

const AVATAR_BY_PERSONALITY: Record<string, { img: string; color: string }> = {
  hardcore: { img: '/assets/coach/kubra_main.jpg', color: 'bg-amber-900/60 border-amber-700/40' },
  enforcer: { img: '/assets/coach/kubra_main.jpg', color: 'bg-red-900/60 border-red-700/40' },
  harsh: { img: '/assets/coach/kubra_main.jpg', color: 'bg-red-900/60 border-red-700/40' },
  motivational: { img: '/assets/coach/kubra_main.jpg', color: 'bg-orange-900/60 border-orange-700/40' },
  analytical: { img: '/assets/coach/kubra_main.jpg', color: 'bg-blue-900/60 border-blue-700/40' },
  default: { img: '/assets/coach/kubra_main.jpg', color: 'bg-zinc-800 border-zinc-700/40' },
};

export function TypingIndicator({ coachPersonality }: TypingIndicatorProps) {
  const personality = coachPersonality || 'default';
  const messages = TYPING_MESSAGES_BY_PERSONALITY[personality] || TYPING_MESSAGES_BY_PERSONALITY.default;
  const avatar = AVATAR_BY_PERSONALITY[personality] || AVATAR_BY_PERSONALITY.default;

  const [msgIdx, setMsgIdx] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % messages.length);
    }, 1500);

    const dotTimer = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 400);

    return () => {
      clearInterval(msgTimer);
      clearInterval(dotTimer);
    };
  }, [messages.length]);

  const isHardcore = personality === 'hardcore';

  return (
    <div className="flex items-end gap-3 max-w-xs">
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-xl border flex items-center justify-center overflow-hidden shrink-0 ${avatar.color} ${isHardcore ? 'shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse' : ''}`}
        aria-hidden="true"
      >
        <img src={avatar.img} alt="" className="w-full h-full object-cover img-protected" />
      </div>

      {/* Bubble */}
      <motion.div 
        animate={isHardcore ? {
          x: [0, -1, 1, -1, 0],
          y: [0, 1, -1, 1, 0],
        } : {}}
        transition={isHardcore ? {
          repeat: Infinity,
          duration: 0.1,
        } : {}}
        className={`border rounded-2xl rounded-bl-sm px-5 py-4 flex items-center gap-3 shadow-lg ${isHardcore ? 'bg-amber-950/20 border-amber-500/30' : 'bg-[#141414] border-[#2A2A2A]'}`}
      >
        {/* Dot animation */}
        <div className="flex gap-1 items-center" aria-label="Koç yazıyor">
          {[1, 2, 3].map((dot) => (
            <span
              key={dot}
              className="w-1.5 h-1.5 rounded-full transition-all duration-200"
              style={{
                backgroundColor: dot <= dotCount ? (isHardcore ? '#F59E0B' : '#C17767') : '#374151',
                transform: dot === dotCount ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Status text */}
        <span className={`text-[10px] uppercase tracking-widest font-bold italic animate-pulse ${isHardcore ? 'text-amber-500/80' : 'text-zinc-500'}`}>
          {messages[msgIdx]}
        </span>
      </motion.div>
    </div>
  );
}
