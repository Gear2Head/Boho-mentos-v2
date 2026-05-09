import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cleanForFirestore } from '../utils/firebaseHelpers';
import { getAllQueued, getQueueStats, removeFromQueue, incrementRetry, type QueuedOperation } from '../services/offlineQueue';

const MAX_RETRIES = 5;

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const isReplaying = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const stats = await getQueueStats();
    setPendingCount(stats.pending);
    setFailedCount(stats.failed);
  }, []);

  const replayQueue = useCallback(async () => {
    if (isReplaying.current || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    isReplaying.current = true;

    try {
      const queued = await getAllQueued();
      setPendingCount(queued.length);

      for (const op of queued) {
        try {
          await executeOperation(op);
          await removeFromQueue(op.id);
        } catch (error) {
          await incrementRetry(op.id, error, MAX_RETRIES);
        }
      }

      await refreshPendingCount();
    } finally {
      isReplaying.current = false;
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      replayQueue();
    }
  }, [isOnline, replayQueue]);

  useEffect(() => {
    refreshPendingCount().catch(() => {});
  }, [refreshPendingCount]);

  return { isOnline, pendingCount, failedCount, replayQueue, refreshPendingCount };
}

async function executeOperation(op: QueuedOperation): Promise<void> {
  const ref = doc(db, op.collection, op.docId);

  switch (op.operation) {
    case 'set':
      if (op.merge) {
        await setDoc(ref, cleanForFirestore(op.data), { merge: true });
      } else {
        await setDoc(ref, cleanForFirestore(op.data));
      }
      break;
    case 'update':
      await updateDoc(ref, cleanForFirestore(op.data));
      break;
    case 'delete':
      await deleteDoc(ref);
      break;
  }
}
