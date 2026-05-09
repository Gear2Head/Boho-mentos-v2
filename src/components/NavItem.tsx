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
  <motion.button
    whileHover={{ x: 4, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    onClick={onClick}
    className={`
      relative flex flex-col md:flex-row items-center justify-center md:justify-start w-full select-none group
      transition-all duration-300 ease-out h-12 md:h-11 px-1 md:px-3 rounded-xl md:mb-1
      ${active
        ? 'text-[#C17767] bg-[#C17767]/10 shadow-[0_0_20px_rgba(193,119,103,0.1),inset_0_0_12px_rgba(193,119,103,0.08)] border border-[#C17767]/20'
        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
      }
    `}
  >
    {/* Active indicator bar */}
    <AnimatePresence>
      {active && (
        <motion.div 
          layoutId="active-indicator"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0 }}
          className="hidden md:block absolute left-0 top-2 bottom-2 w-1 bg-[#C17767] rounded-r-full shadow-[0_0_15px_rgba(193,119,103,0.8)] z-10" 
        />
      )}
    </AnimatePresence>
    
    <AnimatePresence>
      {active && (
        <motion.div 
          layoutId="active-indicator-mobile"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0 }}
          className="md:hidden absolute top-0 left-2 right-2 h-1 bg-[#C17767] rounded-b-full shadow-[0_0_15px_rgba(193,119,103,0.8)] z-10" 
        />
      )}
    </AnimatePresence>

    {/* Icon Wrapper - Centers itself in the 11px area */}
    <div className={`flex items-center justify-center shrink-0 transition-all duration-300 md:w-5`}>
      <motion.div 
        animate={{ 
          scale: active ? 1.2 : 1,
          rotate: active ? [0, -10, 10, 0] : 0 
        }}
        transition={active ? { duration: 0.4, ease: "backOut" } : {}}
        className={`${active ? 'text-[#C17767]' : 'group-hover:text-zinc-100'}`}
      >
        {icon}
      </motion.div>
    </div>

    {/* Label with absolute hiding */}
    <AnimatePresence mode="wait">
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
  </motion.button>
));

NavItem.displayName = 'NavItem';
