// W224: scoring the forecaster against what actually happened.
//
// W223 ships a forecaster and nothing yet knows whether it is any good. The row's sentence is the
// requirement: a forecaster that is usually wrong cannot present as one that is usually right.
//
// THE OBVIOUS SCORE IS TRIVIALLY GAMED, AND THE GAMING IS INVISIBLE. W223 returns a RANGE, and a
// range's hit rate improves by widening it: "between 0 and 6 will fill" is correct every single
// week and says nothing at all. A hit rate on its own therefore RANKS THE USELESS FORECASTER ABOVE
// THE USEFUL ONE while looking like rigour. So the score carries the WIDTH beside the hit rate,
// both live in one value, and the sentence names both — W219's move with the caveat, for the same
// reason: a number that is only honest next to another number must not be obtainable alone.
//
// THE BACK-TEST WALKS FORWARD, BECAUSE THE ALTERNATIVE IS A RESTATEMENT. W223's range is the
// lowest and highest rate observed, so it CONTAINS every week it was built from by construction:
// scoring a forecast against its own input would report 100% and would be measuring the arithmetic
// against itself. Each prediction is built from the weeks strictly before the one it is scored
// against, and the first can only be made once enough weeks have accumulated to clear W223's floor.
//
// A HIT IS A CONTAINMENT, NOT A CLOSENESS. There is no mean absolute error here and no "how close
// were we": those are scores for a point estimate, and reaching for one would smuggle back in the
// single number W223 deliberately refuses to produce.
//
// AND A SCORE OVER TOO FEW PREDICTIONS IS ITSELF A CLAIM. Three predictions and two hits is not
// "67% accurate", it is three weeks. Below a declared floor the score reports its COUNTS and
// withholds the RATE — W72's shape, and the fourth time this argument appears in this lane
// (W196's zero, W215's arms, W222's history, W223's weeks). It keeps appearing because it is the
// same mistake wearing different clothes each time.
//
// POOLED AND PER-SESSION SCORES ANSWER DIFFERENT QUESTIONS, and `scorePredictions` scores whatever
// set it is handed rather than choosing for the caller. Pooling every session's predictions asks
// "is this METHOD usually right"; scoring one session's asks "is this SESSION predictable". Both
// are legitimate and they are not interchangeable, so the floor applies to each on its own count
// and neither borrows the other's evidence.
//
// NOTHING IS SILENTLY DROPPED. A week that offered no slots cannot test a forecast — there is
// nothing to have filled — and it is recorded as skipped WITH its reason rather than quietly
// leaving the denominator, which is how a score comes to describe a friendlier set of weeks than
// the ones that happened.

import type { RecordedBasis } from "@/reporting/model";
import type { SessionKey, SessionOccurrence } from "./model";
import { forecastFill, type FilledRange } from "./forecast";

/**
 * The minimum number of scored predictions a RATE requires. Declared data, no parameter (W196).
 *
 * Five because a rate over fewer moves in steps a reader will over-read: with three predictions
 * every possible score is 0, 33, 67 or 100 per cent, and a forecaster that missed once reads as
 * having a two-thirds hit rate. The counts are reported below the floor regardless; it is the
 * PERCENTAGE that is withheld, because a percentage is what invites the comparison.
 */
export const MIN_SCORED_PREDICTIONS: { readonly predictions: number; readonly why: string } = {
  predictions: 5,
  why:
    "A hit rate over a handful of weeks moves in steps large enough to mislead: over three predictions the only possible scores are nought, a third, two thirds and all of them, so one miss reads as a settled two-thirds accuracy. The counts are always reported; it is the percentage that waits, because the percentage is what gets compared.",
};

/** One forecast, and the week it was scored against. */
export interface Prediction {
  dayIso: string;
  /** Slots that week actually offered. The forecast was made for exactly this many. */
  slotsOffered: number;
  range: FilledRange;
  actualFilled: number;
  /** Whether the recorded week fell inside the range. Containment, not closeness. */
  hit: boolean;
  /** `high - low`, in slots. The number that stops a wide guess from scoring as skill. */
  widthSlots: number;
}

/** A week the back-test could not score, and why. Never silently absent. */
export interface SkippedWeek {
  dayIso: string;
  why: string;
}

export interface BackTest {
  key: SessionKey;
  predictions: readonly Prediction[];
  skipped: readonly SkippedWeek[];
}

export type ScoreRefusal = "too_few_predictions";

export const SCORE_WITHHELD_COPY: Record<ScoreRefusal, string> = {
  too_few_predictions:
    "There have not been enough weeks to work out a hit rate yet. The counts below are what was recorded; a percentage over this few weeks would move in jumps big enough to read as a settled figure.",
};

export type ForecastScore =
  | {
      scored: true;
      predictions: number;
      hits: number;
      /** hits / predictions. Never present without `meanWidthSlots` — see the module note. */
      hitRate: number;
      /** Mean `high - low` in slots. The number that makes the hit rate mean something. */
      meanWidthSlots: number;
      /** The same width as a share of the slots on offer, so sessions of different size compare. */
      meanWidthShare: number;
      basis: RecordedBasis;
      /** Both numbers in one sentence, because either alone is misleading. */
      sentence: string;
    }
  | {
      scored: false;
      why: ScoreRefusal;
      predictions: number;
      hits: number;
      predictionsNeeded: number;
      copy: string;
    };

