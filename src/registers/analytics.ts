// W64: register analytics — gap-closure rate by condition, under W9's holdout discipline.
//
// "Gap closure" is easy to report dishonestly. Of the gaps open on a register at the start
// of a window, some fraction are closed by the end — but most of those would have closed
// anyway, because patients book appointments without being asked. A closure rate on its own
// is therefore a vanity number. The only figure worth showing a practice is the DIFFERENCE
// between the invite arm's closure rate and the holdout arm's, which is the same discipline
// W9 applies to attendance and W72 applies per condition.
//
// So this module reports both arms and withholds the difference wherever it would not be
// meaningful — no holdout arm, or arms too thin to extrapolate from. It never reports the
// invite arm's closure rate as an achievement on its own.
//
// One modelling limitation, stated rather than hidden: an attended appointment carries no
// condition, so a visit cannot be attributed to a particular register. `closuresFromAppointments`
// therefore produces UNSCOPED closures — a visit closes every open gap for that patient —
// and `ambiguousClosures` counts how many closures were resolved that way, so a caller can
// see how much of the result rests on that assumption. Callers that DO know which register a
// visit belongs to (a PMS with a reason-for-visit, a practice-confirmed closure) should pass
// scoped closures instead and the ambiguity disappears.

import type { ConditionCode, PatientId, PracticeId } from "@/domain/types";
import type { CareGap } from "./caregap";
import type { WithheldReason } from "./attribution";

/** Minimum gaps in BOTH arms before a closure difference may be claimed. */
export const MIN_ARM_GAPS = 20;

export interface GapClosureEvent {
  patientId: PatientId;
  /** null when the closing visit cannot be attributed to one register. */
  conditionCode: ConditionCode | null;
  at: string;
}

export interface ArmClosure {
  /** Gaps open for this arm at the start of the window. */
  gapsAtStart: number;
  closed: number;
  /** closed / gapsAtStart, 0..1. Zero when the arm had no gaps. */
  closureRate: number;
}

export interface ConditionClosure {
  conditionCode: ConditionCode;
  invite: ArmClosure;
  holdout: ArmClosure;
  /**
   * Invite closure rate minus holdout closure rate, in percentage points, or null when it
   * must not be claimed. This — not `invite.closureRate` — is the figure that means anything.
   */
  differencePoints: number | null;
  withheld: WithheldReason | null;
}

export interface RegisterAnalytics {
  conditions: ConditionClosure[];
  /**
   * Unscoped closure EVENTS relied upon — comparable against the closure list, so a caller
   * can read "how much of this rests on the unscoped assumption" as a fraction.
   */
  ambiguousClosures: number;
  /**
   * GAPS closed by those events. Always >= ambiguousClosures, because one visit closes every
   * open gap for that patient. Both are reported because they answer different questions and
   * a single number called "ambiguous" was being read as each of them.
   */
  ambiguousGapClosures: number;
}

export interface AnalyticsOptions {
  minArmGaps?: number;
}

/**
 * Treat every attended visit in the window as closing all of that patient's open gaps.
 *
 * Deliberately unscoped: appointment records carry no condition, and guessing which
 * register a visit belongs to would invent precision the data does not have.
 */
