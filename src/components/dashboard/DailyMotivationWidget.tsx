/**
 * AMAÇ: Günlük motivasyon sözü veya Kübra'dan kısa mesaj gösterir.
 * MANTIK: Sabit quotes listesi veya son koç direktifinden gelen bir satır.
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Quote } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

const HARDCORE_QUOTES = [
  "Hedefin yoksa enerjin de yoktur. Yeniden odaklan.",
  "Sınav sana beklemiyor. Sen neden bekliyorsun?",
  "Medyan olmak istiyorsan medyanca çalış. Zirve istiyorsan dur ve düşün.",
  "Her hata bir veri noktasıdır. İkinci kez aynı hatayı yapıyorsan veri körüsün.",
  "Motivasyon gelip geçicidir. Disiplin her sabah uyandırır.",
  "Rakibin şu an çalışıyor. Sen ne yapıyorsun?",
  "Zamanını değil, fırsatını kaybediyorsun.",
  "YKS'ye kalan her gün, bir geri sayım değil — bir seçimdir.",
  "İlk 1000 soru alışkanlık kurar. Sonraki 9000 alışkanlık pekiştirir.",
  "Yanlışını kabul etmek zayıflık değil, zekânın kanıtıdır.",
];

const ANALYST_QUOTES = [
  "Veri olmadan sezgi tahmindir. Yap, kaydet, analiz et.",
  "Doğruluk oranın düşüyorsa hız sorunu değil, kavram sorunudur.",
  "Her konu için 'neden öğreniyorum?' sorusunu sormadan çalışma.",
  "Spaced repetition formülü: az ama düzenli tekrar.",
  "Hedefin altına düştüğünde değil, üstüne çıktığında analiz yap.",
];

const MOTIVATIONAL_QUOTES = [
  "Bugün atacağın bir adım, yarın büyük bir fark yaratabilir.",
  "Küçük adımlar uzun yolları kısaltır.",
  "Şu an hissettiğin baskı, geleceğin gücüdür.",
  "Her 'bitmez' hissinin bitişinde bir başarı var.",
  "Bugün koyduğun emek, sınavda seni koruyacak.",
];

function getDailyIndex() {
  const day = new Date().getDay() + new Date().getDate();
  return day;
}

export function DailyMotivationWidget() {
  const profile = useAppStore(s => s.profile);
  const lastDirective = useAppStore(s => s.lastCoachDirective);

  const quote = useMemo(() => {
    const personality = profile?.coachPersonality ?? 'default';
    const pool = personality === 'hardcore' || personality === 'enforcer'
      ? HARDCORE_QUOTES
      : personality === 'analytical' || personality === 'analyst'
        ? ANALYST_QUOTES
        : MOTIVATIONAL_QUOTES;

    // Try using a dynamic line from last directive summary
    if (lastDirective?.summary && lastDirective.summary.length > 20 && lastDirective.summary.length < 180) {
      return lastDirective.summary.split('.')[0].trim() + '.';
    }

    return pool[getDailyIndex() % pool.length];
  }, [profile?.coachPersonality, lastDirective?.summary]);

  const isHardcore = profile?.coachPersonality === 'hardcore' || profile?.coachPersonality === 'enforcer';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`relative overflow-hidden glass-card p-5 rounded-2xl border ${
        isHardcore
          ? 'border-amber-500/20 bg-amber-950/10'
          : 'border-[#EAE6DF] dark:border-zinc-800'
      }`}
    >
      {/* Background glow */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl ${
        isHardcore ? 'bg-amber-500/10' : 'bg-[#C17767]/5'
      }`} />

      <div className="flex items-start gap-3 relative z-10">
        <Quote
          size={16}
          className={`mt-0.5 shrink-0 ${isHardcore ? 'text-amber-500' : 'text-[#C17767]'}`}
        />
        <div>
          <p className={`text-[11px] leading-relaxed font-medium italic ${
            isHardcore ? 'text-amber-100/80' : 'text-zinc-600 dark:text-zinc-300'
          }`}>
            {quote}
          </p>
          <p className={`text-[9px] mt-2 font-bold uppercase tracking-widest ${
            isHardcore ? 'text-amber-500/50' : 'text-zinc-400'
          }`}>
            — Kübra
          </p>
        </div>
      </div>
    </motion.div>
  );
}
