export const runtime = 'edge';

declare const process: {
  env: Record<string, string | undefined>;
};

async function lookupUser(idToken: string): Promise<{ localId?: string } | null> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new Error('FIREBASE_WEB_API_KEY is missing');

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) return null;
  const data = await response.json() as { users?: Array<{ localId?: string }> };
  return data.users?.[0] ?? null;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  
  try {
    const body = await req.json();
    const { uid, action } = body;
    if (!uid || !action) return json({ error: 'MISSING_PARAMS' }, 400);

    const bearer = req.headers.get('authorization') || '';
    const idToken = bearer.startsWith('Bearer ') ? bearer.slice('Bearer '.length).trim() : '';
    if (!idToken) return json({ error: 'AUTH_REQUIRED' }, 401);

    const user = await lookupUser(idToken);
    if (!user?.localId || user.localId !== uid) {
      return json({ error: 'FORBIDDEN_UID' }, 403);
    }

    if (!['log_added', 'exam_added', 'task_completed'].includes(String(action))) {
      return json({ error: 'INVALID_ACTION' }, 400);
    }

    return json({ error: 'SCORE_SERVICE_NOT_CONFIGURED' }, 501);
  } catch (e) {
    console.error(e);
    return json({ error: 'INTERNAL_ERROR' }, 500);
  }
}
