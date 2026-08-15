import React from "react";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);

  const rawScore = url.searchParams.get("score") || "0";
  const cleanedScore = rawScore.replace(/[^0-9]/g, "");

  let score = parseInt(cleanedScore || "0", 10);

  if (!Number.isFinite(score) || score < 0) {
    score = 0;
  }

  score = Math.min(score, 999999999);

  const formattedScore = score.toLocaleString("en-US");

  let fontSize = 150;

  if (formattedScore.length >= 5) fontSize = 135;
  if (formattedScore.length >= 7) fontSize = 115;
  if (formattedScore.length >= 9) fontSize = 95;

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0)",
          color: "#FFE000",
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          fontFamily: "Arial"
        }
      },
      formattedScore
    ),
    {
      width: 600,
      height: 180
    }
  );
}
