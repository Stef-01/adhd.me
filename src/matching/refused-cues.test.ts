// W231 (O125): the refusal register, checked against the lexicon in both directions.

import { describe, expect, it } from "vitest";
import { LEXICON_CUES, readNeeds, facetKey } from "./needs";
import { REFUSED_CUES } from "./refused-cues";

describe("O125 a cue refused once is not re-added by accident", () => {
  it("no refused phrase appears in the lexicon", () => {
    const live = new Set(LEXICON_CUES.map((cue) => cue.phrase));
    const readded = REFUSED_CUES.filter((r) => live.has(r.phrase)).map(
      (r) => `"${r.phrase}" was refused by ${r.unit} because "${r.refusedBy}" is ${r.because}`,
    );
    expect(readded).toEqual([]);
  });

  /**
   * The register is only worth having if each entry is still TRUE — that the refusing sentence
   * really does not reach the facet today. An entry that has quietly become false would send a
   * later author away from a cue that is now safe, which is the opposite of the point.
   */
  it("every refusing sentence still fails to reach the facet it refused", () => {
    for (const r of REFUSED_CUES) {
      const facets = readNeeds(r.refusedBy).map((n) => facetKey(n.facet));
      if (r.protects) {
        // Span theft: the sentence still reaches the proposed facet through an older cue, and
        // what the refusal protects is the OTHER read. Assert that instead.
        expect(facets, `${r.unit}: "${r.refusedBy}" no longer reaches ${r.protects}`).toContain(r.protects);
      } else {
        expect(facets, `${r.unit}: "${r.refusedBy}" now reaches ${r.facet}`).not.toContain(r.facet);
      }
    }
  });

  it("each entry carries its measurement, not an opinion", () => {
    for (const r of REFUSED_CUES) {
      expect(r.phrase.length, `${r.unit} entry has no phrase`).toBeGreaterThan(0);
      expect(r.refusedBy.length, `${r.phrase} names no refusing sentence`).toBeGreaterThan(0);
      expect(r.because.length, `${r.phrase} gives no reason`).toBeGreaterThan(0);
      expect(r.unit).toMatch(/^O\d+$/);
    }
  });

  it("would catch a re-add: the check is not vacuous", () => {
    const live = new Set(LEXICON_CUES.map((cue) => cue.phrase));
    // "coaching" is a real live cue on care:non-medication; if the register listed it, the
    // first test would fire. This proves the membership check actually reads the lexicon.
    expect(live.has("coaching")).toBe(true);
  });
});
