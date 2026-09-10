// M1 verify gate: every hard filter refuses by name, never silently; the shortlist is bounded,
// deterministic and order-independent; distance is a gazetteer fact or an honest null.

import { describe, expect, it } from "vitest";
import { HARD_FILTER_COPY, SHORTLIST_MAX, generateCandidates, hardFilterReasons, type HardFilterReason } from "./candidates";
import { embedder, gp, patient } from "./test-fixtures";

const ALL_REASONS: HardFilterReason[] = [
  "condition_not_treated",
  "not_accepting",
  "no_capacity",
  "verification_rejected",
  "age_group_not_treated",
  "billing_not_accepted",
  "telehealth_unavailable",
  "out_of_reach",
];

describe("M1 hard filters refuse by name, never silently", () => {
  it("passes a GP who declares everything the patient asked for", () => {
    expect(hardFilterReasons(patient(), gp())).toEqual([]);
  });

  it.each<[HardFilterReason, () => [ReturnType<typeof patient>, ReturnType<typeof gp>]]>([
    ["condition_not_treated", () => [patient(), gp({ conditions: [] })]],
    ["not_accepting", () => [patient(), gp({ acceptingNewPatients: false })]],
    ["no_capacity", () => [patient(), gp({ credentials: { caseloadCapacityCurrent: 0 } })]],
    ["verification_rejected", () => [patient(), gp({ verificationStatus: "rejected" })]],
    ["age_group_not_treated", () => [patient({ signals: { ageGroup: "children" } }), gp()]],
    ["billing_not_accepted", () => [patient({ signals: { billingPreference: "bulk-billing" } }), gp({ preferences: { billingAccepted: ["private"] } })]],
    ["telehealth_unavailable", () => [patient({ signals: { preferredConsultStyle: "telehealth" } }), gp({ telehealthAvailable: false })]],
    ["out_of_reach", () => [patient({ signals: { preferredConsultStyle: "in-person" }, location: { suburb: "Epping", postcode: null } }), gp({ practiceLocation: { suburb: "Bondi Junction", postcode: null } })]],
  ])("names %s", (reason, build) => {
    const [p, g] = build();
    expect(hardFilterReasons(p, g, 5)).toContain(reason);
  });

  it("collects every applicable reason for one pair rather than stopping at the first", () => {
    const reasons = hardFilterReasons(patient({ signals: { ageGroup: "children" } }), gp({ acceptingNewPatients: false, credentials: { caseloadCapacityCurrent: 0 } }));
    expect(reasons).toEqual(expect.arrayContaining(["not_accepting", "no_capacity", "age_group_not_treated"]));
  });

  it("has copy for every reason, so a new one without copy is a type error and this test both", () => {
    for (const reason of ALL_REASONS) expect(HARD_FILTER_COPY[reason].length).toBeGreaterThan(10);
  });

  it("does not exclude on distance when either suburb is not in the gazetteer", () => {
    const far = gp({ telehealthAvailable: false, practiceLocation: { suburb: "Nowhere Particular", postcode: null } });
    expect(hardFilterReasons(patient({ signals: { preferredConsultStyle: "in-person" } }), far)).toEqual([]);
  });

  it("lets telehealth bridge a distance when the patient is open to either", () => {
    const far = gp({ telehealthAvailable: true, practiceLocation: { suburb: "Bondi Junction", postcode: null } });
    expect(hardFilterReasons(patient({ signals: { preferredConsultStyle: "either" } }), far, 5)).toEqual([]);
    expect(hardFilterReasons(patient({ signals: { preferredConsultStyle: "either" } }), { ...far, telehealthAvailable: false }, 5)).toEqual(["out_of_reach"]);
    // Within the default radius the same GP is in reach either way.
    expect(hardFilterReasons(patient({ signals: { preferredConsultStyle: "in-person" } }), { ...far, telehealthAvailable: false })).toEqual([]);
  });
});

describe("M1 the shortlist", () => {
  const roster = Array.from({ length: 30 }, (_, i) =>
    gp({
      id: `gp-${String(i).padStart(2, "0")}`,
      credentials: { bioLongText: i % 3 === 0 ? "Adult ADHD assessment, unhurried, titration on a schedule." : "General practice, skin checks, travel medicine." },
    }),
  );

  it("caps at the ceiling and orders by similarity then id", () => {
    const { candidates, note } = generateCandidates(patient(), roster, { embedder });
    expect(candidates.length).toBe(SHORTLIST_MAX);
    expect(note).toBeNull();
    for (let i = 1; i < candidates.length; i++) {
      const a = candidates[i - 1]!;
      const b = candidates[i]!;
      expect(a.similarity > b.similarity || (a.similarity === b.similarity && a.gp.id < b.gp.id)).toBe(true);
    }
    expect(candidates[0]!.gp.credentials.bioLongText).toMatch(/Adult ADHD/);
  });

  it("is a function of the roster set, not its order", () => {
    const forward = generateCandidates(patient(), roster, { embedder });
    const reversed = generateCandidates(patient(), [...roster].reverse(), { embedder });
    expect(reversed.candidates.map((c) => c.gp.id)).toEqual(forward.candidates.map((c) => c.gp.id));
    expect(reversed.excluded).toEqual(forward.excluded);
  });

  it("reports every exclusion with its reasons and says when the list is short", () => {
    const small = roster.slice(0, 4).map((g, i) => (i === 0 ? { ...g, acceptingNewPatients: false } : g));
    const { candidates, excluded, note } = generateCandidates(patient(), small, { embedder });
    expect(candidates.length).toBe(3);
    expect(excluded).toEqual([{ gpId: "gp-00", reasons: ["not_accepting"] }]);
    expect(note).toMatch(/Only 3 of 4/);
  });

  it("carries the gazetteer distance on each candidate, null when unresolved", () => {
    const { candidates } = generateCandidates(patient(), [gp({ id: "a" }), gp({ id: "b", practiceLocation: { suburb: "Elsewhere", postcode: null } })], { embedder, min: 1 });
    const byId = new Map(candidates.map((c) => [c.gp.id, c]));
    expect(byId.get("a")!.distanceKm).toBe(0);
    expect(byId.get("b")!.distanceKm).toBeNull();
  });
});