export function closuresFromAppointments(
  appointments: readonly {
    practiceId: PracticeId;
    patientId: PatientId | null;
    status: string;
    startsAt: string;
  }[],
  window: { fromIso: string; toIso: string },
  /** Required to scope, exactly as countAttribution scopes. Omit only for single-tenant data. */
  practiceId?: PracticeId,
): GapClosureEvent[] {
  const events: GapClosureEvent[] = [];
  for (const a of appointments) {
    // Tenancy: countAttribution discards other practices' appointments; this mirrors it.
    // Without the filter an attended visit elsewhere, for a colliding patient id, inflated
    // this arm's closure count.
    if (practiceId !== undefined && a.practiceId !== practiceId) continue;
    if (a.status !== "attended" || a.patientId === null) continue;
    const date = a.startsAt.slice(0, 10);
    if (date < window.fromIso || date > window.toIso) continue;
    events.push({ patientId: a.patientId, conditionCode: null, at: date });
  }
  return events;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function gapClosureByCondition(
  gapsAtStart: readonly CareGap[],
  closures: readonly GapClosureEvent[],
  holdoutPatientIds: ReadonlySet<PatientId>,
  options: AnalyticsOptions = {},
): RegisterAnalytics {
  const minArm = options.minArmGaps ?? MIN_ARM_GAPS;

  const scoped = new Set<string>();
  const unscoped = new Set<PatientId>();
  for (const c of closures) {
    if (c.conditionCode === null) unscoped.add(c.patientId);
    else scoped.add(`${c.patientId}::${c.conditionCode}`);
  }

  interface Tally {
    invite: { gaps: number; closed: number };
    holdout: { gaps: number; closed: number };
  }
  const byCondition = new Map<ConditionCode, Tally>();
  // Counted as a set of CLOSURE EVENTS, not incremented per closed gap. One patient on three
  // registers with a single unscoped visit is ONE ambiguous closure resolving three gaps; the
  // old counter said 3, so a caller comparing it against closures.length to judge how much of
  // the result rested on the unscoped assumption got a ratio above 1.
  const ambiguousPatients = new Set<string>();
  let ambiguousGapClosures = 0;

  for (const gap of gapsAtStart) {
    const tally =
      byCondition.get(gap.conditionCode) ??
      { invite: { gaps: 0, closed: 0 }, holdout: { gaps: 0, closed: 0 } };
    const arm = holdoutPatientIds.has(gap.patientId) ? tally.holdout : tally.invite;

    arm.gaps += 1;
    const closedScoped = scoped.has(`${gap.patientId}::${gap.conditionCode}`);
    const closedUnscoped = !closedScoped && unscoped.has(gap.patientId);
    if (closedScoped || closedUnscoped) {
      arm.closed += 1;
      if (closedUnscoped) {
        ambiguousPatients.add(gap.patientId as string);
        ambiguousGapClosures += 1;
      }
    }

    byCondition.set(gap.conditionCode, tally);
  }

  const conditions: ConditionClosure[] = [];
  for (const conditionCode of [...byCondition.keys()].sort()) {
    const t = byCondition.get(conditionCode)!;
    const rate = (closed: number, gaps: number) => (gaps === 0 ? 0 : closed / gaps);

    const invite: ArmClosure = {
      gapsAtStart: t.invite.gaps,
      closed: t.invite.closed,
      closureRate: rate(t.invite.closed, t.invite.gaps),
    };
    const holdout: ArmClosure = {
      gapsAtStart: t.holdout.gaps,
      closed: t.holdout.closed,
      closureRate: rate(t.holdout.closed, t.holdout.gaps),
    };

    let withheld: WithheldReason | null = null;
    if (holdout.gapsAtStart === 0) withheld = "no_holdout_arm";
    else if (invite.gapsAtStart < minArm || holdout.gapsAtStart < minArm) {
      withheld = "cohort_too_small";
    }

    conditions.push({
      conditionCode,
      invite,
      holdout,
      differencePoints:
        withheld === null ? round1((invite.closureRate - holdout.closureRate) * 100) : null,
      withheld,
    });
  }

  return { conditions, ambiguousClosures: ambiguousPatients.size, ambiguousGapClosures };
}

/**
 * Why a closure figure was withheld, in this module's own units.
 *
 * attribution.ts's explainWithheld() counts PATIENTS against MIN_ARM_PATIENTS; this module
 * withholds on GAPS against MIN_ARM_GAPS. Reusing the other explainer told a practice with
 * 25 gaps per arm that it needed 30 patients — the wrong unit and the wrong number, on a
 * surface whose whole job is being trusted.
 */
export function explainClosureWithheld(reason: WithheldReason, minArmGaps = MIN_ARM_GAPS): string {
  switch (reason) {
    case "no_holdout_arm":
      return "No comparison group on this register yet, so there is nothing to measure against.";
    case "cohort_too_small":
      return `This register is too small to measure reliably — it needs at least ${minArmGaps} open care gaps in each group.`;
  }
}
