// W58 verify gate: fixtures per condition. Two fixture registers with different cadences,
// exercised across the cases that decide whether a patient is contacted about their health —
// so the arithmetic that drives that decision is pinned, not assumed.
//
// The fixtures are placeholder conditions citing a placeholder source, because W56's real
// intervals are blocked on the G5 ruling. That is not a weaker test: the engine reads every
// cadence from the catalogue, so the values a fixture supplies and the values a signed-off
// guideline will supply travel the identical path.

import { describe, expect, it } from "vitest";
import type { ConditionCode, PatientId, PracticeId, RegisterMembership } from "@/domain/types";
import { detectCareGaps, gapCountsByCondition, wholeMonthsBetween } from "./caregap";
import { guidelineIntervals, loadIntervals } from "./intervals";

const PRACTICE = "prac-1" as PracticeId;
const REG_A = "placeholder_register_a" as ConditionCode; // 12-month cadence fixture
const REG_B = "placeholder_register_b" as ConditionCode; // 3-month cadence fixture
const TODAY = "2026-08-10";

const provenance = {
  citation: "Placeholder source for care-gap fixtures — not clinical guidance",
  url: "https://example.org/not-a-guideline",
  publishedOn: "2026-01-01",
  retrievedOn: "2026-08-10",
};

const CATALOGUE = loadIntervals([
  { id: "iv-a", conditionCode: REG_A, name: "Annual cadence", intervalMonths: 12, provenance },
  { id: "iv-b", conditionCode: REG_B, name: "Quarterly cadence", intervalMonths: 3, provenance },
  { id: "iv-b2", conditionCode: REG_B, name: "Six-monthly cadence", intervalMonths: 6, provenance },
]);

function member(id: string, conditionCode: ConditionCode, over: Partial<RegisterMembership> = {}): RegisterMembership {
  return {
    practiceId: PRACTICE,
    patientId: id as PatientId,
    conditionCode,
    source: "pms_condition_flag",
    addedAt: "2026-01-01T00:00:00Z",
    removedAt: null,
    ...over,
  };
}

describe("W58 the boundary is typed, not just documented", () => {
  it("every gap carries notAClinicalRecommendation", () => {
    const gaps = detectCareGaps(CATALOGUE, [{ membership: member("pat-1", REG_A), lastRelevantVisit: "2024-01-01" }], TODAY);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.notAClinicalRecommendation).toBe(true);
    // The disclaimer travels with the value: it survives serialisation to any consumer.
    expect(JSON.parse(JSON.stringify(gaps[0]))).toHaveProperty("notAClinicalRecommendation", true);
  });
});

describe("W58 fixtures: 12-month register", () => {
  it("a visit older than the cadence is a gap", () => {
    const gaps = detectCareGaps(CATALOGUE, [{ membership: member("pat-1", REG_A), lastRelevantVisit: "2025-01-10" }], TODAY);
    expect(gaps[0]).toMatchObject({ conditionCode: REG_A, basis: "interval_elapsed", monthsSinceLastVisit: 19, intervalMonths: 12 });
  });

  it("a visit inside the cadence is not a gap — 'not due yet' is not a finding", () => {
    expect(detectCareGaps(CATALOGUE, [{ membership: member("pat-1", REG_A), lastRelevantVisit: "2026-01-10" }], TODAY)).toEqual([]);
  });

  it("the cadence boundary is inclusive: exactly 12 whole months is due", () => {
    expect(detectCareGaps(CATALOGUE, [{ membership: member("p", REG_A), lastRelevantVisit: "2025-08-10" }], TODAY)).toHaveLength(1);
    // One day short of 12 months is not.
    expect(detectCareGaps(CATALOGUE, [{ membership: member("p", REG_A), lastRelevantVisit: "2025-08-11" }], TODAY)).toEqual([]);
  });

  it("no recorded visit is a gap, but a distinct one", () => {
    const gaps = detectCareGaps(CATALOGUE, [{ membership: member("pat-1", REG_A), lastRelevantVisit: null }], TODAY);
    expect(gaps[0]).toMatchObject({ basis: "no_recorded_visit", monthsSinceLastVisit: null, lastRelevantVisit: null });
  });
});

