import { describe, expect, it } from "vitest";
import {
  tallyOutcomes,
  USEFULNESS_OPTIONS,
  validateSubmission,
} from "@/audit/usefulness";
import type { OutcomeRecord, PracticeId, VisitUsefulness } from "@/domain/types";

const PRACTICE = "prac-1" as PracticeId;

function sub(usefulness: string[], reasonable: boolean, appointmentId = "apt-1") {
  return { appointmentId, usefulness, clinicianJudgedReasonable: reasonable };
}

describe("validateSubmission", () => {
  it("normalises a valid submission into an OutcomeRecord", () => {
    const result = validateSubmission(sub(["medication_reviewed", "preventive_care"], true), PRACTICE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record).toEqual({
      appointmentId: "apt-1",
      practiceId: PRACTICE,
      usefulness: ["medication_reviewed", "preventive_care"],
      clinicianJudgedReasonable: true,
    });
  });

  it("de-duplicates repeated options", () => {
    const result = validateSubmission(sub(["preventive_care", "preventive_care"], true), PRACTICE);
    expect(result.ok && result.record.usefulness).toEqual(["preventive_care"]);
  });

  it("rejects unknown options", () => {
    expect(validateSubmission(sub(["not_a_real_option"], false), PRACTICE)).toEqual({
      ok: false,
      error: "unknown_option",
    });
  });

  it("rejects 'unnecessary' combined with a positive action", () => {
    expect(validateSubmission(sub(["unnecessary", "referral_made"], false), PRACTICE)).toEqual({
      ok: false,
      error: "unnecessary_conflict",
    });
  });

  it("rejects 'reasonable' with no action recorded", () => {
    expect(validateSubmission(sub([], true), PRACTICE)).toEqual({
      ok: false,
      error: "reasonable_requires_action",
    });
    expect(validateSubmission(sub(["no_action_required"], true), PRACTICE)).toEqual({
      ok: false,
      error: "reasonable_requires_action",
    });
  });

  it("allows an empty/no-action record when the visit is judged not reasonable", () => {
    expect(validateSubmission(sub([], false), PRACTICE).ok).toBe(true);
    expect(validateSubmission(sub(["no_action_required"], false), PRACTICE).ok).toBe(true);
    expect(validateSubmission(sub(["unnecessary"], false), PRACTICE).ok).toBe(true);
  });

  it("covers every declared option as a valid category", () => {
    for (const { value } of USEFULNESS_OPTIONS) {
      const reasonable = value !== "no_action_required" && value !== "unnecessary";
      expect(validateSubmission(sub([value], reasonable), PRACTICE).ok).toBe(true);
    }
  });
});

describe("tallyOutcomes", () => {
  const records: OutcomeRecord[] = [
    { appointmentId: "a" as never, practiceId: PRACTICE, usefulness: ["medication_reviewed"], clinicianJudgedReasonable: true },
    { appointmentId: "b" as never, practiceId: PRACTICE, usefulness: ["preventive_care", "referral_made"], clinicianJudgedReasonable: true },
    { appointmentId: "c" as never, practiceId: PRACTICE, usefulness: ["unnecessary"], clinicianJudgedReasonable: false },
  ];

  it("counts audited, reasonable, unnecessary and per-category", () => {
    const tally = tallyOutcomes(records);
    expect(tally.audited).toBe(3);
    expect(tally.reasonable).toBe(2);
    expect(tally.reasonablePct).toBe(67);
    expect(tally.unnecessary).toBe(1);
    expect(tally.byCategory.medication_reviewed).toBe(1);
    expect(tally.byCategory.referral_made).toBe(1);
    expect(tally.byCategory.care_plan_updated).toBe(0);
  });

  it("handles an empty set without dividing by zero", () => {
    const tally = tallyOutcomes([]);
    expect(tally).toMatchObject({ audited: 0, reasonable: 0, reasonablePct: 0, unnecessary: 0 });
    expect(Object.values(tally.byCategory).every((n) => n === 0)).toBe(true);
  });

  it("byCategory keys are exactly the declared options", () => {
    const tally = tallyOutcomes([]);
    const expected = USEFULNESS_OPTIONS.map((o) => o.value as VisitUsefulness).sort();
    expect(Object.keys(tally.byCategory).sort()).toEqual(expected);
  });
});
