// W225: the session-opening recommendation, addressed to the practice about its own diary.
//
// W222 counts, W223 forecasts, W224 scores. This is the first thing in the lane that says a
// practice might DO something, and it is one join away from being a triage.
//
// THE DANGER IS THE SENTENCE ONE STEP FROM THIS ONE. "If you open two more slots on Thursday,
// between one and two filled in the weeks recorded" is a statement about a diary. "…for the
// patients who are overdue" is a triage, and the tree already holds a recall register and a
// matcher that could size it. MATCH-1 is the worked example of that drift: `rankCandidates` has
// ordered the live invitation pool by `chronicCare` since W5, in a reasonable-looking line of
// code, contradicting a published ADM notice for eight quarters. So the refusal is a TYPE with
// nowhere to put a patient rather than a filter somebody remembers to apply.
//
// A RECOMMENDATION HERE IS A CONDITIONAL, NOT AN INSTRUCTION. The practice supplies the number of
// slots it is thinking about; this module does not choose it. Choosing it would require knowing
// the practice's staffing, its costs and its appetite, none of which this product has, and a
// recommendation that skips the "if" is claiming to know them. That the copy then passes W200's
// advice linter is a consequence rather than a constraint worked around — the honest form of this
// output is already the conditional form.
//
// THE HIT RATE IS ABOUT THE WEEKLY RANGES, NOT ABOUT THIS ONE — a distinction W234's code review
// found being blurred in the sentence this module composes. `backTest` only ever forecasts
// `week.slotsOffered`, the slots a week actually had; this function forecasts EXTRA slots. Both
// ranges come from the same recorded rates, so the track record is relevant, but it is not a track
// record OF THIS RANGE and the first draft said "ranges like this one contained what happened 85
// per cent of the time" — a real rate attached to a different question, which is precisely the
// overclaim this lane exists to prevent, in the sentence written to prevent it. The wording now
// says what was actually scored: the weekly ranges this is worked out from.
//
// IT MAY ONLY SPEAK WHERE THE FORECASTER HAS BEEN SCORED. W224 exists so a forecaster that is
// usually wrong cannot present as one that is usually right; a recommendation resting on an
// UNSCORED forecast is exactly that presentation. Below W224's floor there is no recommendation at
// all — not a hedged one, because a hedge is still a claim somebody acts on.
//
// AND THE SCORE THAT RIDES IT IS THE METHOD'S, WHICH IS NAMED RATHER THAN GLOSSED. W224 drew the
// distinction: pooled predictions answer "is this method usually right", one session's answer "is
// this session predictable". A practice's own sessions rarely have enough weeks for the second, so
// the score carried here is the first — the method's record across THIS practice's sessions — and
// `scoreScope` says so in the value. One member today, asserted by value, so a second reading of
// "scored" cannot arrive without a visible widening (W215's one-member union).
//
// THE DEMAND EVIDENCE IS DESCRIPTIVE AND IT IS THE POINT. Opening more slots to be filled presumes
// demand the record may not show: a session that has never once filled every slot it offered is
// one where the record holds no evidence of unmet demand. Reported as a count of weeks run full,
// not as advice about whether to open — the practice knows things this does not.

import type { RecordedBasis } from "@/reporting/model";
import { WEEKDAY_NAMES, type SessionKey, type SessionOccurrence } from "./model";
import { forecastFill, type FilledRange } from "./forecast";
import { backTest, scorePredictions, type ForecastScore } from "./score";

/**
 * Whose track record the score beside a recommendation is.
 *
 * One member, deliberately: see the module note. A second reading of "scored" — this session's own
 * weeks, say — is a real thing somebody may want later, and it must arrive as a visible change to
 * a declared type rather than as a quiet change of meaning behind the same word.
 */
export type ScoreScope = "method_across_this_practice";

export const ALL_SCORE_SCOPES: readonly ScoreScope[] = ["method_across_this_practice"];

export type RecommendationRefusal =
  /** W223 would not forecast this session. Its reason and its words are carried through. */
  | "no_forecast"
  /** W224 has not scored the forecaster over enough weeks for anything to rest on it. */
  | "forecaster_unscored";

export const RECOMMENDATION_WITHHELD_COPY: Record<RecommendationRefusal, string> = {
  no_forecast:
    "There is no range for this session, so there is nothing to say about opening more of it.",
  forecaster_unscored:
    "How well these ranges have matched what actually happened is not known yet, so nothing is offered about opening more slots. A range nobody has checked against the record is not a basis for changing a diary, and a hedged version of it would be read as one anyway.",
};

export interface SessionRecommendation {
  key: SessionKey;
  label: string;
  /** The practice's own number, echoed back. This module never chooses it. */
  slotsConsidered: number;
  range: FilledRange;
  /** Weeks in which every offered slot was filled. The record's only evidence of unmet demand. */
  weeksRunFull: number;
  weeksRecorded: number;
  scoreScope: ScoreScope;
  score: Extract<ForecastScore, { scored: true }>;
  basis: RecordedBasis;
  /** The conditional a practice reads. Composed here so no surface writes its own. */
  sentence: string;
  /** What the record does and does not show about demand beyond what was offered. */
  demandEvidence: string;
}

export type RecommendationResult =
  | { offered: true; recommendation: SessionRecommendation }
  | { offered: false; why: RecommendationRefusal; copy: string };

