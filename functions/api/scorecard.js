export async function onRequestGet(context) {
  const url = new URL(context.request.url);

  const rawScore = url.searchParams.get("score") || "0";
  const cleanedScore = rawScore.replace(/[^0-9]/g, "");

  let score = parseInt(cleanedScore || "0", 10);

  if (!Number.isFinite(score) || score < 0) {
    score = 0;
  }

  score = Math.min(score, 999999999);

  // REPLACE THIS with your GitHub RAW image URL
  const backgroundUrl =
    "https://raw.githubusercontent.com/Coyody/popokdegen-site/refs/heads/main/public/assets/scorecard-template.jpg";

  const scoreImageUrl =
    `${url.origin}/api/score-text?score=${score}`;

  return fetch(backgroundUrl, {
    cf: {
      image: {
        width: 1200,
        height: 630,

        draw: [
          {
            url: scoreImageUrl,
            left: 570,
            top: 225
          }
        ]
      }
    }
  });
}
