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
  const templateUrl = `${url.origin}/assets/scorecard-template.png`;

  let fontSize = 245;

  if (formattedScore.length >= 5) fontSize = 215;
  if (formattedScore.length >= 7) fontSize = 180;
  if (formattedScore.length >= 9) fontSize = 150;

  const image = React.createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden"
      }
    },

    React.createElement("img", {
      src: templateUrl,
      style: {
        position: "absolute",
        width: "100%",
        height: "100%",
        objectFit: "cover"
      }
    }),

    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          left: "48%",
          top: "34%",
          width: "50%",
          height: "26%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFD900",
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          lineHeight: 1,
          textShadow:
            "8px 8px 0 #000000, -4px -4px 0 #000000, 4px -4px 0 #000000, -4px 4px 0 #000000"
        }
      },
      formattedScore
    )
  );

  return new ImageResponse(image, {
    width: 1536,
    height: 1024
  });
}
