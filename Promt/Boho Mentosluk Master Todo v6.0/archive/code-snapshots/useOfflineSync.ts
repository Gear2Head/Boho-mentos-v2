/**
 * AMAÇ: İnternet geldiğinde yerel verileri (IndexedDB) bulutla (Firebase) senkronize etmek
 * MANTIK: 'online' eventini dinler ve kuyruktaki verileri Firestore'a basar.
 *
 * [BUG-002 FIX]: profile?.id → authUser?.uid
 * StudentProfile tipinde "id" alanı tanımlı değildi. Bu yüzden userId her zaman
 * undefined dönüyor ve hook hiç çalışmıyordu. authUser.uid üzerinden direkt okuma sağlandı.
 */

import { useEffect } from 'react';
import { getSyncQueue, clearSyncQueue } from '../services/indexedDB';
import { db } from '../services/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { useAppStore } from '../store/appStore';

export function useOfflineSync() {
  // [BUG-002 FIX]: authUser.uid kullan, profile.id değil
  const authUser = useAppStore((s) => s.authUser);
  const userId = authUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const syncData = async () => {
      if (!navigator.onLine) return;

      const queue = await getSyncQueue();
      if (queue.length === 0) return;

      console.log(`[OfflineSync] ${queue.length} kayıt senkronize ediliyor...`);

      try {
        for (const item of queue) {
          if (item.collection && item.id) {
            await setDoc(doc(db, item.collection, item.id), item.data, {
              merge: true,
            });
          }
        }
        await clearSyncQueue();
        console.log('[OfflineSync] Başarılı.');
      } catch (err) {
        console.error('[OfflineSync Error]', err);
      }
    };

    window.addEventListener('online', syncData);

    // İlk açılışta online isek hemen kontrol et
    if (navigator.onLine) {
      syncData();
    }

    return () => {
      window.removeEventListener('online', syncData);
    };
  }, [userId]);
}
