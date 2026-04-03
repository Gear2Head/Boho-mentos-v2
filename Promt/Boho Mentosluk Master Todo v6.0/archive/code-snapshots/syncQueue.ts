/**
 * AMAÇ: Offline-first çalışma ve verileri Vercel Sync Endpoint'ine basma
 * MANTIK: Gelen log, exam gibi operasyonları IndexedDB'ye yazar, internet olunca senkronize eder.
 * 
 * [BUG-003 FIX]: window.addEventListener module scope'dan çıkarıldı.
 * initOfflineSync() → App.tsx içinde useEffect ile çağrılmalı.
 */

import { openDB } from 'idb';

const SYNC_DB = 'yks_sync_db';
const SYNC_STORE = 'sync_queue';

export async function initSyncDB() {
  return openDB(SYNC_DB, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function addToSyncQueue(endpoint: string, payload: any) {
  try {
    const db = await initSyncDB();
    await db.add(SYNC_STORE, {
      endpoint,
      payload,
      timestamp: Date.now(),
      status: 'pending'
    });

    // Eğer online isek anında tetikle
    if (typeof window !== 'undefined' && navigator.onLine) {
      processSyncQueue();
    }
  } catch (error) {
    console.warn('[SyncQueue] addToSyncQueue error:', error);
  }
}

export async function processSyncQueue() {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  try {
    const db = await initSyncDB();
    const tx = db.transaction(SYNC_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_STORE);
    const items = await store.getAll();

    if (items.length === 0) return;

    for (const item of items) {
      if (item.status === 'pending') {
        try {
          const res = await fetch(item.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });

          if (res.ok) {
            await store.delete(item.id);
          } else {
            item.status = 'failed';
            await store.put(item);
          }
        } catch {
          // Network error — bir sonraki online event'e bırak
          break;
        }
      }
    }
  } catch (error) {
    console.warn('[SyncQueue] processSyncQueue error:', error);
  }
}

/**
 * [BUG-003 FIX] - Daha önce module scope'daydı.
 * Çağrım: App.tsx içinde useEffect(() => { const cleanup = initOfflineSync(); return cleanup; }, [])
 */
export function initOfflineSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    processSyncQueue();
  };

  window.addEventListener('online', handleOnline);

  // İlk yüklemede online isek hemen çalıştır
  if (navigator.onLine) {
    processSyncQueue();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
