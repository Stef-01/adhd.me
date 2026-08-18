/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: false },
  devIndicators: false,
  experimental: {
    // O33, per react-best-practices (bundle-barrel-imports, impact: CRITICAL): the icon and
    // motion packages are barrel files with hundreds of re-exports; this rewrites the named
    // imports to direct ones at build time, keeping TypeScript ergonomics without the barrel
    // cost. Next ships a default list; naming ours makes the dependency explicit.
    optimizePackageImports: ["@phosphor-icons/react", "motion"],
  },
};

export default nextConfig;
