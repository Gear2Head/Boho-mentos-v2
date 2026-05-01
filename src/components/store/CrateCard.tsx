import React from 'react';
import { motion } from 'motion/react';
import { Archive, Box, Package, Sparkles, Zap } from 'lucide-react';
import { Crate } from '../../types/economy';

interface CrateCardProps {
  crate: Crate;
  onBuy: (tier: string) => void;
  disabled?: boolean;
}

export const CrateCard: React.FC<CrateCardProps> = ({ crate, onBuy, disabled = false }) => {
  const getIcon = () => {
    switch (crate.tier) {
      case 'wooden': return <Archive size={34} />;
      case 'bronze': return <Archive size={34} />;
      case 'silver': return <Package size={34} />;
      case 'gold': return <Box size={34} />;
      case 'mythic': return <Sparkles size={34} />;
      case 'cosmic': return <Sparkles size={34} />;
      default: return <Package size={34} />;
    }
  };

  return (
    <motion.div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onBuy(crate.tier);
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onBuy(crate.tier);
        }
      }}
      whileHover={disabled ? undefined : { y: -8, scale: 1.02 }}
      className={`glass-card p-6 rounded-[32px] flex flex-col items-center gap-4 group relative overflow-hidden border transition-all ${
        disabled ? 'opacity-55 grayscale border-white/5 cursor-not-allowed' : 'border-white/10 hover:border-white/20 cursor-pointer'
      }`}
      style={{
        boxShadow: disabled ? undefined : `0 0 38px ${crate.color}18, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${crate.color}30 0%, transparent 58%)` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div
        className="w-24 h-24 rounded-[28px] flex items-center justify-center mb-2 relative z-10 border"
        style={{
          backgroundColor: `${crate.color}18`,
          color: crate.color,
          borderColor: `${crate.color}45`,
          boxShadow: `0 0 30px ${crate.color}22`,
        }}
      >
        {getIcon()}
      </div>

      <div className="text-center relative z-10 min-h-[92px]">
        <p className="text-[9px] uppercase tracking-[0.28em] font-black mb-2" style={{ color: crate.color }}>
          Ganimet Kasası
        </p>
        <h3 className="text-xl font-display italic font-black text-zinc-100">{crate.name}</h3>
        <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{crate.description}</p>
      </div>

      <button
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) onBuy(crate.tier);
        }}
        disabled={disabled}
        className={`mt-2 w-full py-3 rounded-2xl font-black text-[11px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 border ${
          disabled
            ? 'bg-zinc-900 text-zinc-600 border-white/5 cursor-not-allowed'
            : 'bg-white/5 text-zinc-100 border-white/10 hover:text-black active:scale-95'
        }`}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.backgroundColor = crate.color;
        }}
        onMouseLeave={(e) => {
          if (!disabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
        }}
      >
        <Zap size={14} />
        {disabled ? 'Yetersiz Coin' : `${crate.price} Coin`}
      </button>
    </motion.div>
  );
};
