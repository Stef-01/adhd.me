// O190: the sitemap derives from the compliance census, both directions pinned — a public page
// cannot join the census and miss the sitemap (the hand-typed list this replaced was missing
// /demo), and the sitemap cannot advertise a gated path.
//
// O192 ROUND 7 CHANGED ONE RULE AND KEPT THE INVARIANT. "No dynamic path" used to mean "drop
// them", which was right while `/book/[token]` was the only one: a tokened page is reached by
// invitation and robots.ts disallows the whole prefix. `/network/[clinician]` is its opposite —
// statically generated from a build-time roster, linked from `/network`, crawlable, and the pages
// whose indexing hold the founder specifically lifted — so it EXPANDS into its real URLs instead.
// The invariant that matters is unchanged and asserted below: every URL in the sitemap traces back
// to a census entry, and no literal `[…]` template is ever advertised.
import { describe, expect, it } from "vitest";
import { censusPathFor, sitemapPaths } from "../../app/sitemap";
import { PUBLIC_SURFACES } from "@/compliance/public-surfaces";
import { NETWORK_CLINICIANS } from "@/network/gallery";
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

  it("advertises no path template and no gated /about while gated", () => {
    const paths = sitemapPaths();
    expect(paths.filter((p) => p.includes("["))).toEqual([]);
    if (!TEAM_PAGE_PUBLIC) expect(paths).not.toContain("/about");
  });

  it("traces every URL back to the census — no second source of truth", () => {
    const census = new Set(PUBLIC_SURFACES.map((s) => s.path));
    for (const p of sitemapPaths()) {
      expect(census.has(censusPathFor(p)), `${p} is in the sitemap but not the census`).toBe(true);
    }
  });

  it("expands every GP's own page, so the network is announced and not only linked", () => {
    // O192 round 7. The founder lifted the indexing hold on these pages; a sitemap that dropped
    // them left that decision half-implemented — findable by following a link and by nothing else.
    const paths = sitemapPaths();
    expect(NETWORK_CLINICIANS.length, "an empty roster would make this assertion vacuous").toBeGreaterThan(0);
    for (const clinician of NETWORK_CLINICIANS) {
      expect(paths, `${clinician.name}'s page is missing from the sitemap`).toContain(
        `/network/${clinician.id}`,
      );
    }
    expect(censusPathFor(`/network/${NETWORK_CLINICIANS[0]!.id}`)).toBe("/network/[clinician]");
  });

  it("still drops a dynamic path that declares no expansion", () => {
    // The tokened booking page is the case the original filter existed for, and it must stay out:
    // an index entry under somebody's personal invitation is the failure this rule prevents.
    const paths = sitemapPaths();
    expect(paths.some((p) => p.startsWith("/book/"))).toBe(false);
    // And an unexpanded dynamic path resolves to itself rather than silently matching something.
    expect(censusPathFor("/book/[token]")).toBe("/book/[token]");
  });
});
