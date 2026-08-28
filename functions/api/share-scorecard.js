const json = (data, status = 200) =>
  new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'content-type':
          'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    }
  );

function dataUrlToBytes(dataUrl) {
  const match =
    /^data:image\/png;base64,(.+)$/i.exec(
      String(dataUrl || '')
    );

  if (!match) {
    throw new Error(
      'Invalid scorecard image.'
    );
  }

  const binary =
    atob(match[1]);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i += 1
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes;
}

export async function onRequest(context) {
  if (
    context.request.method !== 'POST'
  ) {
    return json(
      { error: 'Method not allowed' },
      405
    );
  }

  const DB = context.env.DB;

  if (!DB) {
    return json(
      {
        error:
          'Database binding not configured'
      },
      503
    );
  }

  let body;

  try {
    body =
      await context.request.json();
  } catch (_) {
    return json(
      { error: 'Invalid JSON' },
      400
    );
  }

  const score =
    Number(body?.score);

  if (
    !Number.isInteger(score) ||
    score < 0
  ) {
    return json(
      { error: 'Invalid score' },
      400
    );
  }

  let bytes;

  try {
    bytes =
      dataUrlToBytes(
        body?.imageDataUrl
      );
  } catch (error) {
    return json(
      {
        error:
          error.message ||
          'Invalid scorecard image'
      },
      400
    );
  }

  /*
    D1 has a 2 MB maximum BLOB/row size,
    so reject oversized scorecards.
  */
  if (
    bytes.byteLength >
    1_900_000
  ) {
    return json(
      {
        error:
          'Scorecard image is too large'
      },
      413
    );
  }

  const id =
    crypto.randomUUID();

  const createdAt =
    Date.now();

  try {
    await DB.prepare(`
      INSERT INTO shared_scorecards (
        id,
        image,
        score,
        created_at
      )
      VALUES (?, ?, ?, ?)
    `).bind(
      id,
      bytes,
      score,
      createdAt
    ).run();

    /*
      Delete scorecards older than 7 days.
    */
    await DB.prepare(`
      DELETE FROM shared_scorecards
      WHERE created_at < ?
    `).bind(
      createdAt -
        7 * 24 * 60 * 60 * 1000
    ).run();

  } catch (error) {
    console.error(
      'Scorecard save failed:',
      error
    );

    return json(
      {
        error:
          'Could not save scorecard'
      },
      500
    );
  }

  return json({
    ok: true,
    id,
    shareUrl:
      `https://wethdegen.xyz/share/${id}`
  });
}
