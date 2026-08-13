// W68 verify gate: exclusions are honoured ahead of ranking.
//
// The ordering assertion is the point. If a rail ran after ranking, a red-flagged patient
// could be ranked into a batch and only removed by luck of position — so the tests check
// that exclusion is a property of the SET, independent of order and of batch size.

import { describe, expect, it } from "vitest";
import type { ConditionCode, PatientId, PracticeId } from "@/domain/types";
import type { CareGap } from "./caregap";
import { rankGapAware } from "./ranking";
import {
  applySafetyRails,
  loadSafetyRules,
  SHIPPED_SAFETY_RULES,
  type PatientSafetyFlag,
  type SafetyRule,
} from "./safety-rails";

const PRACTICE = "prac-1" as PracticeId;
const OTHER = "prac-2" as PracticeId;
const COND = "placeholder_register_a" as ConditionCode;

function gap(patientId: string, practiceId = PRACTICE, conditionCode = COND): CareGap {
  return {
    notAClinicalRecommendation: true,
    practiceId,
    patientId: patientId as PatientId,
    conditionCode,
    intervalId: "iv-a" as CareGap["intervalId"],
    intervalMonths: 12,
    lastRelevantVisit: "2020-01-01",
    monthsSinceLastVisit: 60,
    basis: "interval_elapsed",
  };
}

const RULE: SafetyRule = {
  conditionCode: COND,
  flag: "placeholder_flag",
  rationale: "Placeholder rule for mechanism tests — not clinical guidance.",
};

const flag = (patientId: string, practiceId = PRACTICE, f = "placeholder_flag"): PatientSafetyFlag => ({
  practiceId,
  patientId: patientId as PatientId,
  flag: f,
  setAt: "2026-01-01T00:00:00Z",
});

describe("W68 no clinical content ships", () => {
  it("the shipped rule set is empty pending the G5 ruling", () => {
    expect(SHIPPED_SAFETY_RULES).toEqual([]);
  });

  it("with no authored rules, nothing is routed and nothing is dropped", () => {
    const gaps = [gap("pat-1"), gap("pat-2")];
    const out = applySafetyRails(gaps, [flag("pat-1")]);
    expect(out.invitable).toHaveLength(2);
    expect(out.routedToUsualGp).toEqual([]);
  });
});

describe("W68 exclusions route rather than drop", () => {
  it("a flagged patient is withheld AND surfaced with the reason", () => {
    const out = applySafetyRails([gap("pat-1"), gap("pat-2")], [flag("pat-1")], [RULE]);
    expect(out.invitable.map((g) => g.patientId)).toEqual(["pat-2"]);
    // Silence is the failure a safety rail exists to prevent, so the practice must see them.
    expect(out.routedToUsualGp).toEqual([
      { patientId: "pat-1", conditionCode: COND, flag: "placeholder_flag", rationale: RULE.rationale },
    ]);
  });

  it("every gap is accounted for — nothing vanishes", () => {
    const gaps = [gap("pat-1"), gap("pat-2"), gap("pat-3")];
    const out = applySafetyRails(gaps, [flag("pat-2")], [RULE]);
    expect(out.invitable.length + out.routedToUsualGp.length).toBe(gaps.length);
  });

  it("a flag with no matching rule does not route", () => {
    const out = applySafetyRails([gap("pat-1")], [flag("pat-1", PRACTICE, "unrelated_flag")], [RULE]);
    expect(out.invitable).toHaveLength(1);
    expect(out.routedToUsualGp).toEqual([]);
  });

  it("a rule for another condition does not route", () => {
    const out = applySafetyRails(
      [gap("pat-1", PRACTICE, "other_condition" as ConditionCode)],
      [flag("pat-1")],
      [RULE],
    );
    expect(out.invitable).toHaveLength(1);
  });
});

describe("W68 exclusions are honoured ahead of ranking", () => {
  it("a flagged patient never reaches the ranker, whatever their rank would be", () => {
    const gaps = [gap("pat-1"), gap("pat-2"), gap("pat-3")];
    const { invitable, routedToUsualGp } = applySafetyRails(gaps, [flag("pat-1")], [RULE]);
    const ranked = rankGapAware(
      invitable.map((g) => ({
        id: g.patientId,
        practiceId: PRACTICE,
        usualClinicianId: null,
        smsConsent: true,
        optedOut: false,
        lastAttendedAt: "2025-01-01",
        futureBookingAt: null,
        activeRecall: false,
        chronicCare: false,
        holdout: false,
      })),
      invitable,
    );
    expect(ranked.map((p) => p.id)).not.toContain("pat-1");
    expect(routedToUsualGp).toHaveLength(1);
  });

  it("exclusion does not depend on position in the input", () => {
    // A rail that ran after ranking would let batch size decide who was protected.
    const forwards = applySafetyRails([gap("pat-1"), gap("pat-2")], [flag("pat-2")], [RULE]);
    const backwards = applySafetyRails([gap("pat-2"), gap("pat-1")], [flag("pat-2")], [RULE]);
    expect(forwards.routedToUsualGp).toEqual(backwards.routedToUsualGp);
    expect(forwards.invitable.map((g) => g.patientId)).toEqual(["pat-1"]);
    expect(backwards.invitable.map((g) => g.patientId)).toEqual(["pat-1"]);
  });
});

describe("W68 tenancy", () => {
  it("one practice's flag cannot route another practice's patient", () => {
    const out = applySafetyRails([gap("pat-1", PRACTICE)], [flag("pat-1", OTHER)], [RULE]);
    expect(out.invitable).toHaveLength(1);
    expect(out.routedToUsualGp).toEqual([]);
  });
});

describe("W68 rules must explain themselves", () => {
  it("loads a well-formed rule", () => {
    const { rules, rejected } = loadSafetyRules([RULE]);
    expect(rules).toHaveLength(1);
    expect(rejected).toEqual([]);
  });

  it.each([
    ["no conditionCode", { ...RULE, conditionCode: "" }, /conditionCode/],
    ["no flag", { ...RULE, flag: "" }, /flag/],
    ["no rationale", { ...RULE, rationale: "" }, /rationale/],
    ["a rationale too short to review", { ...RULE, rationale: "red flag" }, /rationale/],
  ])("refuses a rule with %s", (_label, row, shape) => {
    const { rules, rejected } = loadSafetyRules([row]);
    expect(rules).toEqual([]);
    expect(rejected[0]?.reason).toMatch(shape);
  });

  it("keeps a good rule when a neighbouring one is refused", () => {
    const { rules, rejected } = loadSafetyRules([{ ...RULE, rationale: "" }, RULE]);
    expect(rules).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });
});
