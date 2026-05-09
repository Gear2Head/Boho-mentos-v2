import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;
  variant?: 'sidebar' | 'bottom';
}

export const NavItem: React.FC<NavItemProps> = React.memo(
  ({ icon, label, active, onClick, collapsed = false, variant = 'sidebar' }) => {
    const isBottom = variant === 'bottom';

    return (
      <motion.button
        whileHover={isBottom ? { y: -2 } : { x: 4, scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
        onClick={onClick}
        className={
          isBottom
            ? `
              relative flex h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1
              transition-all duration-200 select-none
              ${active
              ? 'text-[#C17767] bg-[#C17767]/12 border border-[#C17767]/25 shadow-[0_0_18px_rgba(193,119,103,0.12)]'
              : 'text-zinc-500 border border-transparent hover:text-zinc-200 hover:bg-white/5'
            }
            `
            : `
              relative flex h-11 w-full select-none items-center rounded-xl px-3
              transition-all duration-300 ease-out group
              ${collapsed ? 'justify-center' : 'justify-start'}
              ${active
              ? 'text-[#C17767] bg-[#C17767]/10 shadow-[0_0_20px_rgba(193,119,103,0.1),inset_0_0_12px_rgba(193,119,103,0.08)] border border-[#C17767]/20'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }
            `
        }
      >
        <AnimatePresence>
          {active && !isBottom && (
            <motion.div
              layoutId="active-indicator-sidebar"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#C17767] shadow-[0_0_15px_rgba(193,119,103,0.8)]"
            />
          )}

          {active && isBottom && (
            <motion.div
              layoutId="active-indicator-bottom"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              className="absolute top-0 left-4 right-4 h-1 rounded-b-full bg-[#C17767] shadow-[0_0_14px_rgba(193,119,103,0.75)]"
            />
          )}
        </AnimatePresence>

        <motion.div
          animate={{
            scale: active ? 1.13 : 1,
            y: isBottom && active ? -1 : 0,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className={`flex shrink-0 items-center justify-center ${active ? 'text-[#C17767]' : 'group-hover:text-zinc-100'
            }`}
        >
          {icon}
        </motion.div>

        {isBottom ? (
          <span
            className={`max-w-full truncate text-[9px] font-black uppercase leading-none tracking-[0.08em] ${active ? 'text-[#C17767]' : 'text-zinc-500'
              }`}
          >
            {label}
          </span>
        ) : (
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                className="ml-3 overflow-hidden whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.2em]"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        )}

        {collapsed && !isBottom && (
          <div className="pointer-events-none absolute left-full z-[100] ml-4 -translate-x-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white opacity-0 shadow-2xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
            {label}
          </div>
        )}
      </motion.button>
    );
  },
);

NavItem.displayName = 'NavItem';