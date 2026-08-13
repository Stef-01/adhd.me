// W63: 26-week simulation, registers enabled vs disabled.
//
// The comparison runs the SAME seed twice, changing exactly one thing, so any difference is
// attributable to the register layer and not to a different random world. Both arms keep
// their holdout, so each arm's incrementality is measured the way ATTRIBUTION.md requires and
// the two are compared as measurements, never as a raw before/after.
//
// What this can and cannot show. It can show what the mechanism does: how narrowing to
// care-gap patients changes how many messages are sent, who receives them, and what the
// measured incremental effect is in each arm. It cannot show a clinical benefit, and the
// report says so — the intervals driving it are FIXTURES citing a placeholder source,
// because W56's real values are blocked on the G5 ruling. A cadence of 12 fixture-months is
// not a claim that any condition should be reviewed annually.

import { checkInvariants, runSim, type SimConfig, type SimResult } from "@/sim/harness";
import { DEFAULT_REGISTER_SIM, type RegisterSimConfig } from "./sim-registers";

export interface ArmSummary {
  invitationsSent: number;
  booked: number;
  attendedGenerated: number;
  optedOut: number;
  expired: number;
  conversionRate: number;
  /** Null without a holdout arm — the attribution law, carried through unchanged. */
  incrementalPer1000: number | null;
  incrementalAttended: number | null;
  naiveGeneratedAttended: number;
}

export interface RegisterComparison {
  weeks: number;
  seed: number;
  registerConfig: RegisterSimConfig;
  off: ArmSummary;
  on: ArmSummary;
  /** on − off, for the figures where a difference is meaningful. */
  delta: {
    invitationsSent: number;
    attendedGenerated: number;
    conversionRatePoints: number;
    incrementalPer1000: number | null;
  };
  invariantsHeld: boolean;
  /** Every invariant violation found, by arm. Empty in both when invariantsHeld. */
  violations: { off: string[]; on: string[] };
}

function summarise(result: SimResult): ArmSummary {
  const t = result.totals;
  const a = result.attribution;
  return {
    invitationsSent: t.invitationsSent,
    booked: t.booked,
    attendedGenerated: t.attendedGenerated,
    optedOut: t.optedOut,
    expired: t.expired,
    conversionRate: t.invitationsSent === 0 ? 0 : t.booked / t.invitationsSent,
    incrementalPer1000: a.incrementalPer1000,
    incrementalAttended: a.incrementalAttended,
    naiveGeneratedAttended: a.naiveGeneratedAttended,
  };
}

