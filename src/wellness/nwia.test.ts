import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import { SUBDOMAINS } from "@/model/layers";
import { NWIA_DIMENSIONS, NWIA_LABELS, NWIA_MEANINGS, NWIA_OF, NWIA_PARADIGM, nwiaBalance } from "./nwia";

describe("the NWIA model, as the app reads it", () => {
  it("has the Institute's nine dimensions, each with a label and a one-line meaning that passes the patient rules", () => {
    expect(NWIA_DIMENSIONS.length).toBe(9);
    for (const d of NWIA_DIMENSIONS) {
      expect(NWIA_LABELS[d].length).toBeGreaterThan(0);
      expect(lintLandingCopy(`${NWIA_LABELS[d]}. ${NWIA_MEANINGS[d]}`), d).toEqual([]);
    }
    expect(lintLandingCopy(NWIA_PARADIGM)).toEqual([]);
  });

  it("maps every one of the app's subdomains to one or two dimensions, and every dimension is reached", () => {
    const reached = new Set<string>();
    for (const s of SUBDOMAINS) {
      const dims = NWIA_OF[s.id];
      expect(dims.length, s.id).toBeGreaterThanOrEqual(1);
      expect(dims.length, s.id).toBeLessThanOrEqual(2);
      dims.forEach((d) => reached.add(d));
    }
    // Spiritual values has no node: it is reached through the goal, not the map.
    expect([...reached].sort()).toEqual(NWIA_DIMENSIONS.filter((d) => d !== "spiritual").sort());
    expect(nwiaBalance([], { goal: true }).touched).toEqual(["spiritual"]);
  });

  it("says which dimensions a picture touches and which it does not, in the Institute's order", () => {
    const b = nwiaBalance(["activation", "sleep", "partner"]);
    expect(b.touched).toEqual(["physical", "social", "work", "intellectual"]);
    expect(b.untouched).toEqual(["emotional", "spiritual", "cultural", "environment", "finances"]);
    expect(nwiaBalance([]).touched).toEqual([]);
    expect(nwiaBalance([]).untouched.length).toBe(9);
  });
});
