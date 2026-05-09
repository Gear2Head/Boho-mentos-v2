/**
 * AMAÇ: Offline Queue — IndexedDB tabanlı.
 * MANTIK: Bağlantı yokken gelen yazma işlemlerini kuyruğa alır,
 *         online olunca idempotent replay yapar.
 */

const DB_NAME = 'boho_offline';
const STORE_NAME = 'queue';
const DB_VERSION = 1;
const DEFAULT_MAX_RETRIES = 5;

export interface QueuedOperation {
  id: string;
  collection: string;
  docId: string;
  data: Record<string, unknown>;
  operation: 'set' | 'update' | 'delete';
  merge?: boolean;
  createdAt: string;
  updatedAt: string;
  retries: number;
  payloadHash: string;
  status: 'pending' | 'failed';
  lastAttemptAt?: string;
  lastError?: string;
  failedAt?: string;
}

type QueueInput = Omit<
  QueuedOperation,
  'id' | 'createdAt' | 'updatedAt' | 'retries' | 'payloadHash' | 'status' | 'lastAttemptAt' | 'lastError' | 'failedAt'
>;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOperation(op: QueueInput): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const now = new Date().toISOString();
  const payloadHash = createPayloadHash(op);
  const id = `oq_${payloadHash}`;

  const entry: QueuedOperation = {
    ...op,
    id,
    createdAt: now,
    updatedAt: now,
    retries: 0,
    payloadHash,
    status: 'pending',
  };

  const getReq = store.get(id);
  return new Promise((resolve, reject) => {
    getReq.onsuccess = () => {
      const existing = getReq.result as QueuedOperation | undefined;
      if (existing) {
        store.put({
          ...existing,
          ...entry,
          createdAt: existing.createdAt,
          retries: existing.status === 'failed' ? 0 : existing.retries,
          lastAttemptAt: existing.status === 'failed' ? undefined : existing.lastAttemptAt,
          lastError: undefined,
          failedAt: undefined,
          status: 'pending',
        });
        return;
      }
      store.add(entry);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllQueued(): Promise<QueuedOperation[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const queued = (request.result as QueuedOperation[])
        .filter((item) => item.status !== 'failed')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      resolve(queued);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getQueueStats(): Promise<{ pending: number; failed: number }> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const queued = request.result as QueuedOperation[];
      resolve({
        pending: queued.filter((item) => item.status !== 'failed').length,
        failed: queued.filter((item) => item.status === 'failed').length,
      });
    };
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function incrementRetry(id: string, error?: unknown, maxRetries = DEFAULT_MAX_RETRIES): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const getReq = store.get(id);

  return new Promise((resolve, reject) => {
    getReq.onsuccess = () => {
      const item = getReq.result as QueuedOperation | undefined;
      if (item) {
        const retries = item.retries + 1;
        item.retries = retries;
        item.updatedAt = new Date().toISOString();
        item.lastAttemptAt = item.updatedAt;
        item.lastError = normalizeError(error);
        if (retries >= maxRetries) {
          item.status = 'failed';
          item.failedAt = item.updatedAt;
        }
        store.put(item);
      }
      tx.oncomplete = () => resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearQueue(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function createPayloadHash(op: QueueInput): string {
  return hashString(stableSerialize({
    collection: op.collection,
    docId: op.docId,
    operation: op.operation,
    merge: op.merge === true,
    data: op.data,
  }));
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;

  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`)
    .join(',')}}`;
}

function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function normalizeError(error: unknown): string {
  if (!error) return 'Unknown replay error';
  if (error instanceof Error) return error.message.slice(0, 500);
  return String(error).slice(0, 500);
}
