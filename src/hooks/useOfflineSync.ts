/**
 * AMAÇ: İnternet geldiğinde yerel verileri (IndexedDB) bulutla (Firebase) senkronize etmek
 * MANTIK: 'online' eventini dinler ve kuyruktaki verileri Firestore'a basar.
 */

import { useEffect } from 'react';
import { getSyncQueue, clearSyncQueue } from '../services/indexedDB';
import { db } from '../services/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { useAppStore } from '../store/appStore';

export function useOfflineSync() {
  const profile = useAppStore(s => s.profile);
  const userId = profile?.id; // Varsayılan user ID

  useEffect(() => {
    if (!userId) return;

    const syncData = async () => {
      if (!navigator.onLine) return;
      
      const queue = await getSyncQueue();
      if (queue.length === 0) return;

      console.log(`[Offline Sync] ${queue.length} kayıt senkronize ediliyor...`);
      
      try {
        for (const item of queue) {
          if (item.collection && item.id) {
             await setDoc(doc(db, item.collection, item.id), item.data, { merge: true });
          }
        }
        await clearSyncQueue();
        console.log('[Offline Sync] Başarılı.');
      } catch (err) {
        console.error('[Offline Sync Error]', err);
      }
    };

    window.addEventListener('online', syncData);
    // İlk açılışta online isek hemen kontrol et
    if (navigator.onLine) syncData();

    return () => window.removeEventListener('online', syncData);
  }, [userId]);
}
