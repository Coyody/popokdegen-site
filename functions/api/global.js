const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });

export async function onRequest(context) {
  const DB = context.env.DB;

  if (!DB) {
    return json(
      { error: 'Database binding not configured' },
      503
    );
  }

  /*
    GET is the normal way to read GLOBAL WETH'D.
  */
  if (context.request.method === 'GET') {
    const row = await DB.prepare(`
      SELECT total
      FROM global_stats
      WHERE id = 1
    `).first();

    return json({
      total: Number(row?.total || 0)
    });
  }

  /*
    TEMPORARY compatibility for the old frontend.

    The browser still POSTs to /api/global right now,
    but this POST DOES NOT add clicks anymore.

    It only returns the existing total.

    We will remove this compatibility block in
    the next step after cleaning app.js.
  */
  if (context.request.method === 'POST') {
    const row = await DB.prepare(`
      SELECT total
      FROM global_stats
      WHERE id = 1
    `).first();

    return json({
      ok: true,
      total: Number(row?.total || 0)
    });
  }

  return json(
    { error: 'Method not allowed' },
    405
  );
}
