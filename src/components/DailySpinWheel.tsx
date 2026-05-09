/**
 * AMAÇ: Günlük Şans Çarkı UI bileşeni.
 * MANTIK: CSS + Framer Motion dönen çark, Firestore kontrolüyle günde 1 hak.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, RotateCcw, CheckCircle, Lock } from 'lucide-react';
import {
  SPIN_REWARDS,
  canSpinToday,
  performSpin,
  type SpinReward,
} from '../services/dailySpinService';
import { useAppStore } from '../store/appStore';
import { triggerHaptic } from '../services/mobileCapabilities';

const SEGMENT_COLORS = [
  '#C17767', '#4A90D9', '#22C55E', '#E09F3E',
  '#9B59B6', '#C17767', '#E74C3C', '#1ABC9C',
  '#F39C12', '#3498DB', '#2ECC71', '#E67E22',
];

interface DailySpinWheelProps {
  onClose?: () => void;
}

export function DailySpinWheel({ onClose }: DailySpinWheelProps) {
  const [canSpin, setCanSpin] = useState<boolean | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reward, setReward] = useState<SpinReward | null>(null);
  const [showResult, setShowResult] = useState(false);
  const authUser = useAppStore(s => s.authUser);
  const addElo = useAppStore(s => s.addElo);
  const addCoins = useAppStore(s => s.addBohoCoins);

  const segmentCount = SPIN_REWARDS.length;
  const segmentDeg = 360 / segmentCount;

  useEffect(() => {
    if (!authUser?.uid) return;
    canSpinToday(authUser.uid).then(setCanSpin);
  }, [authUser?.uid]);

  const handleSpin = async () => {
    if (!authUser?.uid || isSpinning || !canSpin) return;

    void triggerHaptic('light');
    setIsSpinning(true);
    setShowResult(false);

    const result = await performSpin(authUser.uid);
    if (!result) {
      setCanSpin(false);
      setIsSpinning(false);
      return;
    }

    // Çarkı ödüle hizala
    const targetIndex = result.rewardIndex;
    const targetDeg = segmentDeg * targetIndex;
    // En az 5 tam tur + hedef segmente hizala
    const extraSpins = 5 * 360;
    const finalRotation = rotation + extraSpins + (360 - targetDeg - segmentDeg / 2);

    setRotation(finalRotation);
    setReward(result.reward);

    // Animasyon süresi (4s) sonunda sonucu göster
    setTimeout(() => {
      setIsSpinning(false);
      setShowResult(true);
      setCanSpin(false);
      void triggerHaptic(result.reward.type === 'empty' ? 'warning' : 'reward');

      // Ödülü store'a uygula
      if (result.reward.type === 'elo') {
        addElo(result.reward.amount, 'daily_spin');
      } else if (result.reward.type === 'coins') {
        addCoins(result.reward.amount, 'daily_spin');
      }
      // Sandık ödülleri için inventory entegrasyonu burada yapılabilir
    }, 4200);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Başlık */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Gift className="text-[#C17767]" size={20} />
          <h2 className="font-display italic text-2xl font-bold text-zinc-100">Günlük Şans Çarkı</h2>
        </div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-black">Her gün 1 çevirme hakkın var</p>
      </div>

      {/* Çark */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* İşaretçi */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20 w-0 h-0
          border-l-[10px] border-r-[10px] border-t-[20px]
          border-l-transparent border-r-transparent border-t-[#C17767]
          drop-shadow-lg" />

        {/* SVG Çark */}
        <motion.div
          className="w-full h-full"
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ willChange: 'transform' }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
            {SPIN_REWARDS.map((seg, i) => {
              const startAngle = i * segmentDeg - 90;
              const endAngle = startAngle + segmentDeg;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              const x1 = 100 + 95 * Math.cos(startRad);
              const y1 = 100 + 95 * Math.sin(startRad);
              const x2 = 100 + 95 * Math.cos(endRad);
              const y2 = 100 + 95 * Math.sin(endRad);
              const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
              const tx = 100 + 62 * Math.cos(midAngle);
              const ty = 100 + 62 * Math.sin(midAngle);

              return (
                <g key={i}>
                  <path
                    d={`M100,100 L${x1},${y1} A95,95 0 0,1 ${x2},${y2} Z`}
                    fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                    stroke="#1a1a1a"
                    strokeWidth="1"
                    opacity={0.9}
                  />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="7.5"
                    fontWeight="900"
                    fill="white"
                    transform={`rotate(${startAngle + segmentDeg / 2 + 90}, ${tx}, ${ty})`}
                    style={{ userSelect: 'none' }}
                  >
                    {seg.label.length > 10 ? seg.label.slice(0, 10) + '…' : seg.label}
                  </text>
                </g>
              );
            })}
            {/* Merkez daire */}
            <circle cx="100" cy="100" r="14" fill="#0f0f0f" stroke="#C17767" strokeWidth="2" />
          </svg>
        </motion.div>
      </div>

      {/* Çevirme Butonu */}
      {canSpin === null ? (
        <div className="h-12 w-40 bg-white/5 rounded-2xl animate-pulse" />
      ) : canSpin ? (
        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all cursor-pointer ${
            isSpinning
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-[#C17767] text-white hover:bg-[#A56253] hover:scale-105 shadow-lg shadow-[#C17767]/25 active:scale-95'
          }`}
        >
          {isSpinning ? (
            <>
              <RotateCcw size={16} className="animate-spin" />
              Çevriliyor...
            </>
          ) : (
            <>
              <RotateCcw size={16} />
              Çevir!
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-2 px-6 py-3 bg-zinc-800/50 border border-zinc-700 rounded-2xl text-zinc-500 text-sm font-black uppercase tracking-widest">
          <Lock size={14} />
          Yarın Tekrar Gel
        </div>
      )}

      {/* Sonuç Modalı */}
      <AnimatePresence>
        {showResult && reward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="w-full bg-gradient-to-br from-zinc-900 to-zinc-950 border border-[#C17767]/30 rounded-3xl p-6 text-center shadow-2xl shadow-[#C17767]/10"
          >
            <CheckCircle className="mx-auto text-[#22C55E] mb-3" size={36} />
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 font-black mb-2">Ödülün</p>
            <p className="text-3xl font-display italic font-bold text-white mb-1">{reward.label}</p>
            {reward.type !== 'empty' && (
              <p className="text-xs text-[#C17767] font-black uppercase tracking-widest mt-2">
                Hesabına yansıtıldı ✓
              </p>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-300 transition cursor-pointer"
              >
                Kapat
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
