import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { triggerHaptic } from '../../services/mobileCapabilities';

interface BottomSheetProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function BottomSheet({ isOpen, title, onClose, children, footer }: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    void triggerHaptic('light');
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[140] flex items-end md:items-center md:justify-center">
          <motion.button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Alt pencere'}
            className="relative w-full max-h-[88dvh] overflow-hidden rounded-t-[28px] border border-white/10 bg-[#101013] shadow-2xl md:max-w-xl md:rounded-[24px]"
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/20 md:hidden" />
            <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <div className="min-w-0 flex-1">
                {title && <h2 className="truncate text-sm font-black uppercase tracking-widest text-zinc-100">{title}</h2>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:text-white"
                aria-label="Kapat"
              >
                <X size={16} />
              </button>
            </header>
            <div className="max-h-[calc(88dvh-8rem)] overflow-y-auto px-5 py-4">{children}</div>
            {footer && <footer className="border-t border-white/10 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">{footer}</footer>}
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
