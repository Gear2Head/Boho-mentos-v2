/**
 * AMAÇ: Uygulama içi bildirim merkezi (Notification Center)
 * MANTIK: Cam morfolojisi (glassmorphism) tasarımı, okunmamış bildirim takibi.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Bell, CheckCircle2, AlertTriangle, Info, 
  Trophy, Trash2, Calendar, LayoutList 
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOTIF_ICONS = {
  success: <CheckCircle2 size={16} className="text-green-400" />,
  error: <AlertTriangle size={16} className="text-red-400" />,
  warning: <AlertTriangle size={16} className="text-amber-400" />,
  info: <Info size={16} className="text-blue-400" />,
  achievement: <Trophy size={16} className="text-yellow-400" />,
};

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, markNotificationAsRead, clearNotifications } = useAppStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md md:flex md:items-start md:justify-end md:p-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full h-[85vh] md:h-auto md:max-h-[70vh] md:w-[400px] bg-[#121212] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2rem] flex flex-col shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#C17767]/10 to-transparent">
            <div>
              <h3 className="font-display italic text-xl text-zinc-100 flex items-center gap-2">
                <Bell size={20} className="text-[#C17767]" /> Bildirimler
                {unreadCount > 0 && (
                  <span className="bg-[#C17767] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} YENİ
                  </span>
                )}
              </h3>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mt-1">İlerleme ve Güncellemeler</p>
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button 
                  onClick={clearNotifications}
                  className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-red-400 transition-colors"
                  title="Tümünü Temizle"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                <Bell size={48} className="text-zinc-600 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Henüz bildirim yok</p>
                <p className="text-[10px] mt-1">Gear_Head seni takip etmeye devam ediyor.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    layout
                    onClick={() => markNotificationAsRead(notif.id)}
                    className={`
                      p-4 rounded-2xl border transition-all cursor-pointer group relative
                      ${notif.read ? 'bg-white/[0.02] border-white/5 opacity-60' : 'bg-white/[0.05] border-[#C17767]/20 shadow-lg shadow-[#C17767]/5'}
                    `}
                  >
                    {!notif.read && (
                      <div className="absolute top-4 right-4 w-2 h-2 bg-[#C17767] rounded-full shadow-[0_0_8px_#C17767]" />
                    )}
                    <div className="flex gap-3">
                      <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center border shrink-0
                        ${notif.read ? 'bg-zinc-900 border-zinc-800' : 'bg-[#C17767]/10 border-[#C17767]/30'}
                      `}>
                        {NOTIF_ICONS[notif.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-bold uppercase tracking-tight truncate ${notif.read ? 'text-zinc-400' : 'text-zinc-100'}`}>
                          {notif.title}
                        </h4>
                        <p className={`text-xs mt-1 leading-relaxed ${notif.read ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 opacity-50">
                          <Calendar size={10} />
                          <span className="text-[10px] font-mono">
                            {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: tr })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer (Sync Status Indicator) */}
          <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-xl">
             <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
                <span>Versiyon 4.2 Elite</span>
                <span className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                   Sİstem Aktİf
                </span>
             </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