/**
 * What the record says about opening more of one session — or the reason it says nothing.
 *
 * Takes the WHOLE practice's occurrences: the forecast is built from this session's weeks and the
 * score from every session's, which is the distinction `scoreScope` records. No patient enters
 * this signature and none can enter the result — a `SessionOccurrence` is a clinician, a weekday
 * and two counts, and there is nowhere in it or in `SessionRecommendation` for a person.
 */
export function sessionRecommendation(
  practiceOccurrences: readonly SessionOccurrence[],
  key: SessionKey,
  slotsConsidered: number,
  period: { fromIso: string; toIso: string },
): RecommendationResult {
  // The method's record across this practice's sessions, not this session's own — named in the
  // value rather than glossed, because the two are different claims.
  const everyKey = new Map<string, SessionKey>();
  for (const occurrence of practiceOccurrences) {
    everyKey.set(`${occurrence.clinicianId}::${occurrence.weekday}`, {
      clinicianId: occurrence.clinicianId,
      weekday: occurrence.weekday,
    });
  }
  const predictions = [...everyKey.values()].flatMap(
    (each) => backTest(practiceOccurrences, each, period).predictions,
  );
  return recommendationFrom(practiceOccurrences, key, slotsConsidered, period, scorePredictions(predictions, period));
}

/** The body, given a score. Shared by the single-session and many-session entry points. */
function recommendationFrom(
  practiceOccurrences: readonly SessionOccurrence[],
  key: SessionKey,
  slotsConsidered: number,
  period: { fromIso: string; toIso: string },
  score: ForecastScore,
): RecommendationResult {
  const forecast = forecastFill(practiceOccurrences, key, slotsConsidered, period);
  if (!forecast.forecast) {
    return {
      offered: false,
      why: "no_forecast",
      copy: `${RECOMMENDATION_WITHHELD_COPY.no_forecast} ${forecast.copy}`,
    };
  }

  if (!score.scored) {
    return {
      offered: false,
      why: "forecaster_unscored",
      copy: RECOMMENDATION_WITHHELD_COPY.forecaster_unscored,
    };
  }

  const mine = practiceOccurrences.filter(
    (o) => o.clinicianId === key.clinicianId && o.weekday === key.weekday && o.slotsOffered > 0,
  );
  let weeksRunFull = 0;
  for (const occurrence of mine) {
    if (occurrence.slotsFilled === occurrence.slotsOffered) weeksRunFull += 1;
  }

  const weekday = WEEKDAY_NAMES[key.weekday];
  const demandEvidence =
    weeksRunFull === 0
      ? `In the ${mine.length} ${weekday}s recorded, this session has never filled every slot it offered. The record holds no sign of people who wanted an appointment and could not have one, which is not the same as there being none.`
      : `This session filled every slot it offered on ${weeksRunFull} of the ${mine.length} ${weekday}s recorded, so on those days the record cannot show whether more would have been taken.`;

  return {
    offered: true,
    recommendation: {
      key,
      label: `${key.clinicianId}, ${weekday}`,
      slotsConsidered,
      range: forecast.range,
      weeksRunFull,
      weeksRecorded: mine.length,
      scoreScope: "method_across_this_practice",
      score,
      basis: forecast.basis,
      sentence:
        `If ${slotsConsidered} more slot${slotsConsidered === 1 ? "" : "s"} were opened on ${weekday}: ` +
        `between ${forecast.range.low} and ${forecast.range.high} filled, going by the ` +
        `${forecast.observed.recordedWeeks} ${weekday}s recorded for this session. ` +
        `Across this practice's sessions, the weekly ranges this is worked out from contained ` +
        `what happened ${Math.round(score.hitRate * 100)} per cent of the time.`,
      demandEvidence,
    },
  };
}

/**
 * Recommendations for many sessions, with the practice-wide score computed ONCE.
 *
 * `sessionRecommendation` back-tests every session in the practice to work out the method's track
 * record, which is correct for one call and quadratic for a page: W234's review measured the
 * capacity console doing 70 × 70 = 4,900 back-tests per render. This does the shared half once.
 *
 * NOT an optimisation with a different answer: a test asserts this and `sessionRecommendation`
 * agree for every session, because two paths to one number is exactly how a fast path comes to say
 * something the slow path never would.
 */
export function sessionRecommendations(
  practiceOccurrences: readonly SessionOccurrence[],
  keys: readonly SessionKey[],
  slotsConsidered: number,
  period: { fromIso: string; toIso: string },
): { key: SessionKey; result: RecommendationResult }[] {
  const everyKey = new Map<string, SessionKey>();
  for (const occurrence of practiceOccurrences) {
    everyKey.set(`${occurrence.clinicianId}::${occurrence.weekday}`, {
      clinicianId: occurrence.clinicianId,
      weekday: occurrence.weekday,
    });
  }
  const score = scorePredictions(
    [...everyKey.values()].flatMap((each) => backTest(practiceOccurrences, each, period).predictions),
    period,
  );
  return keys.map((key) => ({
    key,
    result: recommendationFrom(practiceOccurrences, key, slotsConsidered, period, score),
  }));
}

/** The sentence to render when nothing is offered. Exported so every surface says the same thing. */
export function withheldRecommendationCopy(result: RecommendationResult): string | null {
  return result.offered ? null : result.copy;
}
