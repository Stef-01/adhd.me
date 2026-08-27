import { describe, expect, it } from "vitest";
import { clinicians } from "@/demo/clinicians";
import { syntheticClinician } from "@/demo/synthetic-clinician";
import type { CareArea } from "@/demo/care-archetypes";
import type { NeedSignal } from "./needs";
import { REACH_CORPUS } from "./corpus";
import {
  auditSeparation,
  declarationSentence,
  declarationState,
  intervalsDisjoint,
  intervalsSeparate,
  scoreInterval,
} from "./declaration-state";

const careNeed = (area: CareArea, weight = 24): NeedSignal => ({
  facet: { kind: "care", area },
  matched: "test",
  label: "the care area",
  weight,
});

const womanGpNeed: NeedSignal = {
  facet: { kind: "preference", preference: "woman-gp" },
  matched: "test",
  label: "a woman GP",
  weight: 20,
};

const telehealthNeed: NeedSignal = {
  facet: { kind: "preference", preference: "telehealth-first" },
  matched: "test",
  label: "telehealth first appointment",
  weight: 20,
};

describe("M8: declarationState", () => {
  it("is 'declared' for an often declaration and for a sometimes one — both are certain", () => {
    const often = syntheticClinician({ careAreas: ["depression"] as CareArea[] });
    const sometimes = syntheticClinician({ careAreas: [], careAreasSometimes: ["depression"] as CareArea[] });
    expect(declarationState(often, careNeed("depression").facet)).toBe("declared");
    expect(declarationState(sometimes, careNeed("depression").facet)).toBe("declared");
  });

  it("is 'undeclared', never 'declared-no', for every facet kind except gender", () => {
    const silent = syntheticClinician({ careAreas: [], careAreasSometimes: [], manner: [], languages: ["English"] });
    expect(declarationState(silent, careNeed("depression").facet)).toBe("undeclared");
    expect(declarationState(silent, { kind: "manner", trait: "unhurried" })).toBe("undeclared");
    expect(declarationState(silent, { kind: "language", language: "Tamil" })).toBe("undeclared");
    // Not every absent preference is a gender check — telehealth-first, bulk-billing and
    // longer-appointment all read an optional field that can only ever be silent, never "no".
    expect(declarationState(silent, telehealthNeed.facet)).toBe("undeclared");
  });

  it("is 'declared-no' for woman-gp exactly when gender is real and not 'woman' — the one exempt field", () => {
    const man = syntheticClinician({ gender: "man" });
    const nonBinary = syntheticClinician({ gender: "non-binary" });
    const woman = syntheticClinician({ gender: "woman" });
    expect(declarationState(man, womanGpNeed.facet)).toBe("declared-no");
    expect(declarationState(nonBinary, womanGpNeed.facet)).toBe("declared-no");
    expect(declarationState(woman, womanGpNeed.facet)).toBe("declared");
  });
});

describe("M8: scoreInterval", () => {
  it("is an exact point for a declared value, whichever grade it was declared at", () => {
    const often = syntheticClinician({ careAreas: ["depression"] as CareArea[] });
    const sometimes = syntheticClinician({ careAreas: [], careAreasSometimes: ["depression"] as CareArea[] });
    const need = careNeed("depression", 24);
    expect(scoreInterval(often, need)).toEqual({ lo: 24, hi: 24, state: "declared" });
    expect(scoreInterval(sometimes, need)).toEqual({ lo: 12, hi: 12, state: "declared" });
  });

  it("is the zero-width [0, 0] for a real declared-no", () => {
    const man = syntheticClinician({ gender: "man" });
    expect(scoreInterval(man, womanGpNeed)).toEqual({ lo: 0, hi: 0, state: "declared-no" });
  });

  it("is the full [0, weight] range for an undeclared facet — this is the whole point", () => {
    const silent = syntheticClinician({ careAreas: [], careAreasSometimes: [] });
    const need = careNeed("depression", 24);
    expect(scoreInterval(silent, need)).toEqual({ lo: 0, hi: 24, state: "undeclared" });
  });
});

