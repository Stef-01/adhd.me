// W48: load/perf — the whole loop at fleet scale. One process runs N independent
// synthetic practices through the full W12 sim and measures what a real deployment
// would pay for: wall-clock per practice-week (latency budget) and message volume
// against the W21 economics envelope (cost budget — every SMS costs money, and the
// unit economics priced a minimal-batch sender, not a spammy one). Budgets are
// explicit inputs and the checker returns violations, not vibes.

import { checkInvariants, runSim, DEFAULT_SIM_CONFIG, type SimConfig, type SimResult } from "./harness";

export interface FleetConfig {
  practices: number;
  baseSeed: number;
  perPractice: Partial<Omit<SimConfig, "seed">>;
}

export interface PracticeRunStat {
  seed: number;
  wallMs: number;
  avgWeekMs: number;
  invitationsSent: number;
  booked: number;
  backfillLatenciesMs: number[];
  invariantViolations: number;
}

export interface FleetResult {
  config: FleetConfig;
  runs: PracticeRunStat[];
  totalWallMs: number;
  /** Expected sends per practice-week from the practice's own calibration (see below). */
  expectedSendsPerWeek: number;
  meanSendsPerWeek: number;
}

export interface FleetBudgets {
  /** Whole-fleet wall clock. */
  maxTotalWallMs: number;
  /** p95 of per-practice average weekly-cycle time. */
  maxP95AvgWeekMs: number;
  /** p95 of late-cancellation fast-path latency across the fleet. */
  maxP95BackfillMs: number;
  /** Cost envelope: fleet mean sends/practice-week vs the economics expectation. */
  sendsEnvelope: { min: number; max: number }; // as multiples of expectedSendsPerWeek
}

export const DEFAULT_FLEET_BUDGETS: FleetBudgets = {
  maxTotalWallMs: 90_000,
  maxP95AvgWeekMs: 150,
  maxP95BackfillMs: 50,
  sendsEnvelope: { min: 0.2, max: 1.3 },
};

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

/**
 * The economics envelope: the W5 pool calculator sends ceil(openSlots / fillRate)
 * per session, so a practice's expected weekly volume is its expected open slots ×
 * 1/fillRate. Open-slot expectation comes from the same W3 calibration the ROI
 * model (W21) prices: slots/clinician/day 24 × 5 days × 8% open × 80% participating.
 */
export function expectedSendsPerWeek(clinicianCount: number, responseRate: number): number {
  const participating = Math.round(clinicianCount * 0.8);
  const openSlotsPerWeek = participating * 24 * 5 * 0.08;
  return openSlotsPerWeek / responseRate;
}

export function runFleet(config: FleetConfig): FleetResult {
  const runs: PracticeRunStat[] = [];
  const t0 = performance.now();
  for (let i = 0; i < config.practices; i++) {
    const simConfig: SimConfig = {
      ...DEFAULT_SIM_CONFIG,
      ...config.perPractice,
      seed: config.baseSeed + i,
    };
    const start = performance.now();
    const result: SimResult = runSim(simConfig);
    const wallMs = performance.now() - start;
    runs.push({
      seed: simConfig.seed,
      wallMs,
      avgWeekMs: wallMs / Math.max(result.totals.weeksSimulated, 1),
      invitationsSent: result.totals.invitationsSent,
      booked: result.totals.booked,
      backfillLatenciesMs: result.backfillLatenciesMs,
      invariantViolations: checkInvariants(result).length,
    });
  }
  const totalWallMs = performance.now() - t0;
  const weeks = Math.max(Number(config.perPractice.weeks ?? DEFAULT_SIM_CONFIG.weeks), 1);
  const meanSendsPerWeek =
    runs.reduce((n, r) => n + r.invitationsSent, 0) / Math.max(runs.length, 1) / weeks;
  return {
    config,
    runs,
    totalWallMs,
    expectedSendsPerWeek: expectedSendsPerWeek(
      Number(config.perPractice.clinicianCount ?? DEFAULT_SIM_CONFIG.clinicianCount),
      Number(config.perPractice.responseRate ?? DEFAULT_SIM_CONFIG.responseRate),
    ),
    meanSendsPerWeek,
  };
}

