import { describe, expect, it } from "vitest";
import {
  clinicians,
  matchEvidence,
  matchQuality,
  needsFor,
  rankClinicians,
  scoreAgainst,
  getPersonalizedMatch,
} from "@/demo/clinicians";
import { MANNER_TRAITS, NEED_LABELS, facetKey, languageNeeds, readNeeds } from "./needs";

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

      // And the score is exactly the evidence's weight — no unexplainable contribution, and
      // since O1 no carve-out either: language evidence is scored like everything else, so the
      // comparison is against the full needs the ranking actually reads.
      expect(scoreAgainst(clinician, needsFor(query))).toBe(
        evidence.reduce((sum, n) => sum + n.weight, 0),
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

describe("O1 languages go through the one pipeline (F2)", () => {
  /**
   * THE DEFECT THIS PINS. Until O1, language signals were appended to `matchEvidence` alone by a
   * raw-substring matcher: shown on the card, invisible to `scoreAgainst` and `matchQuality`.
   * A reader who asked only for a language was told "this is everyone we list rather than an
   * order" — beside a card explaining a ranking that never happened. That is the inverse of the
   * drift W221 removed (ranked for a reason not given; here, given a reason not ranked on), and
   * these tests hold the guarantee in both directions.
   */
  it("ranks the speaker first on a language-only request, and calls the order informed", () => {
    // Urdu separates the roster: Dr Saxena declares it, Dr Yadav does not.
    const query = "a GP who speaks Urdu";
    expect(rankClinicians(query)[0]!.id).toBe("anubhav-saxena");
    expect(matchQuality(query)).toBe("informed");
  });

  it("reads an inflected language mention the substring matcher was never tested on", () => {
    const needs = needsFor("an Urdu-speaking GP please");
    expect(needs.some((n) => n.label === "Urdu-speaking")).toBe(true);
  });

  it("scores what the card says: language evidence is never explanation-only", () => {
    const query = "a GP who speaks Urdu";
    for (const clinician of clinicians) {
      const evidence = matchEvidence(clinician, query);
      const spoken = evidence.filter((n) => n.facet.kind === "language");
      // Every language on the card contributed to the score...
      expect(scoreAgainst(clinician, needsFor(query))).toBe(evidence.reduce((s, n) => s + n.weight, 0));
      // ...and only speakers carry it.
      for (const need of spoken) {
        if (need.facet.kind !== "language") continue;
        const asked = need.facet.language.toLowerCase();
        expect(clinician.languages.map((l) => l.toLowerCase())).toContain(asked);
      }
    }
  });

  it("a language shared by the whole roster ties rather than separates, and says so", () => {
    // Both GPs declare Hindi, so a Hindi-only request is an honest tie, not a ranking.
    expect(matchQuality("a GP who speaks Hindi")).toBe("tied");
  });

  it("reaches nothing on a language nobody on the roster declares", () => {
    // Only declared data is matchable: an undeclared language must not invent a signal.
    expect(needsFor("a GP who speaks Tamil").filter((n) => n.facet.kind === "language")).toEqual([]);
    expect(matchQuality("a GP who speaks Tamil")).toBe("unmatched");
  });

  it("never treats English as a match reason", () => {
    expect(languageNeeds("an English speaking GP", ["English", "Hindi"])).toEqual([]);
  });

  it("counts an asked language once however it is cased or repeated", () => {
    const needs = languageNeeds("urdu URDU Urdu", ["Urdu", "urdu"]);
    expect(needs).toHaveLength(1);
  });
});

describe("O2 breadth has a price (F1)", () => {
  /**
   * THE DEFECT THIS PINS. `scoreAgainst` was a raw sum over declared facets — monotone in
   * declarations, so at a self-declaring roster ticking every interview box was the dominant
   * strategy. Two prices now exist: a facet's weight is discounted by how much of the roster
   * declares it (rarity separates; universality does not), and a "sometimes" declaration earns
   * half of an "often" one. Both are the clinician's or the roster's own data, both sayable.
   */
  it("discounts a facet by how much of the roster declares it, but never to zero", () => {
    // Hindi is declared by both GPs; Urdu by one. Equal authored weight, unequal separation.
    const needs = needsFor("a GP who speaks Hindi and Urdu");
    const hindi = needs.find((n) => n.label === "Hindi-speaking")!;
    const urdu = needs.find((n) => n.label === "Urdu-speaking")!;
    expect(urdu.weight).toBeGreaterThan(hindi.weight);
    expect(hindi.weight).toBeGreaterThan(0);
  });

  it("a facet the whole roster declares cannot change the relative order", () => {
    const withoutUniversal = rankClinicians("a GP who speaks Urdu").map((c) => c.id);
    const withUniversal = rankClinicians("a GP who speaks Urdu and also Hindi").map((c) => c.id);
    expect(withUniversal).toEqual(withoutUniversal);
  });

  it("a 'sometimes' declaration answers at half the weight of an 'often' one", () => {
    const base = clinicians[0]!;
    const often = { ...base, careAreas: ["sleep" as const], careAreasSometimes: [] };
    const sometimes = { ...base, careAreas: [], careAreasSometimes: ["sleep" as const] };
    const needs = needsFor("my sleep has never been right");
    const sleep = needs.filter((n) => n.facet.kind === "care" && n.facet.area === "sleep");
    expect(sleep).toHaveLength(1);
    expect(scoreAgainst(sometimes, sleep)).toBe(scoreAgainst(often, sleep) / 2);
  });

  it("the card's evidence carries the earned weight, not the authored one", () => {
    const base = clinicians[0]!;
    const sometimes = { ...base, careAreas: [], careAreasSometimes: ["sleep" as const] };
    const evidence = matchEvidence(sometimes, "my sleep has never been right");
    const claimed = evidence.find((n) => n.facet.kind === "care" && n.facet.area === "sleep")!;
    expect(scoreAgainst(sometimes, needsFor("my sleep has never been right"))).toBe(claimed.weight);
  });
});
