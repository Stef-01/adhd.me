/**
 * The one place the site's absolute URL is decided.
 *
 * An explicit `NEXT_PUBLIC_SITE_URL` first, then the deployment's own hostname (Vercel sets
 * `VERCEL_PROJECT_PRODUCTION_URL` on every build), then the local server — so canonical URLs, OG
 * tags, robots and the sitemap can never disagree about where this site lives. U2 removed the
 * baked production alias that used to sit last: a hostname committed to source outlives the
 * deployment it named, and a local build claiming to be the live site is a lie in every sitemap
 * it writes.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