export function checkFleetBudgets(result: FleetResult, budgets: FleetBudgets): string[] {
  const violations: string[] = [];
  if (result.totalWallMs > budgets.maxTotalWallMs) {
    violations.push(`total wall ${Math.round(result.totalWallMs)}ms > ${budgets.maxTotalWallMs}ms`);
  }
  const avgWeeks = result.runs.map((r) => r.avgWeekMs).sort((a, b) => a - b);
  const p95Week = percentile(avgWeeks, 95);
  if (p95Week > budgets.maxP95AvgWeekMs) {
    violations.push(`p95 weekly cycle ${p95Week.toFixed(1)}ms > ${budgets.maxP95AvgWeekMs}ms`);
  }
  const backfill = result.runs.flatMap((r) => r.backfillLatenciesMs).sort((a, b) => a - b);
  if (backfill.length > 0) {
    const p95Backfill = percentile(backfill, 95);
    if (p95Backfill > budgets.maxP95BackfillMs) {
      violations.push(`p95 backfill ${p95Backfill.toFixed(1)}ms > ${budgets.maxP95BackfillMs}ms`);
    }
  }
  const ratio =
    result.expectedSendsPerWeek === 0 ? 0 : result.meanSendsPerWeek / result.expectedSendsPerWeek;
  if (ratio < budgets.sendsEnvelope.min || ratio > budgets.sendsEnvelope.max) {
    violations.push(
      `sends/practice-week ${result.meanSendsPerWeek.toFixed(1)} is ${ratio.toFixed(2)}× the priced envelope (allowed ${budgets.sendsEnvelope.min}–${budgets.sendsEnvelope.max}×)`,
    );
  }
  const brokenPractices = result.runs.filter((r) => r.invariantViolations > 0).length;
  if (brokenPractices > 0) {
    violations.push(`${brokenPractices} practice(s) violated sim invariants under load`);
  }
  return violations;
}

export function renderFleetReport(result: FleetResult, violations: string[]): string {
  const walls = result.runs.map((r) => r.wallMs).sort((a, b) => a - b);
  const weeks = result.runs.map((r) => r.avgWeekMs).sort((a, b) => a - b);
  const backfill = result.runs.flatMap((r) => r.backfillLatenciesMs).sort((a, b) => a - b);
  return `# 100-practice load report (W48)

${result.config.practices} practices × ${result.config.perPractice.patientCount} patients ×
${result.config.perPractice.weeks} weeks, sequential in one process.

| Measure | p50 | p95 | max |
|---|---|---|---|
| Practice sim wall (ms) | ${percentile(walls, 50).toFixed(0)} | ${percentile(walls, 95).toFixed(0)} | ${percentile(walls, 100).toFixed(0)} |
| Avg weekly cycle (ms) | ${percentile(weeks, 50).toFixed(1)} | ${percentile(weeks, 95).toFixed(1)} | ${percentile(weeks, 100).toFixed(1)} |
| Backfill fast path (ms) | ${percentile(backfill, 50).toFixed(1)} | ${percentile(backfill, 95).toFixed(1)} | ${percentile(backfill, 100).toFixed(1)} |

Total wall: ${(result.totalWallMs / 1000).toFixed(1)}s.
Cost envelope: ${result.meanSendsPerWeek.toFixed(1)} sends/practice-week vs ${result.expectedSendsPerWeek.toFixed(1)} priced (${(result.meanSendsPerWeek / result.expectedSendsPerWeek).toFixed(2)}×).

${violations.length === 0 ? "**All latency and cost budgets met.**" : violations.map((v) => `- BUDGET VIOLATION: ${v}`).join("\n")}
`;
}
