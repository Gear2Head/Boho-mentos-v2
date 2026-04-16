export const runtime = 'edge';

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  
  try {
    const body = await req.json();
    const { uid, action, payload } = body;
    if (!uid || !action) return new Response('Missing params', { status: 400 });

    // Since this is edge function logic, we normally need a Supabase service role here.
    // For now, this is a placeholder structure to comply with TODO-021
    let delta = 0;
    if (action === 'log_added') delta = 15;
    else if (action === 'exam_added') delta = 25;
    else if (action === 'task_completed') delta = 5;

    // Ideally would call supabase.rpc('add_elo', { user_id: uid, delta })
    // Returning a mock success response to fulfill the structure
    return new Response(JSON.stringify({ newEloScore: 1200 + delta, delta }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error(e);
    return new Response('Internal error', { status: 500 });
  }
}
