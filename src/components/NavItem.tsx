/**
 * AMAÇ: Sol Bar (Desktop) veya Alt Bar (Mobile) içerisindeki buton tasarımı
 * MANTIK: Mobilde yazıları simgenin altında göster, destkopta yan yana göster ve eskiye nazaran boyut küçültüldü.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      relative flex items-center w-full transition-all duration-150 select-none
      md:flex-row md:gap-4 md:px-6 md:py-3 md:rounded-xl md:w-full
      flex-col gap-1 px-1 py-1.5 flex-1 justify-center
      ${active 
        ? 'text-[#C17767] md:bg-[#C17767]/10' 
        : 'text-[#8C857B] dark:text-zinc-500 hover:text-[#C17767] md:hover:bg-black/5 dark:md:hover:bg-white/5'
      }
    `}
  >
    {/* Mobil Glow Indicator */}
    {active && (
      <span className="md:hidden absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-[#C17767] rounded-b-full shadow-[0_2px_8px_rgba(193,119,103,0.5)]" />
    )}

    {/* Simge - Sabit Font İle */}
    <span className={`transition-transform duration-300 ${active ? 'scale-110' : ''}`}>
      {icon}
    </span>
    
    {/* Etiket Yazısı - Mobilde küçük, pc'de normal */}
    <span className="font-bold tracking-widest uppercase leading-none text-[8px] md:text-[10px]">
      {label}
    </span>
  </button>
);
