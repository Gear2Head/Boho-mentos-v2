import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cleanForFirestore } from '../utils/firebaseHelpers';
import { getAllQueued, removeFromQueue, incrementRetry, type QueuedOperation } from '../services/offlineQueue';

const MAX_RETRIES = 5;

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const isReplaying = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const queued = await getAllQueued();
    setPendingCount(queued.length);
  }, []);

  const replayQueue = useCallback(async () => {
    if (isReplaying.current || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    isReplaying.current = true;

    try {
      const queued = await getAllQueued();
      setPendingCount(queued.length);

      for (const op of queued) {
        if (op.retries >= MAX_RETRIES) {
          await removeFromQueue(op.id);
          continue;
        }

        try {
          await executeOperation(op);
          await removeFromQueue(op.id);
        } catch {
          await incrementRetry(op.id);
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

  return { isOnline, pendingCount, replayQueue, refreshPendingCount };
}

async function executeOperation(op: QueuedOperation): Promise<void> {
  const ref = doc(db, op.collection, op.docId);

  switch (op.operation) {
    case 'set':
    case 'update':
      await setDoc(ref, cleanForFirestore(op.data), { merge: true });
      break;
    case 'delete':
      await deleteDoc(ref);
      break;
  }
}
