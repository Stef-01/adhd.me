// W99: 500-practice scale projection.
//
// Running 500 full simulations to answer "does this scale" would take minutes and prove less
// than it appears to. What it would actually measure is how fast ONE machine runs 500 sims
// back to back, which is not the production question — in production the 500 practices'
// nightly cycles are independent jobs, and the thing that matters is whether each one stays
// inside its budget and what the fleet costs in aggregate.
//
// So this projects from a measured sample, and the projection is explicit about which
// quantities scale and which do not. That distinction is the unit:
//
//   LINEAR in practice count — total sends, SMS spend, total compute. Each practice's work
//   is independent of every other practice's, so N practices do N times the work.
//
//   INVARIANT in practice count — per-practice cycle latency, backfill latency. A practice's
//   nightly cycle does not get slower because another practice exists. If these ever DID
//   scale with fleet size, that would mean shared contention, and the projection would be
//   wrong in the direction that matters.
//
// The assumptions are carried in the output rather than left in a comment, because a
// projection whose assumptions are invisible gets quoted as a measurement.

import { percentile, type FleetResult } from "./fleet";

export interface ScaleAssumptions {
  /** Practices' nightly cycles are independent jobs; no shared lock or single queue. */
  independentPerPractice: boolean;
  /** Cost per SMS segment, AUD. Pricing input, not a measurement. */
  smsCostAud: number;
  /** Weeks per year the fleet sends. */
  sendingWeeksPerYear: number;
}

export const DEFAULT_SCALE_ASSUMPTIONS: ScaleAssumptions = {
  independentPerPractice: true,
  smsCostAud: 0.045,
  sendingWeeksPerYear: 48,
};

export interface ScaleProjection {
  measuredPractices: number;
  targetPractices: number;
  assumptions: ScaleAssumptions;
  /** Scales linearly. */
  linear: {
    sendsPerWeek: number;
    sendsPerYear: number;
    smsCostPerWeekAud: number;
    smsCostPerYearAud: number;
    totalComputeMsPerCycle: number;
  };
  /** Does NOT scale — these are per-practice properties, carried through unchanged. */
  invariant: {
    p95AvgWeekMs: number;
    p95BackfillMs: number;
  };
  /** Stated so the number is never read as a measurement. */
  caveats: string[];
}

export function projectFleet(
  measured: FleetResult,
  targetPractices: number,
  assumptions: ScaleAssumptions = DEFAULT_SCALE_ASSUMPTIONS,
): ScaleProjection {
  const measuredPractices = measured.runs.length;
  const factor = measuredPractices === 0 ? 0 : targetPractices / measuredPractices;

  const sendsPerWeek = measured.meanSendsPerWeek * targetPractices;
  const avgWeekMs = [...measured.runs.map((r) => r.avgWeekMs)].sort((a, b) => a - b);
  const backfill = measured.runs.flatMap((r) => r.backfillLatenciesMs).sort((a, b) => a - b);

  const caveats = [
    `Projected from ${measuredPractices} measured practices to ${targetPractices} — a ${factor.toFixed(0)}x extrapolation, not a measurement.`,
    "Latency figures are per-practice and are carried through unchanged, not multiplied: a practice's cycle does not slow down because other practices exist.",
    "Linear scaling assumes practices' cycles are independent. A shared lock, a single job queue, or one SMS provider rate limit across the fleet would each break that, and none of them is modelled here.",
    "Send volume drives cost and is calibrated per practice; a fleet skewed toward larger practices would exceed this.",
  ];
  if (!assumptions.independentPerPractice) {
    caveats.push("Independence is marked FALSE in the assumptions, so the linear figures above do not hold.");
  }

  return {
    measuredPractices,
    targetPractices,
    assumptions,
    linear: {
      sendsPerWeek,
      sendsPerYear: sendsPerWeek * assumptions.sendingWeeksPerYear,
      smsCostPerWeekAud: sendsPerWeek * assumptions.smsCostAud,
      smsCostPerYearAud: sendsPerWeek * assumptions.sendingWeeksPerYear * assumptions.smsCostAud,
      totalComputeMsPerCycle:
        measured.runs.reduce((n, r) => n + r.avgWeekMs, 0) * (measuredPractices === 0 ? 0 : factor),
    },
    invariant: {
      p95AvgWeekMs: percentile(avgWeekMs, 95),
      p95BackfillMs: percentile(backfill, 95),
    },
    caveats,
  };
}

