// O220 (Phase 1a of docs/STANDALONE-APP-PLAN.md): the web app manifest — the finder becomes an
// installable, standalone-display app with no store, no wrapper and no second codebase.
//
// THE TWO COLOUR LITERALS MIRROR TOKENS, under the same law as viewport.themeColor in
// app/layout.tsx: a manifest is serialized JSON a CSS variable cannot reach, so the values must
// EQUAL the tokens — background is --paper (the launch frame and the page are one surface), theme
// is --brand (the yellow header the chrome continues). The day the palette moves, these move in
// the same commit.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ADHD.ME",
    short_name: "ADHD.ME",
    description:
      "A finder. Describe the support you are looking for in your own words, and it shows the listed GPs and allied providers who say they do that work — with the reason each one is shown.",
    start_url: "/finder",
    display: "standalone",
    background_color: "#fafaf7",
    theme_color: "#f1bc31",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
