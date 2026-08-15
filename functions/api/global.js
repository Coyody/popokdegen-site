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
    return json({ error: 'Database binding not configured' }, 503);
  }

  // Read the current global total
  if (context.request.method === 'GET') {
    const row = await DB.prepare(
      'SELECT total FROM global_stats WHERE id = 1'
    ).first();

    return json({
      total: Number(row?.total || 0)
    });
  }

  // Add clicks to the global total
  if (context.request.method === 'POST') {
    let body;

    try {
      body = await context.request.json();
    } catch (_) {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const clicks = Number(body?.clicks);

    if (!Number.isInteger(clicks) || clicks < 1 || clicks > 100) {
      return json({ error: 'Invalid click count' }, 400);
    }

    await DB.prepare(`
      UPDATE global_stats
      SET total = total + ?
      WHERE id = 1
    `).bind(clicks).run();

    const row = await DB.prepare(
      'SELECT total FROM global_stats WHERE id = 1'
    ).first();

    return json({
      ok: true,
      total: Number(row?.total || 0)
    });
  }

  return json({ error: 'Method not allowed' }, 405);
}
