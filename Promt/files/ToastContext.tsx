/**
 * AMAÇ: Uygulama genelinde toast bildirimleri ve confirm diyalogları
 * MANTIK: alert() / window.confirm() yerine tema uyumlu, non-blocking UI
 * KULLANIM:
 *   - Hook: const { toast, confirm } = useToast()
 *   - Modül: import { toast, confirmDialog } from '@/contexts/ToastContext'
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
  ShieldAlert,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

interface ConfirmState extends Required<ConfirmOptions> {
  id: string;
  resolve: (value: boolean) => void;
}

interface ToastAPI {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

interface ToastContextValue {
  toast: ToastAPI;
  confirm: (options: string | ConfirmOptions) => Promise<boolean>;
}

// ─── Singleton refs (callable outside React tree) ─────────────────────────────

let _toastAPI: ToastAPI | null = null;
let _confirmFn: ((opts: string | ConfirmOptions) => Promise<boolean>) | null = null;

/**
 * Hook dışından çağrılabilir toast singleton.
 * Provider mount olmadan önce çağrılırsa sessizce yok sayılır.
 */
export const toast: ToastAPI = {
  success: (msg, dur) => _toastAPI?.success(msg, dur),
  error: (msg, dur) => _toastAPI?.error(msg, dur),
  warning: (msg, dur) => _toastAPI?.warning(msg, dur),
  info: (msg, dur) => _toastAPI?.info(msg, dur),
};

/**
 * Hook dışından çağrılabilir confirm singleton.
 * Provider mount olmadan önce çağrılırsa window.confirm'e fallback yapar.
 */
export async function confirmDialog(
  options: string | ConfirmOptions
): Promise<boolean> {
  if (_confirmFn) return _confirmFn(options);
  const message = typeof options === 'string' ? options : options.message;
  return window.confirm(message);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<
  ToastType,
  { icon: React.ReactNode; bg: string; border: string; text: string }
> = {
  success: {
    icon: <CheckCircle2 size={16} />,
    bg: 'bg-green-950/80',
    border: 'border-green-700/50',
    text: 'text-green-300',
  },
  error: {
    icon: <XCircle size={16} />,
    bg: 'bg-red-950/80',
    border: 'border-red-700/50',
    text: 'text-red-300',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    bg: 'bg-amber-950/80',
    border: 'border-amber-700/50',
    text: 'text-amber-300',
  },
  info: {
    icon: <Info size={16} />,
    bg: 'bg-zinc-900/90',
    border: 'border-zinc-700/50',
    text: 'text-zinc-300',
  },
};

const CONFIRM_VARIANT_STYLES = {
  danger: {
    confirmBtn: 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30',
    icon: <ShieldAlert size={20} className="text-red-400" />,
    iconBg: 'bg-red-950/50 border-red-900/50',
  },
  warning: {
    confirmBtn: 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-900/30',
    icon: <AlertTriangle size={20} className="text-amber-400" />,
    iconBg: 'bg-amber-950/50 border-amber-900/50',
  },
  default: {
    confirmBtn: 'bg-[#C17767] hover:bg-[#A56253] text-white shadow-[#C17767]/20',
    icon: <Info size={20} className="text-zinc-400" />,
    iconBg: 'bg-zinc-800/50 border-zinc-700/50',
  },
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const counterRef = useRef(0);

  // Toast API ────────────────────────────────────────────────────────────────
  const addToast = useCallback((type: ToastType, message: string, duration = 3500) => {
    const id = `toast_${++counterRef.current}_${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastAPI = useCallback(
    (): ToastAPI => ({
      success: (msg, dur) => addToast('success', msg, dur),
      error: (msg, dur) => addToast('error', msg, dur),
      warning: (msg, dur) => addToast('warning', msg, dur),
      info: (msg, dur) => addToast('info', msg, dur),
    }),
    [addToast]
  );

  // Confirm API ──────────────────────────────────────────────────────────────
  const confirm = useCallback(
    (options: string | ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        const opts = typeof options === 'string' ? { message: options } : options;
        const id = `confirm_${++counterRef.current}`;
        setConfirmState({
          id,
          title: opts.title ?? 'Emin misin?',
          message: opts.message,
          confirmLabel: opts.confirmLabel ?? 'Onayla',
          cancelLabel: opts.cancelLabel ?? 'İptal',
          variant: opts.variant ?? 'default',
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(
    (value: boolean) => {
      confirmState?.resolve(value);
      setConfirmState(null);
    },
    [confirmState]
  );

  // Keyboard handler for confirm dialog ─────────────────────────────────────
  useEffect(() => {
    if (!confirmState) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleConfirm(false);
      if (e.key === 'Enter') handleConfirm(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [confirmState, handleConfirm]);

  // Expose singletons ────────────────────────────────────────────────────────
  const api = toastAPI();
  useEffect(() => {
    _toastAPI = api;
    _confirmFn = confirm;
    return () => {
      _toastAPI = null;
      _confirmFn = null;
    };
  }, [api, confirm]);

  const contextValue: ToastContextValue = { toast: api, confirm };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* ── Toast Container ─────────────────────────────────────────────── */}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>

      {/* ── Confirm Dialog ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmState && (
          <ConfirmDialog
            state={confirmState}
            onConfirm={() => handleConfirm(true)}
            onCancel={() => handleConfirm(false)}
          />
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

// ─── Toast Item Component ─────────────────────────────────────────────────────

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  const cfg = TOAST_CONFIG[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 48, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.9 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className={`
        pointer-events-auto flex items-start gap-3 px-4 py-3
        rounded-2xl border backdrop-blur-xl shadow-xl
        min-w-[260px] max-w-[360px]
        ${cfg.bg} ${cfg.border}
      `}
      role="alert"
    >
      <span className={`mt-0.5 shrink-0 ${cfg.text}`}>{cfg.icon}</span>
      <p className={`flex-1 text-sm font-mono leading-relaxed ${cfg.text}`}>
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
        aria-label="Kapat"
      >
        <X size={14} className={cfg.text} />
      </button>
    </motion.div>
  );
}

// ─── Confirm Dialog Component ─────────────────────────────────────────────────

function ConfirmDialog({
  state,
  onConfirm,
  onCancel,
}: {
  state: ConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const styles = CONFIRM_VARIANT_STYLES[state.variant];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 12 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-8 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="confirm-title"
      >
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center border mb-6 ${styles.iconBg}`}
        >
          {styles.icon}
        </div>

        {/* Content */}
        <h3
          id="confirm-title"
          className="font-serif italic text-xl text-zinc-200 mb-2"
        >
          {state.title}
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed font-mono mb-8">
          {state.message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="
              flex-1 py-3 rounded-xl border border-[#2A2A2A]
              text-xs font-bold uppercase tracking-widest text-zinc-400
              hover:bg-[#2A2A2A] hover:text-zinc-200 transition-colors
            "
          >
            {state.cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={`
              flex-1 py-3 rounded-xl shadow-lg
              text-xs font-bold uppercase tracking-widest transition-colors
              ${styles.confirmBtn}
            `}
          >
            {state.confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
