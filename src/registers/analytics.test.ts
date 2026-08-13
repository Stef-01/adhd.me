// W64 verify gate: golden fixtures for gap-closure by condition.
//
// The fixture is fixed and the whole expected result is asserted as one object, so any
// change to the arithmetic shows up as a diff of the golden rather than as a passing test
// that quietly means something else.

import { describe, expect, it } from "vitest";
import type { ConditionCode, PatientId, PracticeId } from "@/domain/types";

import type { CareGap } from "./caregap";
import {
  explainClosureWithheld,
  MIN_ARM_GAPS,
  type GapClosureEvent,
  type RegisterAnalytics,
  closuresFromAppointments,
  gapClosureByCondition,
} from "./analytics";

const PRACTICE = "prac-1" as PracticeId;

const DIABETES = "cond_diabetes" as ConditionCode;
const CKD = "cond_ckd" as ConditionCode;

function gap(patientId: string, conditionCode: ConditionCode): CareGap {
  return {
    notAClinicalRecommendation: true,
    practiceId: PRACTICE,
    patientId: patientId as PatientId,
    conditionCode,
    intervalId: "i1" as CareGap["intervalId"],
    intervalMonths: 12,
    lastRelevantVisit: "2025-01-01",
    monthsSinceLastVisit: 19,
    basis: "interval_elapsed",
  };
}

/**
 * 50 invite + 30 holdout gaps on diabetes; 20 invite + 20 holdout on CKD.
 * Closures chosen to give round rates: diabetes 60% vs 30%, CKD 50% vs 25%.
 */
function fixture() {
  const gaps: CareGap[] = [];
  const closures: GapClosureEvent[] = [];
  const holdout = new Set<PatientId>();

  const add = (
    prefix: string,
    condition: ConditionCode,
    count: number,
    isHoldout: boolean,
    closeCount: number,
  ) => {
    for (let i = 0; i < count; i += 1) {
      const id = `${prefix}-${i}` as PatientId;
      gaps.push(gap(id, condition));
      if (isHoldout) holdout.add(id);
      if (i < closeCount) closures.push({ patientId: id, conditionCode: condition, at: "2026-03-01" });
    }
  };

  add("dia-inv", DIABETES, 50, false, 30); // 60%
  add("dia-hold", DIABETES, 30, true, 9); //  30%
  add("ckd-inv", CKD, 20, false, 10); //      50%
  add("ckd-hold", CKD, 20, true, 5); //       25%

  return { gaps, closures, holdout };
}

describe("W64 gap closure — golden fixture", () => {
  const f = fixture();

  const GOLDEN: RegisterAnalytics = {
    conditions: [
      {
        conditionCode: CKD,
        invite: { gapsAtStart: 20, closed: 10, closureRate: 0.5 },
        holdout: { gapsAtStart: 20, closed: 5, closureRate: 0.25 },
        differencePoints: 25,
        withheld: null,
      },
      {
        conditionCode: DIABETES,
        invite: { gapsAtStart: 50, closed: 30, closureRate: 0.6 },
        holdout: { gapsAtStart: 30, closed: 9, closureRate: 0.3 },
        differencePoints: 30,
        withheld: null,
      },
    ],
    ambiguousClosures: 0,
    ambiguousGapClosures: 0,
  };

  it("matches the golden output exactly", () => {
    expect(gapClosureByCondition(f.gaps, f.closures, f.holdout)).toEqual(GOLDEN);
  });

  it("reports conditions in a stable order", () => {
    const codes = gapClosureByCondition(f.gaps, f.closures, f.holdout).conditions.map(
      (c) => c.conditionCode,
    );
    expect(codes).toEqual([...codes].sort());
  });

  it("is the difference that carries the meaning, not the invite rate", () => {
    // Both arms improving equally is a zero-difference result, however good the raw rate
    // looks — the check that a vanity number cannot sneak through as impact.
    const closures = f.gaps.map((g) => ({
      patientId: g.patientId,
      conditionCode: g.conditionCode,
      at: "2026-03-01",
    }));
    const result = gapClosureByCondition(f.gaps, closures, f.holdout);

    for (const c of result.conditions) {
      expect(c.invite.closureRate).toBe(1);
      expect(c.differencePoints).toBe(0);
    }
  });
});

describe("W64 holdout discipline", () => {
  const holdout = new Set<PatientId>();

  it("withholds the difference when the register has no holdout arm", () => {
    const gaps = Array.from({ length: 40 }, (_, i) => gap(`inv-${i}`, DIABETES));
    const result = gapClosureByCondition(gaps, [], holdout);

    expect(result.conditions[0]!.withheld).toBe("no_holdout_arm");
    expect(result.conditions[0]!.differencePoints).toBeNull();
    // Counts survive; only the claim is withheld.
    expect(result.conditions[0]!.invite.gapsAtStart).toBe(40);
  });

  it("withholds the difference when either arm is too thin", () => {
    const gaps = [
      ...Array.from({ length: 40 }, (_, i) => gap(`inv-${i}`, DIABETES)),
      ...Array.from({ length: 5 }, (_, i) => gap(`hold-${i}`, DIABETES)),
    ];
    const thinHoldout = new Set(
      Array.from({ length: 5 }, (_, i) => `hold-${i}` as PatientId),
    );

    const result = gapClosureByCondition(gaps, [], thinHoldout);
    expect(result.conditions[0]!.withheld).toBe("cohort_too_small");
    expect(result.conditions[0]!.differencePoints).toBeNull();
  });

  it("the minimum is a stated option, not a hidden constant", () => {
    const gaps = [
      ...Array.from({ length: 6 }, (_, i) => gap(`inv-${i}`, DIABETES)),
      ...Array.from({ length: 6 }, (_, i) => gap(`hold-${i}`, DIABETES)),
    ];
    const holdoutIds = new Set(Array.from({ length: 6 }, (_, i) => `hold-${i}` as PatientId));

    expect(gapClosureByCondition(gaps, [], holdoutIds, { minArmGaps: 5 }).conditions[0]!.withheld).toBeNull();
    expect(gapClosureByCondition(gaps, [], holdoutIds).conditions[0]!.withheld).toBe("cohort_too_small");
    expect(MIN_ARM_GAPS).toBeGreaterThan(6);
  });
});

