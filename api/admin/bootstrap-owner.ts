import { createHash, createSign } from 'node:crypto';

declare const process: { env: Record<string, string | undefined> };

type VercelReq = { method?: string; body?: unknown };
type VercelRes = {
  statusCode: number;
  setHeader: (key: string, value: string) => void;
  end: (body: string) => void;
};

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

function json(res: VercelRes, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function getServiceAccount(): ServiceAccount | null {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const raw = encoded
    ? Buffer.from(encoded, 'base64').toString('utf8')
    : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const parsed = JSON.parse(raw) as ServiceAccount;
  parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  return parsed;
}

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64Url(signer.sign(serviceAccount.private_key))}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`OAuth failed: ${response.status}`);
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('OAuth response missing access_token');
  return data.access_token;
}

async function lookupUser(idToken: string): Promise<{ localId: string; email: string } | null> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new Error('FIREBASE_WEB_API_KEY is missing');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { users?: Array<{ localId?: string; email?: string }> };
  const user = data.users?.[0];
  return user?.localId && user.email ? { localId: user.localId, email: user.email } : null;
}

async function setCustomClaims(projectId: string, accessToken: string, localId: string) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      localId,
      customAttributes: JSON.stringify({ superAdmin: true, role: 'super_admin' }),
    }),
  });
  if (!response.ok) throw new Error(`Custom claims update failed: ${response.status}`);
}

async function patchOwnerUserDoc(projectId: string, accessToken: string, localId: string) {
  const params = new URLSearchParams();
  params.append('updateMask.fieldPaths', 'role');
  params.append('updateMask.fieldPaths', 'streakDays');
  params.append('updateMask.fieldPaths', 'updated_at');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(localId)}?${params}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        role: { stringValue: 'super_admin' },
        streakDays: { integerValue: '68' },
        updated_at: { stringValue: new Date().toISOString() },
      },
    }),
  });
  if (!response.ok) throw new Error(`Owner Firestore patch failed: ${response.status}`);
}

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown> | undefined);
    const idToken = String(body?.idToken ?? '');
    if (!idToken) {
      json(res, 400, { error: 'ID_TOKEN_REQUIRED' });
      return;
    }

    const ownerHash = process.env.OWNER_EMAIL_SHA256?.trim().toLowerCase();
    if (!ownerHash) {
      json(res, 503, { error: 'OWNER_BOOTSTRAP_NOT_CONFIGURED' });
      return;
    }

    const user = await lookupUser(idToken);
    if (!user) {
      json(res, 401, { error: 'INVALID_TOKEN' });
      return;
    }
    if (sha256(user.email) !== ownerHash) {
      json(res, 200, { eligible: false });
      return;
    }

    const serviceAccount = getServiceAccount();
    if (!serviceAccount) {
      json(res, 503, { error: 'SERVICE_ACCOUNT_NOT_CONFIGURED' });
      return;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id;
    if (!projectId) {
      json(res, 503, { error: 'FIREBASE_PROJECT_ID_MISSING' });
      return;
    }

    const accessToken = await getAccessToken(serviceAccount);
    await setCustomClaims(projectId, accessToken, user.localId);
    await patchOwnerUserDoc(projectId, accessToken, user.localId);
    json(res, 200, { eligible: true, superAdmin: true, streakDays: 68 });
  } catch (error) {
    console.error('[bootstrap-owner]', error);
    json(res, 500, { error: 'OWNER_BOOTSTRAP_FAILED' });
  }
}
