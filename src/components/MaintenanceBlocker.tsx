/**
 * AMAÇ: Sistem bakımı sırasında kullanıcıların girişini engelleyen UI
 * MANTIK: Sadece Super Adminlerin girmesine izin verir, diğerlerine bilgi ekranı gösterir.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Hammer, Instagram, Twitter } from 'lucide-react';

export function MaintenanceBlocker() {
  return (
    <div className="fixed inset-0 z-[2000] bg-[#121212] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative inline-block"
        >
          <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full" />
          <div className="relative p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl">
            <Hammer className="text-amber-500 w-12 h-12" />
          </div>
        </motion.div>

        <div className="space-y-4">
          <h1 className="text-3xl font-display font-bold text-white italic">Kısa Bir Mola.</h1>
          <p className="text-zinc-400 text-sm leading-relaxed tracking-wide">
            Boho Mentosluk şu an bir sistem güncellemesinden geçiyor. 
            Seni daha güçlü bir Gear_Head ile karşılamak için hazırlık yapıyoruz.
          </p>
        </div>

        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center gap-4 text-left">
           <AlertTriangle className="text-amber-500 shrink-0" size={20} />
           <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
             Kayıtlı verilerin güvende. <br/>
             <span className="text-amber-500/80">Tahmini bitiş: Yakında</span>
           </p>
        </div>

        <div className="flex justify-center gap-6 pt-4">
           <a href="#" className="text-zinc-600 hover:text-white transition-colors"><Instagram size={20}/></a>
           <a href="#" className="text-zinc-600 hover:text-white transition-colors"><Twitter size={20}/></a>
        </div>

        <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-700 font-bold">
           #GEAR_HEAD #UPGRADING
        </p>
      </div>
    </div>
  );
}
