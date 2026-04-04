/**
 * useSyncManager
 * Downloaded sync manager'in proje-sema uyumlu adaptasyonu.
 *
 * Not:
 * - Realtime cloud dinleyicisi zaten useAuth tarafinda kurulu.
 * - Buradaki hook duplicate listener kurmaz.
 * - Sorumlulugu: sync status, manual forceSync ve offline event entegrasyonu.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { pushToFirestore } from '../services/firestoreSync';
import { buildSyncPayload } from '../services/syncSchema';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export function useSyncManager(uid: string | undefined) {
  const isStoreSyncing = useAppStore((s) => s.isSyncing);
  const setSyncing = useAppStore((s) => s.setSyncing);
  const addNotification = useAppStore((s) => s.addNotification);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle'
  );

  useEffect(() => {
    if (!uid) {
      setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus((current) => {
      if (isStoreSyncing) return 'syncing';
      if (current === 'synced' || current === 'error') return current;
      return 'idle';
    });
  }, [uid, isStoreSyncing]);

  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('idle');
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [uid]);

  const forceSync = useCallback(
    async (showNotif = true) => {
      if (!uid) return;

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncStatus('offline');
        if (showNotif) {
          addNotification({
            type: 'warning',
            title: 'Cevrimdisi',
            message: 'Internet baglantisi olmadigi icin bulut esitlemesi yapilamadi.',
          });
        }
        return;
      }

      setSyncing(true);
      setSyncStatus('syncing');

      try {
        const state = useAppStore.getState();
        const { root, entities } = buildSyncPayload(state);
        // Entity'leri ayrı gönderiyoruz
        await pushToFirestore(uid, { ...root, ...entities });
        setSyncStatus('synced');

        if (showNotif) {
          addNotification({
            type: 'success',
            title: 'Senkronizasyon Basarili',
            message: 'Tum ilerlemen buluta guvenle yedeklendi.',
          });
        }
      } catch (error) {
        console.error('[SyncManager] forceSync failed:', error);
        setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');

        if (showNotif) {
          addNotification({
            type: 'error',
            title: 'Senkronizasyon Hatasi',
            message: 'Veriler buluta gonderilemedi. Daha sonra tekrar dene.',
          });
        }
      } finally {
        setSyncing(false);
      }
    },
    [uid, setSyncing, addNotification]
  );

  const isSyncing = useMemo(() => syncStatus === 'syncing', [syncStatus]);

  return { syncStatus, forceSync, isSyncing };
}
