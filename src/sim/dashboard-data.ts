// W14: dashboard data — the deterministic W12 sim, shaped for the incrementality
// dashboard. The sim is the console's data source until real (gated) practice data
// exists; one cached run serves every request because the seed fixes the world.

import { countAttribution, type AttributionResult } from "@/engine/attribution";
import { isoDaysFrom } from "@/lib/dates";
import { DEFAULT_SIM_CONFIG, runSim, type SimResult } from "./harness";

export interface WeeklyPoint {
  /** 1-based week number. */
  week: number;
  weekStartIso: string;
  invitePer1000: number;
  holdoutPer1000: number;
  /**
   * Null when the week has no holdout arm. ATTRIBUTION.md: no holdout means no claim —
   * "not zero, not an estimate" — so the absence has to survive all the way to the render.
   */
  incrementalPer1000: number | null;
}

export interface DashboardData {
  attribution: AttributionResult;
  weekly: WeeklyPoint[];
  totals: SimResult["totals"];
  optOutRatePct: number;
  patientCount: number;
  weeks: number;
}

export function buildDashboardData(result: SimResult): DashboardData {
  const { config } = result;
  const weekly: WeeklyPoint[] = [];
  for (let w = 0; w < config.weeks; w++) {
    // Same day-span the sim used for week w: anchor+7w+1 .. anchor+7w+7.
    const attr = countAttribution(
      { ...result.practice },
      result.patients,
      result.appointments,
      { fromIso: isoDaysFrom(config.todayIso, w * 7 + 1), toIso: isoDaysFrom(config.todayIso, w * 7 + 7) },
    );
    weekly.push({
      week: w + 1,
      weekStartIso: isoDaysFrom(config.todayIso, w * 7 + 1),
      invitePer1000: attr.inviteArm.attendedPer1000,
      holdoutPer1000: attr.holdoutArm.attendedPer1000,
      // NOT `?? 0`. ATTRIBUTION.md is explicit: with no holdout arm there is no claim —
      // "not zero, not an estimate". Coercing null to 0 printed a measured result of
      // exactly no effect where the honest answer is that nothing was measured.
      // (W51 audit, low — but it is the one law this product is built around.)
      incrementalPer1000: attr.incrementalPer1000,
    });
  }
  return {
    attribution: result.attribution,
    weekly,
    totals: result.totals,
    optOutRatePct:
      result.totals.invitationsSent === 0
        ? 0
        : (result.totals.optedOut / result.totals.invitationsSent) * 100,
    patientCount: config.patientCount,
    weeks: config.weeks,
  };
}

let cached: DashboardData | null = null;

/** Deterministic, so computed once per server process. */
export function getDashboardData(): DashboardData {
  cached ??= buildDashboardData(runSim(DEFAULT_SIM_CONFIG));
  return cached;
}
