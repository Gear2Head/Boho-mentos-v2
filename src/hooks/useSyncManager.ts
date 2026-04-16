/**
 * useSyncManager
 * Sync status yönetimi — duplicated listener kurulmaz.
 * - forceSync: Manuel tetikleme
 * - syncStatus: idle | syncing | synced | error | offline
 * - 'synced' durumu 3sn sonra otomatik 'idle'ye döner
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { pushToSupabase, SyncSummary } from '../services/supabaseSync';
import { buildSyncPayload } from '../services/syncSchema';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export function useSyncManager(uid: string | undefined) {
  const isStoreSyncing = useAppStore((s) => s.isSyncing);
  const setSyncing = useAppStore((s) => s.setSyncing);
  const addNotification = useAppStore((s) => s.addNotification);
  const syncedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getInitialStatus = (): SyncStatus =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle';

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getInitialStatus);

  // Auto-reset 'synced' → 'idle' after 3s to stop the icon from staying colored
  const setStatusWithAutoReset = useCallback((status: SyncStatus) => {
    setSyncStatus(status);
    if (status === 'synced') {
      if (syncedResetTimerRef.current) clearTimeout(syncedResetTimerRef.current);
      syncedResetTimerRef.current = setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (syncedResetTimerRef.current) clearTimeout(syncedResetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!uid) {
      setSyncStatus(getInitialStatus());
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    if (isStoreSyncing) {
      setSyncStatus('syncing');
    } else if (syncStatus === 'syncing') {
      // If store stopped syncing and we were in 'syncing' status, reset
      setSyncStatus('idle');
    }
  }, [uid, isStoreSyncing, syncStatus]);

  useEffect(() => {
    const handleOnline  = () => setSyncStatus('idle');
    const handleOffline = () => setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatSummary = (summary: SyncSummary): string => {
    const parts: string[] = [];
    if (summary.rootSynced) parts.push('Profil güncellendi');
    
    const count = Object.values(summary.entities).reduce((a, b) => a + b, 0);
    if (count > 0) {
      const detail = Object.entries(summary.entities)
        .map(([k, v]) => `${v} ${k.replace('failedQuestions', 'Hatalı Soru').replace('chatHistory', 'Mesaj').replace('logs', 'Log').replace('exams', 'Deneme')}`)
        .join(', ');
      parts.push(`${count} veri yedeklendi (${detail})`);
    }

    if (parts.length === 0) return 'Herhangi bir yeni veri bulunamadı.';
    return parts.join('. ') + '.';
  };

  const forceSync = useCallback(
    async (showNotif = true) => {
      if (!uid) return;

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncStatus('offline');
        if (showNotif) {
          addNotification({
            type: 'warning',
            title: 'Çevrimdışı',
            message: 'İnternet bağlantısı olmadığı için bulut eşitlemesi yapılamadı.',
          });
        }
        return;
      }

      setSyncing(true);
      setSyncStatus('syncing');

      try {
        const state = useAppStore.getState();
        const { root, entities } = buildSyncPayload(state);
        
        // Timeout protection: 15 seconds
        const syncPromise = pushToSupabase(uid, { ...root, ...entities });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sync timeout')), 15000)
        );

        const summary = await Promise.race([syncPromise, timeoutPromise]) as SyncSummary;
        
        setStatusWithAutoReset('synced');

        if (showNotif) {
          addNotification({
            type: 'success',
            title: 'Senkronizasyon Başarılı',
            message: formatSummary(summary),
          });
        }
      } catch (error) {
        console.error('[SyncManager] forceSync failed:', error);
        setStatusWithAutoReset(
          typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error'
        );

        if (showNotif) {
          const isTimeout = (error as Error).message === 'Sync timeout';
          addNotification({
            type: 'error',
            title: isTimeout ? 'Senkronizasyon Zaman Aşımı' : 'Senkronizasyon Hatası',
            message: isTimeout 
              ? 'Bağlantı çok yavaş olduğu için işlem iptal edildi. Daha sonra tekrar dene.'
              : 'Veriler buluta gönderilemedi. Daha sonra tekrar dene.',
          });
        }
      } finally {
        setSyncing(false);
      }
    },
    [uid, setSyncing, addNotification, setStatusWithAutoReset]
  );

  const isSyncing = useMemo(() => syncStatus === 'syncing', [syncStatus]);

  return { syncStatus, forceSync, isSyncing };
}
