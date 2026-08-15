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

  const result = await DB.prepare(
    'SELECT display_name AS name, score FROM scores ORDER BY score DESC, updated_at ASC LIMIT 10'
  ).all();

  return json({ entries: result.results || [] });
}
