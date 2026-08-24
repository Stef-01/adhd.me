// Launch items 10–12 (supporting), rewritten by O190: the paths DERIVE from the compliance
// census instead of a hand-typed list — the list had already gone stale exactly the way O168
// predicted (it was missing /demo, a public route since W-era, because nobody re-typed it).
// PUBLIC_SURFACES is the register every public page must join (W102's census fails the build
// otherwise), so deriving from it makes the sitemap complete by construction: a page cannot be
// swept for compliance and forgotten by crawlers at the same time.
//
// Console, API and tokened booking pages stay absent — the dynamic paths are filtered out and
// robots.ts disallows the same set. O155's rule is kept: a gated /about that still advertises
// itself in the sitemap is hidden from readers and announced to crawlers.
import type { MetadataRoute } from "next";
import { PUBLIC_SURFACES } from "@/compliance/public-surfaces";
import { TEAM_PAGE_PUBLIC } from "./about/team";
import { SITE_URL } from "./site";

export function sitemapPaths(): string[] {
  return PUBLIC_SURFACES.map((surface) => surface.path)
    .filter((path) => !path.includes("["))
    .filter((path) => path !== "/about" || TEAM_PAGE_PUBLIC);
}

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapPaths().map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly", priority: path === "/" ? 1 : 0.6 }));
}
