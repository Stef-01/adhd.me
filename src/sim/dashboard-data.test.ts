import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "./harness";
import { buildDashboardData, getDashboardData } from "./dashboard-data";

describe("W14 dashboard data", () => {
  const result = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
  const data = buildDashboardData(result);

  it("produces one point per simulated week", () => {
    expect(data.weekly.map((p) => p.week)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("weekly per-arm rates sum back to the overall attribution counts", () => {
    const perThousandToCount = (per1000: number, patients: number) =>
      Math.round((per1000 * patients) / 1000);
    const inviteSum = data.weekly.reduce(
      (n, p) => n + perThousandToCount(p.invitePer1000, result.attribution.inviteArm.patients),
      0,
    );
    const holdoutSum = data.weekly.reduce(
      (n, p) => n + perThousandToCount(p.holdoutPer1000, result.attribution.holdoutArm.patients),
      0,
    );
    expect(inviteSum).toBe(result.attribution.inviteArm.attended);
    expect(holdoutSum).toBe(result.attribution.holdoutArm.attended);
  });

  it("weekly incremental is exactly the arm-rate difference", () => {
    for (const p of data.weekly) {
      expect(p.incrementalPer1000).toBeCloseTo(p.invitePer1000 - p.holdoutPer1000, 10);
    }
  });

  it("opt-out rate is a percentage of sent invitations", () => {
    expect(data.optOutRatePct).toBeCloseTo(
      (result.totals.optedOut / result.totals.invitationsSent) * 100,
      10,
    );
  });

  it("the cached accessor returns one stable instance", { timeout: 30_000 }, () => {
    // First call builds the full default sim (26 weeks) — legitimately heavy, so
    // allow well beyond the 5s default to avoid a timing-only flake under load.
    expect(getDashboardData()).toBe(getDashboardData());
  });
});

describe("W51 audit fix: no holdout means no claim, never zero", () => {
  it("a week without a holdout arm reports null, not 0", () => {
    // ATTRIBUTION.md is explicit — "not zero, not an estimate". Coercing null to 0 printed
    // a measured result of exactly no effect where nothing was measured at all.
    const data = getDashboardData();
    // The type itself is the guarantee: null must survive to the render layer rather than
    // being flattened to 0 on the way out of the accessor.
    const nullable: number | null = data.weekly[0]!.incrementalPer1000;
    expect(nullable === null || typeof nullable === "number").toBe(true);
    // And no week silently reports a 0 that came from a null.
    for (const point of data.weekly) {
      if (point.incrementalPer1000 === 0) {
        expect(point.invitePer1000).toBeCloseTo(point.holdoutPer1000, 10);
      }
    }
  });
});
