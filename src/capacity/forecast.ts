// W223: the forecast, stated as an interval and never as a point.
//
// The row's example is the whole specification: "open 6 slots Thursday → 4 to 6 fill", never "5
// will fill". Those two sentences rest on identical arithmetic and say completely different things
// to somebody deciding whether to open a list, and the second is what every forecasting API
// returns by default — because a single number is what a function signature wants to give back.
//
// SO THERE IS NO POINT IN THE RETURN TYPE. `FilledRange` has `low` and `high` and no `expected`,
// no `midpoint`, no `mean`. A caller who wants a single number can average the two and own that
// claim; this module will not hand one over, and the absence is asserted on the type rather than
// left to a comment, because an `expected` field added later is a one-line change nobody flags.
//
// NOTHING IS FITTED AND NOTHING IS SMOOTHED. The range is read off what was recorded: the lowest
// and highest fill rate this session actually ran at, applied to the number of slots being opened.
// It is a RECORDED RANGE extrapolated, not a predictive interval — no distribution, no confidence
// level, no model. W215's posture, and it is why the sentence says "in the weeks recorded" rather
// than "we expect".
//
// THE WIDTH THEREFORE MEANS SOMETHING. A session that ran 5/6, 6/6, 5/6, 6/6 is genuinely more
// predictable than one that ran 1/6, 6/6, 2/6, 6/6, and the two get different intervals from the
// same average. An interval whose width came from a constant would be decoration.
//
// THE FLOOR IS ON RECORDED WEEKS, NOT ON SLOTS. One Thursday with 200 slots is one observation of
// one Thursday: a rate computed from it carries the confidence of two hundred measurements while
// holding the information of one. W222 separates `occurrences` from `slotsOffered` precisely so
// the floor lands on the right one — putting it on the denominator would be the error W215 found,
// a claim scaled from data it does not have.
//
// AND A WITHHELD FORECAST IS NOT A FORECAST OF ZERO (W196). A session with no history carries
// W222's own refusal and W222's own words through unchanged rather than getting a second sentence
// of its own: two phrasings of one refusal drift, and the drift is invisible (W177).

import type { RecordedBasis } from "@/reporting/model";
import {
  NO_HISTORY_COPY,
  WEEKDAY_NAMES,
  sessionHistory,
  type NoHistoryReason,
  type SessionKey,
  type SessionOccurrence,
} from "./model";

/**
 * The minimum number of recorded occurrences a forecast requires. Declared data, no parameter.
 *
 * W196's rule: a floor passed per call is a floor somebody raises after seeing the answer. Four
 * because the interval is a RANGE — with two occurrences the "lowest and highest observed" is just
 * the two values it saw, and a range that is only ever its own endpoints describes the sample
 * rather than the session.
 */
export const MIN_RECORDED_WEEKS: { readonly weeks: number; readonly why: string } = {
  weeks: 4,
  why:
    "The forecast is the range this session actually ran at, so it needs enough occurrences for a range to mean anything. With two, the lowest and highest observed values are simply the two values seen; with one there is no range at all. Four is the smallest number at which the interval describes the session rather than the sample, and it is the same figure for every session because a floor that varied between them could be lowered by choosing which session to ask about.",
};

export type ForecastRefusal =
  /** W222 has nothing recorded for this session. Its reason and its words are carried through. */
  | "no_recorded_history"
  /** It has run, and not often enough for a range to describe anything. */
  | "too_few_recorded_weeks"
  /** The question has no subject: no slots were being opened. */
  | "no_slots_to_open";

export const FORECAST_REFUSAL_COPY: Record<ForecastRefusal, string> = {
  no_recorded_history:
    "Nothing is recorded about how full this session runs, so there is no range to give. This is not a forecast that nothing will fill.",
  too_few_recorded_weeks:
    "This session has not run often enough for a range to describe it. A high and a low worked out from a couple of weeks are just those two weeks, and presenting them as the span this session runs at would give a narrow-looking answer the record cannot support.",
  no_slots_to_open:
    "No slots were being opened, so there is nothing to work out a range for. Ask again with the number of slots you are thinking of opening.",
};

/** How many of the opened slots filled, as a span. No point estimate — see the module note. */
export interface FilledRange {
  low: number;
  high: number;
}

