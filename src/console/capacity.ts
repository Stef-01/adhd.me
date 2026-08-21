// W229: the capacity console's view — where W222–W228 finally get read.
//
// Seven modules and nothing rendered any of them. Every refusal the lane built only does its work
// at the moment somebody reads a number, so this is where they are kept or lost.
//
// THE ROW'S GATE IS A DISTINCTION EASY TO STATE AND EASY TO LOSE: NO DATA IS NOT NO CAPACITY.
// They are opposite facts behind the same blank screen. A practice whose diary holds nothing has
// told this page nothing at all. A practice whose every session runs full has told it something
// quite definite — that there is no room. Rendering either as "no capacity information" states the
// wrong one half the time, and the half it gets wrong is the one where a practice concludes it has
// spare room it does not have.
//
// THERE IS A THIRD AND IT IS THE ONE THE SIMULATION ACTUALLY PRODUCES: a diary with sessions whose
// forecaster is not yet scored, so ranges exist and W225 will recommend nothing from them. Three
// states, three sentences, each reached by construction in the test rather than reasoned about —
// W220's rule, which found a fourth state there by applying it.
//
// THE DRIFT VERDICT IS NOT A GRADE AND MUST NOT RENDER AS ONE. W228 reports that two halves of the
// record disagree and refuses to say which side moved. A page that colours `drifted` red has
// resolved that disagreement in CSS — W173's argument about the unknown pile, inherited rather
// than re-argued, and `improved` gets identical treatment for identical reasons.
//
// AND THE CALENDAR GAP IS SHOWN, NOT OMITTED. W227 ships empty on purpose, so nothing on this page
// allows for the days a practice was shut. That absence is a property of the numbers being read
// and belongs beside them.

import {
  CALENDAR_UNKNOWN_COPY,
  loadCalendar,
  SHIPPED_HOLIDAYS,
  type HolidayCalendar,
} from "@/capacity/calendar";
import {
  capacityReport,
  occurrencesFrom,
  sessionKeyOf,
  type CapacityReport,
  type SessionOccurrence,
} from "@/capacity/model";
import { backTest, scorePredictions, type ForecastScore } from "@/capacity/score";
import { driftReport, type DriftReport } from "@/capacity/drift";
import { sessionRecommendations, type RecommendationResult } from "@/capacity/recommendation";
import type { Appointment } from "@/domain/types";

/** Why the page has no capacity picture to show. Three different facts, three sentences. */
export type CapacityEmptyReason = "no_data" | "no_capacity" | "forecaster_unscored";

export const CAPACITY_EMPTY_COPY: Record<CapacityEmptyReason, string> = {
  no_data:
    "Nothing has been recorded about how this practice's sessions ran, so there is nothing here to read. This is not a practice with no room — it is a diary this page has not been given.",
  no_capacity:
    "Every session on record filled every slot it offered. There is no spare room in what has been recorded, which is a fact about the diary rather than a gap in it — the opposite of having nothing to show.",
  forecaster_unscored:
    "The sessions are here and the ranges have not been checked against enough weeks to rest anything on yet. Counts are shown; nothing is offered about opening more slots until the ranges have a track record.",
};

export interface CapacitySessionRow {
  label: string;
  /** Null where W222 recorded no history — never a fabricated zero. See the mapping below. */
  occurrences: number | null;
  slotsOffered: number | null;
  slotsFilled: number | null;
  /** Null where W222 refused a rate — never rendered as nought per cent. */
  utilisation: number | null;
  /**
   * What the page prints in the "how full" cell.
   *
   * COMPOSED HERE RATHER THAN IN THE TEMPLATE, and that is the whole point. In the page it was
   * `row.utilisation === null ? "—" : pct(row.utilisation)`, one keystroke from `pct(x ?? 0)` —
   * and the e2e that was supposed to catch that change PASSED when I seeded it, because no session
   * in the simulation has a null rate, so the branch never rendered. A guard over a branch the
   * data cannot reach is not a guard. Here the branch is reachable by a two-line fixture.
   */
  utilisationLabel: string;
  /** W222's own sentence when there is no rate. Null when there is one. */
  noHistoryCopy: string | null;
  recommendation: RecommendationResult;
}

/**
 * Whether to show W227's "no calendar loaded" notice.
 *
 * EXPORTED so a test can exercise the real rule rather than a copy of it. The first attempt at
 * pinning finding 1 re-implemented this line in the test file, which would have passed whatever
 * the view did — the same shape as the vacuous guards this session has already produced four
 * times. The jurisdiction is genuinely not known to this view, so the question is about the
 * calendar as a whole and nothing narrower.
 */
