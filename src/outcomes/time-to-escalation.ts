// W176: how long it took to notice — reported, and never targeted.
//
// An escalation criterion fires on a fact somebody recorded. Between the fact landing in the
// record and the pathway being evaluated there is an interval, and that interval is worth
// showing a practice: "this sat there for eleven days" is a fact about the record that nobody
// currently has any way of seeing.
//
// It is also, of every number this tree produces, THE ONE MOST OBVIOUSLY ASKING FOR A TARGET.
// So the unit is mostly the refusal, and there are three separate reasons, none of which is
// "targets are bad in general".
//
// A TARGET ON THIS NUMBER CHANGES CLINICAL BEHAVIOUR, AND NOT IN THE DIRECTION IT LOOKS LIKE.
// The measure is only defined for escalations that HAPPENED. The cheapest way to improve it is
// therefore not to notice faster — it is to escalate sooner, on less, and more often, because
// every marginal escalation raised on a thinner fact lands near zero days and pulls the number
// down. That is a change in what clinicians do, produced by a management figure, and the thing
// it pushes them toward has a real cost: the receiving clinician's attention, and the patient's
// alarm. W121 already refuses to attach a timeframe to an escalation because urgency is
// signed-off clinical content (G5); a target is the same judgement arriving as a KPI instead.
//
// IT IS CONDITIONED ON HAVING ESCALATED AT ALL, WHICH MAKES IT A SURVIVORSHIP FIGURE. A practice
// that escalates nothing has no measurement, and "no measurement" looks identical to "nothing
// went slowly". So `notEscalated` travels inside the report rather than beside it: there is no
// way to obtain the measure from this module without also obtaining the size of the population
// it excludes. W170's rule, applied to a different denominator.
//
// AND THE INTERVAL IS NOT A FACT ABOUT ANY PERSON. `recordedAt` is when the fact entered the
// record, not when it became true and not when anybody could first have acted on it — a slow
// PMS ingest and an inattentive week are the same eleven days here. Attributing it to a
// clinician would be W83's productivity board built on a number that partly measures an
// integration, so nothing in this module takes or returns a clinician.
//
// Consequently there is NO MEAN OR MEDIAN. A central tendency is the single figure a target
// attaches to, and here it would also be a summary of a survivorship-conditioned set — wrong in
// the same way W170's success rate was wrong, and for the same reason: the population it omits
// is the one that matters. The spread is reported instead, alongside every measurement, because
// on this rail the list is short enough to read and a reader who can see all of it does not
// need a number that stands in for it.

/** One escalation, with the two instants that bracket it. */
export interface EscalationTiming {
  pathwayId: string;
  versionHash: string;
  factCode: string;
  /** When the fact the criterion fired on entered the record. Not when it became true. */
  factRecordedAt: string;
  /** When the pathway was evaluated and the criterion fired. */
  noticedAt: string;
}

export interface Measurement extends EscalationTiming {
  /** Whole days between the two. A fact about the record, deliberately unclassified. */
  days: number;
}

const DAY_MS = 86_400_000;

const key = (t: EscalationTiming) => `${t.pathwayId}::${t.versionHash}::${t.factCode}`;

/** Why there is no measurement. Never collapsed into a reassuring single answer. */
export type NoMeasurement =
  /** No pathway verdict reached this module. Nothing was looked at. */
  | "nothing_evaluated"
  /** Verdicts were evaluated and none raised an escalation, so no interval exists. */
  | "evaluated_none_escalated";

export interface TimeToEscalationReport {
  /** Every measurement, shortest first. The whole list, not a summary of it. */
  measured: Measurement[];
  /** The spread. Null when nothing is measured — not zero, which reads as "instant". */
  shortestDays: number | null;
  longestDays: number | null;
  /**
   * Verdicts that raised no escalation, so contributed no interval.
   *
   * Inside the report on purpose: the measure cannot be read without the size of the population
   * it is conditioned on.
   */
  notEscalated: number;
  /** Present only when `measured` is empty. */
  noMeasurement: NoMeasurement | null;
  /** The sentence the figures must be read with. */
  basis: string;
}

