// W42: practice-facing results view-model. v1 (/console/dashboard) is the detailed
// measurement view and speaks the measurement's own language; this is the same
// arithmetic restated for a practice manager. Nothing is recomputed here — every
// figure is derived from the W9 attribution and W16 guardrail outputs, so the page
// can never drift from the weekly report (W20).
//
// Two honesty rules are encoded, not just described:
//   - the naive generated-booking count is never presented as impact (ATTRIBUTION v1);
//   - continuity is 100% BY CONSTRUCTION when usual-GP-only eligibility is on, so it
//     is reported as a rule that held, never as a result the product achieved.

import type { DashboardData } from "@/sim/dashboard-data";
import type { GuardrailAlert, GuardrailConfig } from "@/guardrails/monitors";
import { counterfactual, withheldCopy, type CounterfactualRefusal } from "@/outcomes/counterfactual";

export interface ResultsOptions {
  /** Practice-configured billing per attended visit (AUD) — same input as W20/W21. */
  revenuePerAttendedVisit: number;
  guardrails: GuardrailConfig;
}

export interface PracticeResults {
  weeks: number;
  /**
   * Appointments the practice would not have had. Null when the claim is withheld.
   *
   * W215: "withheld" is no longer only "there is no comparison group". W72's floor now applies
   * to the practice-wide figure too, so a three-patient holdout arm withholds the claim instead
   * of scaling a rate off three people into a headline.
   */
  extraAppointments: number | null;
  extraPerWeek: number | null;
  extraRevenueAud: number | null;
  /** Attended appointments booked from a Meherr message — context, never the headline. */
  bookedFromMessage: number;
  /** The part of `bookedFromMessage` that would have happened anyway. */
  wouldHaveHappenedAnyway: number | null;
  naiveWouldClaimAud: number;
  messagedPatients: number;
  comparisonPatients: number;
  /** Attendance per 100 patients — a unit a practice manager reads without translating. */
  messagedPer100: number;
  comparisonPer100: number;
  differencePer100: number | null;
  optOut: { count: number; ofMessages: number; pct: number };
  /** Why the extra-appointments claim is withheld, in words. Null when it is claimed. */
  withheldReasons: CounterfactualRefusal[];
  withheldCopy: string | null;
  alerts: GuardrailAlert[];
  allClear: boolean;
}

const per100 = (per1000: number) => per1000 / 10;

export function buildPracticeResults(
  data: DashboardData,
  alerts: GuardrailAlert[],
  options: ResultsOptions,
): PracticeResults {
  const { attribution: attr, totals, weeks } = data;
  const bookedFromMessage = attr.naiveGeneratedAttended;
  // W215: the claim comes from the counterfactual, not from the raw arithmetic. `attr` still
  // carries `incrementalAttended` and it is deliberately NOT read here — that field is the
  // arithmetic layer, and reading it directly is how the practice-wide figure escaped W72's
  // floor for two years while every register cohort honoured it.
  const cf = counterfactual(attr);
  // Round ONCE, here. Everything downstream prices off the rounded count so the
  // page's own arithmetic checks out — a tile reading "84 visits at $80 each" beside
  // $6,722 invites a practice manager to distrust the whole page.
  const extra = cf.claimed ? Math.round(cf.figure.difference) : null;

  return {
    weeks,
    extraAppointments: extra,
    extraPerWeek: extra === null || weeks === 0 ? null : Math.round((extra / weeks) * 10) / 10,
    extraRevenueAud: extra === null ? null : extra * options.revenuePerAttendedVisit,
    bookedFromMessage,
    wouldHaveHappenedAnyway: extra === null ? null : Math.max(0, bookedFromMessage - extra),
    naiveWouldClaimAud: Math.round(bookedFromMessage * options.revenuePerAttendedVisit),
    messagedPatients: attr.inviteArm.patients,
    comparisonPatients: attr.holdoutArm.patients,
    messagedPer100: per100(attr.inviteArm.attendedPer1000),
    comparisonPer100: per100(attr.holdoutArm.attendedPer1000),
    differencePer100: cf.claimed ? per100(attr.incrementalPer1000!) : null,
    optOut: {
      count: totals.optedOut,
      ofMessages: totals.invitationsSent,
      pct: Math.round(data.optOutRatePct * 10) / 10,
    },
    withheldReasons: cf.claimed ? [] : cf.withheld,
    withheldCopy: withheldCopy(cf),
    alerts,
    allClear: alerts.length === 0,
  };
}

/** Weekly series in the unit the page shows: extra appointments, not a rate. */
export interface WeeklyExtra {
  week: number;
  weekStartIso: string;
  messagedPer100: number;
  comparisonPer100: number;
  /** Null when the week has no holdout arm — no comparison, so no figure. */
  extraAppointments: number | null;
}

export function weeklyExtras(data: DashboardData): WeeklyExtra[] {
  const messaged = data.attribution.inviteArm.patients;
  return data.weekly.map((point) => ({
    week: point.week,
    weekStartIso: point.weekStartIso,
    messagedPer100: per100(point.invitePer1000),
    comparisonPer100: per100(point.holdoutPer1000),
    // Per-1,000 difference scaled back to whole appointments across the messaged arm.
    // Null propagates rather than becoming 0: a week with no comparison group has no
    // "extra appointments" figure, and printing 0 would assert one.
    extraAppointments:
      point.incrementalPer1000 === null
        ? null
        : Math.round((point.incrementalPer1000 * messaged) / 1000),
  }));
}

/** A short date a practice manager reads at a glance ("9 Aug"). */
export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
