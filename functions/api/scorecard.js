import React from "react";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);

    const rawScore = url.searchParams.get("score") || "0";
    const cleanedScore = rawScore.replace(/[^0-9]/g, "");

    let score = parseInt(cleanedScore || "0", 10);

    if (!Number.isFinite(score) || score < 0) {
      score = 0;
    }

    score = Math.min(score, 999999999);

    const formattedScore = score.toLocaleString("en-US");

    // Load the template directly from Cloudflare Pages assets
    const templateRequest = new Request(
      new URL("/assets/scorecard-template.png", url.origin)
    );

    const templateResponse =
      await context.env.ASSETS.fetch(templateRequest);

    if (!templateResponse.ok) {
      return new Response(
        `Template failed: ${templateResponse.status}`,
        { status: 500 }
      );
    }

    const templateImage =
      await templateResponse.arrayBuffer();

    let fontSize = 245;

    if (formattedScore.length >= 5) fontSize = 215;
    if (formattedScore.length >= 7) fontSize = 180;
    if (formattedScore.length >= 9) fontSize = 150;

    const card = React.createElement(
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
        src: templateImage,
        width: 1536,
        height: 1024,
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          width: "1536px",
          height: "1024px"
        }
      }),

      React.createElement(
        "div",
        {
          style: {
            position: "absolute",

            left: "735px",
            top: "345px",
            width: "760px",
            height: "270px",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            color: "#FFD900",
            fontSize: `${fontSize}px`,
            fontWeight: 900,
            lineHeight: 1,
            fontFamily: "Arial",
            textAlign: "center",

            textShadow:
              "8px 8px 0 #000, -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000"
          }
        },
        formattedScore
      )
    );

    return new ImageResponse(card, {
      width: 1536,
      height: 1024
    });

  } catch (error) {
    return new Response(
      `Scorecard error: ${error?.message || String(error)}`,
      {
        status: 500,
        headers: {
          "content-type": "text/plain"
        }
      }
    );
  }
}
