import type { NextConfig } from "next";
import { securityHeaders } from "./src/security/headers";
import { robotsHeaders } from "./src/security/robots";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  devIndicators: false,
  // U1: no `X-Powered-By: Next.js` advertisement; Strict Mode so a dev render surfaces an effect
  // that cannot survive being run twice before the production build hides it.
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // O33, per react-best-practices (bundle-barrel-imports, impact: CRITICAL): the icon and
    // motion packages are barrel files with hundreds of re-exports; this rewrites the named
    // imports to direct ones at build time, keeping TypeScript ergonomics without the barrel
    // cost. Next ships a default list; naming ours makes the dependency explicit.
    optimizePackageImports: ["@phosphor-icons/react", "motion"],
  },
  // U1: the security headers and the report-only CSP on every route. Built once at `next build`
  // from the same environment the GA component reads, so the policy and the page agree.
  // U7: then `X-Robots-Tag: noindex, nofollow` on each route the crawler register hides — one
  // entry per route, derived, so the header cannot disagree with the meta tag or the sitemap.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          gaId: process.env.NEXT_PUBLIC_GA_ID,
          dev: process.env.NODE_ENV !== "production",
        }),
      },
      ...robotsHeaders(),
    ];
  },
};

export default nextConfig;
