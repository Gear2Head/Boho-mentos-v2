import React, { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, ChevronUp, X } from 'lucide-react';

interface WarRoomLayoutProps {
  topBar: ReactNode;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  modeSwitcher: ReactNode;
}

export function WarRoomLayout({ topBar, leftPanel, rightPanel, modeSwitcher }: WarRoomLayoutProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-paper dark:bg-zinc-950 transition-colors duration-500">
      {/* Üst Bar: Timer, Özet, Çıkış */}
      <header className="h-16 border-b border-border flex items-center px-6 bg-white/50 dark:bg-black/50 backdrop-blur-xl z-50 shrink-0">
        <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between">
          {topBar}
        </div>
      </header>

      {/* Ana İçerik Alanı */}
      <main className="flex-1 overflow-hidden relative w-full max-w-[1400px] mx-auto flex flex-col md:flex-row">
        
        {/* Sol Panel: Soru ve Çizim Katmanı */}
        <div className="flex-1 h-full min-w-0 relative border-r border-border/50 flex flex-col">
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              {leftPanel}
            </motion.div>
          </div>
          
          {/* Mod Değiştirici (Masaüstünde Alt-Sol, Mobilde Yüzen) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 md:static md:translate-x-0 md:w-full md:px-8 md:pb-6 md:pt-2">
            {modeSwitcher}
          </div>
        </div>

        {/* Sağ Panel: Koç ve Strateji (Masaüstünde 1/3, Mobilde Gizlenebilir/Alt) */}
        <aside className="hidden lg:flex w-[380px] bg-white/30 dark:bg-black/20 backdrop-blur-sm h-full flex-col border-l border-border shrink-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
             {rightPanel}
          </div>
        </aside>
      </main>

      {/* Mobil Koç Paneli — BottomSheet */}
      <div className="lg:hidden">
        {/* FAB trigger */}
        <AnimatePresence>
          {!isSheetOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => setIsSheetOpen(true)}
              className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-2xl bg-[#C17767] text-white shadow-xl shadow-[#C17767]/30 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Koç panelini aç"
            >
              <BrainCircuit size={22} />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Sheet overlay + content */}
        <AnimatePresence>
          {isSheetOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
                onClick={() => setIsSheetOpen(false)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-[91] bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-h-[75dvh] flex flex-col shadow-2xl"
              >
                {/* Sheet handle */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/50 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#C17767]/10 rounded-lg">
                      <BrainCircuit size={14} className="text-[#C17767]" />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-black text-[#C17767]">
                      Koç Paneli
                    </span>
                  </div>
                  <button
                    onClick={() => setIsSheetOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-500"
                    aria-label="Kapat"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Sheet content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {rightPanel}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
