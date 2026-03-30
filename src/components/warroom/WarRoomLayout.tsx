/**
 * AMAÇ: War Room Ana Yerleşim Mimarisi (Strategy 1: Command Center)
 * MANTIK: Desktop'ta 2 sütun (2fr_1fr), Mobile'da 1 sütun. min-w-0 ve h-screen guardlar ekli.
 */

import React, { ReactNode } from 'react';
import { motion } from 'motion/react';

interface WarRoomLayoutProps {
  topBar: ReactNode;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  modeSwitcher: ReactNode;
}

export function WarRoomLayout({ topBar, leftPanel, rightPanel, modeSwitcher }: WarRoomLayoutProps) {
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

      {/* Mobil Koç Paneli (BottomSheet veya Tabbed mantığı için hazır altyapı) */}
      <div className="lg:hidden">
        {/* İleride buraya BottomSheet eklenecek */}
      </div>
    </div>
  );
}