export function runRegisterComparison(
  base: SimConfig,
  registers: RegisterSimConfig = { ...DEFAULT_REGISTER_SIM, enabled: true },
): RegisterComparison {
  const off = runSim({ ...base, registers: { ...registers, enabled: false } });
  const on = runSim({ ...base, registers: { ...registers, enabled: true } });

  const offS = summarise(off);
  const onS = summarise(on);

  // Actually check, rather than assert. A report that prints "invariants held" without
  // running the check is worse than one that prints nothing: it launders an unverified
  // claim through an artefact a reader is meant to trust.
  const violations = { off: checkInvariants(off), on: checkInvariants(on) };

  return {
    weeks: base.weeks,
    seed: base.seed,
    registerConfig: { ...registers, enabled: true },
    off: offS,
    on: onS,
    delta: {
      invitationsSent: onS.invitationsSent - offS.invitationsSent,
      attendedGenerated: onS.attendedGenerated - offS.attendedGenerated,
      conversionRatePoints: (onS.conversionRate - offS.conversionRate) * 100,
      incrementalPer1000:
        onS.incrementalPer1000 === null || offS.incrementalPer1000 === null
          ? null
          : onS.incrementalPer1000 - offS.incrementalPer1000,
    },
    invariantsHeld: violations.off.length === 0 && violations.on.length === 0,
    violations,
  };
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const signed1 = (n: number) => (n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

export function renderComparisonReport(c: RegisterComparison): string {
  const inc = (v: number | null) => (v === null ? "n/a (no holdout)" : v.toFixed(1));
  return [
    `# Register simulation — ${c.weeks} weeks, registers off vs on (synthetic)`,
    ``,
    `Same seed (${c.seed}) run twice, changing only whether the care-gap register is active,`,
    `so every difference below is the register layer and not a different random world. Both`,
    `arms keep their holdout, so each figure is measured per docs/ATTRIBUTION.md rather than`,
    `compared raw.`,
    ``,
    `## What this does NOT show`,
    ``,
    `The interval driving the register is a FIXTURE citing a placeholder source, because the`,
    `real guideline values (W56) are blocked pending a founder G5 ruling. This compares the`,
    `MECHANISM — what narrowing and reordering do to sending — and makes no clinical claim.`,
    `A ${c.registerConfig.intervalMonths}-month fixture cadence is not a recommendation that`,
    `anything be reviewed every ${c.registerConfig.intervalMonths} months.`,
    ``,
    `It also shows no benefit, and cannot. The synthetic world models NO relationship between`,
    `having a care gap and responding to an invitation — response rate is drawn identically for`,
    `every patient. So the register arm should not be expected to convert better here, and any`,
    `difference between the two incrementality figures is sampling noise, not evidence. In`,
    `particular a negative on-arm figure means the narrowed arm is too small for its holdout`,
    `comparison to resolve, not that registers harm patients. Whether care-gap patients actually`,
    `respond differently is an empirical question a pilot answers (G4), never this simulation.`,
    ``,
    `## Arms`,
    ``,
    `| Measure | Registers off | Registers on | Delta |`,
    `|---|---|---|---|`,
    `| Invitations sent | ${c.off.invitationsSent} | ${c.on.invitationsSent} | ${signed(c.delta.invitationsSent)} |`,
    `| Booked | ${c.off.booked} | ${c.on.booked} | ${signed(c.on.booked - c.off.booked)} |`,
    `| Attended (generated) | ${c.off.attendedGenerated} | ${c.on.attendedGenerated} | ${signed(c.delta.attendedGenerated)} |`,
    `| Conversion | ${pct(c.off.conversionRate)} | ${pct(c.on.conversionRate)} | ${signed1(c.delta.conversionRatePoints)} pts |`,
    `| Opt-outs | ${c.off.optedOut} | ${c.on.optedOut} | ${signed(c.on.optedOut - c.off.optedOut)} |`,
    `| Expired offers | ${c.off.expired} | ${c.on.expired} | ${signed(c.on.expired - c.off.expired)} |`,
    ``,
    `## Measured incrementality (holdout-based, each arm on its own)`,
    ``,
    `| Measure | Registers off | Registers on |`,
    `|---|---|---|`,
    `| Incremental attended / 1,000 arm patients | ${inc(c.off.incrementalPer1000)} | ${inc(c.on.incrementalPer1000)} |`,
    `| Incremental attended | ${inc(c.off.incrementalAttended)} | ${inc(c.on.incrementalAttended)} |`,
    `| Naive generated count (contrast only, never impact) | ${c.off.naiveGeneratedAttended} | ${c.on.naiveGeneratedAttended} |`,
    ``,
    `Register configuration: ${pct(c.registerConfig.flaggedShare)} of the panel flagged,`,
    `care gap ${c.registerConfig.requireCareGap ? "required" : "not required"} to invite.`,
    ``,
    `Sample-size warning: the register arm sent ${c.on.invitationsSent} messages against`,
    `${c.off.invitationsSent} — ${c.off.invitationsSent === 0 ? "n/a" : `${Math.round((c.on.invitationsSent / c.off.invitationsSent) * 100)}%`} of the unnarrowed volume. Read its incrementality figure`,
    `with that in mind; a point estimate on a small arm is a wide interval reported as a number.`,
    ``,
    c.invariantsHeld
      ? `Invariants: held in both arms — checked with the same checkInvariants() the fleet run uses.`
      : `Invariants: **FAILED** — off: ${c.violations.off.join("; ") || "none"} | on: ${c.violations.on.join("; ") || "none"}`,
    ``,
  ].join("\n");
}
