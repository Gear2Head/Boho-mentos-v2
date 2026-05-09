import { deleteDoc, doc, setDoc, updateDoc, type DocumentReference, type SetOptions } from 'firebase/firestore';
import { db } from './firebase';
import { enqueueOperation } from './offlineQueue';
import { cleanForFirestore } from '../utils/firebaseHelpers';

function splitDocumentPath(ref: DocumentReference): { collectionPath: string; docId: string } {
  const parts = ref.path.split('/');
  const docId = parts.pop();
  if (!docId || parts.length === 0) {
    throw new Error(`Invalid Firestore document path: ${ref.path}`);
  }
  return { collectionPath: parts.join('/'), docId };
}

async function enqueueFromRef(
  ref: DocumentReference,
  operation: 'set' | 'update' | 'delete',
  data: Record<string, unknown> = {},
  merge = false
): Promise<void> {
  const { collectionPath, docId } = splitDocumentPath(ref);
  await enqueueOperation({
    collection: collectionPath,
    docId,
    operation,
    merge,
    data: cleanForFirestore(data),
  });
}

function canQueue(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  try {
    JSON.stringify(data);
    return true;
  } catch {
    return false;
  }
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

function shouldQueueWriteError(error: unknown): boolean {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return [
    'unavailable',
    'deadline-exceeded',
    'resource-exhausted',
    'internal',
  ].some((retryableCode) => code.includes(retryableCode))
    || message.includes('offline')
    || message.includes('network')
    || message.includes('failed to fetch');
}

export async function setDocWithOfflineQueue(
  ref: DocumentReference,
  data: Record<string, unknown>,
  options?: SetOptions
): Promise<void> {
  const payload = cleanForFirestore(data);
  const shouldMerge = Boolean((options as { merge?: boolean } | undefined)?.merge);
  if (isOffline() && canQueue(payload)) {
    await enqueueFromRef(ref, 'set', payload, shouldMerge);
    return;
  }
  try {
    await setDoc(ref, payload, options as SetOptions);
  } catch (error) {
    if (canQueue(payload) && shouldQueueWriteError(error)) {
      await enqueueFromRef(ref, 'set', payload, shouldMerge);
      return;
    }
    throw error;
  }
}

export async function updateDocWithOfflineQueue(
  ref: DocumentReference,
  data: Record<string, unknown>
): Promise<void> {
  const payload = cleanForFirestore(data);
  if (isOffline() && canQueue(payload)) {
    await enqueueFromRef(ref, 'update', payload);
    return;
  }
  try {
    await updateDoc(ref, payload);
  } catch (error) {
    if (canQueue(payload) && shouldQueueWriteError(error)) {
      await enqueueFromRef(ref, 'update', payload);
      return;
    }
    throw error;
  }
}

export async function deleteDocWithOfflineQueue(ref: DocumentReference): Promise<void> {
  if (isOffline()) {
    await enqueueFromRef(ref, 'delete');
    return;
  }
  try {
    await deleteDoc(ref);
  } catch (error) {
    if (shouldQueueWriteError(error)) {
      await enqueueFromRef(ref, 'delete');
      return;
    }
    throw error;
  }
}

export function userEntityDoc(uid: string, collectionPath: string, id: string): DocumentReference {
  return doc(db, 'users', uid, collectionPath, id);
}
