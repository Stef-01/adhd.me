// W231 (O131): the false-positive register, checked in both directions, and the O84 bar.

import { describe, expect, it } from "vitest";
import { facetKey, readNeeds } from "./needs";
import { REACH_CORPUS } from "./corpus";
import {
  acceptedFalsePositives,
  familiesAtTheBar,
  openFalsePositives,
  KNOWN_FALSE_POSITIVES,
  type KnownFalsePositive,
} from "./known-fps";

const facets = (text: string) => readNeeds(text).map((need) => facetKey(need.facet));

describe("O131 the false-positive register knows what is still true", () => {
  it("every OPEN or ACCEPTED entry still exhibits its false positive", () => {
    // A pin that has quietly stopped being true is worse than no pin: it sends the next author
    // to build a mechanism for a reading that no longer happens. Accepted entries are checked
    // too — an acceptance of something that no longer occurs is a stale exemption, the same
    // defect W194 found in its own name-exclusion list.
    for (const fp of [...openFalsePositives(), ...acceptedFalsePositives()]) {
      expect(facets(fp.text), `${fp.pinnedBy}: "${fp.text}" no longer reaches ${fp.facet}`)
        .toContain(fp.facet);
    }
  });

  it("every FIXED entry no longer exhibits it, so a fix cannot silently regress", () => {
    for (const fp of KNOWN_FALSE_POSITIVES.filter((e) => e.fixedBy)) {
      expect(facets(fp.text), `${fp.fixedBy} fixed "${fp.text}" and it is reaching ${fp.facet} again`)
        .not.toContain(fp.facet);
    }
  });

  it("names a real corpus sentence, so the register cannot drift from the thing it describes", () => {
    const corpus = new Set(REACH_CORPUS.map((e) => e.text));
    for (const fp of KNOWN_FALSE_POSITIVES) {
      expect(corpus.has(fp.text), `"${fp.text}" is registered but is not in the corpus`).toBe(true);
    }
  });

  it("carries a family and a pinning unit on every entry", () => {
    for (const fp of KNOWN_FALSE_POSITIVES) {
      expect(fp.family.length, `${fp.text} has no family`).toBeGreaterThan(0);
      expect(fp.pinnedBy).toMatch(/^O\d+$/);
    }
  });

  it("gives every acceptance a reason, because one without is indistinguishable from not looking", () => {
    for (const fp of acceptedFalsePositives()) {
      expect(fp.accepted!.length, `${fp.text} is accepted with no rationale`).toBeGreaterThan(60);
    }
  });
});

/**
 * THE O84 BAR, WRITTEN WHERE IT EXECUTES.
 *
 * One case does not earn a mechanism; two do. The tree has applied this from memory since
 * August — O84 refused a raw-run rule on a single case and O94 built it when the second arrived,
 * and the two together showed a shape neither would have shown alone. This makes the count
 * automatic: when a family reaches two open members, the build says so.
 */
describe("O131 the two-case bar", () => {
  it("fails the build when a family has earned its mechanism", () => {
    const earned = familiesAtTheBar();
    expect(
      earned.map((f) => `${f.family} has ${f.members.length} open cases and has earned a mechanism: ${f.members.join(" / ")}`),
      "a false-positive family reached two open cases — build the rule, then mark them fixedBy",
    ).toEqual([]);
  });

  it("would fire on a second case: the bar is not vacuous", () => {
    const seeded: KnownFalsePositive[] = [
      { text: "one", facet: "care:anxiety", family: "negated-saying-of-a-state", pinnedBy: "O128" },
      { text: "two", facet: "care:anxiety", family: "negated-saying-of-a-state", pinnedBy: "O999" },
    ];
    expect(familiesAtTheBar(seeded).map((f) => f.family)).toEqual(["negated-saying-of-a-state"]);
  });

  it("does not count a family whose cases are fixed", () => {
    const seeded: KnownFalsePositive[] = [
      { text: "one", facet: "care:anxiety", family: "f", pinnedBy: "O1", fixedBy: "O2" },
      { text: "two", facet: "care:anxiety", family: "f", pinnedBy: "O1", fixedBy: "O2" },
    ];
    expect(familiesAtTheBar(seeded)).toEqual([]);
  });
});
