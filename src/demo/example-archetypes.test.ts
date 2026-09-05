// The worked-examples page shows three of the six archetypes. It showed the FIRST three, which
// happen to be three care-area asks with no language and no "who" — the roadmap's Q1 concern in
// one line: the examples did not demonstrate range. The three are chosen for coverage now, and
// this holds them to it: distinct care areas, at least one language ask, at least one ask about
// who the GP is.
import { describe, expect, it } from "vitest";
import { careArchetypes, exampleArchetypes } from "./care-archetypes";

describe("the worked examples", () => {
  const shown = exampleArchetypes();
  it("are three, each a real archetype, no two alike", () => {
    expect(shown).toHaveLength(3);
    for (const a of shown) expect(careArchetypes.some((c) => c.id === a.id)).toBe(true);
    expect(new Set(shown.map((a) => a.id)).size).toBe(3);
  });
  it("span care area, language, and who the GP is", () => {
    const careAreas = new Set(shown.flatMap((a) => a.requirements.careAreas));
    expect(careAreas.size).toBeGreaterThanOrEqual(2);
    expect(shown.some((a) => (a.requirements.languageOptions?.length ?? 0) > 0)).toBe(true);
    expect(shown.some((a) => a.requirements.preferredGender === "woman")).toBe(true);
  });
});
