/**
 * The one place the site's absolute URL is decided.
 *
 * Reads the deployment's own environment first (Vercel sets VERCEL_PROJECT_PRODUCTION_URL on
 * every build), then an explicit override, then the current production alias as the committed
 * fallback — so canonical URLs, OG tags, robots and the sitemap can never disagree about where
 * this site lives.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://adhd-lovat.vercel.app");
