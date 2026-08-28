export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response(
      'Method not allowed',
      {
        status: 405
      }
    );
  }

    const userAgent =
    context.request.headers.get(
      'user-agent'
    ) || '';

  const isTwitterBot =
    /Twitterbot/i.test(
      userAgent
    );

  /*
    X's crawler needs to see this page
    so it can build the scorecard preview.

    Real visitors should go straight
    to the WETHDEGEN game.
  */
  if (!isTwitterBot) {
    return Response.redirect(
      'https://wethdegen.xyz',
      302
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
        score,
        created_at
      FROM shared_scorecards
      WHERE id = ?
      LIMIT 1
    `).bind(id).first();

  if (!row) {
    return new Response(
      'Scorecard not found',
      {
        status: 404
      }
    );
  }

  const score =
    Number(row.score || 0);

  const scoreText =
    score.toLocaleString('en-US');

  const pageUrl =
    `https://wethdegen.xyz/share/${id}`;

  const imageUrl =
    `https://wethdegen.xyz/share-image/${id}`;

  const title =
    `I just WETH'd ${scoreText} times on WETHDEGEN`;

  const description =
    'Can you beat me?';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>${title}</title>

  <meta
    name="description"
    content="${description}"
  >

  <link
    rel="canonical"
    href="${pageUrl}"
  >

  <!-- X / Twitter -->
  <meta
    name="twitter:card"
    content="summary_large_image"
  >

  <meta
    name="twitter:title"
    content="${title}"
  >

  <meta
    name="twitter:description"
    content="${description}"
  >

  <meta
    name="twitter:image"
    content="${imageUrl}"
  >

  <!-- Open Graph -->
  <meta
    property="og:type"
    content="website"
  >

  <meta
    property="og:url"
    content="${pageUrl}"
  >

  <meta
    property="og:title"
    content="${title}"
  >

  <meta
    property="og:description"
    content="${description}"
  >

  <meta
    property="og:image"
    content="${imageUrl}"
  >

  <meta
    property="og:image:width"
    content="1200"
  >

  <meta
    property="og:image:height"
    content="630"
  >
</head>

<body
  style="
    margin:0;
    background:#080808;
    color:white;
    font-family:Arial,sans-serif;
    text-align:center;
  "
>
  <main
    style="
      max-width:900px;
      margin:0 auto;
      padding:32px 16px;
    "
  >
    <img
      src="${imageUrl}"
      alt="WETHDEGEN scorecard showing ${scoreText} WETH'D"
      style="
        width:100%;
        height:auto;
        border-radius:12px;
      "
    >

    <p>
      <a
        href="https://wethdegen.xyz"
        style="
          color:#ffe600;
          font-weight:700;
        "
      >
        Play WETHDEGEN
      </a>
    </p>
  </main>
</body>
</html>`;

  return new Response(
    html,
    {
      status: 200,
      headers: {
        'content-type':
          'text/html; charset=utf-8',

        'cache-control':
          'public, max-age=300'
      }
    }
  );
}
