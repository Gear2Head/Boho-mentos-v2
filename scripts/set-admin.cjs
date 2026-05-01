/**
 * 🛠️ ADMIN YETKİSİ VERME SCRİPTİ (CJS - GÜVENLİ & KARARLI)
 * 
 * Bu script CommonJS kullanarak OpenSSL sorunlarını aşmayı hedefler.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const TARGET_UID = '9z9OAxBXsFU3oPT8AqIxnDSfzNy2'; 

function base64Url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function run() {
  console.log('🚀 Admin yetkilendirme işlemi başlatılıyor...');
  
  try {
    const saPath = path.join(process.cwd(), 'firebase-service-account.json');
    if (!fs.existsSync(saPath)) {
      throw new Error('firebase-service-account.json bulunamadı!');
    }
    
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    const pemKey = sa.private_key.replace(/\\n/g, '\n');

    const now = Math.floor(Date.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64Url(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }));
    
    const unsignedToken = `${header}.${payload}`;
    const signature = crypto.createSign('RSA-SHA256').update(unsignedToken).end().sign(pemKey);
    const assertion = `${unsignedToken}.${base64Url(signature)}`;

    console.log('[1/3] Google OAuth Token alınıyor...');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('OAuth hatası: ' + JSON.stringify(tokenData));
    const token = tokenData.access_token;

    console.log(`[2/3] Custom claims ayarlanıyor (UID: ${TARGET_UID})...`);
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:update`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        localId: TARGET_UID,
        customAttributes: JSON.stringify({ superAdmin: true, role: 'super_admin' }),
      }),
    });

    if (!authRes.ok) throw new Error('Auth hatası: ' + await authRes.text());

    console.log(`[3/3] Firestore dokümanı güncelleniyor...`);
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/users/${TARGET_UID}?updateMask.fieldPaths=role`;
    const dbRes = await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: { role: { stringValue: 'super_admin' } },
      }),
    });

    if (!dbRes.ok) throw new Error('Firestore hatası: ' + await dbRes.text());

    console.log('✅ İŞLEM BAŞARILI! Kübra sizi selamlıyor, Super Admin oldunuz.');
    console.log('Uygulamayı yenileyip admin paneline girebilirsiniz.');

  } catch (err) {
    console.error('❌ HATA:', err.message);
  }
}

run();
