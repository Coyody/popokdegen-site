import React from "react";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

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

  const templateResponse = await fetch(
    new URL("/assets/scorecard-template.png", url.origin)
  );

  if (!templateResponse.ok) {
    return new Response("Template image not found", { status: 500 });
  }

  const contentType =
    templateResponse.headers.get("content-type") || "image/png";
  const templateBuffer = await templateResponse.arrayBuffer();
  const templateBase64 = arrayBufferToBase64(templateBuffer);
  const templateDataUrl = `data:${contentType};base64,${templateBase64}`;

  let fontSize = 245;

  if (formattedScore.length >= 5) fontSize = 215;
  if (formattedScore.length >= 7) fontSize = 180;
  if (formattedScore.length >= 9) fontSize = 150;

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#4f46e5"
        }
      },

      React.createElement("img", {
        src: templateDataUrl,
        width: "1536",
        height: "1024",
        style: {
          position: "absolute",
          inset: "0",
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
            fontFamily: "Arial",
            textAlign: "center",

            textShadow:
              "8px 8px 0 #000000, -4px -4px 0 #000000, 4px -4px 0 #000000, -4px 4px 0 #000000"
          }
        },
        formattedScore
      )
    ),
    {
      width: 1536,
      height: 1024
    }
  );
}
