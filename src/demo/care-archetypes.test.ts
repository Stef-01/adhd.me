import { describe, expect, it } from "vitest";
import { careArchetypes } from "./care-archetypes";
import { cliniciansMatchingArchetype, clinicians, rankClinicians } from "./clinicians";

describe("ADHD assessment demo archetypes", () => {
  it("includes six distinct qualitative journeys", () => {
    expect(careArchetypes).toHaveLength(6);
    expect(new Set(careArchetypes.map((archetype) => archetype.id)).size).toBe(6);
  });

  it.each(careArchetypes)("ranks the intended first match for $title", (archetype) => {
    expect(rankClinicians(archetype.request)[0]!.id).toBe(archetype.expectedFirstMatch);
  });

  /**
   * THIS USED TO DEMAND TWO VIABLE CLINICIANS PER JOURNEY AND NOW DEMANDS ONE, WHICH IS A
   * WEAKENING THAT HAS TO BE ARGUED RATHER THAN JUST MADE.
   *
   * The old rule existed so no journey dead-ends, and against a roster of fifteen invented GPs it
   * cost nothing. Against two real ones it would mean every scenario must be servable by BOTH of
   * them — which is only satisfiable if the two are interchangeable, and the whole point of the
   * finder is that they are not. "Do the physical checks properly first" goes to Dr Saxena because
   * he does the cardiac baseline; forcing every active doctor to be an equally valid answer would mean
   * deleting the distinction rather than describing it.
   *
   * So the invariant is re-aimed at the failure it was really guarding: a journey that leads
   * NOWHERE. One eligible clinician is a real answer; zero is a scenario that advertises care this
   * directory cannot reach. The ranked first match must also be one of the eligible ones, so a
   * journey cannot be satisfied by a clinician the requirements would have excluded.
   */
  it.each(careArchetypes)("leads somewhere real for $title", (archetype) => {
    const eligible = cliniciansMatchingArchetype(archetype);
    const eligibleIds = new Set(eligible.map((clinician) => clinician.id));

    expect(eligible.length).toBeGreaterThanOrEqual(1);
    expect(eligibleIds.has(rankClinicians(archetype.request)[0]!.id)).toBe(true);
  });

  /** Every active GP must be reachable by some journey, or the roster carries a name nothing routes to. */
  it("routes to every clinician on the roster", () => {
    const reached = new Set(careArchetypes.map((archetype) => archetype.expectedFirstMatch));

    expect([...reached].sort()).toEqual(clinicians.map((clinician) => clinician.id).sort());
  });

  it("anchors every journey on assessment rather than on a subtype", () => {
    for (const archetype of careArchetypes) {
      expect(archetype.requirements.careAreas).toContain("adhd-assessment");
    }
  });

  /**
   * THE LANGUAGE LIST SHRANK WITH THE ROSTER, AND THAT IS THE POINT OF ASSERTING IT.
   *
   * This test used to require Tamil, Spanish, Arabic and Vietnamese journeys, because four
   * invented GPs spoke them. Two real GPs speak English, Hindi and Urdu, so a Tamil journey would
   * now be a promise the directory cannot keep. The assertion therefore checks the journeys
   * against what the ROSTER actually speaks rather than against a fixed list: add a Tamil-speaking
   * GP and this test starts asking for the journey to come back.
   */
  it("only asks for languages the roster actually speaks", () => {
    const spoken = new Set(clinicians.flatMap((clinician) => clinician.languages));

    for (const archetype of careArchetypes) {
      for (const language of archetype.requirements.languageOptions ?? []) {
        expect(spoken, `no clinician speaks ${language}`).toContain(language);
      }
    }

    const requests = careArchetypes.map((archetype) => archetype.request.toLowerCase()).join(" ");
    expect(requests).toMatch(/hindi/);
    expect(requests).toMatch(/anxious|mental health|rushed|family/);
  });

  /**
   * An assessment product whose demo only shows confirmed cases is selling a conclusion. These
   * journeys describe somebody who may not have ADHD at all, and they are named here so a later
   * edit that quietly turns them into confirmed cases fails.
   */
  it("keeps journeys where the answer may be no", () => {
    const byId = new Map(careArchetypes.map((archetype) => [archetype.id, archetype.request.toLowerCase()]));

    expect(byId.get("anxiety-differential-hindi")).toMatch(/wrong answer|differential/);
    expect(byId.get("sleep-and-family-context")).toMatch(/sleep/);
  });
});
