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

  // Load the smaller JPG directly from Pages assets
  const imageRequest = new Request(
    new URL("/assets/scorecard-template.jpg", url.origin)
  );

  const imageResponse = await context.env.ASSETS.fetch(imageRequest);

  if (!imageResponse.ok) {
    return new Response("Scorecard template not found", { status: 500 });
  }

  const imageData = await imageResponse.arrayBuffer();

  let fontSize = 180;

  if (formattedScore.length >= 5) fontSize = 165;
  if (formattedScore.length >= 7) fontSize = 140;
  if (formattedScore.length >= 9) fontSize = 115;

  const numberStyle = {
    position: "absolute",
    left: "565px",
    top: "245px",
    width: "590px",
    height: "175px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    fontSize: `${fontSize}px`,
    fontWeight: 900,
    lineHeight: 1
  };

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden"
        }
      },

      React.createElement("img", {
        src: imageData,
        width: 1200,
        height: 630,
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          width: "1200px",
          height: "630px"
        }
      }),

      // Black layer behind the number
      React.createElement(
        "div",
        {
          style: {
            ...numberStyle,
            left: "571px",
            top: "251px",
            color: "#000000"
          }
        },
        formattedScore
      ),

      // Yellow number
      React.createElement(
        "div",
        {
          style: {
            ...numberStyle,
            color: "#FFE000"
          }
        },
        formattedScore
      )
    ),
    {
      width: 1200,
      height: 630
    }
  );
}
