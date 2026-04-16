/**
 * useSyncManager
 * Sync status yönetimi — duplicated listener kurulmaz.
 * - forceSync: Manuel tetikleme
 * - syncStatus: idle | syncing | synced | error | offline
 * - 'synced' durumu 3sn sonra otomatik 'idle'ye döner
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { pushRootToSupabase, pushEntitiesToSupabase, SyncSummary } from '../services/supabaseSync';
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
      if (useAppStore.getState().isSyncing) return; // [Global Guard] Prevents duplicate fetches across components

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

      let rootSynced = false;
      let entitiesSynced = false;

      try {
        const state = useAppStore.getState();
        const { root, entities } = buildSyncPayload(state);

        // ── ADIM 1: Root (profil + konular) — 30s timeout, kritik ──────────
        try {
          await Promise.race([
            pushRootToSupabase(uid, root as any),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Root timeout')), 30000)),
          ]);
          rootSynced = true;
          console.log('[SyncManager] Root push OK');
        } catch (rootErr) {
          console.error('[SyncManager] Root push failed:', rootErr);
        }

        // ── ADIM 2: Entities (loglar, denemeler…) — 40s timeout, kritik değil ─
        try {
          await Promise.race([
            pushEntitiesToSupabase(uid, entities as any),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Entities timeout')), 40000)),
          ]);
          entitiesSynced = true;
          console.log('[SyncManager] Entities push OK');
        } catch (entErr) {
          console.warn('[SyncManager] Entities push failed (non-critical):', entErr);
        }

        if (rootSynced) {
          setStatusWithAutoReset('synced');
          if (showNotif) {
            addNotification({
              type: entitiesSynced ? 'success' : 'info',
              title: 'Senkronizasyon Tamamlandı',
              message: entitiesSynced
                ? 'Tüm veriler buluta yedeklendi.'
                : 'Profil ve konular yedeklendi. Loglar/Denemeler bir sonraki senkronda aktarılacak.',
            });
          }
        } else {
          setStatusWithAutoReset('error');
          if (showNotif) {
            addNotification({
              type: 'error',
              title: 'Senkronizasyon Başarısız',
              message: 'Profil verisi gönderilemedi. İnternet bağlantını ve oturumunu kontrol et.',
            });
          }
        }
      } catch (err: unknown) {
        const error = err as any;
        console.error('[SyncManager] forceSync unexpected error:', error);
        setStatusWithAutoReset('error');
        const isAuthError = error?.code === '42501'
          || error?.message?.toLowerCase().includes('jwt')
          || error?.status === 401 || error?.status === 403;
        if (showNotif) {
          addNotification({
            type: 'error',
            title: isAuthError ? 'Oturum Hatası' : 'Senkronizasyon Hatası',
            message: isAuthError
              ? 'Yetki reddedildi. Çıkış yapıp tekrar giriş yapın.'
              : 'Beklenmedik bir hata oluştu. Tekrar dene.',
          });
        }
      } finally {
        setSyncing(false);
      }
    },
    [uid, setSyncing, addNotification, setStatusWithAutoReset, syncStatus]
  );

  const isSyncing = useMemo(() => syncStatus === 'syncing', [syncStatus]);

  return { syncStatus, forceSync, isSyncing };
}
