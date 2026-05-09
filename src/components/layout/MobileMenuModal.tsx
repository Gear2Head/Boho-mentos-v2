import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X } from 'lucide-react';
import { confirmDialog } from '../../contexts/ToastContext';
import { NAV_ITEMS } from '../../config/navItems';

interface MobileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigate: (id: string) => void;
  onSignOut: () => void;
}

export function MobileMenuModal({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
  onSignOut,
}: MobileMenuModalProps) {
  const menuItems = NAV_ITEMS.filter((item) => item.menuVisible !== false);

  const handleSignOut = async () => {
    const ok = await confirmDialog({
      title: 'Çıkış Yap',
      message: 'Çıkış yapmak istediğine emin misin?',
      confirmLabel: 'Çıkış Yap',
      cancelLabel: 'İptal',
      variant: 'danger',
    });

    if (ok) onSignOut();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end bg-black/70 backdrop-blur-md md:hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.85 }}
            className="max-h-[88dvh] w-full overflow-hidden rounded-t-[2rem] border-t border-zinc-800 bg-zinc-950 shadow-[0_-18px_60px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 pt-3">
              <button
                onClick={onClose}
                className="mx-auto mb-5 block h-1.5 w-12 rounded-full bg-zinc-800"
                aria-label="Menüyü kapat"
              />

              <header className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="font-display text-2xl font-black italic text-[#C17767]">
                    Navigasyon
                  </h3>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600">
                    Boho Mentos OS
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 active:scale-95"
                  aria-label="Menüyü kapat"
                >
                  <X size={20} />
                </button>
              </header>
            </div>

            <div className="max-h-[calc(88dvh-160px)] overflow-y-auto px-5 pb-5 custom-scrollbar">
              <div className="grid grid-cols-3 gap-3">
                {menuItems.map((item) => {
                  const active = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      className="group flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 active:scale-[0.98]"
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${active
                            ? 'bg-[#C17767] text-white shadow-lg shadow-[#C17767]/20'
                            : 'bg-black/30 text-zinc-400 group-hover:text-[#C17767]'
                          }`}
                      >
                        {item.icon}
                      </div>

                      <span
                        className={`max-w-full truncate text-center text-[9px] font-black uppercase leading-tight tracking-[0.08em] ${active ? 'text-[#C17767]' : 'text-zinc-500'
                          }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}

                <button
                  onClick={handleSignOut}
                  className="group flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 active:scale-[0.98]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
                    <LogOut size={20} />
                  </div>
                  <span className="text-center text-[9px] font-black uppercase leading-tight tracking-[0.08em] text-rose-400">
                    Çıkış
                  </span>
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-900 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-zinc-100 py-4 text-xs font-black uppercase tracking-widest text-zinc-950 active:scale-[0.98]"
              >
                Menüyü Kapat
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MobileMenuModal;