describe("M8: intervalsDisjoint / intervalsSeparate — the ambiguity, proven rather than described", () => {
  it("does NOT separate a declared clinician from an undeclared one — the exact defect F10 names", () => {
    const often = syntheticClinician({ id: "often", careAreas: ["depression"] as CareArea[] });
    const silent = syntheticClinician({ id: "silent", careAreas: [], careAreasSometimes: [] });
    const need = careNeed("depression", 24);
    // Point [24,24] and range [0,24] touch at 24 — overlapping, not disjoint. A silent clinician
    // could, for all this record says, also score 24: the roster's declarations do not rule it
    // out, so nothing here may claim they differ.
    expect(intervalsDisjoint(scoreInterval(often, need), scoreInterval(silent, need))).toBe(false);
    expect(intervalsSeparate(need, [often, silent])).toBe(false);
  });

  it("separates a declared-no clinician from a declared-yes one — the one real case in this schema", () => {
    const man = syntheticClinician({ id: "man", gender: "man" });
    const woman = syntheticClinician({ id: "woman", gender: "woman" });
    expect(intervalsDisjoint(scoreInterval(man, womanGpNeed), scoreInterval(woman, womanGpNeed))).toBe(true);
    expect(intervalsSeparate(womanGpNeed, [man, woman])).toBe(true);
  });

  it("separates two DECLARED clinicians at different grades — certainty needs no third state", () => {
    const often = syntheticClinician({ id: "often", careAreas: ["depression"] as CareArea[] });
    const sometimes = syntheticClinician({
      id: "sometimes",
      careAreas: [],
      careAreasSometimes: ["depression"] as CareArea[],
    });
    const need = careNeed("depression", 24);
    expect(intervalsSeparate(need, [often, sometimes])).toBe(true);
  });

  it("does not separate two undeclared clinicians from each other", () => {
    const a = syntheticClinician({ id: "a", careAreas: [], careAreasSometimes: [] });
    const b = syntheticClinician({ id: "b", careAreas: [], careAreasSometimes: [] });
    expect(intervalsSeparate(careNeed("depression", 24), [a, b])).toBe(false);
  });
});

describe("M8: declarationSentence — three states, three sentences, never the same words", () => {
  const sentences = (["declared", "declared-no", "undeclared"] as const).map((state) =>
    declarationSentence(womanGpNeed, state),
  );

  it("gives every state its own wording", () => {
    expect(new Set(sentences).size).toBe(3);
  });

  it("says 'no' when the state is 'no', and never claims certainty when it is not stated", () => {
    expect(declarationSentence(womanGpNeed, "declared-no")).toMatch(/does not apply/);
    expect(declarationSentence(womanGpNeed, "undeclared")).toMatch(/cannot say/);
    expect(declarationSentence(womanGpNeed, "undeclared")).not.toMatch(/does not apply/);
  });
});

describe("M8: auditSeparation — the module header's claim, pinned against the real roster and corpus", () => {
  it("measures the real gap between 'differs' and 'is provably different', not assumed", () => {
    const result = auditSeparation(
      REACH_CORPUS.map((entry) => entry.text),
      clinicians,
    );
    // MEASURED at this commit, over the real two-clinician roster (`anubhav-saxena`, man;
    // `anusha-saxena`, woman) and the full 447-sentence reach corpus. Re-earned, not inherited:
    // a roster or corpus change that moves these numbers is real news about what this schema can
    // and cannot tell a reader, and the pin exists so that news cannot pass silently.
    // O191 re-pinned: the refugee-register corpus line grew the run 447 -> 448; culturally_attuned differs between the two, so valueDiffers 332 -> 333.
    // O210: valueDiffers 333 -> 336 AND ambiguous 308 -> 311, from three corpus sentences (one per
    // cue that unit closed). A first draft of this note claimed `ambiguous` was unmoved; it is not,
    // and the corrected reading is the more interesting one. Each new sentence reaches a manner
    // facet that exactly one clinician declares — so the pair's SCORES differ (valueDiffers +3) —
    // while the other clinician is UNDECLARED rather than declared-no, which is precisely M8's
    // "we cannot tell": the intervals overlap, so it is ambiguous too (+3). Both counters moving
    // together is the correct shape for a two-person roster where one has answered and one has not.
    // `intervalSeparates` is genuinely unmoved at 25, which is the part worth checking.
    expect(result.valueDiffers).toBe(336);
    expect(result.intervalSeparates).toBe(25);
    expect(result.ambiguous).toBe(311);
    // The named risk, checkable rather than merely asserted: every genuine, uncertainty-free
    // separation this roster's declarations support traces to the one exempt field.
    expect(result.separatingFacetKeys).toEqual(["pref:woman-gp"]);
  });

  it("is non-vacuous: a roster with no real negative anywhere separates on nothing", () => {
    const a = syntheticClinician({ id: "a", gender: "man", careAreas: ["depression"] as CareArea[] });
    const b = syntheticClinician({ id: "b", gender: "man", careAreas: [], careAreasSometimes: [] });
    const result = auditSeparation(["I want help with depression"], [a, b]);
    expect(result.valueDiffers).toBeGreaterThan(0);
    expect(result.intervalSeparates).toBe(0);
    expect(result.separatingFacetKeys).toEqual([]);
  });

  it("is non-vacuous the other way: a synthetic gender split is counted as separating", () => {
    const man = syntheticClinician({ id: "man", gender: "man" });
    const woman = syntheticClinician({ id: "woman", gender: "woman" });
    const result = auditSeparation(["I'd like to see a woman GP"], [man, woman]);
    expect(result.intervalSeparates).toBeGreaterThan(0);
    expect(result.separatingFacetKeys).toEqual(["pref:woman-gp"]);
  });
});
