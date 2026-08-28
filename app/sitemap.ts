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

/**
 * Dynamic census paths that EXPAND into real URLs instead of being dropped.
 *
 * EMPTY ON THIS DEPLOYMENT, AND THAT IS THE HONEST STATE RATHER THAN AN OVERSIGHT. The register was
 * built (O192 round 7) because `/network/[clinician]` needed to expand: statically generated from a
 * roster known at build time, crawlable, and the pages the founder lifted the indexing hold from.
 * The network moved to its own deployment, so the only dynamic path left here is `/book/[token]` —
 * reached by invitation, with robots.ts disallowing the whole `/book/` prefix. There is nothing
 * there to announce, which is exactly the case the original filter got right.
 *
 * Kept as a register rather than collapsed into the filter, so the rule stays readable in both
 * directions: a dynamic path either expands (and says how) or is deliberately absent.
 */
const EXPANDED_DYNAMIC_PATHS: Readonly<Record<string, () => string[]>> = {};

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
