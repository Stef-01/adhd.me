// M1 verify gate: both rankings are weighted sums of a printed breakdown (the O8 arithmetic
// law), the weights are global and sum to 1, capacity adjusts the patient side, and a GP's
// declared minimum fit makes a patient unacceptable before any proposal.

import { describe, expect, it } from "vitest";
import type { Candidate } from "./candidates";
import { GP_WEIGHTS, PATIENT_WEIGHTS, rankGPsForPatient, rankPatientsForGP } from "./ranking";
import { gp, patient } from "./test-fixtures";

const candidate = (overrides: Parameters<typeof gp>[0], similarity = 0.6, distanceKm: number | null = 3): Candidate => ({
  gp: gp(overrides),
  similarity,
  distanceKm,
});

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("M1 the weights are declared, global, and sum to one", () => {
  it("patient side", () => expect(sum(Object.values(PATIENT_WEIGHTS))).toBeCloseTo(1, 9));
  it("GP side", () => expect(sum(Object.values(GP_WEIGHTS))).toBeCloseTo(1, 9));
});

describe("M1 the patient side ranks the shortlist", () => {
  it("prints a breakdown whose weighted parts sum to the total, and a sentence per part", () => {
    const [ranked] = rankGPsForPatient(patient(), [candidate({})]);
    expect(ranked).toBeDefined();
    expect(ranked!.score).toBeCloseTo(sum(ranked!.breakdown.map((b) => b.weighted)), 3);
    for (const b of ranked!.breakdown) {
      expect(b.raw).toBeGreaterThanOrEqual(0);
      expect(b.raw).toBeLessThanOrEqual(1);
      expect(b.sentence.length).toBeGreaterThan(8);
    }
    expect(ranked!.breakdown.map((b) => b.criterion)).toEqual(["similarity", "capacity", "communication", "consultStyle", "proximity"]);
  });

  it("adjusts similarity by declared capacity: same bio, more places open, ranks higher", () => {
    const ranked = rankGPsForPatient(patient(), [
      candidate({ id: "full", credentials: { caseloadCapacityCurrent: 1 } }),
      candidate({ id: "open", credentials: { caseloadCapacityCurrent: 8 } }),
    ]);
    expect(ranked.map((r) => r.gpId)).toEqual(["open", "full"]);
  });

  it("scores the manner asked for against the manner declared", () => {
    const p = patient({ signals: { communicationPreference: ["unhurried", "non_judgmental"] } });
    const [ranked] = rankGPsForPatient(p, [candidate({ credentials: { communicationStyle: ["unhurried"] } })]);
    const communication = ranked!.breakdown.find((b) => b.criterion === "communication")!;
    expect(communication.raw).toBe(0.5);
    expect(communication.sentence).toBe("Declares 1 of the 2 ways of working asked for.");
  });

  it("scores an unresolved distance at the midpoint and says so", () => {
    const [ranked] = rankGPsForPatient(patient(), [candidate({}, 0.5, null)]);
    const proximity = ranked!.breakdown.find((b) => b.criterion === "proximity")!;
    expect(proximity.raw).toBe(0.5);
    expect(proximity.sentence).toMatch(/gazetteer/);
  });

  it("breaks an exact tie on id, and the order does not depend on arrival", () => {
    const a = candidate({ id: "b" });
    const b = candidate({ id: "a" });
    expect(rankGPsForPatient(patient(), [a, b]).map((r) => r.gpId)).toEqual(["a", "b"]);
    expect(rankGPsForPatient(patient(), [b, a]).map((r) => r.gpId)).toEqual(["a", "b"]);
  });
});

describe("M1 the GP side ranks incoming patients by fit to the declaration", () => {
  it("prints a breakdown whose weighted parts sum to the total", () => {
    const [ranked] = rankPatientsForGP(gp(), [{ patient: patient(), similarity: 0.7 }]);
    expect(ranked!.score).toBeCloseTo(sum(ranked!.breakdown.map((b) => b.weighted)), 3);
    expect(ranked!.acceptable).toBe(true);
  });

  it("prefers the age group and comorbidity mix the GP asked for", () => {
    const g = gp({ preferences: { ageGroups: ["adults"] }, credentials: { caseloadMix: ["anxiety"] } });
    const ranked = rankPatientsForGP(g, [
      { patient: patient({ id: "older", signals: { ageGroup: "older-adults" } }), similarity: 0.6 },
      { patient: patient({ id: "adult-anxious", signals: { ageGroup: "adults", comorbidities: ["anxiety"] } }), similarity: 0.6 },
    ]);
    expect(ranked.map((r) => r.patientId)).toEqual(["adult-anxious", "older"]);
  });

  it("makes a patient unacceptable below the declared minimum fit, and says why", () => {
    const strict = gp({ preferences: { minimumFit: 0.9, ageGroups: ["older-adults"], consultStyles: ["in-person"], billingAccepted: ["private"] } });
    const [ranked] = rankPatientsForGP(strict, [{ patient: patient({ signals: { preferredConsultStyle: "telehealth", billingPreference: "bulk-billing" } }), similarity: 0.2 }]);
    expect(ranked!.acceptable).toBe(false);
    expect(ranked!.unacceptableBecause).toBe("below_minimum_fit");
  });

  it("declines complex comorbidity before any proposal when the GP did not ask for it", () => {
    const g = gp({ preferences: { acceptsComplexComorbidity: false } });
    const [ranked] = rankPatientsForGP(g, [{ patient: patient({ signals: { comorbidities: ["anxiety", "depression"] } }), similarity: 0.9 }]);
    expect(ranked!.acceptable).toBe(false);
    expect(ranked!.unacceptableBecause).toBe("complex_comorbidity_declined");
    expect(ranked!.breakdown.find((b) => b.criterion === "comorbidity")!.sentence).toMatch(/2 presentations/);
  });

  it("never reads anything but declared facts: no sentence contains the narrative", () => {
    const p = patient({ narrativeText: "ZEBRAWORD my private story here" });
    const [ranked] = rankPatientsForGP(gp(), [{ patient: p, similarity: 0.5 }]);
    for (const b of ranked!.breakdown) expect(b.sentence).not.toMatch(/ZEBRAWORD/);
    const [mine] = rankGPsForPatient(p, [candidate({})]);
    for (const b of mine!.breakdown) expect(b.sentence).not.toMatch(/ZEBRAWORD/);
  });
});
