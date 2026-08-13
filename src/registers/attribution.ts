// W72: condition attribution — incrementality per register cohort.
//
// W9 answers "did Meherr add attended appointments at this practice". This answers it
// per condition, because a practice deciding whether to keep the diabetes register on
// needs the diabetes number, not the practice-wide one.
//
// The v1 definitions are NOT restated here. Each cohort is measured by the same
// `countAttribution` the practice-wide figure uses, with the panel narrowed to that
// register's members — so a change to attribution law lands in one place and every
// cohort follows. docs/ATTRIBUTION.md stays the single written definition.
//
// Two properties of per-condition measurement that the practice-wide figure does not have,
// both of which are ways to mislead if left implicit:
//
//   1. COHORTS OVERLAP. A patient on the diabetes and CKD registers is in both, and their
//      attended appointments are counted in both. Cohort numbers therefore MUST NOT be
//      summed to a practice total — the practice total is the W9 figure. `overlapCount`
//      is reported so a caller can see the overlap rather than discover it in a spreadsheet.
//   2. COHORTS ARE SMALL. A register might hold 40 patients, of whom 8 are holdout. An
//      incremental-per-1000 extrapolated from an 8-patient arm is noise with a decimal
//      point. Below a stated minimum, counts are still reported but the CLAIM is withheld,
//      exactly as W9 withholds it when there is no holdout arm at all.

import type {
  Appointment,
  ConditionCode,
  Patient,
  Practice,
  RegisterMembership,
} from "@/domain/types";
import {
  ATTRIBUTION_VERSION,
  countAttribution,
  type AttributionResult,
  type MeasurementWindow,
} from "@/engine/attribution";

/**
 * Minimum patients in BOTH arms before a cohort may carry an incrementality claim.
 *
 * Not a significance test — it is a floor below which the arithmetic is obviously not
 * worth reporting. A real pilot sets this from the practice's own numbers; the default is
 * deliberately conservative because the failure mode is a confident-looking figure.
 */
export const MIN_ARM_PATIENTS = 30;

export type WithheldReason = "no_holdout_arm" | "cohort_too_small";

export interface ConditionClaim {
  incrementalPer1000: number;
  incrementalAttended: number;
}

export interface ConditionAttribution {
  version: typeof ATTRIBUTION_VERSION;
  conditionCode: ConditionCode;
  /** Raw arm counts for the cohort — always reported, claim or no claim. */
  cohort: AttributionResult;
  /**
   * The headline figures, or null when they must not be claimed. Read THIS rather than
   * `cohort.incremental*`: the raw result carries arithmetic that may be too thin to show.
   */
  claim: ConditionClaim | null;
  withheld: WithheldReason | null;
}

export interface ConditionAttributionOptions {
  minArmPatients?: number;
}

export interface ConditionAttributionReport {
  window: MeasurementWindow;
  conditions: ConditionAttribution[];
  /** Patients counted in more than one cohort. Cohorts must not be summed. */
  overlapCount: number;
}

/** Live register members per condition (removed memberships are history, not a cohort). */
function cohortsByCondition(
  memberships: readonly RegisterMembership[],
  practice: Practice,
): Map<ConditionCode, Set<string>> {
  const cohorts = new Map<ConditionCode, Set<string>>();
  for (const m of memberships) {
    if (m.practiceId !== practice.id) continue;
    if (m.removedAt !== null) continue;
    const set = cohorts.get(m.conditionCode) ?? new Set<string>();
    set.add(m.patientId);
    cohorts.set(m.conditionCode, set);
  }
  return cohorts;
}

export function attributionByCondition(
  practice: Practice,
  patients: readonly Patient[],
  appointments: readonly Appointment[],
  memberships: readonly RegisterMembership[],
  window: MeasurementWindow,
  options: ConditionAttributionOptions = {},
): ConditionAttributionReport {
  const minArm = options.minArmPatients ?? MIN_ARM_PATIENTS;
  const cohorts = cohortsByCondition(memberships, practice);

  const membershipTally = new Map<string, number>();
  for (const [, ids] of cohorts) {
    for (const id of ids) membershipTally.set(id, (membershipTally.get(id) ?? 0) + 1);
  }
  let overlapCount = 0;
  for (const [, count] of membershipTally) if (count > 1) overlapCount += 1;

  const conditions: ConditionAttribution[] = [];

  // Sorted so a report's row order is stable across runs rather than map-insertion order.
  // Copied once, not once per condition: the spread exists only to satisfy countAttribution's
  // mutable Appointment[] parameter, which it never mutates.
  const apptsOnce = [...appointments];
  for (const conditionCode of [...cohorts.keys()].sort()) {
    const ids = cohorts.get(conditionCode)!;
    const cohortPatients = patients.filter((p) => ids.has(p.id));
    const cohort = countAttribution(practice, cohortPatients, apptsOnce, window);

    let withheld: WithheldReason | null = null;
    if (cohort.incrementalPer1000 === null || cohort.incrementalAttended === null) {
      withheld = "no_holdout_arm";
    } else if (cohort.inviteArm.patients < minArm || cohort.holdoutArm.patients < minArm) {
      withheld = "cohort_too_small";
    }

    conditions.push({
      version: ATTRIBUTION_VERSION,
      conditionCode,
      cohort,
      claim:
        withheld === null
          ? {
              incrementalPer1000: cohort.incrementalPer1000!,
              incrementalAttended: cohort.incrementalAttended!,
            }
          : null,
      withheld,
    });
  }

  return { window, conditions, overlapCount };
}

/**
 * Why a cohort shows no number, in words a practice manager can act on. Never invents a
 * figure to fill the gap — "we cannot say" is the honest output and the product says it.
 */
export function explainWithheld(reason: WithheldReason, minArmPatients = MIN_ARM_PATIENTS): string {
  switch (reason) {
    case "no_holdout_arm":
      return "No comparison group on this register yet, so there is nothing to measure against.";
    case "cohort_too_small":
      return `This register is too small to measure reliably — it needs at least ${minArmPatients} patients in each group.`;
  }
}
