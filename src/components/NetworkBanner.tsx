import { WifiOff, CloudUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function NetworkBanner() {
  const { isOnline, pendingCount, replayQueue } = useNetworkStatus();
  const showBanner = !isOnline || pendingCount > 0;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-xs font-bold uppercase tracking-widest text-center py-2 flex items-center justify-center gap-2 shadow-lg"
        >
          {!isOnline ? <WifiOff size={14} /> : <CloudUpload size={14} />}
          <span>
            {!isOnline
              ? `Ag baglantisi kesildi. ${pendingCount} islem kuyrukta.`
              : `${pendingCount} offline islem esitleme bekliyor.`}
          </span>
          {isOnline && pendingCount > 0 && (
            <button
              onClick={() => replayQueue()}
              className="ml-2 rounded bg-white/20 px-2 py-0.5 text-[10px] hover:bg-white/30"
            >
              Esitle
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
