import { describe, expect, it } from "vitest";
import { TOUCH_EXEMPTIONS } from "./touch-exemptions";

describe("AR22 — the touch-exemption register", () => {
  /**
   * THE EMPTINESS PIN (W55/W56/W68's shape): the sweep is green with zero under-floor controls,
   * so an exemption today would be paperwork for a violation that does not exist. The first
   * real entry flips this assertion in the same commit it argues its rationale — visibly.
   */
  it("ships empty: every control today meets the floor, so nothing is exempt", () => {
    expect(TOUCH_EXEMPTIONS).toEqual([]);
  });

  /** Shape law for the day entries exist — asserted now so the first entry meets it. */
  it("any future entry must name one element, its route, and an arguable rationale", () => {
    for (const exemption of TOUCH_EXEMPTIONS) {
      expect(exemption.selector.length).toBeGreaterThan(0);
      expect(exemption.where.startsWith("/")).toBe(true);
      expect(exemption.rationale.length).toBeGreaterThanOrEqual(40);
    }
  });
});
