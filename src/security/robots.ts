// The routes this deployment hides from crawlers, in one register — and it is EMPTY, on purpose.
//
// U7 (O229) wrote this file when the founder's posture was that the finder was not public: the
// register held `/`, `/profile`, `/examples`, `/demo` and `/thanks`, and three enforcement points
// read it (an `X-Robots-Tag` header from `next.config.ts`, each page's `metadata.robots`, and the
// sitemap + robots.txt exclusions). The 2026-09-03 strip emptied it. That was a real decision —
// the site is public now — and nothing here argues with it.
//
// WHAT THE STRIP LEFT BEHIND WAS A TRAP, AND THE AI-SEARCH PASS IS WHERE IT SURFACED. The constant
// every page sets as its `metadata.robots` was flipped from `{index: false}` to `{index: true}` and
// kept its name: five pages read `robots: HIDDEN_ROBOTS_META` and published themselves. A reader
// adding a sixth page would have copied that line believing it hid the page. It is `ROBOTS_META`
// now, which is what it means, and this header says why rather than leaving the next reader to
// diff two years of history to find out.
//
// The register itself stays as the shape rather than being deleted: if a route ever needs holding
// back again, one entry here still reaches robots.txt, the sitemap and the page's own meta tag
// together, which is the property that made it worth writing. `src/seo/ai-crawlers.ts` is the
// separate, live question — which AI crawlers may read what is published.

import type { Header } from "./headers";

export interface HiddenRoute {
  /** The census path, exactly as `PUBLIC_SURFACES` spells it. */
  path: string;
  /** Why a crawler must not have it — the reason a reader of the register needs. */
  why: string;
}

export const HIDDEN_FROM_CRAWLERS: readonly HiddenRoute[] = [];

/**
 * What a page sets as `metadata.robots`. Indexable, because the register above is empty.
 *
 * Named for what it is. It was `HIDDEN_ROBOTS_META` and meant `index: true` — see the header.
 */
export const ROBOTS_META = { index: true, follow: true } as const;

/** The header value, the same instruction as the meta tag for crawlers that never read the page. */
export const X_ROBOTS_TAG = "noindex, nofollow";

export function isHiddenFromCrawlers(path: string): boolean {
  return HIDDEN_FROM_CRAWLERS.some((route) => route.path === path);
}

/** One `next.config.ts` headers entry per hidden route. */
export function robotsHeaders(): { source: string; headers: Header[] }[] {
  return HIDDEN_FROM_CRAWLERS.map((route) => ({
    source: route.path,
    headers: [{ key: "X-Robots-Tag", value: X_ROBOTS_TAG }],
  }));
}
