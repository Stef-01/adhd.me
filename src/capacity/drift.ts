// W228: the drift monitor — has the forecaster stopped tracking reality?
//
// W224 scores the forecaster over its whole record, which is exactly the shape that hides a
// forecaster that WAS right and has stopped being right. Eighty-five per cent over a year can be
// ninety-five per cent then seventy, and the average reports neither of those. This splits the
// record in two and compares the halves.
//
// W120'S RULE IS THE WHOLE GATE: REPORT THE DISAGREEMENT, DO NOT RESOLVE IT. The obvious next line
// after detecting drift is to widen the ranges until the hit rate recovers, and it is wrong twice.
// It destroys the only evidence that something changed — after a recalibration the record shows a
// forecaster that was always fine. And a range widened to fit its own misses is W224's useless
// forecaster arriving through the back door with a justification: "between 0 and 6 will fill" is
// right every week, and a monitor that tunes toward it is optimising for the number W224 exists to
// stop anybody optimising for.
//
// SO THERE IS NO RECALIBRATION HERE, AND THE ABSENCE IS ASSERTED RATHER THAN PROMISED. Nothing in
// this module returns a range, a rate or a floor. The only thing it returns is a description of
// two windows and the difference between them.
//
// AND DRIFT DOES NOT SAY WHICH SIDE MOVED. A hit rate that falls can mean the method has gone
// stale, or that the practice's world changed: a clinician left, a second location opened, a
// season the record has never seen. This cannot tell those apart and must not appear to. It
// reports that the record and the method have parted company, with both windows' counts, and stops
// there — the copy says so in words, because a monitor that reads as "the forecaster is broken" is
// making the claim it refused to compute.
//
// THE THRESHOLD IS DECLARED DATA WITH A REASON (W196). A drift threshold passed per call is a
// threshold somebody raises after seeing the alert, which is the same move as widening the range
// and is harder to spot.

import type { RecordedBasis } from "@/reporting/model";
import { MIN_SCORED_PREDICTIONS, type Prediction } from "./score";

/**
 * How far the hit rate must fall between the halves before it is reported as drift.
 *
 * Ten points, and the reason is arithmetic rather than taste: with the smallest window this module
 * will look at — W224's floor of scored predictions — one extra miss moves the rate by more than a
 * tenth, so a smaller threshold would report the difference between "one miss" and "two misses" as
 * a change in the world. It is a single figure for every practice, because a threshold that varied
 * could be chosen after the alert.
 */
export const DRIFT_THRESHOLD: { readonly points: number; readonly why: string } = {
  points: 0.1,
  why:
    "Ten percentage points. With the smallest window this looks at, a single extra miss moves the hit rate by more than that, so anything tighter would report the difference between one miss and two as a change in the world. One figure for every practice, because a threshold that could vary is a threshold somebody sets after seeing the alert.",
};

export type DriftVerdict =
  /** The two halves agree within the threshold. Not a claim that the forecaster is good. */
  | "tracking"
  /** The recent half is worse by more than the threshold. Not a claim about why. */
  | "drifted"
  /** The recent half is BETTER by more than the threshold. Reported, not celebrated. */
  | "improved";

export type DriftRefusal = "too_few_in_a_window";

export const DRIFT_REFUSAL_COPY: Record<DriftRefusal, string> = {
  too_few_in_a_window:
    "There are not enough scored weeks on both sides of the record to compare them. Splitting what there is would produce two figures too small to mean anything and a difference between them that is mostly arithmetic.",
};

export const DRIFT_VERDICT_COPY: Record<DriftVerdict, string> = {
  tracking:
    "The ranges have matched what happened about as often lately as they did earlier. This says the two halves of the record agree; it does not say the ranges are good, which is the separate figure reported beside them.",
  drifted:
    "The ranges have matched what happened less often lately than they did earlier. This does not say which side moved: the method may have gone stale, or the practice's weeks may have changed — a clinician leaving, a second location, a stretch the record has not seen before. Nothing here has been adjusted to close the gap, because the gap is the finding.",
  improved:
    "The ranges have matched what happened more often lately than they did earlier. Reported for the same reason a fall is: the two halves of the record disagree, and which side moved is not something this can tell you.",
};

