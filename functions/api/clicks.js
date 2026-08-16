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
  const clicks = Number(body?.clicks);
  const seq = Number(body?.seq);

  if (!validSession(sessionId)) {
    return json({ error: 'Invalid session' }, 400);
  }

  // Browser may send at most 10 accepted clicks per batch.
  if (
    !Number.isInteger(clicks) ||
    clicks < 1 ||
    clicks > 10
  ) {
    return json({ error: 'Invalid click batch' }, 400);
  }

  if (
    !Number.isInteger(seq) ||
    seq < 1
  ) {
    return json({ error: 'Invalid sequence' }, 400);
  }

  const session = await DB.prepare(`
    SELECT
      started_at,
      server_score,
      batch_seq,
      last_batch_at
    FROM sessions
    WHERE id = ?
  `).bind(sessionId).first();

  if (!session) {
    return json(
      { error: 'Session expired. Refresh and try again.' },
      400
    );
  }

  const expectedSeq =
    Number(session.batch_seq || 0) + 1;

  if (seq !== expectedSeq) {
    return json(
      {
        error: 'Invalid batch sequence',
        expectedSeq
      },
      409
    );
  }

  const now = Date.now();

  const elapsedMs =
    Math.max(
      0,
      now - Number(session.started_at)
    );

  const elapsedSeconds =
    elapsedMs / 1000;

  const currentServerScore =
    Number(session.server_score || 0);

  const proposedScore =
    currentServerScore + clicks;

  /*
    Your browser currently accepts roughly
    12.5 clicks/sec max because of the 80ms rule.

    Server allows 13/sec plus a small 5-click
    startup allowance for timing/network jitter.
  */
  const maxAllowedScore =
    Math.floor(elapsedSeconds * 13) + 5;

  if (proposedScore > maxAllowedScore) {
    return json(
      {
        error: 'Clicks arrived too quickly',
        serverScore: currentServerScore
      },
      429
    );
  }

  /*
    Atomic update:
    only succeeds if nobody has already used
    this sequence number.
  */
  const result = await DB.prepare(`
    UPDATE sessions
    SET
      server_score = server_score + ?,
      batch_seq = ?,
      last_batch_at = ?
    WHERE
      id = ?
      AND batch_seq = ?
  `).bind(
    clicks,
    seq,
    now,
    sessionId,
    Number(session.batch_seq || 0)
  ).run();

  if (!result.success) {
    return json(
      { error: 'Could not save click batch' },
      500
    );
  }

  const updated = await DB.prepare(`
    SELECT server_score, batch_seq
    FROM sessions
    WHERE id = ?
  `).bind(sessionId).first();

  return json({
    ok: true,
    serverScore: Number(updated?.server_score || 0),
    nextSeq: Number(updated?.batch_seq || 0) + 1
  });
}
