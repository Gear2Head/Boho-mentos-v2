/**
 * AMAÇ: PWA Sync Endpoint — Kimlik doğrulamalı Firestore merge yazma uç noktası.
 * MANTIK: Bearer token doğrulama → kullanıcı sahipliği kontrolü → Firestore set(merge:true).
 * UYARI: Her path zorunlu auth kontrolü yapar. İmzasız istek 401 döner.
 *
 * [SYNC-008 FIX]: no-op console.log yerine gerçek Firestore Admin SDK yazmasına dönüştürüldü.
 */
import { type VercelRequest, type VercelResponse } from '@vercel/node';
import { verifyBearerToken, getAdminFirestore } from './_lib/firebaseAdmin';

interface SyncPayload {
  uid?: string;
  collection?: string; // 'users' | subcollection adı
  docId?: string;
  data?: Record<string, unknown>;
  rootData?: Record<string, unknown>; // root doc merge
}

const ALLOWED_SUBCOLLECTIONS = new Set([
  'logs', 'exams', 'failedQuestions', 'agendaEntries', 'focusSessions', 'chatMessages'
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', version: 2, note: 'POST ile sync yapın' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST desteklenir' });
  }

  let uid: string;
  try {
    const verified = await verifyBearerToken(req.headers.authorization);
    uid = verified.uid;
  } catch {
    return res.status(401).json({ error: 'Kimlik doğrulama başarısız' });
  }

  const payload = (req.body ?? {}) as SyncPayload;

  // Kullanıcı kendi verisine mi yazıyor?
  if (payload.uid && payload.uid !== uid) {
    return res.status(403).json({ error: 'Yetkisiz kullanıcı verisi' });
  }

  try {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // Seçenek 1: Subcollection entity yazma
    if (payload.collection && payload.docId && payload.data) {
      if (!ALLOWED_SUBCOLLECTIONS.has(payload.collection)) {
        return res.status(400).json({ error: 'Geçersiz koleksiyon adı' });
      }
      const ref = db
        .collection('users')
        .doc(uid)
        .collection(payload.collection)
        .doc(payload.docId);
      await ref.set({ ...payload.data, updatedAt: now, syncedViaApi: true }, { merge: true });
    }

    // Seçenek 2: Root doc merge
    if (payload.rootData) {
      const rootRef = db.collection('users').doc(uid);
      const safeRoot: Record<string, unknown> = {};
      const ALLOWED_ROOT_KEYS = new Set([
        'profile', 'tytSubjects', 'aytSubjects', 'trophies', 'eloScore',
        'streakDays', 'theme', 'subjectViewMode', 'isPassiveMode', 'activeAlerts'
      ]);
      for (const [k, v] of Object.entries(payload.rootData)) {
        if (ALLOWED_ROOT_KEYS.has(k)) safeRoot[k] = v;
      }
      if (Object.keys(safeRoot).length > 0) {
        await rootRef.set({ ...safeRoot, updatedAt: now, lastSyncAt: now }, { merge: true });
      }
    }

    return res.status(200).json({ success: true, uid, timestamp: Date.now() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[SYNC ERROR]', msg);
    return res.status(500).json({ error: 'Senkronizasyon başarısız', detail: msg });
  }
}

