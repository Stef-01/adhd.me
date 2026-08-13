// W59: register-driven eligibility.
//
// A care gap can make Meherr contact FEWER patients. It can never make it contact one it
// would not otherwise have contacted. That asymmetry is the whole unit, and it is structural
// rather than conventional: `withCareGapFilter` takes the W4 decision as its input and can
// only ever turn an `eligible: true` into a `false`. There is no branch that produces
// `eligible: true`, so no gap, register, or future edit to this file can widen the W4 rules —
// the only way to widen eligibility is to change W4 itself, where the consent and safety
// exclusions live and are tested.
//
// Why it matters: the W4 exclusions are opt-out, SMS consent, holdout arm, active recall,
// existing booking, recency, invite caps. Every one protects a patient or the measurement.
// A care gap is a scheduling observation about a calendar (W58), and a scheduling observation
// must never be able to overrule consent. Reversing that — "she has a gap, so contact her
// even though she opted out" — is precisely the failure this shape makes unrepresentable.

import type { Patient } from "@/domain/types";
import type { EligibilityResult } from "@/engine/eligibility";
import type { CareGap } from "./caregap";

export type RegisterExclusionReason = "no_care_gap";

export type RegisterEligibilityResult =
  | EligibilityResult
  | { eligible: false; reason: RegisterExclusionReason };

export interface CareGapFilterConfig {
  /**
   * When true, a patient must have an open care gap to be invited. Off by default: the
   * register is an ADDITIONAL narrowing input a practice opts into, not a new default.
   */
  requireCareGap: boolean;
}

export const DEFAULT_CARE_GAP_FILTER: CareGapFilterConfig = { requireCareGap: false };

/**
 * Apply the care-gap narrowing to an existing W4 decision.
 *
 * Note the shape: `base` is returned untouched whenever it is already a refusal, and the
 * only value this function can newly produce is a refusal. It is a filter, never a grant.
 */
export function withCareGapFilter(
  base: EligibilityResult,
  patient: Pick<Patient, "id">,
  gaps: readonly CareGap[],
  config: CareGapFilterConfig,
): RegisterEligibilityResult {
  // An existing exclusion is preserved verbatim, including its reason: the audit trail must
  // keep showing the most serious applicable cause, not have it overwritten by "no_care_gap".
  if (!base.eligible) return base;
  if (!config.requireCareGap) return base;
  const hasGap = gaps.some((g) => g.patientId === patient.id);
  return hasGap ? base : { eligible: false, reason: "no_care_gap" };
}

/**
 * The patients a care-gap-driven run should contact: those W4 already allows, narrowed to
 * those with an open gap. Returns a subset of `baseEligible` by construction.
 */
export function narrowToCareGaps<T extends { id: Patient["id"] }>(
  baseEligible: readonly T[],
  gaps: readonly CareGap[],
): T[] {
  const withGap = new Set(gaps.map((g) => g.patientId as string));
  return baseEligible.filter((p) => withGap.has(p.id as string));
}
