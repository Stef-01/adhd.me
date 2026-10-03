// O220 (Phase 1a of docs/STANDALONE-APP-PLAN.md): the web app manifest — the finder becomes an
// installable, standalone-display app with no store, no wrapper and no second codebase.
//
// The launch background matches --paper; browser chrome matches --brand and viewport.themeColor.
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
