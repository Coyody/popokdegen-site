const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const DB = context.env.DB;
  if (!DB) return json({ error: 'Database binding not configured' }, 503);

  const sessionId = crypto.randomUUID();
  const now = Date.now();

  await DB.prepare(
    'INSERT INTO sessions (id, started_at, last_submit_at, submitted_score) VALUES (?, ?, NULL, 0)'
  ).bind(sessionId, now).run();

  // Light probabilistic cleanup so abandoned sessions do not grow forever.
  if (Math.random() < 0.02) {
    const cutoff = now - (7 * 24 * 60 * 60 * 1000);
    context.waitUntil(DB.prepare('DELETE FROM sessions WHERE started_at < ?').bind(cutoff).run());
  }

  return json({ sessionId, startedAt: now });
}
