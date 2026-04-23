/**
 * AMAÇ: Sol Bar (Desktop) veya Alt Bar (Mobile) içerisindeki buton tasarımı
 * MANTIK: collapsed=true → sadece ikon + sağ tooltip. collapsed=false → ikon + label.
 * T-002: Pin sistemi desteği eklendi.
 */

import React from 'react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;
}

export const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, collapsed = false }) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    aria-label={label}
    className={`
      relative flex items-center w-full transition-all duration-150 select-none group
      md:rounded-xl md:w-full
      flex-col gap-1 px-1 py-1.5 flex-1 justify-center
      ${collapsed ? 'md:justify-center md:px-2 md:py-3' : 'md:flex-row md:gap-3 md:px-4 md:py-2.5 md:justify-start'}
      ${active
        ? 'text-[#C17767] md:bg-[#C17767]/10'
        : 'text-[#8C857B] dark:text-zinc-500 hover:text-[#C17767] md:hover:bg-black/5 dark:md:hover:bg-white/5'
      }
    `}
  >
    {/* Desktop: active left strip */}
    {active && (
      <span className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#C17767] rounded-r-full" />
    )}

    {/* Mobile: active top strip */}
    {active && (
      <span className="md:hidden absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#C17767] rounded-b-full" />
    )}

    {/* Icon */}
    <span className={`transition-transform duration-150 shrink-0 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
      {icon}
    </span>

    {/* Label — hidden when collapsed on desktop */}
    {!collapsed && (
      <span className="font-semibold tracking-wide leading-none text-[9px] md:text-[13px] md:normal-case md:tracking-normal truncate">
        {label}
      </span>
    )}

    {/* Mobile label always visible */}
    {collapsed && (
      <span className="md:hidden font-bold tracking-widest uppercase leading-none text-[8px]">
        {label}
      </span>
    )}
  </button>
);
