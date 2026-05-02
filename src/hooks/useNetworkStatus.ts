/**
 * AMAÇ: Online/offline durum takibi + offline queue replay.
 * MANTIK: navigator.onLine + event listener. Online olunca queue'yu drain eder.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cleanForFirestore } from '../utils/firebaseHelpers';
import { getAllQueued, removeFromQueue, incrementRetry, type QueuedOperation } from '../services/offlineQueue';

const MAX_RETRIES = 5;

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const isReplaying = useRef(false);

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

  // Online olunca queue drain
  const replayQueue = useCallback(async () => {
    if (isReplaying.current || !navigator.onLine) return;
    isReplaying.current = true;

    try {
      const queued = await getAllQueued();
      setPendingCount(queued.length);

      for (const op of queued) {
        if (op.retries >= MAX_RETRIES) {
          // Çok fazla retry — sil ve devam et
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

      const remaining = await getAllQueued();
      setPendingCount(remaining.length);
    } finally {
      isReplaying.current = false;
    }
  }, []);

  useEffect(() => {
    if (isOnline) {
      replayQueue();
    }
  }, [isOnline, replayQueue]);

  // İlk yüklenme sırasında da queue'yu kontrol et
  useEffect(() => {
    getAllQueued().then(q => setPendingCount(q.length)).catch(() => {});
  }, []);

  return { isOnline, pendingCount, replayQueue };
}

async function executeOperation(op: QueuedOperation): Promise<void> {
  const pathParts = op.collection.split('/');

  // Basit tek-seviye subcollection desteği: "users/UID/logs"
  let ref;
  if (pathParts.length === 3) {
    ref = doc(db, pathParts[0], pathParts[1], pathParts[2], op.docId);
  } else {
    ref = doc(db, op.collection, op.docId);
  }

  switch (op.operation) {
    case 'set':
      // Idempotent: Zaten varsa üzerine yazar
      await setDoc(ref, cleanForFirestore(op.data), { merge: true });
      break;
    case 'update':
      await setDoc(ref, cleanForFirestore(op.data), { merge: true });
      break;
    case 'delete':
      await deleteDoc(ref);
      break;
  }
}
