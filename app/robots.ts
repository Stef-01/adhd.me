// Launch item 10. The console and API are operator surfaces; the booking page is reached by a
// personal token and must never be indexed under somebody's invitation.
import type { MetadataRoute } from "next";
import { SITE_URL } from "./site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/console/", "/api/", "/book/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
