import { type VercelRequest, type VercelResponse } from '@vercel/node';

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
    const payload = req.body;
    
    // ŞİMDİLİK: Gelen veriler sunucuya (Vercel Log) düşüyor. 
    // Gerçekte: Buraya Vercel KV (Redis) veya Postgres yazma komutu gelecek (İleriki faz).
    console.log('[SYNC] Payload alındı:', payload);

    // Başarı yanıtı dönerek istemcideki (IndexedDB) logların kuyruktan (queue) silinmesini sağla
    return res.status(200).json({ success: true, timestamp: Date.now() });

  } catch (err: any) {
    console.error('[SYNC ERROR]', err);
    return res.status(500).json({ error: 'Senkronizasyon başarısız' });
  }
}