/** The observed fill rates the range was extrapolated from. Stated so a reader can check it. */
export interface ObservedSpread {
  lowestRate: number;
  highestRate: number;
  recordedWeeks: number;
}

export type Forecast =
  | {
      forecast: true;
      slotsToOpen: number;
      range: FilledRange;
      observed: ObservedSpread;
      basis: RecordedBasis;
      /** The sentence a practice reads. Composed here so no surface writes its own. */
      sentence: string;
    }
  | { forecast: false; why: "no_recorded_history"; copy: string; carriedFrom: NoHistoryReason }
  | {
      forecast: false;
      why: "too_few_recorded_weeks";
      copy: string;
      recordedWeeks: number;
      weeksNeeded: number;
    }
  | { forecast: false; why: "no_slots_to_open"; copy: string };

/**
 * The range this session ran at, applied to the slots being opened — or the reason there is none.
 *
 * Takes W222's occurrences rather than its aggregated history, because the AGGREGATE cannot show a
 * spread: 185 filled of 188 offered is the same total whether every week ran near-full or one week
 * ran empty and the rest ran over. The refusals still come from `sessionHistory`, so this module
 * decides nothing W222 has already decided.
 */
export function forecastFill(
  occurrences: readonly SessionOccurrence[],
  key: SessionKey,
  slotsToOpen: number,
  period: { fromIso: string; toIso: string },
): Forecast {
  if (!Number.isInteger(slotsToOpen) || slotsToOpen <= 0) {
    return { forecast: false, why: "no_slots_to_open", copy: FORECAST_REFUSAL_COPY.no_slots_to_open };
  }

  // W222 owns whether anything is recorded at all, and its words come with its verdict.
  const history = sessionHistory(occurrences, key, period);
  if (!history.recorded) {
    return {
      forecast: false,
      why: "no_recorded_history",
      copy: `${FORECAST_REFUSAL_COPY.no_recorded_history} ${NO_HISTORY_COPY[history.why]}`,
      carriedFrom: history.why,
    };
  }

  // Per-occurrence rates: the spread is the point, and only the occurrences hold it. A week that
  // offered nothing is not a week that filled nothing, so it contributes no rate — the same
  // refusal W222 makes about the aggregate, applied one level down.
  const rates: number[] = [];
  for (const occurrence of occurrences) {
    if (occurrence.clinicianId !== key.clinicianId || occurrence.weekday !== key.weekday) continue;
    if (occurrence.slotsOffered === 0) continue;
    rates.push(occurrence.slotsFilled / occurrence.slotsOffered);
  }

  if (rates.length < MIN_RECORDED_WEEKS.weeks) {
    return {
      forecast: false,
      why: "too_few_recorded_weeks",
      copy: FORECAST_REFUSAL_COPY.too_few_recorded_weeks,
      recordedWeeks: rates.length,
      weeksNeeded: MIN_RECORDED_WEEKS.weeks - rates.length,
    };
  }

  let lowestRate = rates[0]!;
  let highestRate = rates[0]!;
  for (const rate of rates) {
    if (rate < lowestRate) lowestRate = rate;
    if (rate > highestRate) highestRate = rate;
  }

  // Rounded outwards: a range narrowed by rounding claims more than the record supports.
  const range: FilledRange = {
    low: Math.floor(lowestRate * slotsToOpen),
    high: Math.ceil(highestRate * slotsToOpen),
  };

  return {
    forecast: true,
    slotsToOpen,
    range,
    observed: { lowestRate, highestRate, recordedWeeks: rates.length },
    basis: {
      source: "the practice's own recorded diary",
      recordedFacts: rates.length,
      fromIso: period.fromIso,
      toIso: period.toIso,
    },
    sentence:
      `Opening ${slotsToOpen} slot${slotsToOpen === 1 ? "" : "s"} on ${WEEKDAY_NAMES[key.weekday]}: ` +
      `between ${range.low} and ${range.high} filled, going by the ${rates.length} ` +
      `${WEEKDAY_NAMES[key.weekday]}s recorded for this session.`,
  };
}

/**
 * The sentence to render when a forecast is withheld.
 *
 * Exported so every surface says the same thing, and so a withheld forecast cannot be rendered as
 * a range of zero to zero — which is what a caller reaching for a default would produce.
 */
export function withheldForecastCopy(forecast: Forecast): string | null {
  return forecast.forecast ? null : forecast.copy;
}
