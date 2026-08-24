// O190: the sitemap derives from the compliance census, both directions pinned — a public page
// cannot join the census and miss the sitemap (the hand-typed list this replaced was missing
// /demo), and the sitemap cannot advertise a gated or dynamic path.
import { describe, expect, it } from "vitest";
import { sitemapPaths } from "../../app/sitemap";
import { PUBLIC_SURFACES } from "@/compliance/public-surfaces";
import { TEAM_PAGE_PUBLIC } from "../../app/about/team";

describe("O190 the sitemap is the census, filtered by stated rules only", () => {
  it("carries every static public surface, /demo included — the omission that exposed the hand list", () => {
    const paths = sitemapPaths();
    expect(paths).toContain("/demo");
    for (const s of PUBLIC_SURFACES) {
      if (s.path.includes("[")) continue;
      if (s.path === "/about" && !TEAM_PAGE_PUBLIC) continue;
      expect(paths, `${s.path} is in the census but not the sitemap`).toContain(s.path);
    }
  });

  it("advertises nothing the rules exclude: no dynamic path, no gated /about while gated", () => {
    const paths = sitemapPaths();
    expect(paths.filter((p) => p.includes("["))).toEqual([]);
    if (!TEAM_PAGE_PUBLIC) expect(paths).not.toContain("/about");
    // And nothing beyond the census: the sitemap has no second source of truth.
    const census = new Set(PUBLIC_SURFACES.map((s) => s.path));
    for (const p of paths) expect(census.has(p), `${p} is in the sitemap but not the census`).toBe(true);
  });
});
