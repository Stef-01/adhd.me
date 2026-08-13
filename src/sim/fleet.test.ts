// W48 verify gate: the 100-practice fleet run completes with latency and cost
// budgets met, invariants intact under load, and the report artifact generated.

import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  checkFleetBudgets,
  DEFAULT_FLEET_BUDGETS,
  expectedSendsPerWeek,
  percentile,
  renderFleetReport,
  runFleet,
  type FleetResult,
} from "./fleet";

describe("W48 stats helpers (deterministic)", () => {
  it("percentile picks the right ranks", () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(sorted, 50)).toBe(5);
    expect(percentile(sorted, 95)).toBe(10);
    expect(percentile(sorted, 100)).toBe(10);
    expect(percentile([], 95)).toBe(0);
  });

  it("the cost envelope derives from the same calibration the ROI model prices", () => {
    // 10 clinicians → 8 participating × 24 × 5 × 8% = 76.8 open slots → ÷ 0.25 = 307.2
    expect(expectedSendsPerWeek(10, 0.25)).toBeCloseTo(307.2, 5);
  });

  it("budget checker reports each violation in words", () => {
    const fake: FleetResult = {
      config: { practices: 1, baseSeed: 1, perPractice: { weeks: 4 } },
      runs: [
        {
          seed: 1,
          wallMs: 100_000,
          avgWeekMs: 400,
          invitationsSent: 10_000,
          booked: 10,
          backfillLatenciesMs: [200],
          invariantViolations: 1,
        },
      ],
      totalWallMs: 100_000,
      expectedSendsPerWeek: 300,
      meanSendsPerWeek: 2_500,
    };
    const violations = checkFleetBudgets(fake, DEFAULT_FLEET_BUDGETS);
    expect(violations.some((v) => v.includes("total wall"))).toBe(true);
    expect(violations.some((v) => v.includes("p95 weekly cycle"))).toBe(true);
    expect(violations.some((v) => v.includes("p95 backfill"))).toBe(true);
    expect(violations.some((v) => v.includes("priced envelope"))).toBe(true);
    expect(violations.some((v) => v.includes("invariants under load"))).toBe(true);
  });
});

describe("W48 the 100-practice run", () => {
  it("completes within budgets, invariants intact, report generated", { timeout: 300_000 }, () => {
    const result = runFleet({
      practices: 100,
      baseSeed: 480_000,
      perPractice: {
        patientCount: 1_500,
        clinicianCount: 6,
        weeks: 4,
        lateCancellationRate: 0.02, // fast path active fleet-wide
      },
    });
    expect(result.runs).toHaveLength(100);
    expect(result.runs.every((r) => r.booked > 0)).toBe(true); // every practice's loop ran

    const violations = checkFleetBudgets(result, DEFAULT_FLEET_BUDGETS);
    const report = renderFleetReport(result, violations);
    const dir = path.resolve(__dirname, "../../reports");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "load-w48.md"), report);

    expect(violations).toEqual([]); // latency + cost budgets met — the unit's gate
    expect(report).toContain("All latency and cost budgets met.");
  });
});
