import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;
}

export const NavItem: React.FC<NavItemProps> = React.memo(({ icon, label, active, onClick, collapsed = false }) => (
  <button
    onClick={onClick}
    className={`
      relative flex items-center w-full select-none group
      transition-all duration-300 ease-out h-11 px-3 rounded-xl mb-1
      ${active
        ? 'text-[#C17767] bg-[#C17767]/5 shadow-[inset_0_0_10px_rgba(193,119,103,0.05)]'
        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
      }
    `}
  >
    {/* Active indicator bar */}
    {active && (
      <motion.div 
        layoutId="active-indicator"
        className="absolute left-0 top-3 bottom-3 w-1 bg-[#C17767] rounded-r-full" 
      />
    )}

    {/* Icon Wrapper - Centers itself in the 11px area */}
    <div className={`flex items-center justify-center shrink-0 transition-all duration-300 ${collapsed ? 'w-full' : 'w-5'}`}>
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
    </div>

    {/* Label with absolute hiding */}
    <AnimatePresence mode="wait">
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -5 }}
          transition={{ duration: 0.15 }}
          className="ml-3 font-bold text-[11px] uppercase tracking-[0.2em] whitespace-nowrap overflow-hidden"
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>

    {/* Tooltip for collapsed mode */}
    {collapsed && (
      <div className="absolute left-full ml-4 px-3 py-2 bg-zinc-900 text-white text-[10px] font-black tracking-widest uppercase rounded-lg opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-[100] shadow-2xl border border-white/10">
        {label}
      </div>
    )}
  </button>
));

NavItem.displayName = 'NavItem';
