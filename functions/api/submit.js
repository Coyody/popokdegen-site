const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

const validName = (name) => /^[A-Za-z0-9 _.-]{1,16}$/.test(name);
const validSession = (value) => /^[0-9a-f-]{36}$/i.test(value);

async function getTop10(DB) {
  const result = await DB.prepare(
    'SELECT display_name AS name, score FROM scores ORDER BY score DESC, updated_at ASC LIMIT 10'
  ).all();
  return result.results || [];
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const DB = context.env.DB;
  if (!DB) return json({ error: 'Database binding not configured' }, 503);

  const length = Number(context.request.headers.get('content-length') || 0);
  if (length > 4096) return json({ error: 'Request too large' }, 413);

  let body;
  try {
    body = await context.request.json();
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const name = String(body?.name || '').trim().replace(/\s+/g, ' ');
  const nameKey = name.toLowerCase();
  const score = Number(body?.score);
  const sessionId = String(body?.sessionId || '');

  if (!validName(name)) return json({ error: 'Invalid name' }, 400);
  if (!Number.isInteger(score) || score < 1 || score > 5_000_000) return json({ error: 'Invalid score' }, 400);
  if (!validSession(sessionId)) return json({ error: 'Invalid session' }, 400);

  const session = await DB.prepare(
    'SELECT started_at, last_submit_at, submitted_score FROM sessions WHERE id = ?'
  ).bind(sessionId).first();

  if (!session) return json({ error: 'Session expired. Refresh and try again.' }, 400);

  const now = Date.now();
  const elapsedMs = Math.max(0, now - Number(session.started_at));
  const elapsedSeconds = elapsedMs / 1000;

  // Basic anti-cheat: allow a generous 20 clicks/sec plus a 40-click startup burst.
  // This blocks instant impossible scores but intentionally stays forgiving for fast users.
  const maxAllowed = Math.floor(elapsedSeconds * 20) + 40;
  if (score > maxAllowed) {
    return json({ error: 'Score increased too quickly. Keep clicking and try again.' }, 400);
  }

  if (score < Number(session.submitted_score || 0)) {
    return json({ error: 'Score cannot go backwards in the same session.' }, 400);
  }

  if (session.last_submit_at && now - Number(session.last_submit_at) < 2000) {
    return json({ error: 'Please wait a moment before submitting again.' }, 429);
  }

  const existing = await DB.prepare('SELECT score FROM scores WHERE name_key = ?').bind(nameKey).first();
  const improved = !existing || score > Number(existing.score);

  if (improved) {
  await DB.prepare(`
    INSERT INTO scores (
      name_key,
      display_name,
      score,
      updated_at,
      owner_session_id
    )
    VALUES (?, ?, ?, ?, ?)

    ON CONFLICT(name_key) DO UPDATE SET
      display_name = excluded.display_name,
      score = excluded.score,
      updated_at = excluded.updated_at,
      owner_session_id = excluded.owner_session_id

    WHERE excluded.score > scores.score
  `).bind(
    nameKey,
    name,
    score,
    now,
    sessionId
  ).run();
}

  await DB.prepare(
    'UPDATE sessions SET last_submit_at = ?, submitted_score = ? WHERE id = ?'
  ).bind(now, score, sessionId).run();

  return json({ ok: true, improved, entries: await getTop10(DB) });
}
