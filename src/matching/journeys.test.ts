// The matching promise, as a person meets it: one sentence in, and the first clinician the finder
// shows answers what they asked. For each journey (./journeys.ts) the asks are heard, and the first
// clinician answers as many of them as anyone on the roster does: all of them, whenever anyone can.
// On the finder's roster, at level 0, so it is free and runs on every change.

import { describe, expect, it } from "vitest";
import { clinicians, matchEvidence, needsFor, rankClinicians, type Clinician } from "@/demo/clinicians";
import { JOURNEYS } from "./journeys";
import { facetKey } from "./needs";

const roster = clinicians;
const TODAY = new Date("2026-09-28T00:00:00Z");

/** How many of the asks this clinician declares, by the same evidence the finder shows. */
function answers(clinician: Clinician, says: string, hears: readonly string[]): number {
  const declared = new Set(matchEvidence(clinician, says, roster, needsFor(says, roster)).map((need) => facetKey(need.facet)));
  return hears.filter((key) => declared.has(key)).length;
}

describe("one sentence in, the right clinician first", () => {
  for (const { says, hears } of JOURNEYS) {
    it(`"${says}"`, () => {
      const heard = needsFor(says, roster).map((need) => facetKey(need.facet));
      expect(heard, "the finder hears every ask").toEqual(expect.arrayContaining([...hears]));
      const [first] = rankClinicians(says, roster, TODAY);
      const best = Math.max(...roster.map((c) => answers(c, says, hears)));
      expect(best, "somebody on the roster answers at least one ask").toBeGreaterThan(0);
      expect(answers(first!, says, hears), `${first!.name} is first`).toBe(best);
    });
  }
});
