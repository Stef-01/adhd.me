// W215: what would have happened without the intervention.
//
// This is the question every claim in the product eventually rests on, and it is unanswerable.
// Nobody can observe the same practice both messaged and not messaged over the same weeks. So
// there are only two honest postures: hold out a group and compare, or say nothing. Everything
// in between — a propensity model, a synthetic control, a regression-adjusted baseline, an
// "expected bookings" curve — is a guess with a confidence interval that a practice will read as
// a measurement.
//
// SO THE COMPARATOR IS A ONE-MEMBER UNION. `Comparator` has exactly one value,
// `observed_holdout_arm`, and adding a second is a visible widening of a declared type rather
// than an option somebody passes. There is no strategy parameter, no `method` argument and no
// pluggable baseline; a test asserts the union's membership by value, because a single-member
// union that quietly grows is the whole failure mode.
//
// AND THE FIGURE IS COHORT-ONLY, REFUSED PER PATIENT BY ABSENCE. "Would Mrs Nguyen have come
// anyway" is the question a per-patient counterfactual answers, and it is both unanswerable and
// the input to a triage. No function here takes a patient — asserted on the signatures, not
// just on the names — so the refusal is structural rather than a rule somebody remembers.
//
// THE FLOOR, AND THE GAP THIS UNIT FOUND. W72 established that a cohort below a stated minimum
// gets its counts reported and its CLAIM withheld: "an incremental-per-1000 extrapolated from an
// 8-patient arm is noise with a decimal point". That floor was applied to register cohorts and
// never to the practice-wide figure — `countAttribution` withholds only when the holdout arm is
// EMPTY, so a practice with three holdout patients gets a north-star number on its dashboard.
// This module applies W72's floor to the practice-wide figure, importing `MIN_ARM_PATIENTS`
// rather than restating it: two floors would drift, and the drift would be invisible.
//
// Raw counts are still reported when the claim is withheld — W72's shape exactly. A withheld
// claim is not a zero and not a gap: it is a measurement the arithmetic cannot carry, and the
// difference is stated in words rather than left to the reader (W197's rule about suppression).

import type { AttributionResult } from "@/engine/attribution";
import { MIN_ARM_PATIENTS } from "@/registers/attribution";

/**
 * Where a counterfactual may come from.
 *
 * One member, on purpose. See the module note: the second member is the whole risk, and a union
 * makes adding one a change to a declared shape that a reviewer sees.
 */
export type Comparator = "observed_holdout_arm";

export const ALL_COMPARATORS: readonly Comparator[] = ["observed_holdout_arm"];

export type CounterfactualRefusal =
  /** No holdout arm at all, so there is nothing to compare against. W9's original refusal. */
  | "no_holdout_arm"
  /** The holdout arm is below W72's floor: the comparator itself is too thin to extrapolate. */
  | "holdout_arm_below_floor"
  /** The invited arm is below the floor: the figure would be scaled from too few people. */
  | "invited_arm_below_floor";

export const COUNTERFACTUAL_WITHHELD_COPY: Record<CounterfactualRefusal, string> = {
  no_holdout_arm:
    "There is no comparison group at this practice, so there is nothing to say what would have happened without the messages. The counts below are still what was recorded; the difference between them is not a claim anybody can make.",
  holdout_arm_below_floor:
    "The comparison group is too small for the arithmetic to carry a claim. A rate worked out from a handful of people and scaled up is noise with a decimal point, so the figure is withheld rather than shown with a caveat nobody reads.",
  invited_arm_below_floor:
    "The messaged group is too small for the arithmetic to carry a claim. The counts below are what was recorded; scaling a rate from this few people would produce a confident-looking number the data does not support.",
};

/** The arithmetic, and what it rests on. W196: a figure without its basis is an impression. */
export interface CounterfactualBasis {
  comparator: Comparator;
  invitedArmPatients: number;
  holdoutArmPatients: number;
  invitedAttended: number;
  holdoutAttended: number;
  /** The minimum arm size a claim requires. Stated so a reader can check the refusal. */
  floor: number;
}

export interface CounterfactualFigure {
  /** What the invited arm actually attended, in the window. A count, not an estimate. */
  observed: number;
  /**
   * What the invited arm would have attended at the holdout arm's OBSERVED rate.
   *
   * Not a prediction and not a model output: it is one measured rate applied to a known head
   * count. The only thing being assumed is that the two arms are otherwise alike, which is what
   * randomised assignment buys and is the only reason this number is allowed to exist.
   */
  withoutTheIntervention: number;
  /** observed − withoutTheIntervention. Negative is a real answer, not an error. */
  difference: number;
  basis: CounterfactualBasis;
}

export type CounterfactualResult =
  | { claimed: true; figure: CounterfactualFigure }
  | {
      claimed: false;
      /** Every reason, not the first — a caller showing one of three is showing a third of it. */
      withheld: CounterfactualRefusal[];
      basis: CounterfactualBasis;
    };

export interface CounterfactualOptions {
  /**
   * Override W72's floor. A real pilot sets this from the practice's own numbers.
   *
   * Deliberately NOT a comparator or a method: the only thing tunable here is how much data a
   * claim requires, never where the claim comes from.
   */
  minArmPatients?: number;
}

/**
 * The counterfactual for one practice-wide attribution result.
 *
 * Takes the already-counted arms rather than patients and appointments, which is why there is no
 * patient in this signature and no per-patient answer to give. W9 owns the counting;
 * this owns whether the difference between the arms may be claimed at all.
 */
export function counterfactual(
  attribution: AttributionResult,
  options: CounterfactualOptions = {},
): CounterfactualResult {
  const floor = options.minArmPatients ?? MIN_ARM_PATIENTS;
  const invited = attribution.inviteArm;
  const holdout = attribution.holdoutArm;
  const basis: CounterfactualBasis = {
    comparator: "observed_holdout_arm",
    invitedArmPatients: invited.patients,
    holdoutArmPatients: holdout.patients,
    invitedAttended: invited.attended,
    holdoutAttended: holdout.attended,
    floor,
  };

  const withheld: CounterfactualRefusal[] = [];
  if (holdout.patients === 0) withheld.push("no_holdout_arm");
  else if (holdout.patients < floor) withheld.push("holdout_arm_below_floor");
  if (invited.patients < floor) withheld.push("invited_arm_below_floor");
  if (withheld.length > 0) return { claimed: false, withheld, basis };

  // One measured rate applied to a known head count. Nothing is fitted and nothing is smoothed.
  const withoutTheIntervention = (holdout.attendedPer1000 * invited.patients) / 1000;
  return {
    claimed: true,
    figure: {
      observed: invited.attended,
      withoutTheIntervention,
      difference: invited.attended - withoutTheIntervention,
      basis,
    },
  };
}

/**
 * The sentence to render when the claim is withheld.
 *
 * Exported so every surface says the same thing, and so "withheld" cannot be rendered as a zero
 * — which is what the incrementality dashboard did until this unit: `(incrementalAttended ?? 0)`
 * printed a confident `0` for a practice that simply had no comparison group.
 */
export function withheldCopy(result: CounterfactualResult): string | null {
  if (result.claimed) return null;
  return result.withheld.map((reason) => COUNTERFACTUAL_WITHHELD_COPY[reason]).join(" ");
}