export interface DriftWindow {
  predictions: number;
  hits: number;
  hitRate: number;
  meanWidthSlots: number;
  fromIso: string;
  toIso: string;
}

export type DriftReport =
  | {
      compared: true;
      verdict: DriftVerdict;
      earlier: DriftWindow;
      recent: DriftWindow;
      /** recent.hitRate − earlier.hitRate. Negative is drift; the sign is kept, not absolute. */
      change: number;
      threshold: number;
      basis: RecordedBasis;
      copy: string;
    }
  | {
      compared: false;
      why: DriftRefusal;
      /** Both counts, so a reader can see how far off a comparison is. */
      earlierPredictions: number;
      recentPredictions: number;
      copy: string;
    };

/**
 * Summarise one half of the record.
 *
 * Counts directly rather than reading `scorePredictions`, which would need a fallback for the
 * withheld case — and that case is unreachable here, since `driftReport` checks the floor before
 * calling this. A fallback for an unreachable state returns plausible numbers for a situation
 * nobody has reasoned about (W213), so instead the test asserts these figures equal what
 * `scorePredictions` gives for the same window. Two computations agreeing under test beats one
 * computation with a branch nothing can reach.
 */
function windowOf(predictions: readonly Prediction[], period: { fromIso: string; toIso: string }): DriftWindow {
  let hits = 0;
  let width = 0;
  for (const prediction of predictions) {
    if (prediction.hit) hits += 1;
    width += prediction.widthSlots;
  }
  return {
    predictions: predictions.length,
    hits,
    hitRate: hits / predictions.length,
    meanWidthSlots: width / predictions.length,
    fromIso: predictions[0]?.dayIso ?? period.fromIso,
    toIso: predictions[predictions.length - 1]?.dayIso ?? period.toIso,
  };
}

/**
 * Split the scored record in two and report whether the halves agree.
 *
 * The split is by date order and at the midpoint: a split chosen anywhere else is a split somebody
 * could move until the answer changed. With an odd count the extra prediction goes to the RECENT
 * half, so the newer evidence is never the thinner side.
 */
export function driftReport(
  predictions: readonly Prediction[],
  period: { fromIso: string; toIso: string },
): DriftReport {
  const ordered = [...predictions].sort((a, b) => a.dayIso.localeCompare(b.dayIso));
  const cut = Math.floor(ordered.length / 2);
  const earlierPredictions = ordered.slice(0, cut);
  const recentPredictions = ordered.slice(cut);

  if (
    earlierPredictions.length < MIN_SCORED_PREDICTIONS.predictions ||
    recentPredictions.length < MIN_SCORED_PREDICTIONS.predictions
  ) {
    return {
      compared: false,
      why: "too_few_in_a_window",
      earlierPredictions: earlierPredictions.length,
      recentPredictions: recentPredictions.length,
      copy: DRIFT_REFUSAL_COPY.too_few_in_a_window,
    };
  }

  const earlier = windowOf(earlierPredictions, period);
  const recent = windowOf(recentPredictions, period);
  const change = recent.hitRate - earlier.hitRate;
  // EXACTLY AT THE THRESHOLD COUNTS. Both rates come from integer division, so a fall a reader
  // would call "exactly ten points" arrives as -0.09999999999999998 and a bare `<=` reports it as
  // tracking. Caught by testing the boundary from both sides rather than from far away — the
  // failure only ever fires at the one input anybody would check by hand.
  const epsilon = 1e-9;
  const verdict: DriftVerdict =
    change <= -DRIFT_THRESHOLD.points + epsilon
      ? "drifted"
      : change >= DRIFT_THRESHOLD.points - epsilon
        ? "improved"
        : "tracking";

  return {
    compared: true,
    verdict,
    earlier,
    recent,
    change,
    threshold: DRIFT_THRESHOLD.points,
    basis: {
      source: "the practice's own recorded diary, split in two at the midpoint of the scored weeks",
      recordedFacts: ordered.length,
      fromIso: period.fromIso,
      toIso: period.toIso,
    },
    copy:
      `${DRIFT_VERDICT_COPY[verdict]} Earlier: ${earlier.hits} of ${earlier.predictions}. ` +
      `Lately: ${recent.hits} of ${recent.predictions}.`,
  };
}
