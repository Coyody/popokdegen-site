const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });

const validName = (name) =>
  /^[A-Za-z0-9 _.-]{1,16}$/.test(name);

const validSession = (value) =>
  /^[0-9a-f-]{36}$/i.test(value);

const BLOCKED_WORDS = [
  'nigger',
  'nigga',
  'chink',
  'gook',
  'wetback',
  'beaner',
  'kike',
  'raghead',
  'sandnigger',
  'zipperhead',
  'darkie',

  'cunt',
  'whore',
  'slut',
  'bitch',
  'skank',
  'thot',

  'faggot',
  'tranny',

  'retard',
  'retarded'
];

function buildLooseWordRegex(word) {
  const escapedLetters = word
    .split('')
    .map((char) =>
      char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );

  return new RegExp(
    escapedLetters.join('[\\s._-]*'),
    'gi'
  );
}

function censorName(name) {
  let censored = name;

  for (const word of BLOCKED_WORDS) {
    const regex = buildLooseWordRegex(word);

    censored = censored.replace(
      regex,
      (match) => '*'.repeat(match.length)
    );
  }

  return censored;
}

async function getTop10(DB) {
  const result = await DB.prepare(
    `SELECT display_name AS name, score
     FROM scores
     ORDER BY score DESC, updated_at ASC
     LIMIT 10`
  ).all();

  return result.results || [];
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return json(
      { error: 'Method not allowed' },
      405
    );
  }

  const DB = context.env.DB;

  if (!DB) {
    return json(
      { error: 'Database binding not configured' },
      503
    );
  }

  const length = Number(
    context.request.headers.get('content-length') || 0
  );

  if (length > 4096) {
    return json(
      { error: 'Request too large' },
      413
    );
  }

  let body;

  try {
    body = await context.request.json();
  } catch (_) {
    return json(
      { error: 'Invalid JSON' },
      400
    );
  }

  const name = String(body?.name || '')
    .trim()
    .replace(/\s+/g, ' ');

  const nameKey = name.toLowerCase();
  
  const displayName = censorName(name);

  const highestCombo = Number(
    body?.highestCombo || 0
  );

  const sessionId = String(
    body?.sessionId || ''
  );

  if (!validName(name)) {
    return json(
      { error: 'Invalid name' },
      400
    );
  }

  if (!validSession(sessionId)) {
    return json(
      { error: 'Invalid session' },
      400
    );
  }

  if (
    !Number.isInteger(highestCombo) ||
    highestCombo < 0
  ) {
    return json(
      { error: 'Invalid highest combo' },
      400
    );
  }

  /*
    IMPORTANT:
    We intentionally DO NOT read body.score.

    The browser's score is no longer trusted.
  */

  const session = await DB.prepare(`
    SELECT
      started_at,
      last_submit_at,
      submitted_score,
      server_score
    FROM sessions
    WHERE id = ?
  `).bind(sessionId).first();

  if (!session) {
    return json(
      {
        error:
          'Session expired. Refresh and try again.'
      },
      400
    );
  }

  /*
    This is the ONLY score the leaderboard trusts.
  */
  const trustedScore =
    Number(session.server_score || 0);

  if (
    !Number.isInteger(trustedScore) ||
    trustedScore < 1
  ) {
    return json(
      {
        error:
          'No verified clicks have reached the server yet.'
      },
      400
    );
  }

  const now = Date.now();

  /*
    Extra server sanity check.

    /api/clicks already enforces this,
    but we verify it again before accepting
    a leaderboard score.
  */
  const elapsedMs =
    Math.max(
      0,
      now - Number(session.started_at)
    );

  const elapsedSeconds =
    elapsedMs / 1000;

  const maxAllowed =
    Math.floor(elapsedSeconds * 13) + 5;

  if (trustedScore > maxAllowed) {
    return json(
      {
        error:
          'Server score failed timing validation.'
      },
      400
    );
  }

  if (
    trustedScore <
    Number(session.submitted_score || 0)
  ) {
    return json(
      {
        error:
          'Verified score cannot go backwards.'
      },
      400
    );
  }

  if (
    session.last_submit_at &&
    now - Number(session.last_submit_at) < 2000
  ) {
    return json(
      {
        error:
          'Please wait a moment before submitting again.'
      },
      429
    );
  }

  const existing = await DB.prepare(
    'SELECT score FROM scores WHERE name_key = ?'
  ).bind(nameKey).first();

  const improved =
    !existing ||
    trustedScore > Number(existing.score);

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
      displayName,
      trustedScore,
      now,
      sessionId
    ).run();
  }

  await DB.prepare(`
    UPDATE sessions
    SET
      last_submit_at = ?,
      submitted_score = ?
    WHERE id = ?
  `).bind(
    now,
    trustedScore,
    sessionId
  ).run();

  return json({
    ok: true,
    improved,
    score: trustedScore,
    entries: await getTop10(DB)
  });
}
