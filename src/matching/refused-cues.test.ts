// W231 (O125): the refusal register, checked against the lexicon in both directions.

import { describe, expect, it } from "vitest";
import { LEXICON_CUES, readNeeds, facetKey } from "./needs";
import { REACH_CORPUS } from "./corpus";
import { openAspirations, REFUSED_CUES } from "./refused-cues";

describe("O125 a cue refused once is not re-added by accident", () => {
  it("no refused phrase appears in the lexicon", () => {
    const live = new Set(LEXICON_CUES.map((cue) => cue.phrase));
    // `ownedBy` entries are refused BECAUSE the phrase is live on another facet, so their
    // presence in the lexicon is the point rather than a violation.
    const readded = REFUSED_CUES.filter((r) => !r.ownedBy && live.has(r.phrase)).map(
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

  it("an owned phrase really is live on the facet that owns it", () => {
    // Otherwise the exemption above would hide a genuine re-add: an entry claiming somebody
    // else owns a phrase, when nobody does, is a hole in the check rather than a refusal.
    const live = new Set(LEXICON_CUES.map((cue) => cue.phrase));
    for (const r of REFUSED_CUES.filter((x) => x.ownedBy)) {
      expect(live.has(r.phrase), `${r.phrase} claims to be owned by ${r.ownedBy} but is not a live cue`).toBe(true);
      expect(LEXICON_CUES.some((c) => c.phrase === r.phrase && c.key === r.ownedBy),
        `${r.phrase} is live but not on ${r.ownedBy}`).toBe(true);
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

describe("O138 the register can say what is genuinely still open", () => {
  it("names only real corpus sentences that are still aspiring", () => {
    // A refusal whose aspiration has since been promoted is STALE: it would keep subtracting
    // work that is finished, hiding the fact that the refusal itself may now be reversible.
    const byText = new Map(REACH_CORPUS.map((e) => [e.text, e]));
    for (const r of REFUSED_CUES) {
      for (const text of r.leavesStanding ?? []) {
        const entry = byText.get(text);
        expect(entry, `${r.unit}: "${text}" is named as left standing but is not in the corpus`).toBeDefined();
        expect(entry!.aspires?.length ?? 0,
          `${r.unit}: "${text}" is named as left standing but no longer aspires — the refusal is stale`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("subtracts finished thinking from the queue", () => {
    const raw = REACH_CORPUS.filter((e) => e.aspires?.length && !e.awaitingFounder).length;
    const open = openAspirations(REACH_CORPUS).length;
    // The two must differ, or `leavesStanding` is decorative.
    expect(open).toBeLessThan(raw);
  });

  it("never counts a founder-blocked aspiration as open work", () => {
    const open = new Set(openAspirations(REACH_CORPUS).map((e) => e.text));
    for (const e of REACH_CORPUS.filter((x) => x.awaitingFounder)) {
      expect(open.has(e.text), `${e.text} is founder-blocked and is being counted as open`).toBe(false);
    }
  });
});
