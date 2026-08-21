// W226: the composed half of this lane's copy — the half no linter has ever seen.
//
// W200's own module note states the bound this unit closes, and it is worth quoting rather than
// paraphrasing: "KNOWN BOUND, stated rather than filed quietly: this register reaches EXPORTED
// copy. Prose composed inline inside a render function … is not reachable by export name … until a
// later unit lints rendered output against fixtures."
//
// THE UNSEEN HALF IS THE HALF A PRACTICE ACTUALLY READS. W200's census walks exported values, so
// it lints `FORECAST_REFUSAL_COPY` — the sentence shown when there is NO forecast — and never sees
// the sentence a forecast actually carries, because that one is assembled per call. Same for
// W224's score sentence and its skipped-week reasons, and for W225's recommendation sentence and
// demand evidence. Every one of them is prose a practice manager reads off a screen.
//
// AND LINTING THE FRAGMENTS IS NOT LINTING THE SENTENCE. The advice rules match phrases, and a
// join can produce a phrase neither part contained. W200's own worked example is "no action
// needed", six characters whose meaning flips with the surface — assembled across a join it would
// be invisible to a check that only ever saw the two halves separately.
//
// SO THE REGISTER IS OF KINDS, AND THE SWEEP PRODUCES THEM. `CAPACITY_SENTENCE_KINDS` declares
// every distinct sentence this lane can emit and the circumstance that produces it;
// `capacityCopySweep` drives the four modules over fixtures chosen to reach each one. Both
// directions are checked in the test: a new sentence fails until it is declared, and a declared
// sentence nothing produces fails too. A one-directional version of this register would rot the
// first time a branch was deleted, and rot invisibly.
//
// THE FIXTURES ARE HERE RATHER THAN IN THE TEST on purpose. A sweep whose inputs live in the test
// file can be made to pass by adjusting the inputs, and the adjustment looks like fixing a test.
// Here they are part of the declaration: the circumstance each sentence needs is stated beside the
// sentence it produces.

import { occurrencesFrom, type SessionKey, type SessionOccurrence, type Weekday } from "./model";
import { forecastFill } from "./forecast";
import { backTest, scorePredictions } from "./score";
import { sessionRecommendation } from "./recommendation";
import { driftReport } from "./drift";
import { CALENDAR_UNKNOWN_COPY } from "./calendar";
import { NO_HISTORY_COPY } from "./model";
import { COUPLING_OFF_COPY, COUPLING_REJECTION_COPY } from "./coupling";
import { CAPACITY_ATTRIBUTION_WITHHELD_COPY } from "./attribution";

/** One kind of sentence this lane can put in front of a practice. */
export interface SentenceKind {
  id: string;
  /** Which module composes it. */
  module: string;
  /** The circumstance that produces it, in words a reviewer can check against the fixture. */
  when: string;
  /** True where the text is assembled per call and so cannot be reached by W200's census. */
  composed: boolean;
  /**
   * A phrase only this kind's text contains.
   *
   * ADDED AFTER THE FIRST DRAFT SHIPPED A MISLABEL. Without it the register compares IDS, and an
   * id is a label the sweep's author chose: my `never_full` fixture ran full on three of six
   * weeks, so it produced the SOMETIMES-full sentence under the never-full id and the
   * both-directions check passed with the two kinds silently collapsed into one. The register was
   * weaker than the comment standing over it, which is the recurring defect in this tree's own
   * instruments. This binds the id to the text, so a fixture that reaches the wrong branch fails.
   */
  mustContain: string;
  /**
   * Kinds whose whole text this one embeds.
   *
   * The lane carries refusals rather than paraphrasing them (W223 carries W222's words, W225
   * carries W223's), so a carried phrase legitimately appears in two produced sentences. Declaring
   * the carrying is what lets the uniqueness check stay strict: without it the check either fails
   * on a correct design or is loosened until it catches nothing. It also makes the chain visible —
   * `recommendation.withheld.no_forecast` is three modules' prose in one sentence.
   */
  carries?: readonly string[];
}

