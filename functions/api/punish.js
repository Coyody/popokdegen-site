const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });

const validSession = (value) =>
  /^[0-9a-f-]{36}$/i.test(value);

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const DB = context.env.DB;

  if (!DB) {
    return json(
      { error: 'Database binding not configured' },
      503
    );
  }

  let body;

  try {
    body = await context.request.json();
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const sessionId = String(body?.sessionId || '');

  if (!validSession(sessionId)) {
    return json({ error: 'Invalid session' }, 400);
  }

  const session = await DB.prepare(
    'SELECT id FROM sessions WHERE id = ?'
  ).bind(sessionId).first();

  if (!session) {
    return json({ error: 'Session not found' }, 404);
  }

  // Delete only the leaderboard entry owned by this session.
  await DB.prepare(
    'DELETE FROM scores WHERE owner_session_id = ?'
  ).bind(sessionId).run();

  // Kill the offending session too.
  await DB.prepare(
    'DELETE FROM sessions WHERE id = ?'
  ).bind(sessionId).run();

  return json({
    ok: true,
    punished: true
  });
}