describe("W58 fixtures: 3-month register", () => {
  it("the shorter cadence catches a visit the annual register would not", () => {
    const input = [
      { membership: member("pat-1", REG_B), lastRelevantVisit: "2026-02-10", intervalName: "Quarterly cadence" },
    ];
    expect(detectCareGaps(CATALOGUE, input, TODAY)).toHaveLength(1);
    // The same date against the 12-month register is well inside cadence.
    expect(detectCareGaps(CATALOGUE, [{ membership: member("pat-1", REG_A), lastRelevantVisit: "2026-02-10" }], TODAY)).toEqual([]);
  });

  it("a named cadence selects which interval the gap is measured against", () => {
    const input = { membership: member("pat-1", REG_B), lastRelevantVisit: "2026-04-10" };
    // 4 months elapsed: over the quarterly cadence, inside the six-monthly one.
    expect(detectCareGaps(CATALOGUE, [{ ...input, intervalName: "Quarterly cadence" }], TODAY)).toHaveLength(1);
    expect(detectCareGaps(CATALOGUE, [{ ...input, intervalName: "Six-monthly cadence" }], TODAY)).toEqual([]);
  });
});

describe("W58 refuses to manufacture a gap", () => {
  it("refuses an ambiguous lookup rather than picking by row order (W65)", () => {
    // REG_B has two signed-off cadences. Without a name there is no non-arbitrary answer,
    // and picking matches[0] would mean a data-only reordering silently flipped gap counts.
    expect(detectCareGaps(CATALOGUE, [{ membership: member("pat-1", REG_B), lastRelevantVisit: "2020-01-01" }], TODAY)).toEqual([]);
  });

  it("a condition with no signed-off interval yields nothing", () => {
    const gaps = detectCareGaps(CATALOGUE, [{ membership: member("pat-1", "unlisted_condition" as ConditionCode), lastRelevantVisit: "2000-01-01" }], TODAY);
    expect(gaps).toEqual([]);
  });

  it("the shipped (empty) catalogue produces no gaps at all", () => {
    // The production posture while W56's values are blocked: no interval, no cadence, no gap.
    const gaps = detectCareGaps(guidelineIntervals(), [{ membership: member("pat-1", REG_A), lastRelevantVisit: "2000-01-01" }], TODAY);
    expect(gaps).toEqual([]);
  });

  it("a closed membership is history, not a live gap", () => {
    const gaps = detectCareGaps(CATALOGUE, [{ membership: member("pat-1", REG_A, { removedAt: "2026-06-01T00:00:00Z" }), lastRelevantVisit: "2020-01-01" }], TODAY);
    expect(gaps).toEqual([]);
  });

  it("a visit dated in the future is a data error, never a gap", () => {
    expect(detectCareGaps(CATALOGUE, [{ membership: member("pat-1", REG_A), lastRelevantVisit: "2027-01-01" }], TODAY)).toEqual([]);
  });

  it("an unparseable visit date is not evidence of a gap", () => {
    expect(detectCareGaps(CATALOGUE, [{ membership: member("pat-1", REG_A), lastRelevantVisit: "last winter" }], TODAY)).toEqual([]);
  });
});

describe("W58 ordering is recency arithmetic, never clinical priority", () => {
  it("never-visited first, then longest-overdue, then stable by patient", () => {
    const gaps = detectCareGaps(
      CATALOGUE,
      [
        { membership: member("pat-b", REG_A), lastRelevantVisit: "2025-01-10" }, // 19 months
        { membership: member("pat-c", REG_A), lastRelevantVisit: null },
        { membership: member("pat-a", REG_A), lastRelevantVisit: "2023-01-10" }, // 43 months
      ],
      TODAY,
    );
    expect(gaps.map((g) => g.patientId)).toEqual(["pat-c", "pat-a", "pat-b"]);
  });

  it("counts by condition are what the console carries", () => {
    const gaps = detectCareGaps(
      CATALOGUE,
      [
        { membership: member("pat-1", REG_A), lastRelevantVisit: null },
        { membership: member("pat-2", REG_A), lastRelevantVisit: "2020-01-01" },
        { membership: member("pat-3", REG_B), lastRelevantVisit: "2020-01-01", intervalName: "Quarterly cadence" },
      ],
      TODAY,
    );
    expect(gapCountsByCondition(gaps)).toEqual({ [REG_A]: 2, [REG_B]: 1 });
  });
});

describe("W58 month arithmetic", () => {
  it("counts whole months only", () => {
    expect(wholeMonthsBetween("2026-01-10", "2026-02-09")).toBe(0);
    expect(wholeMonthsBetween("2026-01-10", "2026-02-10")).toBe(1);
    expect(wholeMonthsBetween("2025-08-10", "2026-08-10")).toBe(12);
  });

  it("handles month-end without rolling over", () => {
    // 31 Jan → 28 Feb is not yet a whole month; the day of month has not come round.
    expect(wholeMonthsBetween("2026-01-31", "2026-02-28")).toBe(0);
    expect(wholeMonthsBetween("2026-01-31", "2026-03-31")).toBe(2);
  });
});