export function measureTimeToEscalation(
  timings: readonly EscalationTiming[],
  notEscalated: number,
): TimeToEscalationReport {
  const measured: Measurement[] = timings
    .map((timing) => ({
      ...timing,
      days: Math.floor(
        (Date.parse(timing.noticedAt) - Date.parse(timing.factRecordedAt)) / DAY_MS,
      ),
    }))
    // Shortest first, ties by key so the answer cannot depend on the order the store returned
    // them in (W167/W168). Ordering by duration is arithmetic, not prioritisation — there is no
    // patient in this list and nothing here is a queue.
    .sort((a, b) => a.days - b.days || key(a).localeCompare(key(b)));

  const longest = measured.at(-1);

  return {
    measured,
    shortestDays: measured[0]?.days ?? null,
    longestDays: longest?.days ?? null,
    notEscalated,
    noMeasurement:
      measured.length > 0
        ? null
        : notEscalated === 0
          ? "nothing_evaluated"
          : "evaluated_none_escalated",
    basis:
      `Measured over the ${measured.length} escalation(s) that were raised. ` +
      `${notEscalated} evaluated pathway(s) raised none and so contribute no interval — ` +
      `a practice that escalates nothing has no measurement here, which is not the same as ` +
      `nothing having gone slowly.`,
  };
}

export const NO_MEASUREMENT_COPY: Record<NoMeasurement, string> = {
  nothing_evaluated:
    "No pathway has been evaluated, so no escalation could be raised and there is no interval to measure. This is a statement about what has been run, not about how quickly anything is noticed.",
  evaluated_none_escalated:
    "Pathways were evaluated and none raised an escalation, so there is no interval to measure. An escalation criterion only fires on a fact somebody recorded, so this says what is on file.",
};

/**
 * The argument, as copy, because the gate asks the page to make it rather than to imply it.
 *
 * Written out in full rather than summarised: a reader who is about to ask for a target is
 * exactly the reader this paragraph is for, and "we do not do targets" would not persuade them
 * of anything.
 */
export const WHY_NO_TARGET =
  "This figure has no target and no threshold, and that is deliberate rather than unfinished. " +
  "The measure only exists for escalations that were actually raised, so the quickest way to " +
  "improve it is not to notice faster — it is to escalate sooner, on thinner grounds, more " +
  "often, because each of those lands near zero days and pulls the figure down. That is a " +
  "change in clinical behaviour produced by a management number, and what it pushes toward has " +
  "a cost of its own: the attention of whoever receives the escalation, and the alarm of the " +
  "patient it concerns. Deciding how soon an escalation should be raised is a clinical " +
  "judgement that belongs in reviewed and signed-off content, not in a figure this software " +
  "picks.";

/** The report as prose. Structured object first, rendered from it (the W20 pattern). */
export function renderTimeToEscalation(report: TimeToEscalationReport, asOf: string): string {
  const lines: string[] = [`# How long escalations took to be noticed — ${asOf}`, ``];

  if (report.measured.length === 0) {
    lines.push(
      NO_MEASUREMENT_COPY[report.noMeasurement ?? "nothing_evaluated"],
      ``,
      report.basis,
      ``,
      WHY_NO_TARGET,
      ``,
    );
    return lines.join("\n");
  }

  lines.push(
    `${report.measured.length} escalation(s) have been raised. The interval below is the time ` +
      `between the fact being recorded and the pathway being evaluated: it ranges from ` +
      `${report.shortestDays} to ${report.longestDays} day(s).`,
    ``,
    report.basis,
    ``,
    `| Days | Pathway | Criterion |`,
    `|---|---|---|`,
    ...report.measured.map((m) => `| ${m.days} | ${m.pathwayId} | ${m.factCode} |`),
    ``,
    `Every measurement is listed rather than averaged. An average of this would summarise only ` +
      `the escalations that happened, and the practices it would flatter most are the ones ` +
      `raising fewest.`,
    ``,
    `This interval is a fact about the record, not about anybody's attention. It starts when ` +
      `the fact entered the record, so a slow import and a quiet week look the same here, and ` +
      `neither is attributed to a person.`,
    ``,
    WHY_NO_TARGET,
    ``,
  );

  return lines.join("\n");
}
