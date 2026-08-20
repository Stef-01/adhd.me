// Launch items 10–12 (supporting): the public routes, one entry each. Console, API and tokened
// booking pages are deliberately absent — same set robots.ts disallows.
import type { MetadataRoute } from "next";
import { SITE_URL } from "./site";

const PUBLIC_PATHS = ["/", "/about", "/finder", "/approach", "/examples", "/faq", "/practices", "/clinicians", "/clinicians/join", "/privacy", "/privacy/automated-decisions", "/privacy/counsel-review", "/terms", "/thanks"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly", priority: path === "/" ? 1 : 0.6 }));
}