describe("W64 closure attribution", () => {
  it("counts an unscoped closure and reports how many were ambiguous", () => {
    const gaps = [gap("p1", DIABETES), gap("p1", CKD)];
    const result = gapClosureByCondition(
      gaps,
      [{ patientId: "p1" as PatientId, conditionCode: null, at: "2026-03-01" }],
      new Set(),
    );

    // One visit, two registers: it closes both gaps, and both are flagged as gap-closures —
    // while the number of ambiguous EVENTS relied upon is still one (W65). ambiguous.
    expect(result.ambiguousGapClosures).toBe(2);
    expect(result.ambiguousClosures).toBe(1);
    for (const c of result.conditions) expect(c.invite.closed).toBe(1);
  });

  it("prefers a scoped closure and does not double-count it as ambiguous", () => {
    const gaps = [gap("p1", DIABETES)];
    const result = gapClosureByCondition(
      gaps,
      [
        { patientId: "p1" as PatientId, conditionCode: DIABETES, at: "2026-03-01" },
        { patientId: "p1" as PatientId, conditionCode: null, at: "2026-04-01" },
      ],
      new Set(),
    );

    expect(result.conditions[0]!.invite.closed).toBe(1);
    expect(result.ambiguousClosures).toBe(0);
  });

  it("derives unscoped closures from attended appointments inside the window", () => {
    const events = closuresFromAppointments(
      [
        { practiceId: PRACTICE, patientId: "p1" as PatientId, status: "attended", startsAt: "2026-03-01T09:00:00Z" },
        { practiceId: PRACTICE, patientId: "p2" as PatientId, status: "dna", startsAt: "2026-03-01T09:00:00Z" },
        { practiceId: PRACTICE, patientId: "p3" as PatientId, status: "attended", startsAt: "2026-12-01T09:00:00Z" },
        { practiceId: PRACTICE, patientId: null, status: "attended", startsAt: "2026-03-01T09:00:00Z" },
      ],
      { fromIso: "2026-01-01", toIso: "2026-06-30" },
    );

    expect(events).toEqual([
      { patientId: "p1", conditionCode: null, at: "2026-03-01" },
    ]);
  });

  it("discards another practice's attended visits (W65 tenancy fix)", () => {
    // Without the filter, a colliding patient id at another practice inflated this
    // register's closure count — the same leak countAttribution already guards against.
    const events = closuresFromAppointments(
      [
        { practiceId: PRACTICE, patientId: "p1" as PatientId, status: "attended", startsAt: "2026-03-01T09:00:00Z" },
        { practiceId: "other-practice" as PracticeId, patientId: "p1" as PatientId, status: "attended", startsAt: "2026-03-02T09:00:00Z" },
      ],
      { fromIso: "2026-01-01", toIso: "2026-06-30" },
      PRACTICE,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.at).toBe("2026-03-01");
  });

  it("a gap with no closing visit is simply not closed", () => {
    const result = gapClosureByCondition([gap("p1", DIABETES)], [], new Set());
    expect(result.conditions[0]!.invite).toEqual({ gapsAtStart: 1, closed: 0, closureRate: 0 });
  });
});

describe("W65 the withheld explainer speaks this module's units", () => {
  it("counts gaps, not patients", () => {
    const text = explainClosureWithheld("cohort_too_small");
    expect(text).toContain(`${MIN_ARM_GAPS} open care gaps`);
    expect(text).not.toContain("patients in each group");
  });

  it("still explains a missing holdout", () => {
    expect(explainClosureWithheld("no_holdout_arm")).toMatch(/nothing to measure against/);
  });
});

describe("W65 ambiguousClosures counts events, not gaps", () => {
  it("one unscoped visit closing three registers is one ambiguous closure", () => {
    const gaps = ["a", "b", "c"].map((code) => ({
      notAClinicalRecommendation: true as const,
      practiceId: PRACTICE,
      patientId: "p1" as PatientId,
      conditionCode: code as ConditionCode,
      intervalId: `iv-${code}` as CareGap["intervalId"],
      intervalMonths: 12,
      lastRelevantVisit: "2020-01-01",
      monthsSinceLastVisit: 60,
      basis: "interval_elapsed" as const,
    }));
    const closures: GapClosureEvent[] = [{ patientId: "p1" as PatientId, conditionCode: null, at: "2026-03-01" }];
    const out = gapClosureByCondition(gaps, closures, new Set());
    // Three gaps closed, but only ONE unscoped event was relied upon.
    expect(out.ambiguousClosures).toBe(1);
    expect(out.ambiguousGapClosures).toBe(3);
    expect(out.ambiguousClosures).toBeLessThanOrEqual(closures.length);
  });
});
