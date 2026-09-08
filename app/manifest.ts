// O220 (Phase 1a of docs/STANDALONE-APP-PLAN.md): the web app manifest — the finder becomes an
// installable, standalone-display app with no store, no wrapper and no second codebase.
//
// THE TWO COLOUR LITERALS MIRROR --paper, under the same law as viewport.themeColor in
// app/layout.tsx (its COMPONENT_HEX_EXCEPTIONS entry states it): a manifest is serialized JSON a
// CSS variable cannot reach, and the values must EQUAL the token — the standalone window's launch
// frame and the page must be one surface, not a white flash before paper. The day the palette
// moves, these move in the same commit.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ADHD.ME",
    short_name: "ADHD.ME",
    description:
      "A finder. Describe the GP you are looking for in your own words, and it shows you listed Sydney GPs who say they do that work — with the reason each one is shown.",
    start_url: "/finder",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#fbfaf7",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
