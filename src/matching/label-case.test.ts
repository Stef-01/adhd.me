// O118: a facet label lowered into a sentence, without breaking the words that must not be.

import { describe, expect, it } from "vitest";
import { clinicians, labelInSentence, missedAskCopy, missedAskParts, needsFor } from "@/demo/clinicians";
import { type NeedSignal } from "@/matching/needs";
import { CARE_AREA_LABELS } from "@/onboarding/types";
import { EI_QUALITIES, EI_QUALITY_KEYS } from "@/demo/emotional-fit";

const care = (label: string): NeedSignal =>
  ({ facet: { kind: "care", area: "adhd-assessment" }, matched: "", label, weight: 0 });
const language = (label: string): NeedSignal =>
  ({ facet: { kind: "language", language: "Hindi" }, matched: "", label, weight: 0 });

describe("O118 lowering a label into a sentence", () => {
  /**
   * PINNED BY EXAMPLE, NOT BY RESTATING THE RULE. Each case below is a real label from the
   * vocabulary and the exact string a patient reads. A test that re-implemented the rule would
   * agree with the code by construction and catch nothing.
   */
  it("leaves an acronym at the start alone", () => {
    expect(labelInSentence(care("ADHD assessment"))).toBe("ADHD assessment");
    expect(labelInSentence(care("ADHD in children and adolescents"))).toBe("ADHD in children and adolescents");
  });

  it("never touches an interior word, which is what saves PTSD and GP", () => {
    expect(labelInSentence(care("Trauma and PTSD"))).toBe("trauma and PTSD");
    expect(labelInSentence(care("A woman GP"))).toBe("a woman GP");
  });

  it("leaves a language label alone, because it is a proper noun by construction", () => {
    expect(labelInSentence(language("Hindi-speaking"))).toBe("Hindi-speaking");
    expect(labelInSentence(language("Urdu-speaking"))).toBe("Urdu-speaking");
  });

  it("lowers the ordinary labels, which is why lowering exists at all", () => {
    expect(labelInSentence(care("A longer first appointment"))).toBe("a longer first appointment");
    expect(labelInSentence(care("Bulk billing"))).toBe("bulk billing");
    expect(labelInSentence(care("Non-judgmental"))).toBe("non-judgmental");
    expect(labelInSentence(care("Calm and steadying"))).toBe("calm and steadying");
  });

  /**
   * THE SWEEP THAT MAKES THIS COMPLETE RATHER THAN ANECDOTAL.
   *
   * Every label in the whole vocabulary, checked for the failure the unit exists to stop: a
   * capital letter that was authored and then lost. If somebody adds a facet called "NDIS
   * planning" tomorrow, this fails before a patient reads "ndis planning".
   */
  it("loses no authored capital, across every label in the vocabulary", () => {
    const labels = [
      ...CARE_AREA_LABELS.map((entry) => entry.label),
      ...EI_QUALITY_KEYS.map((key) => EI_QUALITIES[key].label),
      "A woman GP", "By phone or telehealth", "Bulk billing", "A longer first appointment",
    ];
    for (const label of labels) {
      const said = labelInSentence(care(label));
      // Every capital except a leading one must survive exactly where it was authored.
      expect(said.slice(1), `"${label}" lost a capital`).toBe(label.slice(1));
    }
  });

  /**
   * The parts exist so the profile can emphasise the ASK inside a muted line without composing
   * its own sentence — the duplication that let O117's console panel reproduce this bug by
   * copying the wording. Pinned so a later "simplification" to one flat string has to notice.
   */
  it("returns parts that join back to exactly the sentence", () => {
    const need = care("A longer first appointment");
    const { before, label, after } = missedAskParts(need);
    expect(`${before}${label}${after}`).toBe(missedAskCopy(need));
    expect(label).toBe("a longer first appointment");
  });

  it("the sentence is composed once and read everywhere", () => {
    const need = needsFor("I want ADHD assessment", clinicians)[0]!;
    expect(missedAskCopy(need)).toContain("not something they declare");
    expect(missedAskCopy(need)).toContain("Another listing may");
    // W193: a fact about a declaration, never a claim about ability.
    for (const forbidden of ["cannot", "unable", "does not do"]) {
      expect(missedAskCopy(need).toLowerCase()).not.toContain(forbidden);
    }
  });
});
