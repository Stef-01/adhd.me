// W58: care-gap detection.
//
// A care gap is an ARITHMETIC statement about a calendar, and the typing here exists to stop
// it being read as anything more. `CareGap` carries `notAClinicalRecommendation: true` as a
// literal-typed field, so the disclaimer travels with the value rather than living in a
// comment somebody can skip: any consumer destructuring a gap has it in scope, and any
// attempt to construct a gap that claims otherwise fails to typecheck.
//
// What a gap says: this patient is on this register, the guideline cadence for it is N
// months, their last relevant visit was longer ago than that. What it does not say: that
// they need care, that anything is wrong, how urgent it is, or what should happen at a
// visit. Nothing here ranks patients by clinical severity, because severity is a clinical
// judgement and this module has no clinical inputs — only a membership row, a cited
// interval and a date.
//
// The G5 block on W56 reaches this module only as data. With an empty interval catalogue
// `detectCareGaps` returns nothing, which is the correct behaviour for a condition whose
// interval has not been signed off: no interval, no cadence, no gap.

import type {
  ConditionCode,
  GuidelineInterval,
  PatientId,
  PracticeId,
  RegisterMembership,
} from "@/domain/types";
import { lookupInterval, type IntervalCatalogue } from "./intervals";

/**
 * A scheduling observation, deliberately not a clinical one.
 *
 * The `notAClinicalRecommendation` field is typed to the literal `true`, so this boundary
 * is enforced by the compiler at every construction site rather than asserted in prose.
 */
export interface CareGap {
  readonly notAClinicalRecommendation: true;
  /**
   * Carried from the membership. Without it every downstream consumer keys on patientId
   * alone, and a gap list spanning two practices would let one practice's gaps narrow and
   * reorder another's invitation pool — the isolation W60's store and W72's attribution
   * both hold, abandoned at the type level.
   */
  practiceId: PracticeId;
  patientId: PatientId;
  conditionCode: ConditionCode;
  /** The interval this gap was measured against — always a cited one (W56 loader). */
  intervalId: GuidelineInterval["id"];
  intervalMonths: number;
  /** Last visit relevant to this register, or null if none is recorded. */
  lastRelevantVisit: string | null;
  /** Whole months elapsed, or null when there is no recorded visit to measure from. */
  monthsSinceLastVisit: number | null;
  /** Why this counts as a gap — the two cases are genuinely different. */
  basis: "interval_elapsed" | "no_recorded_visit";
}

export interface CareGapInput {
  membership: RegisterMembership;
  /** Date of the last visit relevant to this register; null when none is recorded. */
  lastRelevantVisit: string | null;
  /** Which interval to measure against when a condition has several cadences. */
  intervalName?: string;
}

/** Whole months between two ISO dates. Partial months do not count — a cadence of 12 means
 *  12 elapsed months, not 11 and a bit. */
export function wholeMonthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const to = new Date(`${toIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return Number.NaN;
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1; // the day of month has not come round yet
  return months;
}

/**
 * Detect gaps for a set of memberships. Returns only actual gaps; a member who is inside
 * their cadence simply is not in the result, because "not due yet" is not a finding.
 */
export function detectCareGaps(
  catalogue: IntervalCatalogue,
  inputs: readonly CareGapInput[],
  todayIso: string,
): CareGap[] {
  const gaps: CareGap[] = [];

  for (const input of inputs) {
    const { membership } = input;
    // A closed membership is history, not a live register entry.
    if (membership.removedAt !== null) continue;

    const interval = lookupInterval(catalogue, membership.conditionCode, input.intervalName);
    // No signed-off interval for this condition means no cadence to be overdue against.
    if (interval === null) continue;

    if (input.lastRelevantVisit === null) {
      gaps.push({
        notAClinicalRecommendation: true,
        practiceId: membership.practiceId,
        patientId: membership.patientId,
        conditionCode: membership.conditionCode,
        intervalId: interval.id,
        intervalMonths: interval.intervalMonths,
        lastRelevantVisit: null,
        monthsSinceLastVisit: null,
        basis: "no_recorded_visit",
      });
      continue;
    }

    const months = wholeMonthsBetween(input.lastRelevantVisit, todayIso);
    if (Number.isNaN(months)) continue; // an unparseable date is not evidence of a gap
    // A visit dated in the future is a data error, not a gap — never contact on it.
    if (months < 0) continue;
    if (months < interval.intervalMonths) continue;

    gaps.push({
      notAClinicalRecommendation: true,
      practiceId: membership.practiceId,
      patientId: membership.patientId,
      conditionCode: membership.conditionCode,
      intervalId: interval.id,
      intervalMonths: interval.intervalMonths,
      lastRelevantVisit: input.lastRelevantVisit,
      monthsSinceLastVisit: months,
      basis: "interval_elapsed",
    });
  }

  // Longest-overdue first, with never-visited ahead of them — a stable, explainable order.
  // This is recency arithmetic, NOT clinical prioritisation: it says who has waited longest,
  // never who is sickest.
  return gaps.sort((a, b) => {
    if (a.basis !== b.basis) return a.basis === "no_recorded_visit" ? -1 : 1;
    const am = a.monthsSinceLastVisit ?? 0;
    const bm = b.monthsSinceLastVisit ?? 0;
    if (am !== bm) return bm - am;
    return (a.patientId as string).localeCompare(b.patientId as string);
  });
}

/** Gap count per condition — what W60's console carries and W59's eligibility reads. */
export function gapCountsByCondition(gaps: readonly CareGap[]): Record<string, number> {
  // Null-prototype: condition codes come from a PMS feed, and a code of "__proto__" against
  // a plain object literal resolves to Object.prototype (non-nullish), so `?? 0` never fires,
  // `+ 1` yields a string, and the assignment is a silent no-op — the register would report
  // zero gaps for that condition with no error anywhere.
  const counts: Record<string, number> = Object.create(null);
  for (const gap of gaps) {
    const code = gap.conditionCode as string;
    counts[code] = (counts[code] ?? 0) + 1;
  }
  return counts;
}

/**
 * Gaps belonging to one practice. Callers that hold gaps from more than one tenant must
 * scope before narrowing or ranking; this is the seam that makes that possible at all.
 */
export function scopeGapsToPractice(
  gaps: readonly CareGap[],
  practiceId: PracticeId,
): CareGap[] {
  return gaps.filter((g) => g.practiceId === practiceId);
}
