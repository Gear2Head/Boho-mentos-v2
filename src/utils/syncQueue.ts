/**
 * AMAÇ: Offline-first çalışma ve verileri Vercel Sync Endpoint'ine basma
 * MANTIK: Gelen log, exam gibi operasyonları IndexedDB'ye yazar, internet olunca senkronize eder.
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
    if (navigator.onLine) {
      processSyncQueue();
    }
  } catch (error) {
    console.warn('Sync queue error:', error);
  }
}

export async function processSyncQueue() {
  if (!navigator.onLine) return;
  
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
             // Fallback
             item.status = 'failed';
             await store.put(item);
          }
        } catch {
          // Network error in loop
          break;
        }
      }
    }
  } catch (error) {
    console.warn('Process sync queue error:', error);
  }
}

window.addEventListener('online', processSyncQueue);
