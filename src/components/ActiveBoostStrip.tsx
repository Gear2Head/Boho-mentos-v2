/**
 * AMAÇ: Aktif takviye (boost) strip'i — header'da veya profil üstünde gösterilir.
 * MANTIK: inventory.boosts'tan pozitif değerleri gösterir, aktivasyon ile süre başlatır.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Zap, Shield, Coins, Flame, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import type { BoostKey } from '../types/economy';

const BOOST_CONFIG: Record<BoostKey, { label: string; icon: React.ReactNode; color: string; glowColor: string }> = {
  streakFreezer: {
    label: 'Seri Kalkanı',
    icon: <Shield size={14} />,
    color: '#4A90D9',
    glowColor: 'rgba(74, 144, 217, 0.3)',
  },
  xpMultiplier: {
    label: 'XP Boost',
    icon: <Zap size={14} />,
    color: '#22C55E',
    glowColor: 'rgba(34, 197, 94, 0.3)',
  },
  coinMultiplier: {
    label: 'Coin Boost',
    icon: <Coins size={14} />,
    color: '#E09F3E',
    glowColor: 'rgba(224, 159, 62, 0.3)',
  },
  ghostRivalTickets: {
    label: 'Hayalet Bilet',
    icon: <Flame size={14} />,
    color: '#C17767',
    glowColor: 'rgba(193, 119, 103, 0.3)',
  },
};

export function ActiveBoostStrip() {
  const { inventory, activateInventoryBoost } = useAppStore(useShallow(s => ({
    inventory: s.inventory,
    activateInventoryBoost: s.activateInventoryBoost,
  })));

  const activeBoosts = (Object.entries(inventory.boosts) as [BoostKey, number][])
    .filter(([, count]) => count > 0);

  if (activeBoosts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {activeBoosts.map(([key, count]) => {
        const config = BOOST_CONFIG[key];
        return (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => activateInventoryBoost(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: `${config.color}10`,
              borderColor: `${config.color}30`,
              color: config.color,
              boxShadow: `0 0 12px ${config.glowColor}`,
            }}
            title={`${config.label} — ${count} adet (Tıkla: aktifleştir)`}
          >
            {config.icon}
            <span className="hidden sm:inline">{config.label}</span>
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
              style={{ backgroundColor: `${config.color}25` }}
            >
              {count}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/** Envanter özet kartı — profil veya dashboard'da kullanılabilir. */
export function InventorySummaryCard() {
  const inventory = useAppStore(s => s.inventory);
  const totalItems = inventory.items.length;
  const totalBoosts = Object.values(inventory.boosts).reduce((s, v) => s + v, 0);

  if (totalItems === 0 && totalBoosts === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-[#C17767]" />
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Envanter</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-950 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-zinc-100">{totalItems}</p>
          <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Eşya</p>
        </div>
        <div className="bg-zinc-950 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#C17767]">{totalBoosts}</p>
          <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Takviye</p>
        </div>
      </div>

      {totalBoosts > 0 && (
        <div className="mt-3">
          <ActiveBoostStrip />
        </div>
      )}
    </motion.div>
  );
}
