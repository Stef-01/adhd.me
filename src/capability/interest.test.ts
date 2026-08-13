// W81 (unit half): a clinician states their own interest, and interest is never a
// capability. The console path is asserted in e2e/interest.spec.ts.

import { beforeEach, describe, expect, it } from "vitest";
import type { ClinicianId, ConditionCode, PracticeId } from "@/domain/types";
import {
  MAX_STRENGTH,
  STRENGTH_LABELS,
  clearInterest,
  emptyInterestState,
  interestIn,
  interestsFor,
  saveInterest,
  type InterestState,
} from "./interest";

const PRACTICE = "prac-1" as PracticeId;
const LEE = "clin-lee" as ClinicianId;
const KHAN = "clin-khan" as ClinicianId;
const DIABETES = "cond_diabetes" as ConditionCode;
const CKD = "cond_ckd" as ConditionCode;
const KNOWN = [DIABETES, CKD];

let state: InterestState;
beforeEach(() => {
  state = emptyInterestState();
});

function save(over: Partial<Parameters<typeof saveInterest>[0]> = {}) {
  return saveInterest({
    state,
    practiceId: PRACTICE,
    actingClinicianId: LEE,
    subjectClinicianId: LEE,
    conditionCode: DIABETES,
    strength: 4,
    knownConditions: KNOWN,
    atIso: "2026-08-10T09:00:00Z",
    ...over,
  });
}

describe("W81 stating an interest", () => {
  it("records a clinician's own stated interest", () => {
    const result = save();
    expect(result.ok).toBe(true);
    expect(interestIn(state, PRACTICE, LEE, DIABETES)?.strength).toBe(4);
  });

  it("stamps the provenance W79's constraint admits", () => {
    save();
    expect(interestIn(state, PRACTICE, LEE, DIABETES)?.source).toBe("clinician_self_reported");
  });

  it("refuses one clinician stating an interest for another", () => {
    // A preference someone else recorded for you is not your preference.
    const result = save({ subjectClinicianId: KHAN });
    expect(result).toEqual({ ok: false, reason: "not_own_interest" });
    expect(interestIn(state, PRACTICE, KHAN, DIABETES)).toBeNull();
  });

  it.each([0, 6, -1, 2.5, Number.NaN])("refuses strength %s", (strength) => {
    expect(save({ strength }).ok).toBe(false);
    expect(interestIn(state, PRACTICE, LEE, DIABETES)).toBeNull();
  });

  it("refuses an unknown condition rather than inventing a register", () => {
    const result = save({ conditionCode: "cond_nope" as ConditionCode });
    expect(result).toEqual({ ok: false, reason: "unknown_condition" });
  });

  it("restating replaces rather than duplicating", () => {
    save({ strength: 2 });
    save({ strength: 5 });
    expect(interestsFor(state, PRACTICE, LEE)).toHaveLength(1);
    expect(interestIn(state, PRACTICE, LEE, DIABETES)?.strength).toBe(5);
  });

  it("clearing means 'not stated', not strength zero", () => {
    save();
    clearInterest(state, PRACTICE, LEE, DIABETES);
    expect(interestIn(state, PRACTICE, LEE, DIABETES)).toBeNull();
    expect(interestsFor(state, PRACTICE, LEE)).toEqual([]);
  });

  it("is scoped by practice and clinician", () => {
    save();
    save({ actingClinicianId: KHAN, subjectClinicianId: KHAN, strength: 1 });

    expect(interestsFor(state, PRACTICE, LEE)).toHaveLength(1);
    expect(interestIn(state, PRACTICE, KHAN, DIABETES)?.strength).toBe(1);
    // W78's finding applied up front: a colliding id in another practice sees nothing.
    expect(interestsFor(state, "prac-2" as PracticeId, LEE)).toEqual([]);
  });

  it("lists strongest first, then stably by condition", () => {
    save({ conditionCode: CKD, strength: 5 });
    save({ conditionCode: DIABETES, strength: 5 });
    const listed = interestsFor(state, PRACTICE, LEE).map((i) => i.conditionCode);
    expect(listed).toEqual([...listed].sort());
  });
});

describe("W81 interest is appetite, never ability", () => {
  it("every strength label describes how much work, not how good", () => {
    // A self-reported "expert" rung is exactly the claim Ahpra advertising rules and W79's
    // separation both exist to prevent.
    for (const label of Object.values(STRENGTH_LABELS)) {
      expect(label.toLowerCase()).toMatch(/take|share/);
      for (const banned of ["expert", "specialist", "skilled", "experienced", "qualified", "best", "advanced"]) {
        expect(label.toLowerCase(), `strength label must not imply ability: ${label}`).not.toContain(banned);
      }
    }
  });

  it("the scale is bounded, so it cannot grow into a rating", () => {
    expect(Object.keys(STRENGTH_LABELS)).toHaveLength(MAX_STRENGTH);
    expect(MAX_STRENGTH).toBe(5);
  });

  it("an interest record cannot claim to be derived or verified", () => {
    save();
    const source: "clinician_self_reported" = interestIn(state, PRACTICE, LEE, DIABETES)!.source;
    expect(source).toBe("clinician_self_reported");
  });
});
