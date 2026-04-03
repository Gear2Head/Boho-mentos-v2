import { type VercelRequest, type VercelResponse } from '@vercel/node';
import { verifyBearerToken } from './_lib/firebaseAdmin';

/**
 * AMAÇ: PWA Sync Mekanizması
 * MANTIK: Offline biriken verileri DB/KV (şimdilik localStorage) ile senkronize eden bitiş noktası
 * GÜVENLİK: API Key doğrulaması yapılmalı (guest hesabı için şimdilik dummy)
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST desteklenir' });
  }

  try {
    const { uid } = await verifyBearerToken(req.headers.authorization);
    const payload = req.body ?? {};

    const payloadUid =
      typeof payload === 'object' && payload !== null && 'uid' in payload
        ? String((payload as { uid?: unknown }).uid ?? '')
        : '';

    if (payloadUid && payloadUid !== uid) {
      return res.status(403).json({ error: 'Yetkisiz kullanıcı verisi' });
    }
    
    // ŞİMDİLİK: Gelen veriler sunucuya (Vercel Log) düşüyor. 
    // Gerçekte: Buraya Vercel KV (Redis) veya Postgres yazma komutu gelecek (İleriki faz).
    console.log('[SYNC] Payload alındı:', { uid, payload });

    // Başarı yanıtı dönerek istemcideki (IndexedDB) logların kuyruktan (queue) silinmesini sağla
    return res.status(200).json({ success: true, uid, timestamp: Date.now() });

  } catch (err: any) {
    const message = String(err?.message ?? '');
    if (message.includes('token')) {
      return res.status(401).json({ error: 'Kimlik doğrulama başarısız' });
    }
    console.error('[SYNC ERROR]', err);
    return res.status(500).json({ error: 'Senkronizasyon başarısız' });
  }
}
