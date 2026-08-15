import React from "react";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";

export async function onRequestGet() {
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
          background: "#7566e8",
          color: "white",
          fontSize: "100px",
          fontWeight: "bold"
        }
      },
      "TEST 4206"
    ),
    {
      width: 1200,
      height: 630
    }
  );
}
