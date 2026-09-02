// Launch item 10. The console and API are operator surfaces; the booking page is reached by a
// personal token and must never be indexed under somebody's invitation.
//
// U7: the routes this testing deployment hides from crawlers (`/finder` first among them) are
// added from `src/security/robots.ts`, the one register the header, the meta tag and the sitemap
// also read. Disallow is the weakest of the three measures — it stops crawling, not indexing
// (O19) — so it is derived here rather than typed, and never stands alone.
import type { MetadataRoute } from "next";
import { HIDDEN_FROM_CRAWLERS } from "@/security/robots";
import { SITE_URL } from "./site";

/** The operator, API and tokened prefixes — hidden since launch, independent of U7's register. */
export const OPERATOR_DISALLOW = ["/console/", "/api/", "/book/", "/go/"];

export default function robots(): MetadataRoute.Robots {
  return {
    // /go/ is the outbound booking redirect (O28): an index entry for a redirect is a wrong
    // door, and crawler hits would pollute the one count the route exists to keep clean.
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...OPERATOR_DISALLOW, ...HIDDEN_FROM_CRAWLERS.map((route) => route.path)],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
