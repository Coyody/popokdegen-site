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

  if (context.request.method !== 'GET') {
    return json(
      { error: 'Method not allowed' },
      405
    );
  }

  const row = await DB.prepare(`
    SELECT total
    FROM global_stats
    WHERE id = 1
  `).first();

  return json({
    total: Number(row?.total || 0)
  });
}
