import { describe, expect, it } from "vitest";
import { careArchetypes } from "./care-archetypes";
import { cliniciansMatchingArchetype, clinicians, rankClinicians } from "./clinicians";

describe("ADHD assessment demo archetypes", () => {
  it("includes five distinct qualitative journeys", () => {
    // Seven at O34, when the woman-GP journey arrived with Dr Anusha Saxena. FIVE since O179:
    // Dr Tushar Yadav left and took `anxiety-differential-hindi` and `sleep-and-family-context`
    // with him — he was the only full-grade declarer of `anxiety` and `non-medication`, so both
    // journeys had zero eligible clinicians the moment he was removed. Deleted rather than kept
    // on a loosened definition of eligible; see the header of care-archetypes.ts.
    expect(careArchetypes).toHaveLength(5);
    expect(new Set(careArchetypes.map((archetype) => archetype.id)).size).toBe(5);
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
   * he does the cardiac baseline; forcing Dr Yadav to be an equally valid answer would mean
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

  /** Both GPs must be reachable by some journey, or the roster is carrying a name nothing routes to. */
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
    expect(requests).toMatch(/anxious|anxiety|mental health|rushed|family/);

    /**
     * O179: NO JOURNEY EXERCISES A SPOKEN LANGUAGE ANY MORE, AND THE NUMBER SAYS SO OUT LOUD.
     *
     * `anxiety-differential-hindi` was the only journey carrying `languageOptions`, and it went
     * when Dr Yadav did. The subset rule above is now VACUOUSLY true — it iterates an empty set on
     * every archetype — so on its own it would go on passing while the demo stopped covering
     * language entirely, which is the silent-green failure this tree keeps catching.
     *
     * The count is therefore pinned at its real value rather than the rule being left to iterate
     * nothing. Both GPs speak Hindi and Urdu, so this is a demo GAP, not a roster one: adding a
     * language journey back is the fix, and doing it turns this red so the number moves
     * deliberately instead of drifting.
     */
    const withLanguage = careArchetypes.filter((archetype) => archetype.requirements.languageOptions?.length);
    expect(withLanguage, "a language journey came back — raise the count and delete this note").toHaveLength(0);
  });

  /**
   * An assessment product whose demo only shows confirmed cases is selling a conclusion. These
   * journeys describe somebody who may not have ADHD at all, and they are named here so a later
   * edit that quietly turns them into confirmed cases fails.
   */
  it("keeps journeys where the answer may be no", () => {
    const byId = new Map(careArchetypes.map((archetype) => [archetype.id, archetype.request.toLowerCase()]));

    // O179: `anxiety-differential-hindi` and `sleep-and-family-context` carried this property and
    // left with Dr Yadav. It is not lost — `woman-gp` says "it never quite fitted", which is the
    // same may-not-be-ADHD framing — but it now rests on ONE journey where it rested on three, and
    // that is worth seeing in the test rather than only in the diff.
    expect(byId.get("unhurried-first-appointment")).toMatch(/before deciding anything|whole story/);
    expect(byId.get("woman-gp")).toMatch(/never quite fitted|wrong answer|differential/);

    const openEnded = [...byId.values()].filter((request) => /never quite fitted|wrong answer|differential|before deciding anything/.test(request));
    expect(openEnded.length, "the demo stopped showing a case that might not be ADHD").toBeGreaterThanOrEqual(2);
  });
});
