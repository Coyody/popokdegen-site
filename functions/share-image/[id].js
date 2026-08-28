export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response(
      'Method not allowed',
      {
        status: 405
      }
    );
  }

  const DB = context.env.DB;

  if (!DB) {
    return new Response(
      'Database unavailable',
      {
        status: 503
      }
    );
  }

  const id =
    String(context.params.id || '');

  if (
    !/^[0-9a-f-]{36}$/i.test(id)
  ) {
    return new Response(
      'Invalid scorecard',
      {
        status: 400
      }
    );
  }

  const row =
    await DB.prepare(`
      SELECT
        image,
        created_at
      FROM shared_scorecards
      WHERE id = ?
      LIMIT 1
    `).bind(id).first();

  if (!row || !row.image) {
    return new Response(
      'Scorecard not found',
      {
        status: 404
      }
    );
  }

  /*
    Scorecards are valid for 7 days.
  */
  const maxAge =
    7 * 24 * 60 * 60 * 1000;

  if (
    Date.now() -
      Number(row.created_at || 0) >
    maxAge
  ) {
    return new Response(
      'Scorecard expired',
      {
        status: 410
      }
    );
  }

  /*
    D1 returns BLOB data as an Array.
    Convert it back into image bytes.
  */
  const imageBytes =
    Uint8Array.from(row.image);

  return new Response(
    imageBytes,
    {
      status: 200,
      headers: {
        'content-type':
          'image/png',

        'cache-control':
          'public, max-age=86400',

        'x-content-type-options':
          'nosniff'
      }
    }
  );
}