export const CAPACITY_SENTENCE_KINDS: readonly SentenceKind[] = [
  {
    id: "model.never_run",
    module: "src/capacity/model.ts",
    when: "A session the diary has never recorded. The root of the lane's carrying chain.",
    composed: false,
    mustContain: "not a session that runs empty",
  },
  {
    id: "model.no_slots_offered",
    module: "src/capacity/model.ts",
    when: "A session that ran and offered nothing, so there is no denominator for a rate.",
    composed: false,
    mustContain: "nought per cent",
  },
  {
    id: "forecast.sentence.plural",
    module: "src/capacity/forecast.ts",
    when: "A session with enough recorded weeks, asked about more than one slot.",
    composed: true,
    mustContain: "slots on Thursday: between",
  },
  {
    id: "forecast.sentence.singular",
    module: "src/capacity/forecast.ts",
    when: "The same, asked about exactly one slot — a separate kind because the wording changes.",
    composed: true,
    mustContain: "Opening 1 slot on Thursday",
  },
  {
    id: "forecast.withheld.no_recorded_history",
    module: "src/capacity/forecast.ts",
    when: "A session with nothing recorded. Carries W222's own sentence after its own.",
    composed: true,
    mustContain: "not a forecast that nothing will fill",
    carries: ["model.never_run"],
  },
  {
    id: "forecast.withheld.too_few_recorded_weeks",
    module: "src/capacity/forecast.ts",
    when: "A session that has run, below W223's floor of recorded weeks.",
    composed: false,
    mustContain: "has not run often enough for a range",
  },
  {
    id: "forecast.withheld.no_slots_to_open",
    module: "src/capacity/forecast.ts",
    when: "Asked about no slots at all.",
    composed: false,
    mustContain: "No slots were being opened",
  },
  {
    id: "score.sentence",
    module: "src/capacity/score.ts",
    when: "Enough scored predictions to report a hit rate beside a width.",
    composed: true,
    mustContain: "A wider range is right more often and says less.",
  },
  {
    id: "score.withheld.too_few_predictions",
    module: "src/capacity/score.ts",
    when: "Fewer scored predictions than W224's floor.",
    composed: false,
    mustContain: "not been enough weeks to work out a hit rate",
  },
  {
    id: "score.skipped.no_history_yet",
    module: "src/capacity/score.ts",
    when: "An early week the back-test could not forecast, because too little preceded it.",
    composed: true,
    mustContain: "week(s) before this one",
  },
  {
    id: "score.skipped.offered_nothing",
    module: "src/capacity/score.ts",
    when: "A week that offered no slots, so nothing could be right or wrong about it.",
    // COMPOSED, and the first draft said otherwise. Its text is a string literal inside
    // `backTest` rather than an exported constant, so W200's census cannot reach it either — the
    // flag was wrong and the test that compares the flag against the actual exports caught it.
    composed: true,
    mustContain: "nothing for a forecast to be right or wrong about",
  },
  {
    id: "recommendation.sentence.plural",
    module: "src/capacity/recommendation.ts",
    when: "A forecastable session, a scored forecaster, more than one slot considered.",
    composed: true,
    mustContain: "more slots were opened on Thursday",
  },
  {
    id: "recommendation.sentence.singular",
    module: "src/capacity/recommendation.ts",
    when: "The same, considering exactly one slot.",
    composed: true,
    mustContain: "If 1 more slot were opened on Thursday",
  },
  {
    id: "recommendation.demand.never_full",
    module: "src/capacity/recommendation.ts",
    when: "A session that has never filled every slot it offered.",
    composed: true,
    mustContain: "never filled every slot it offered",
  },
  {
    id: "recommendation.demand.sometimes_full",
    module: "src/capacity/recommendation.ts",
    when: "A session that has filled every slot on at least one recorded week.",
    composed: true,
    mustContain: "cannot show whether more would have been taken",
  },
  {
    id: "recommendation.withheld.no_forecast",
    module: "src/capacity/recommendation.ts",
    when: "No forecast for the session. Carries W223's sentence, which carries W222's.",
    composed: true,
    carries: ["forecast.withheld.no_recorded_history", "model.never_run"],
    mustContain: "nothing to say about opening more of it",
  },
  {
    id: "drift.verdict.tracking",
    module: "src/capacity/drift.ts",
    when: "Two halves of the scored record that agree within W228's threshold.",
    composed: true,
    mustContain: "about as often lately as they did earlier",
  },
  {
    id: "drift.verdict.drifted",
    module: "src/capacity/drift.ts",
    when: "A recent half worse than the earlier one by more than the threshold.",
    composed: true,
    mustContain: "does not say which side moved",
  },
  {
    id: "drift.verdict.improved",
    module: "src/capacity/drift.ts",
    when: "A recent half better by more than the threshold. Reported, not celebrated.",
    composed: true,
    mustContain: "more often lately than they did earlier",
  },
  {
    id: "drift.withheld.too_few_in_a_window",
    module: "src/capacity/drift.ts",
    when: "Fewer scored weeks on one side of the split than W224's floor.",
    composed: false,
    mustContain: "not enough scored weeks on both sides",
  },
  {
    id: "attribution.withheld.no_arm_recorded",
    module: "src/capacity/attribution.ts",
    when: "No sessions set aside for comparison — the state of every practice today.",
    composed: false,
    mustContain: "credit the decision with everything else that changed",
  },
  {
    id: "attribution.withheld.arm_empty",
    module: "src/capacity/attribution.ts",
    when: "One side of the comparison holds no sessions.",
    composed: false,
    mustContain: "A difference needs two groups",
  },
  {
    id: "attribution.withheld.arms_overlap",
    module: "src/capacity/attribution.ts",
    when: "A session appears on both sides — the failure that presents as a bigger sample.",
    composed: false,
    mustContain: "not a larger sample",
  },
  {
    id: "attribution.withheld.assignment_undated",
    module: "src/capacity/attribution.ts",
    when: "An assignment that cannot be shown to precede the results.",
    composed: false,
    mustContain: "An arm chosen afterwards is not an arm",
  },
  {
    id: "coupling.off",
    module: "src/capacity/coupling.ts",
    when: "Always, while W231's coupling ships off — which today is always.",
    composed: false,
    mustContain: "switched off",
  },
  {
    id: "coupling.refused.no_decision",
    module: "src/capacity/coupling.ts",
    when: "An attempt to switch the coupling on with nothing recorded about who decided.",
    composed: false,
    mustContain: "a setting is something somebody flips",
  },
  {
    id: "coupling.refused.reason_too_thin",
    module: "src/capacity/coupling.ts",
    when: "A recorded decision whose reason is too short to be an argument.",
    composed: false,
    mustContain: "too short to be a reason",
  },
  {
    id: "coupling.refused.date_unreadable",
    module: "src/capacity/coupling.ts",
    when: "A recorded decision without a readable date.",
    composed: false,
    mustContain: "so the record says when it was taken",
  },
  {
    id: "calendar.unknown",
    module: "src/capacity/calendar.ts",
    when: "No holiday calendar has been loaded, which today is always.",
    composed: false,
    mustContain: "gap in what has been recorded rather than a finding",
  },
  {
    id: "recommendation.withheld.forecaster_unscored",
    module: "src/capacity/recommendation.ts",
    when: "A forecastable session in a practice whose forecaster has too few scored weeks.",
    composed: false,
    mustContain: "is not known yet, so nothing is offered",
  },
];

