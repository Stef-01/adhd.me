// U7 (O229): the routes this deployment hides from crawlers, in one register.
//
// The founder's posture for this tree is that the finder is not public — it is for testing, and
// it defaults to invented example profiles (the synthetic-roster decision in founder-gates.ts).
// Until U7, `app/robots.ts` allowed `/`, the sitemap announced `/finder` and nothing said
// `noindex`; the tree was open to crawlers while its owner said it was closed. This register is
// the one statement of which routes are hidden and why, and the three places a crawler is told
// read it rather than keeping their own lists:
//
//   1. `X-Robots-Tag: noindex, nofollow` on the response — `next.config.ts` mounts one headers
//      entry per route from `robotsHeaders()`; this is the instruction that reaches a crawler
//      that never parses the HTML.
//   2. `<meta name="robots">` — each route's page module sets `robots: HIDDEN_ROBOTS_META`.
//   3. Discovery — `app/sitemap.ts` filters the register's paths out, and `app/robots.ts` adds
//      them to its disallow list. Disallow alone would be wrong on its own (O19: it stops
//      crawling, not indexing), which is why it is the third measure and not the first.
//
// `robots.test.ts` holds all three to this register in BOTH directions against the public-route
// census: a route here is hidden in every place, and a route in the census that is not here is
// hidden in none. A new public page can therefore be neither silently indexed nor silently hidden.
//
// REVERSING ANY OF THIS IS A FOUNDER GATE, NOT AN EDIT. `finder-public-posture` in
// `src/design/founder-gates.ts` names this file as where the open state lives; the liveness test
// fails when the finder leaves the register. The plan's D-FINDER-PUBLIC opens U65, which empties
// the register in one commit and records the decision.

import type { Header } from "./headers";

export interface HiddenRoute {
  /** The census path, exactly as `PUBLIC_SURFACES` spells it. */
  path: string;
  /** Why a crawler must not have it — the reason a reader of the register needs. */
  why: string;
}

export const HIDDEN_FROM_CRAWLERS: readonly HiddenRoute[] = [
  {
    path: "/",
    why: "O230 moved the finder to the root: the app opens on the product, not on a story. The reason `/finder` was hidden is a fact about what the surface RENDERS — a roster of invented example profiles in a deployment the founder has said is for testing — so it moved with it. A root that is indexed while the thing it serves may not be is the inconsistency this register's both-directions test exists to catch.",
  },
  // `/finder` is NOT here any more, and its absence is the register working rather than a gap.
  // O230 made that address a 308 in `next.config.ts`; it is no longer a route, so it is no longer
  // in the public-route census, and an entry naming it would be exactly the stale row this
  // register's both-directions test exists to fail on. The reason it was hidden did not
  // evaporate — it moved to `/` above, with the surface it was always about.
  {
    path: "/examples",
    why: "Worked examples computed from the same roster, with the same default of invented profiles. Indexed, they read as the product's record of what it does for real people.",
  },
  {
    path: "/demo",
    why: "The presenter's page for the scripted demo world. It has carried `noindex` since W22; the register makes that a rule rather than one page's setting, and adds the header and the sitemap and robots.txt exclusions it never had.",
  },
  {
    path: "/thanks",
    why: "The page after the registration form. It has carried `noindex` since launch item 4 while the sitemap still announced it — the inconsistency this register's both-directions rule exposed. A conversion URL is for the person who just converted; it says nothing to anyone else.",
  },
];

/** What every hidden route's page module sets as `metadata.robots`. */
export const HIDDEN_ROBOTS_META = { index: false, follow: false } as const;

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