/**
 * Walk the session's recorded weeks forward, forecasting each from the ones before it.
 *
 * The forecast for week k is built from weeks 1..k-1 and never sees week k. That is the whole
 * design: W223's range contains its own inputs by construction, so any test that lets a week into
 * its own forecast reports a perfect score for arithmetic rather than a measurement of skill.
 */
export function backTest(
  occurrences: readonly SessionOccurrence[],
  key: SessionKey,
  period: { fromIso: string; toIso: string },
): BackTest {
  const mine = occurrences
    .filter((o) => o.clinicianId === key.clinicianId && o.weekday === key.weekday)
    .sort((a, b) => a.dayIso.localeCompare(b.dayIso));

  const predictions: Prediction[] = [];
  const skipped: SkippedWeek[] = [];

  for (let i = 0; i < mine.length; i++) {
    const week = mine[i]!;
    const before = mine.slice(0, i);
    const forecast = forecastFill(before, key, week.slotsOffered, period);
    if (!forecast.forecast) {
      // Named, not dropped: "not enough history yet" is the honest state of the early weeks, and a
      // back-test that omitted them silently would look like it had scored the whole record.
      skipped.push({
        dayIso: week.dayIso,
        why:
          week.slotsOffered === 0
            ? "This week offered no slots, so there was nothing for a forecast to be right or wrong about."
            : `No forecast could be made from the ${before.length} week(s) before this one.`,
      });
      continue;
    }
    predictions.push({
      dayIso: week.dayIso,
      slotsOffered: week.slotsOffered,
      range: forecast.range,
      actualFilled: week.slotsFilled,
      hit: week.slotsFilled >= forecast.range.low && week.slotsFilled <= forecast.range.high,
      widthSlots: forecast.range.high - forecast.range.low,
    });
  }

  return { key, predictions, skipped };
}

/**
 * Score a set of predictions — or report the counts and withhold the rate.
 *
 * Takes predictions rather than occurrences so a caller can score a DIFFERENT forecaster's
 * predictions with the same instrument. That is not a convenience: it is what lets the test show
 * an always-wide forecaster hitting every week and scoring worse, which is the only way to prove
 * this score measures what it claims to.
 */
export function scorePredictions(
  predictions: readonly Prediction[],
  period: { fromIso: string; toIso: string },
): ForecastScore {
  let hits = 0;
  let widthSlots = 0;
  let widthShare = 0;
  for (const prediction of predictions) {
    if (prediction.hit) hits += 1;
    widthSlots += prediction.widthSlots;
    widthShare += prediction.slotsOffered === 0 ? 0 : prediction.widthSlots / prediction.slotsOffered;
  }

  if (predictions.length < MIN_SCORED_PREDICTIONS.predictions) {
    return {
      scored: false,
      why: "too_few_predictions",
      predictions: predictions.length,
      hits,
      predictionsNeeded: MIN_SCORED_PREDICTIONS.predictions - predictions.length,
      copy: SCORE_WITHHELD_COPY.too_few_predictions,
    };
  }

  const meanWidthSlots = widthSlots / predictions.length;
  const meanWidthShare = widthShare / predictions.length;
  return {
    scored: true,
    predictions: predictions.length,
    hits,
    hitRate: hits / predictions.length,
    meanWidthSlots,
    meanWidthShare,
    basis: {
      source: "the practice's own recorded diary, each week forecast from the weeks before it",
      recordedFacts: predictions.length,
      fromIso: period.fromIso,
      toIso: period.toIso,
    },
    sentence:
      `Over ${predictions.length} weeks scored, the range contained what happened ${hits} times ` +
      `(${Math.round((hits / predictions.length) * 100)} per cent), and the range averaged ` +
      `${meanWidthSlots.toFixed(1)} slots wide — ${Math.round(meanWidthShare * 100)} per cent of ` +
      `the slots on offer. A wider range is right more often and says less.`,
  };
}

/**
 * A forecast and the score of the forecaster that made it, as one value.
 *
 * The row asks for the score to be rendered BESIDE the forecast, and the way to guarantee that is
 * for a caller to have no way of getting one without the other. There is no `forecastOnly` here to
 * reach for, and W223's own function stays what it is: this is the pairing, not a replacement.
 */
export function forecastWithScore(
  occurrences: readonly SessionOccurrence[],
  key: SessionKey,
  slotsToOpen: number,
  period: { fromIso: string; toIso: string },
): { forecast: ReturnType<typeof forecastFill>; score: ForecastScore; backTest: BackTest } {
  const history = backTest(occurrences, key, period);
  return {
    forecast: forecastFill(occurrences, key, slotsToOpen, period),
    score: scorePredictions(history.predictions, period),
    backTest: history,
  };
}