export interface SweptSentence {
  id: string;
  text: string;
}

const KEY: SessionKey = { clinicianId: "c1", weekday: 4 as Weekday };
const PERIOD = { fromIso: "2026-05-01", toIso: "2026-06-30" };

function weeks(
  rates: readonly number[],
  offered = 6,
  clinicianId = KEY.clinicianId,
): SessionOccurrence[] {
  return rates.map((rate, i) => ({
    clinicianId,
    dayIso: `2026-06-${String(i + 1).padStart(2, "0")}`,
    weekday: KEY.weekday,
    slotsOffered: offered,
    slotsFilled: Math.round(rate * offered),
  }));
}

/** A practice with enough sessions for W224's pooled floor, so a recommendation can be offered. */
function practice(mine: readonly SessionOccurrence[]): SessionOccurrence[] {
  return [
    ...mine,
    ...["c2", "c3", "c4"].flatMap((id) => weeks([1, 0.5, 1, 0.5, 1, 0.5], 6, id)),
  ];
}

/**
 * Every sentence this lane can emit, produced rather than transcribed.
 *
 * Transcribing them would defeat the point twice over: a copy of a sentence cannot go stale
 * loudly, and a linter run over a transcript is a linter run over whatever somebody last pasted.
 */
export function capacityCopySweep(): SweptSentence[] {
  const out: SweptSentence[] = [];
  const push = (id: string, text: string | null | undefined) => {
    if (typeof text === "string" && text.length > 0) out.push({ id, text });
  };

  const full = weeks([1, 1, 1, 1, 1, 1]);
  const varied = weeks([0.5, 1, 0.5, 1, 0.5, 1]);
  // Never reaches its own ceiling — the never-full branch needs a session that genuinely never
  // fills, not merely one that varies. `varied` runs full on three of six weeks.
  const neverFull = weeks([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  const belowFloor = weeks([1, 1]);
  const cancelledWeek: SessionOccurrence = {
    clinicianId: KEY.clinicianId,
    dayIso: "2026-06-09",
    weekday: KEY.weekday,
    slotsOffered: 0,
    slotsFilled: 0,
  };

  const plural = forecastFill(varied, KEY, 4, PERIOD);
  if (plural.forecast) push("forecast.sentence.plural", plural.sentence);
  const singular = forecastFill(varied, KEY, 1, PERIOD);
  if (singular.forecast) push("forecast.sentence.singular", singular.sentence);
  const noHistory = forecastFill([], KEY, 4, PERIOD);
  if (!noHistory.forecast) push("forecast.withheld.no_recorded_history", noHistory.copy);
  const thin = forecastFill(belowFloor, KEY, 4, PERIOD);
  if (!thin.forecast) push("forecast.withheld.too_few_recorded_weeks", thin.copy);
  const noSlots = forecastFill(varied, KEY, 0, PERIOD);
  if (!noSlots.forecast) push("forecast.withheld.no_slots_to_open", noSlots.copy);

  const pooled = practice(varied);
  const everyKey = [...new Map(
    pooled.map((o) => [`${o.clinicianId}::${o.weekday}`, { clinicianId: o.clinicianId, weekday: o.weekday }]),
  ).values()];
  const scored = scorePredictions(
    everyKey.flatMap((each) => backTest(pooled, each, PERIOD).predictions),
    PERIOD,
  );
  if (scored.scored) push("score.sentence", scored.sentence);
  const unscored = scorePredictions(backTest(varied, KEY, PERIOD).predictions, PERIOD);
  if (!unscored.scored) push("score.withheld.too_few_predictions", unscored.copy);

  for (const skip of backTest([...full, cancelledWeek], KEY, PERIOD).skipped) {
    push(
      skip.dayIso === cancelledWeek.dayIso ? "score.skipped.offered_nothing" : "score.skipped.no_history_yet",
      skip.why,
    );
  }

  const many = sessionRecommendation(pooled, KEY, 3, PERIOD);
  if (many.offered) push("recommendation.sentence.plural", many.recommendation.sentence);
  const never = sessionRecommendation(practice(neverFull), KEY, 3, PERIOD);
  if (never.offered) push("recommendation.demand.never_full", never.recommendation.demandEvidence);
  const one = sessionRecommendation(practice(full), KEY, 1, PERIOD);
  if (one.offered) {
    push("recommendation.sentence.singular", one.recommendation.sentence);
    push("recommendation.demand.sometimes_full", one.recommendation.demandEvidence);
  }
  const made = (n: number, hits: number, startDay: number) =>
    Array.from({ length: n }, (_, i) => ({
      dayIso: `2026-06-${String(startDay + i).padStart(2, "0")}`,
      slotsOffered: 6,
      range: { low: 2, high: 4 },
      actualFilled: i < hits ? 3 : 6,
      hit: i < hits,
      widthSlots: 2,
    }));
  const steady = driftReport([...made(10, 9, 1), ...made(10, 9, 11)], PERIOD);
  if (steady.compared) push("drift.verdict.tracking", steady.copy);
  const worse = driftReport([...made(10, 10, 1), ...made(10, 4, 11)], PERIOD);
  if (worse.compared) push("drift.verdict.drifted", worse.copy);
  const better = driftReport([...made(10, 4, 1), ...made(10, 10, 11)], PERIOD);
  if (better.compared) push("drift.verdict.improved", better.copy);
  const tooFew = driftReport(made(4, 4, 1), PERIOD);
  if (!tooFew.compared) push("drift.withheld.too_few_in_a_window", tooFew.copy);
  push("calendar.unknown", CALENDAR_UNKNOWN_COPY);
  push("coupling.off", COUPLING_OFF_COPY);
  for (const [reason, text] of Object.entries(CAPACITY_ATTRIBUTION_WITHHELD_COPY)) {
    push(`attribution.withheld.${reason}`, text);
  }
  push("coupling.refused.no_decision", COUPLING_REJECTION_COPY.no_decision);
  push("coupling.refused.reason_too_thin", COUPLING_REJECTION_COPY.reason_too_thin);
  push("coupling.refused.date_unreadable", COUPLING_REJECTION_COPY.date_unreadable);
  push("model.never_run", NO_HISTORY_COPY.never_run);
  push("model.no_slots_offered", NO_HISTORY_COPY.no_slots_offered);

  const noRec = sessionRecommendation(practice([]), KEY, 3, PERIOD);
  if (!noRec.offered) push("recommendation.withheld.no_forecast", noRec.copy);
  const unscoredRec = sessionRecommendation(varied, KEY, 3, PERIOD);
  if (!unscoredRec.offered) push("recommendation.withheld.forecaster_unscored", unscoredRec.copy);

  // Deduplicated on id: the skipped-week loop produces several of one kind, and a register of
  // KINDS should be compared against kinds. The first of each is kept, so the text is a real one.
  const seen = new Set<string>();
  return out.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
}

/**
 * The same sweep over a real diary, so the fixtures above cannot drift from what the sim produces.
 *
 * Not a substitute for them: the sim reaches only the sentences its own data happens to reach,
 * which is most of the happy path and none of the refusals.
 */
export function capacityCopyOverDiary(
  appointments: Parameters<typeof occurrencesFrom>[0],
  asOfIso: string,
  period: { fromIso: string; toIso: string },
): SweptSentence[] {
  const occurrences = occurrencesFrom(appointments, asOfIso);
  const keys = [...new Map(
    occurrences.map((o) => [`${o.clinicianId}::${o.weekday}`, { clinicianId: o.clinicianId, weekday: o.weekday }]),
  ).values()];

  const out: SweptSentence[] = [];
  for (const key of keys) {
    const recommendation = sessionRecommendation(occurrences, key, 2, period);
    if (recommendation.offered) {
      out.push({ id: "recommendation.sentence.plural", text: recommendation.recommendation.sentence });
      out.push({
        id: recommendation.recommendation.weeksRunFull === 0
          ? "recommendation.demand.never_full"
          : "recommendation.demand.sometimes_full",
        text: recommendation.recommendation.demandEvidence,
      });
    } else {
      out.push({ id: `recommendation.withheld.${recommendation.why}`, text: recommendation.copy });
    }
    for (const skip of backTest(occurrences, key, period).skipped) {
      // The id is DERIVED from the text's own shape rather than assumed. The first version
      // hard-coded `no_history_yet` for every skip, so a zero-slot week bound the wrong text to a
      // declared id — the exact mislabel `mustContain` was added to catch, occurring in the other
      // function while that check watched this one. W234's review found it.
      out.push({
        id: skip.why.includes("offered no slots")
          ? "score.skipped.offered_nothing"
          : "score.skipped.no_history_yet",
        text: skip.why,
      });
    }
  }
  return out;
}
