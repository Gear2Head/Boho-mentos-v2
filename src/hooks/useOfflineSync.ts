/**
 * AMAÇ: DEVRE DIŞI — Offline sync kuyruğu artık bu hook'ta yönetilmiyor.
 * MANTIK: FALSEFIX-003 — Eski `indexedDB.ts` queue + `setDoc` sistemi yeni sync mimarisiyle
 *         çakışıyordu ve yanlış Firestore path'lerine yazabiliyordu (users/{uid}/... standardı).
 *         Offline replay artık `useSyncManager.ts` üzerinden yönetilmektedir.
 *
 * Emeklilik nedeni:
 *  - item.collection / item.id bazlı doğrudan setDoc → users/{uid}/... path modeli uyumsuz
 *  - iki ayrı offline mekanizma (indexedDB.ts + syncQueue.ts) aynı anda çalışıyordu (SYNC-009)
 *  - auth header taşımadan cloud'a yazıyordu (SYNC-008)
 *
 * Bu dosya silinmeden önce kod tabanının bu hook'u import eden yerler temizlenmeli.
 * Geçici olarak no-op export bırakılmıştır.
 */

/** @deprecated FALSEFIX-003: Bu hook no-op. useSyncManager.ts kullanın. */
export function useOfflineSync(): void {
  // No-op: Eski offline sync kaldırıldı.
  // Yeni mimaride useSyncManager.ts bu sorumluluğu taşıyor.
  if (process.env.NODE_ENV === 'development') {
    console.warn('[useOfflineSync] DEPRECATED: Bu hook artık çalışmıyor. useSyncManager kullanın.');
  }
}

