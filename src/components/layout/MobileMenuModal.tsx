import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, BookOpen, Calendar, List, Archive, Target, Settings, LogOut, X } from 'lucide-react';
import { confirmDialog } from '../../contexts/ToastContext';

interface MobileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigate: (id: string) => void;
  onSignOut: () => void;
}

export function MobileMenuModal({ isOpen, onClose, activeTab, onNavigate, onSignOut }: MobileMenuModalProps) {
  const menuItems = [
    { id: 'dashboard', icon: <Target size={20} />, label: 'DASHBOARD' },
    { id: 'coach', icon: <BrainCircuit size={20} />, label: 'AI KOÇ' },
    { id: 'agenda', icon: <Calendar size={20} />, label: 'AJANDA' },
    { id: 'subjects', icon: <BookOpen size={20} />, label: 'MÜFREDAT' },
    { id: 'questions', icon: <Target size={20} />, label: 'SORULAR' },
    { id: 'explain', icon: <BookOpen size={20} />, label: 'ANLATIM' },
    { id: 'exams', icon: <Calendar size={20} />, label: 'ANALİZ' },
    { id: 'logs', icon: <List size={20} />, label: 'LOGLAR' },
    { id: 'archive', icon: <Archive size={20} />, label: 'MEZARLIK' },
    { id: 'strategy', icon: <Target size={20} />, label: 'STRATEJİ' },
    { id: 'settings', icon: <Settings size={20} />, label: 'AYARLAR' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-end md:hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
            className="w-full bg-[#FDFBF7] dark:bg-zinc-950 rounded-t-[2.5rem] border-t border-[#EAE6DF] dark:border-zinc-800 p-8 pt-4 overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-full mx-auto mb-6 cursor-pointer" onClick={onClose} />

            <header className="mb-8 flex justify-between items-start">
              <div>
                <h3 className="font-display italic text-2xl text-[#C17767] dark:text-rose-400">Navigasyon</h3>
                <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold font-mono">Boho Mentos OS v5</p>
              </div>
              <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400">
                <X size={20} />
              </button>
            </header>

            <div className="grid grid-cols-3 gap-y-6 gap-x-3 pb-8">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); onClose(); }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${activeTab === item.id ? 'bg-[#C17767] text-white shadow-lg shadow-[#C17767]/20 scale-105' : 'bg-zinc-100 dark:bg-zinc-900 text-[#4A443C] dark:text-zinc-400 group-hover:bg-[#C17767]/10'}`}>
                    {item.icon}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest text-center leading-tight ${activeTab === item.id ? 'text-[#C17767]' : 'text-[#4A443C]/60 dark:text-zinc-500'}`}>{item.label}</span>
                </button>
              ))}
              {/* Mobil Logout */}
              <button
                onClick={async () => { if (await confirmDialog('Çıkış yapmak istediğine emin misin?')) onSignOut(); }}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-rose-500/10 text-rose-500 shadow-sm border border-rose-500/20">
                  <LogOut size={20} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-rose-500">ÇIKIŞ YAP</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-[#FDFBF7] dark:text-zinc-950 border border-transparent dark:border-zinc-200 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
            >
              Menüyü Kapat
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MobileMenuModal;
