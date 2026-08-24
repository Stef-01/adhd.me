import { describe, expect, it } from "vitest";
import { bandCut, TIED_BANDS } from "./fold-bands";

describe("AR19 — the visual fold register", () => {
  /** Both directions of the cut predicate — the SAME function the e2e sweep drives. */
  it("bandCut discriminates a straddling band from a contained or below-fold one", () => {
    expect(bandCut(700, 900, 844)).toBe(true); // starts on screen, ends past the fold: cut
    expect(bandCut(100, 400, 844)).toBe(false); // fully above the fold
    expect(bandCut(900, 1100, 844)).toBe(false); // fully below: the reader scrolls to the whole band
    expect(bandCut(843, 845, 844)).toBe(true); // one pixel each side is still a cut
  });

  it("every tied band names its route, both selectors, and the harm a cut would do", () => {
    expect(TIED_BANDS.length).toBeGreaterThanOrEqual(2);
    for (const band of TIED_BANDS) {
      expect(band.route.startsWith("/")).toBe(true);
      expect(band.selectors).toHaveLength(2);
      expect(band.selectors[0]).not.toBe(band.selectors[1]);
      expect(band.why.length).toBeGreaterThanOrEqual(40);
    }
  });
});
