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
import { NETWORK_CLINICIANS } from "@/network/gallery";
import { TEAM_PAGE_PUBLIC } from "./about/team";
import { SITE_URL } from "./site";

/**
 * O192 round 7: dynamic census paths that EXPAND into real URLs instead of being dropped.
 *
 * Dropping every dynamic path was right while `/book/[token]` was the only one — a tokened page
 * is reached by invitation and robots.ts disallows the whole `/book/` prefix, so there is nothing
 * there to announce. `/network/[clinician]` is the opposite of that in every respect: statically
 * generated at build time from a roster known at build time, linked from `/network`, crawlable
 * under robots.ts's `allow: "/"`, and the pages the founder specifically lifted the indexing hold
 * from. Dropped by the same filter, they were the one part of the network a search engine could
 * only find by following a link — a browsable network whose people are announced to nobody.
 *
 * A register rather than a special case in the filter, so the rule stays readable in both
 * directions: a dynamic path either expands (and says how) or is deliberately absent.
 */
const EXPANDED_DYNAMIC_PATHS: Readonly<Record<string, () => string[]>> = {
  "/network/[clinician]": () => NETWORK_CLINICIANS.map((clinician) => `/network/${clinician.id}`),
};

export function sitemapPaths(): string[] {
  return PUBLIC_SURFACES.flatMap((surface) => {
    if (surface.path.includes("[")) return EXPANDED_DYNAMIC_PATHS[surface.path]?.() ?? [];
    return [surface.path];
  }).filter((path) => path !== "/about" || TEAM_PAGE_PUBLIC);
}

/** The census path an expanded URL came from, or the URL itself when it is a census path. */
export function censusPathFor(path: string): string {
  for (const [dynamic, expand] of Object.entries(EXPANDED_DYNAMIC_PATHS)) {
    if (expand().includes(path)) return dynamic;
  }
  return path;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapPaths().map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly", priority: path === "/" ? 1 : 0.6 }));
}
