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

  // Browser may send at most 10 verified clicks per batch.
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

  const currentServerScore =
    Number(session.server_score || 0);

  const expectedSeq =
    Number(session.batch_seq || 0) + 1;

  if (seq !== expectedSeq) {
    return json(
      {
        error: 'Invalid batch sequence',
        expectedSeq,
        serverScore: currentServerScore
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

  const proposedScore =
  currentServerScore + clicks;

/*
  PER-BATCH TIMING CHECK

  After the first verified batch, we also
  check how much time has passed since the
  previous accepted server batch.

  This prevents someone from creating a
  session, waiting a long time, then rapidly
  dumping many batches using the accumulated
  session time.
*/
if (session.last_batch_at) {
  const sinceLastBatchMs =
    Math.max(
      0,
      now - Number(session.last_batch_at)
    );

  /*
    The browser allows one accepted click
    about every 80ms.

    We allow a small 2-click cushion for
    network/timer jitter.

    Example:
      10-click batch needs about 640ms
      between accepted server batches.
  */
  const maxBatchClicks =
    Math.floor(sinceLastBatchMs / 80) + 2;

  if (clicks > maxBatchClicks) {
    return json(
      {
        error: 'Click batch arrived too quickly',
        serverScore: currentServerScore,
        expectedSeq
      },
      429
    );
  }
}

/*
  Browser currently accepts roughly
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
    Only update the session if this is exactly
    the sequence number Cloudflare expects.
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

  /*
    A successful SQL request does not necessarily
    mean a row was changed.

    We require EXACTLY one session row to have
    been updated before counting these clicks.
  */
  if (Number(result.meta?.changes || 0) !== 1) {
    const latest = await DB.prepare(`
      SELECT server_score, batch_seq
      FROM sessions
      WHERE id = ?
    `).bind(sessionId).first();

    return json(
      {
        error: 'Click batch was not accepted',
        expectedSeq:
          Number(latest?.batch_seq || 0) + 1,
        serverScore:
          Number(latest?.server_score || 0)
      },
      409
    );
  }

  /*
    The click batch has now been verified.

    ONLY verified server clicks are allowed
    to increase GLOBAL WETH'D.
  */
  const globalResult = await DB.prepare(`
    INSERT INTO global_stats (id, total)
    VALUES (1, ?)

    ON CONFLICT(id) DO UPDATE SET
      total = global_stats.total + excluded.total
  `).bind(clicks).run();

  if (!globalResult.success) {
    return json(
      { error: 'Could not update global total' },
      500
    );
  }

  const updated = await DB.prepare(`
    SELECT server_score, batch_seq
    FROM sessions
    WHERE id = ?
  `).bind(sessionId).first();

  const globalRow = await DB.prepare(`
    SELECT total
    FROM global_stats
    WHERE id = 1
  `).first();

  return json({
    ok: true,
    serverScore:
      Number(updated?.server_score || 0),
    nextSeq:
      Number(updated?.batch_seq || 0) + 1,
    globalTotal:
      Number(globalRow?.total || 0)
  });
}
