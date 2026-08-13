// W99 verify gate: latency/cost budgets at 500 practices.
//
// The tests are about the SHAPE of the projection rather than any particular number, because
// the numbers are properties of a synthetic world. What has to be true regardless: cost
// scales with fleet size, latency does not, and the output cannot be mistaken for a
// measurement.

import { describe, expect, it } from "vitest";
import { runFleet, type FleetResult } from "./fleet";
import { DEFAULT_SIM_CONFIG } from "./harness";
import {
  checkScaleBudgets,
  DEFAULT_SCALE_ASSUMPTIONS,
  projectFleet,
  renderScaleReport,
  type ScaleBudgets,
} from "./scale";

// Small measured sample — the point is the projection, and simulating 500 practices to test
// an extrapolation would measure how fast one machine runs 500 sims, which is not the
// production question.
const measured: FleetResult = runFleet({
  practices: 6,
  baseSeed: 4242,
  perPractice: { ...DEFAULT_SIM_CONFIG, weeks: 3, patientCount: 300, clinicianCount: 2 },
});

describe("W99 what scales and what does not", () => {
  const p500 = projectFleet(measured, 500);

  it("cost and volume scale linearly with practice count", () => {
    const p1000 = projectFleet(measured, 1000);
    expect(p1000.linear.sendsPerWeek).toBeCloseTo(p500.linear.sendsPerWeek * 2, 6);
    expect(p1000.linear.smsCostPerYearAud).toBeCloseTo(p500.linear.smsCostPerYearAud * 2, 6);
    expect(p1000.linear.totalComputeMsPerCycle).toBeCloseTo(p500.linear.totalComputeMsPerCycle * 2, 6);
  });

  it("per-practice latency does NOT scale — it is carried through unchanged", () => {
    // If these ever rose with fleet size it would mean shared contention, and the whole
    // projection would be wrong in the direction that matters.
    const p1000 = projectFleet(measured, 1000);
    expect(p1000.invariant.p95AvgWeekMs).toBe(p500.invariant.p95AvgWeekMs);
    expect(p1000.invariant.p95BackfillMs).toBe(p500.invariant.p95BackfillMs);
  });

  it("cost follows the pricing assumption, not a hardcoded rate", () => {
    const dearer = projectFleet(measured, 500, { ...DEFAULT_SCALE_ASSUMPTIONS, smsCostAud: 0.09 });
    expect(dearer.linear.smsCostPerYearAud).toBeCloseTo(p500.linear.smsCostPerYearAud * 2, 6);
  });

  it("records the extrapolation factor it actually performed", () => {
    expect(p500.measuredPractices).toBe(6);
    expect(p500.targetPractices).toBe(500);
    expect(p500.caveats.join(" ")).toMatch(/not a measurement/);
  });
});

describe("W99 budgets", () => {
  const p500 = projectFleet(measured, 500);

  it("passes the default budgets at 500 practices", () => {
    expect(checkScaleBudgets(p500)).toEqual([]);
  });

  it("names the number and the ceiling when a budget breaks", () => {
    // Ceilings below zero, so all three fire regardless of the measured data. (The default
    // sim has no late cancellations, so p95 backfill is genuinely 0 — a ceiling of 0 is
    // correctly NOT exceeded, which is why this uses -1 rather than 0.)
    const strict: ScaleBudgets = { maxP95AvgWeekMs: -1, maxP95BackfillMs: -1, maxSmsCostPerYearAud: -1 };
    const violations = checkScaleBudgets(p500, strict);
    expect(violations).toHaveLength(3);
    expect(violations.some((v) => /weekly cycle/.test(v))).toBe(true);
    expect(violations.some((v) => /backfill/.test(v))).toBe(true);
    expect(violations.some((v) => /SMS spend/.test(v))).toBe(true);
  });

  it("a latency budget cannot be met by shrinking the fleet", () => {
    // The invariant figures are identical at every size, so a breach at 500 is a breach at 5.
    const strict: ScaleBudgets = { maxP95AvgWeekMs: -1, maxP95BackfillMs: 999, maxSmsCostPerYearAud: 1e9 };
    expect(checkScaleBudgets(projectFleet(measured, 5), strict)).toHaveLength(1);
    expect(checkScaleBudgets(projectFleet(measured, 500), strict)).toHaveLength(1);
  });
});

describe("W99 the report cannot be mistaken for a measurement", () => {
  const p500 = projectFleet(measured, 500);
  const report = renderScaleReport(p500, checkScaleBudgets(p500));

  it("says so in the first line of the body", () => {
    expect(report).toContain("**This is a projection, not a measurement.**");
  });

  it("separates the scaling figures from the invariant ones, and explains why", () => {
    expect(report).toContain("## Scales with fleet size");
    expect(report).toContain("## Does NOT scale with fleet size");
    expect(report).toContain("does not slow down because other practices exist");
  });

  it("carries its assumptions in the output, not in a comment", () => {
    expect(report).toContain("## Assumptions");
    expect(report).toContain("shared lock");
    expect(report).toContain("rate limit");
  });

  it("marks a breach loudly rather than burying it in a table", () => {
    const strict: ScaleBudgets = { maxP95AvgWeekMs: -1, maxP95BackfillMs: -1, maxSmsCostPerYearAud: -1 };
    expect(renderScaleReport(p500, checkScaleBudgets(p500, strict))).toContain("**BREACH**");
  });

  it("says outright when the independence assumption is switched off", () => {
    const dependent = projectFleet(measured, 500, { ...DEFAULT_SCALE_ASSUMPTIONS, independentPerPractice: false });
    expect(dependent.caveats.join(" ")).toMatch(/do not hold/);
  });
});
