import { describe, expect, it } from "vitest";
import { clinicians, matchEvidence, rankClinicians, scoreAgainst, getPersonalizedMatch } from "@/demo/clinicians";
import { MANNER_TRAITS, NEED_LABELS, facetKey, readNeeds } from "./needs";

describe("W221 reading what somebody said into the closed vocabulary", () => {
  it("reads a preference about care, and reaches nothing on text that names none", () => {
    expect(readNeeds("")).toEqual([]);
    expect(readNeeds("hello I would like some help please")).toEqual([]);
  });

  /**
   * THE DEFECT THIS PINS IS THE ONE THAT MOTIVATED LONGEST-FIRST READING. "not just medication"
   * contains "medication" and "treated for anxiety" contains "anxiety". A shorter phrase reaching
   * first would let a general term claim a sentence whose specific term says something different —
   * in the first case close to the opposite of what was asked for.
   */
  it("lets the specific phrase win over the general one inside it", () => {
    const labels = readNeeds("I want alternatives, not just medication").map((n) => n.label);
    expect(labels).toContain("Non-medication supports");
  });

  it("counts one facet once, however many ways it was asked for", () => {
    const needs = readNeeds("my dose is wearing off and the dose needs a titration review");
    const keys = needs.map((n) => facetKey(n.facet));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("is deterministic", () => {
    const q = "a thorough structured assessment with the heart checked first";
    expect(readNeeds(q)).toEqual(readNeeds(q));
  });

  /**
   * W213's floor: a reason is composed from a fixed set. This pins the set closed, so a label
   * cannot be introduced by templating a reader's own words into the sentence.
   */
  it("says nothing back that is not in the closed vocabulary", () => {
    const labels = new Set<string>(NEED_LABELS);
    for (const clinician of clinicians) {
      for (const need of matchEvidence(clinician, "hindi, titration, rushed, heart, sleep, drinking")) {
        const allowed = labels.has(need.label) || /-speaking$/.test(need.label);
        expect(allowed, `${need.label} is not in the closed vocabulary`).toBe(true);
      }
    }
  });
});

describe("W221 the ranking and the explanation are one computation", () => {
  /**
   * THE PROPERTY THIS FILE EXISTS FOR.
   *
   * Before W221 the ranker held per-clinician keyword weights and the explanation held its own
   * separate lexicon over the same care areas with different phrase lists. They had already
   * drifted: the ranker weighted "wearing off" and the explainer did not, so a clinician could be
   * ranked first for a reason the page then declined to print. Both now read `matchEvidence`, and
   * this asserts they cannot come apart again — anything that contributes score must be sayable,
   * and anything said must have contributed.
   */
  const QUERIES = [
    "my dose wears off by the afternoon and needs titration reviewed",
    "I get rushed every time, I want a longer first appointment to tell the whole story",
    "a calm GP who speaks Hindi, I was treated for anxiety for years",
    "I drink too much and need that handled as a safety question, by phone",
    "my sleep has never been right and my family think I am just disorganised",
    "I think I might have ADHD and I would like an assessment",
  ];

  it.each(QUERIES)("every point of score is sayable, and every reason scored: %s", (query) => {
    for (const clinician of clinicians) {
      const evidence = matchEvidence(clinician, query);
      const said = getPersonalizedMatch(clinician, query).signals;

      // Everything the page says came from the evidence.
      for (const label of said) expect(evidence.map((e) => e.label)).toContain(label);

      // And the score is exactly the evidence's weight — no unexplainable contribution.
      const fromLexicon = readNeeds(query).filter((n) => evidence.some((e) => facetKey(e.facet) === facetKey(n.facet)));
      expect(scoreAgainst(clinician, readNeeds(query))).toBe(
        fromLexicon.reduce((sum, n) => sum + n.weight, 0),
      );
    }
  });

  it("holds no per-clinician coefficient anywhere", async () => {
    // The scaling property, asserted on the source rather than inferred. A weight keyed by a
    // clinician id is the thing that made adding a GP an engineering task, and its absence is
    // what lets the onboarding interview be the only place a profile is authored.
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../demo/clinicians.ts", import.meta.url), "utf8"),
    );
    expect(source).not.toContain("focusSignals");
    for (const clinician of clinicians) {
      const weightKeyedByName = new RegExp(`"${clinician.id}"\\s*:\\s*\\[`);
      expect(weightKeyedByName.test(source), `${clinician.id} has hand-authored weights`).toBe(false);
    }
  });

  it("scores a clinician only on facets they declared", () => {
    const needs = readNeeds("titration and a longer first appointment");
    for (const clinician of clinicians) {
      for (const need of matchEvidence(clinician, "titration and a longer first appointment")) {
        if (need.facet.kind === "care") expect(clinician.careAreas).toContain(need.facet.area);
        if (need.facet.kind === "manner") expect(clinician.manner).toContain(need.facet.trait);
      }
      expect(scoreAgainst(clinician, needs)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("W221 what the roster declares", () => {
  it("gives every clinician at least one declared manner trait", () => {
    // A clinician with no declared manner can never match "will they understand me", which is
    // half of what somebody is asking. The onboarding interview must not be able to finish
    // without one.
    for (const clinician of clinicians) {
      expect(clinician.manner.length, `${clinician.id} declares no manner`).toBeGreaterThan(0);
      for (const trait of clinician.manner) expect(MANNER_TRAITS).toContain(trait);
    }
  });

  it("still does not float the founder on a request that separates nobody", () => {
    expect(rankClinicians("I think I might have ADHD and I would like an assessment")[0]!.id)
      .not.toBe("anubhav-saxena");
  });
});
