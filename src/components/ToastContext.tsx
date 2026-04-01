import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ConfirmState {
  isOpen: boolean;
  message: string;
  resolve: (value: boolean) => void;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    warning: (msg: string) => void;
    info: (msg: string) => void;
  };
  confirm: (msg: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const addToast = (type: Toast['type'], message: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  };

  const toast = {
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    warning: (msg: string) => addToast('warning', msg),
    info: (msg: string) => addToast('info', msg),
  };

  const confirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ isOpen: true, message, resolve });
    });
  };

  const handleConfirm = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}
      
      {/* Toasts Container */}
      <div className="fixed top-20 md:top-6 right-4 z-[9999] flex flex-col gap-2 w-[calc(100vw-32px)] md:w-auto max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`p-3 rounded-xl shadow-lg border flex items-center gap-3 ${
                t.type === 'success' ? 'bg-green-50 dark:bg-green-950/80 border-green-200 dark:border-green-900 text-green-800 dark:text-green-300' :
                t.type === 'error' ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300' :
                t.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300' :
                'bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300'
              }`}
            >
              {t.type === 'success' && <CheckCircle2 size={18} />}
              {t.type === 'error' && <XCircle size={18} />}
              {t.type === 'warning' && <AlertTriangle size={18} />}
              {t.type === 'info' && <Info size={18} />}
              <span className="text-sm font-medium">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmState && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-app/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <button onClick={() => handleConfirm(false)} className="text-[#4A443C] dark:text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-full"><X size={18} /></button>
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Emin misin?</h3>
              <p className="text-sm text-ink-muted mb-6">{confirmState.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleConfirm(false)}
                  className="flex-1 py-3 text-sm font-bold text-ink bg-surface dark:bg-zinc-800 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  İPTAL
                </button>
                <button
                  onClick={() => handleConfirm(true)}
                  className="flex-1 py-3 text-sm font-bold text-white bg-[#C17767] rounded-xl shadow-lg border border-[#A56253] hover:bg-[#A56253] transition-colors"
                >
                  EVET
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be within ToastProvider');
  return ctx;
};
