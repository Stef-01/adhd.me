// W59 verify gate: a property test — no care gap makes an ineligible patient eligible.
//
// This is tested exhaustively rather than by sampling. The W4 decision has a closed set of
// exclusion reasons, so the property is checked against EVERY one of them, crossed with
// gap/no-gap and filter on/off. If someone later adds an exclusion reason to W4, the
// exhaustiveness check below fails until it is covered here too — the property cannot
// silently stop being exhaustive.

import { describe, expect, it } from "vitest";
import type { ConditionCode, PatientId, PracticeId } from "@/domain/types";
import type { EligibilityResult, ExclusionReason } from "@/engine/eligibility";
import type { CareGap } from "./caregap";
import {
  DEFAULT_CARE_GAP_FILTER,
  narrowToCareGaps,
  withCareGapFilter,
  type CareGapFilterConfig,
} from "./eligibility";

const PRACTICE = "prac-1" as PracticeId;
const PAT = { id: "pat-1" as PatientId };

/** Every reason W4 can refuse for. Kept in sync with the union by the check below. */
const ALL_EXCLUSIONS: ExclusionReason[] = [
  "opted_out",
  "no_sms_consent",
  "holdout_arm",
  "active_recall",
  "future_booking",
  "seen_too_recently",
  "never_attended",
  "not_usual_clinician",
  "not_chronic_care",
  "invite_cap_reached",
  "clinician_not_participating",
];

function gap(patientId = "pat-1"): CareGap {
  return {
    notAClinicalRecommendation: true,
    practiceId: PRACTICE,
    patientId: patientId as PatientId,
    conditionCode: "placeholder_register_a" as ConditionCode,
    intervalId: "iv-a" as CareGap["intervalId"],
    intervalMonths: 12,
    lastRelevantVisit: "2020-01-01",
    monthsSinceLastVisit: 79,
    basis: "interval_elapsed",
  };
}

const ON: CareGapFilterConfig = { requireCareGap: true };

describe("W59 property: a care gap can never widen eligibility", () => {
  it("holds for every W4 exclusion reason, with and without a gap, filter on and off", () => {
    for (const reason of ALL_EXCLUSIONS) {
      const base: EligibilityResult = { eligible: false, reason };
      for (const gaps of [[], [gap()]]) {
        for (const config of [DEFAULT_CARE_GAP_FILTER, ON]) {
          const out = withCareGapFilter(base, PAT, gaps, config);
          expect(out.eligible, `${reason} must stay ineligible`).toBe(false);
          // The original reason survives — the audit trail keeps the most serious cause
          // rather than having it overwritten by "no_care_gap".
          expect(out).toEqual({ eligible: false, reason });
        }
      }
    }
  });

  it("the exclusion list above is exhaustive over W4's union", () => {
    // A compile-time check: if W4 gains a reason, this assignment stops typechecking, so
    // the property test cannot quietly cover less than the whole union.
    const covered: Record<ExclusionReason, true> = {
      opted_out: true,
      no_sms_consent: true,
      holdout_arm: true,
      active_recall: true,
      future_booking: true,
      seen_too_recently: true,
      never_attended: true,
      not_usual_clinician: true,
      not_chronic_care: true,
      invite_cap_reached: true,
      clinician_not_participating: true,
    };
    expect(Object.keys(covered).sort()).toEqual([...ALL_EXCLUSIONS].sort());
  });

  it("an opted-out patient with a gap is still refused, and still for opting out", () => {
    // The headline case: a scheduling observation must never overrule consent.
    const out = withCareGapFilter({ eligible: false, reason: "opted_out" }, PAT, [gap()], ON);
    expect(out).toEqual({ eligible: false, reason: "opted_out" });
  });
});

describe("W59 narrowing behaviour", () => {
  it("is off by default — the register is an input a practice opts into", () => {
    expect(DEFAULT_CARE_GAP_FILTER.requireCareGap).toBe(false);
    expect(withCareGapFilter({ eligible: true }, PAT, [], DEFAULT_CARE_GAP_FILTER)).toEqual({ eligible: true });
  });

  it("with the filter on, an eligible patient WITH a gap stays eligible", () => {
    expect(withCareGapFilter({ eligible: true }, PAT, [gap()], ON)).toEqual({ eligible: true });
  });

  it("with the filter on, an eligible patient WITHOUT a gap is narrowed out", () => {
    expect(withCareGapFilter({ eligible: true }, PAT, [], ON)).toEqual({ eligible: false, reason: "no_care_gap" });
  });

  it("another patient's gap does not carry over", () => {
    expect(withCareGapFilter({ eligible: true }, PAT, [gap("pat-2")], ON)).toEqual({
      eligible: false,
      reason: "no_care_gap",
    });
  });
});

describe("W59 narrowToCareGaps returns a subset, always", () => {
  const panel = [{ id: "pat-1" as PatientId }, { id: "pat-2" as PatientId }, { id: "pat-3" as PatientId }];

  it("keeps only patients with a gap", () => {
    expect(narrowToCareGaps(panel, [gap("pat-2")]).map((p) => p.id)).toEqual(["pat-2"]);
  });

  it("never returns a patient absent from the base set, even if that patient has a gap", () => {
    const out = narrowToCareGaps(panel, [gap("pat-9")]);
    expect(out).toEqual([]);
    // The subset property, stated directly.
    const baseIds = new Set(panel.map((p) => p.id as string));
    expect(out.every((p) => baseIds.has(p.id as string))).toBe(true);
  });

  it("no gap set can grow the base set", () => {
    for (const gaps of [[], [gap("pat-1")], [gap("pat-1"), gap("pat-2"), gap("pat-9")]]) {
      expect(narrowToCareGaps(panel, gaps).length).toBeLessThanOrEqual(panel.length);
    }
  });

  it("an empty gap set narrows to nothing, not to everything", () => {
    // Fail-closed: a register that produced no gaps must not fall back to the whole panel.
    expect(narrowToCareGaps(panel, [])).toEqual([]);
  });
});
