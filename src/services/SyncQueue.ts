import { getSupabaseClient } from './supabaseClient';
import { ENTITY_TABLES, pushRootToSupabase } from './supabaseSync';
import { getDeviceId } from '../utils/deviceId';

/**
 * [D2 FIX]: Offline-First Push Queue
 * A simple robust queue that catches failed single-entity pushes or root state pushes
 * and retries them sequentially to ensure 'Kuyruk sırası garantisi'.
 */

export interface SyncQueueItem {
  id: string; // Queue item id
  uid: string;
  type: 'root' | 'entity' | 'tombstone';
  storeKey?: string;
  payload: Record<string, unknown>;
  entityId?: string;
  retryCount: number;
  addedAt: number;
}

const QUEUE_KEY = 'boho_sync_queue';

function getQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(q: SyncQueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function enqueueRootPush(uid: string, payload: Record<string, unknown>) {
  const q = getQueue();
  // Filter out existing pending root pushes for same user to avoid duplicate heavy pushes
  const nextQ = q.filter(i => !(i.type === 'root' && i.uid === uid));
  nextQ.push({
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    uid,
    type: 'root',
    payload,
    retryCount: 0,
    addedAt: Date.now()
  });
  saveQueue(nextQ);
  void processQueue();
}

export function enqueueEntityPush(uid: string, storeKey: string, payload: Record<string, unknown>) {
  const q = getQueue();
  q.push({
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    uid,
    type: 'entity',
    storeKey,
    payload,
    retryCount: 0,
    addedAt: Date.now()
  });
  saveQueue(q);
  void processQueue();
}

export function enqueueTombstone(uid: string, storeKey: string, entityId: string) {
  const q = getQueue();
  q.push({
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    uid,
    type: 'tombstone',
    storeKey,
    entityId,
    payload: {},
    retryCount: 0,
    addedAt: Date.now()
  });
  saveQueue(q);
  void processQueue();
}

let isProcessing = false;

export async function processQueue() {
  if (isProcessing) return;
  if (!navigator.onLine) return;

  isProcessing = true;
  let hasFailures = false;

  try {
    const sb = getSupabaseClient();
    while (true) {
      if (!navigator.onLine) break;

      const q = getQueue();
      if (q.length === 0) break; // done

      // Take oldest item
      const item = q[0];

      if (item.retryCount > 6) {
        // [D2 FIX]: Fail retry sınırı (drop item if it failed 7 times permanently)
        console.warn('[SyncQueue] Dropping permanently failed item:', item);
        saveQueue(q.slice(1));
        continue;
      }

      let success = false;
      try {
        if (item.type === 'root') {
          await pushRootToSupabase(item.uid, item.payload);
          success = true;
        } else if (item.type === 'entity' && item.storeKey) {
          const tableName = ENTITY_TABLES[item.storeKey];
          if (!tableName) { success = true; continue; } // invalid table, just drop
          
          const id = (item.payload.id as string) || `gen_${Date.now()}`;
          const { error } = await sb.from(tableName as never).upsert({
            id,
            user_id: item.uid,
            updated_at: new Date().toISOString(),
            device_id: getDeviceId(),
            payload: { ...item.payload, id }
          } as never, { onConflict: 'id' });
          if (error) throw error;
          success = true;
        } else if (item.type === 'tombstone' && item.storeKey && item.entityId) {
          const tableName = ENTITY_TABLES[item.storeKey];
          if (!tableName) { success = true; continue; }
          const { error } = await sb.from(tableName as never).update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as never).eq('id', item.entityId).eq('user_id', item.uid);
          if (error) throw error;
          success = true;
        }
      } catch (err) {
        console.warn(`[SyncQueue] Item processing failed (retry ${item.retryCount}):`, err);
        success = false;
        hasFailures = true;
      }

      if (success) {
        const currentQ = getQueue(); // re-read
        saveQueue(currentQ.filter(i => i.id !== item.id)); // shift exact item out
      } else {
        const currentQ = getQueue();
        const me = currentQ.find(i => i.id === item.id);
        if (me) {
          me.retryCount += 1;
          saveQueue(currentQ);
        }
        break; // Stop queue process, will retry later globally (e.g., on online event)
      }
    }
  } finally {
    isProcessing = false;
    // Debounce next retry if failed
    if (hasFailures && navigator.onLine) {
      setTimeout(() => processQueue(), 10000); // retry in 10s
    }
  }
}

// Attach listener to resume when connection returns
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void processQueue();
  });
}