export function calendarGapFor(calendar: HolidayCalendar): string | null {
  return calendar.days.length === 0 ? CALENDAR_UNKNOWN_COPY : null;
}

export interface CapacityView {
  empty: CapacityEmptyReason | null;
  emptyCopy: string | null;
  sessions: readonly CapacitySessionRow[];
  score: ForecastScore | null;
  drift: DriftReport | null;
  /** Present whenever no calendar is loaded, which today is always. Never omitted silently. */
  calendarGap: string | null;
  report: CapacityReport;
}

/**
 * The page as a value.
 *
 * Takes the practice's appointments and the as-of date, so every refusal in the lane is reached
 * through the lane's own functions rather than re-decided here. Nothing in this file computes a
 * rate, a range or a verdict of its own.
 */
export function capacityView(
  appointments: readonly Appointment[],
  asOfIso: string,
  period: { fromIso: string; toIso: string },
  slotsConsidered = 2,
): CapacityView {
  const occurrences: SessionOccurrence[] = occurrencesFrom(appointments, asOfIso);
  const report = capacityReport(appointments, asOfIso, period);

  // W234 finding 4: the recommendations share one practice-wide score instead of each deriving its
  // own. The first version had 70 rows each back-testing 70 sessions — 4,900 per render of a
  // `force-dynamic` page, growing quadratically. `sessionRecommendations` is asserted to agree with
  // the single-session function for every session, so this is not a fast path with its own answer.
  const recommendations = new Map(
    sessionRecommendations(occurrences, report.sessions.map((s) => s.key), slotsConsidered, period)
      .map((row) => [sessionKeyOf(row.key), row.result]),
  );

  const sessions: CapacitySessionRow[] = report.sessions.map((session) => ({
    label: session.label,
    // NULL, NOT ZERO — W234's review found this fabricating `occurrences: 0` for a session with no
    // recorded history, so the table printed "Weeks recorded 0" for a session that ran twice.
    // W222's no-history arm holds no numeric field precisely so a reader cannot take a number out
    // of it; the guarantee survived the module and died here. The row now carries null and the page
    // prints an em dash, the same way it already did for the rate.
    occurrences: session.history.recorded ? session.history.occurrences : null,
    slotsOffered: session.history.recorded ? session.history.slotsOffered : null,
    slotsFilled: session.history.recorded ? session.history.slotsFilled : null,
    utilisation: session.history.recorded ? session.history.utilisation : null,
    utilisationLabel: session.history.recorded
      ? `${Math.round(session.history.utilisation * 100)}%`
      : "—",
    noHistoryCopy: session.history.recorded ? null : session.history.copy,
    recommendation: recommendations.get(sessionKeyOf(session.key))!,
  }));

  const predictions = report.sessions.flatMap((session) => backTest(occurrences, session.key, period).predictions);
  const score = sessions.length === 0 ? null : scorePredictions(predictions, period);
  const drift = sessions.length === 0 ? null : driftReport(predictions, period);

  // Order matters and each branch is a different fact. "No data" first because a practice with no
  // diary has no sessions to be full or unfilled. "No capacity" second, because a fully-booked
  // diary is a finding rather than a gap — and reading it as the first would tell a practice it
  // has room nobody recorded. "Unscored" last, because it is the only one where numbers are still
  // worth showing.
  let empty: CapacityEmptyReason | null = null;
  if (sessions.length === 0) empty = "no_data";
  else if (sessions.every((row) => row.utilisation === 1)) empty = "no_capacity";
  else if (score !== null && !score.scored) empty = "forecaster_unscored";

  const calendar = loadCalendar(SHIPPED_HOLIDAYS);

  return {
    empty,
    emptyCopy: empty === null ? null : CAPACITY_EMPTY_COPY[empty],
    sessions,
    score,
    drift,
    // ASKS WHETHER ANY CALENDAR IS LOADED, and nothing else. The first version also called
    // `calendarKnowsNothing(calendar, "")` — the empty-string jurisdiction, which no real entry can
    // carry — so the notice would have kept rendering forever after W227's calendar was populated,
    // and the test only pinned the empty case. W234's review found it. The jurisdiction is genuinely
    // not known to this view, so the honest question is the one about the calendar as a whole.
    calendarGap: calendarGapFor(calendar),
    report,
  };
}