export interface ScaleBudgets {
  /** A practice's nightly cycle must stay inside this however large the fleet gets. */
  maxP95AvgWeekMs: number;
  maxP95BackfillMs: number;
  /** Fleet SMS spend ceiling, AUD/year, at the target size. */
  maxSmsCostPerYearAud: number;
}

export const DEFAULT_SCALE_BUDGETS: ScaleBudgets = {
  maxP95AvgWeekMs: 150,
  maxP95BackfillMs: 50,
  maxSmsCostPerYearAud: 250_000,
};

/** Budget violations, each naming the number and the ceiling it broke. */
export function checkScaleBudgets(p: ScaleProjection, budgets: ScaleBudgets = DEFAULT_SCALE_BUDGETS): string[] {
  const violations: string[] = [];
  if (p.invariant.p95AvgWeekMs > budgets.maxP95AvgWeekMs) {
    violations.push(`p95 weekly cycle ${p.invariant.p95AvgWeekMs.toFixed(1)}ms exceeds ${budgets.maxP95AvgWeekMs}ms`);
  }
  if (p.invariant.p95BackfillMs > budgets.maxP95BackfillMs) {
    violations.push(`p95 backfill ${p.invariant.p95BackfillMs.toFixed(1)}ms exceeds ${budgets.maxP95BackfillMs}ms`);
  }
  if (p.linear.smsCostPerYearAud > budgets.maxSmsCostPerYearAud) {
    violations.push(
      `projected SMS spend $${Math.round(p.linear.smsCostPerYearAud).toLocaleString("en-AU")}/yr exceeds $${budgets.maxSmsCostPerYearAud.toLocaleString("en-AU")}`,
    );
  }
  return violations;
}

const aud = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

export function renderScaleReport(p: ScaleProjection, violations: string[]): string {
  return [
    `# Scale projection — ${p.targetPractices} practices (synthetic)`,
    ``,
    `**This is a projection, not a measurement.** ${p.measuredPractices} practices were simulated;`,
    `the figures below extrapolate from them under the assumptions listed at the end.`,
    ``,
    `## Scales with fleet size`,
    ``,
    `| Measure | At ${p.targetPractices} practices |`,
    `|---|---|`,
    `| Invitations sent / week | ${Math.round(p.linear.sendsPerWeek).toLocaleString("en-AU")} |`,
    `| Invitations sent / year | ${Math.round(p.linear.sendsPerYear).toLocaleString("en-AU")} |`,
    `| SMS spend / week | ${aud(p.linear.smsCostPerWeekAud)} |`,
    `| SMS spend / year | ${aud(p.linear.smsCostPerYearAud)} |`,
    `| Total compute / nightly cycle | ${(p.linear.totalComputeMsPerCycle / 1000).toFixed(1)}s across the fleet |`,
    ``,
    `## Does NOT scale with fleet size`,
    ``,
    `These are per-practice properties. They are carried through unchanged rather than`,
    `multiplied — a practice's nightly cycle does not slow down because other practices exist.`,
    `If they ever did rise with fleet size, that would mean shared contention and this whole`,
    `projection would be wrong in the direction that matters.`,
    ``,
    `| Measure | Value |`,
    `|---|---|`,
    `| p95 weekly cycle | ${p.invariant.p95AvgWeekMs.toFixed(1)}ms |`,
    `| p95 backfill latency | ${p.invariant.p95BackfillMs.toFixed(1)}ms |`,
    ``,
    `## Budgets`,
    ``,
    violations.length === 0
      ? `All budgets met.`
      : violations.map((v) => `- **BREACH**: ${v}`).join("\n"),
    ``,
    `## Assumptions`,
    ``,
    ...p.caveats.map((c) => `- ${c}`),
    ``,
  ].join("\n");
}
