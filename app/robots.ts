// Launch item 10. The console and API are operator surfaces; the booking page is reached by a
// personal token and must never be indexed under somebody's invitation.
//
// U7: the routes this testing deployment hides from crawlers (`/finder` first among them) are
// added from `src/security/robots.ts`, the one register the header, the meta tag and the sitemap
// also read. Disallow is the weakest of the three measures — it stops crawling, not indexing
// (O19) — so it is derived here rather than typed, and never stands alone.
//
// THE AI-SEARCH PASS ADDS THE SECOND HALF OF THE QUESTION. Until now this file said `*` and
// nothing else, which allowed every AI crawler by silence. Silence is not a decision, and the
// decision is not one answer: a retrieval bot fetches because a person is asking a question right
// now and hands them the source, while a training-corpus bot takes the site and offers nothing
// back. `src/seo/ai-crawlers.ts` names each bot, says which kind it is and why, and this file
// turns that register into rules — so the posture is legible in one place and enforced from it.
//
// EVERY RULE CARRIES THE SAME DISALLOW LIST, and that is the part worth checking on any edit. A
// per-bot rule that omitted the hidden routes would hand an AI crawler exactly what the wildcard
// rule refuses, and `robots.txt` would still look right at a glance because the wildcard block
// above it would still be correct. `disallow` is built once, below, and every rule gets it.
import type { MetadataRoute } from "next";
import { AI_CRAWLERS, crawlersFor } from "@/seo/ai-crawlers";
import { HIDDEN_FROM_CRAWLERS } from "@/security/robots";
import { SITE_URL } from "./site";

/** The operator, API and tokened prefixes — hidden since launch, independent of U7's register. */
export const OPERATOR_DISALLOW = ["/console/", "/api/", "/book/", "/go/"];

/**
 * Everything no crawler of any kind may have: the operator prefixes plus the routes this
 * deployment does not publish. One list, applied to every rule this file writes.
 */
export function crawlerDisallow(): string[] {
  // /go/ is the outbound booking redirect (O28): an index entry for a redirect is a wrong door,
  // and crawler hits would pollute the one count the route exists to keep clean.
  return [...OPERATOR_DISALLOW, ...HIDDEN_FROM_CRAWLERS.map((route) => route.path)];
}

export default function robots(): MetadataRoute.Robots {
  const disallow = crawlerDisallow();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // Named so the posture is explicit rather than inherited. Allowing these is what makes the
      // product citable: the pages are public either way, and a bot that cannot read them simply
      // leaves this product out of the answer a person is being given.
      { userAgent: crawlersFor("retrieval").map((crawler) => crawler.agent), allow: "/", disallow },
      // Bulk corpus collection, refused. Not a rule about AI — a rule about a fetch with no reader
      // at the end of it, which is the one case where being read returns nothing.
      { userAgent: crawlersFor("training").map((crawler) => crawler.agent), disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

/** Re-exported so a reader of robots.txt can find the argument behind it. */
export { AI_CRAWLERS };
