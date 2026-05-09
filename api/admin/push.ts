declare const process: {
  env: Record<string, string | undefined>;
};

type VercelReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelRes = {
  statusCode: number;
  setHeader: (key: string, value: string) => void;
  end: (body: string) => void;
};

type FirebaseLookupUser = {
  localId?: string;
  email?: string;
  customAttributes?: string;
};

function json(res: VercelRes, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function getHeader(headers: VercelReq['headers'], name: string): string {
  const direct = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(direct) ? direct[0] ?? '' : direct ?? '';
}

function parseClaims(raw?: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function lookupUser(idToken: string): Promise<FirebaseLookupUser | null> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new Error('FIREBASE_WEB_API_KEY is missing');

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) return null;
  const data = await response.json() as { users?: FirebaseLookupUser[] };
  return data.users?.[0] ?? null;
}

function isSuperAdmin(user: FirebaseLookupUser): boolean {
  const ownerEmail = (process.env.OWNER_EMAIL ?? 'senerkadiralper@gmail.com').trim().toLowerCase();
  const email = user.email?.trim().toLowerCase();
  const claims = parseClaims(user.customAttributes);
  return Boolean(email && email === ownerEmail) || claims.superAdmin === true || claims.role === 'super_admin';
}

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    const bearer = getHeader(req.headers, 'authorization');
    const idToken = bearer.startsWith('Bearer ') ? bearer.slice('Bearer '.length).trim() : '';
    if (!idToken) {
      json(res, 401, { error: 'AUTH_REQUIRED' });
      return;
    }

    const user = await lookupUser(idToken);
    if (!user || !isSuperAdmin(user)) {
      json(res, 403, { error: 'SUPER_ADMIN_REQUIRED' });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body as Record<string, unknown> | undefined;
    const notification = body?.notification as { title?: unknown; body?: unknown } | undefined;
    const target = body?.target;
    const title = String(notification?.title ?? '').trim();
    const message = String(notification?.body ?? '').trim();

    if (!['all', 'active'].includes(String(target))) {
      json(res, 400, { error: 'INVALID_TARGET' });
      return;
    }

    if (!title || !message || title.length > 120 || message.length > 500) {
      json(res, 400, { error: 'INVALID_NOTIFICATION_PAYLOAD' });
      return;
    }

    json(res, 501, {
      error: 'PUSH_SERVICE_NOT_CONFIGURED',
      message: 'FCM broadcast must be implemented server-side with service account credentials before this endpoint can send notifications.',
    });
  } catch (error) {
    console.error('[admin/push]', error);
    json(res, 500, { error: 'PUSH_ENDPOINT_FAILED' });
  }
}
