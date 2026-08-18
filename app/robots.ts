// Launch item 10. The console and API are operator surfaces; the booking page is reached by a
// personal token and must never be indexed under somebody's invitation.
import type { MetadataRoute } from "next";
import { SITE_URL } from "./site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /go/ is the outbound booking redirect (O28): an index entry for a redirect is a wrong
    // door, and crawler hits would pollute the one count the route exists to keep clean.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/console/", "/api/", "/book/", "/go/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
