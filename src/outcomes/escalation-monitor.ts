// W171: unrouted escalations, over time.
//
// W121 routes an escalation or reports it `unrouted` — "this fired and nobody has said what to
// do about it". That is a snapshot, and a snapshot is exactly the wrong shape for this problem:
// an unrouted escalation is not a state, it is a QUESTION NOBODY HAS ANSWERED YET, and the only
// fact that makes it uncomfortable is how long it has been waiting. A list that looks the same
// on day one and day ninety is a list nobody acts on.
//
// So this ages them. Two things follow, and both are inherited refusals rather than choices
// this unit gets to make.
//
// AN AGE IS A FACT; A THRESHOLD WOULD BE A CLINICAL JUDGEMENT. W121 says it outright — "there is
// deliberately no timeframe field: a timeframe attached to a clinical escalation is a judgement
// about urgency, and that judgement belongs in content the founder signs off". So the obvious
// monitoring feature is the one thing this module must not build. There is no `overdue`, no
// breach threshold, no red/amber/green. It reports days, oldest first, and refuses to say
// whether that is too long — because "34 days is too long for this" is precisely the sentence
// G5 governs. A test asserts the vocabulary is absent.
//
// NOTHING LEAVES THE LIST BY GETTING OLD. An escalation stops being open when somebody writes a
// rule for it, and by no other means. Ageing out would be the failure W68 named — the mechanism
// producing silence — arriving on a timer, and the older an unanswered question is the more
// wrong it would be to drop it. Same shape as W134's unanswered referral: the discomfort is the
// signal.
//
// AND ZERO IS NOT AN ANSWER. An empty list has three quite different causes and the report must
// say which: nothing was evaluated at all (the state today, since W118's catalogue and W121's
// rules both ship empty), verdicts were evaluated and none flagged an escalation, or everything
// that flagged has been routed. Reporting "no escalations needed" would collapse all three into
// the most flattering one — and none of them means "needed" anyway, since a criterion only ever
// fires on a fact somebody recorded. W96 put coverage next to the chart for this reason.

/** Identity of a live escalation question: this criterion, on this exact pathway version. */
export interface EscalationKey {
  pathwayId: string;
  versionHash: string;
  factCode: string;
}

export interface EscalationSighting extends EscalationKey {
  /** When this question first appeared. Never reset by a later sighting — see `observe`. */
  firstSeenAt: string;
  lastSeenAt: string;
  /**
   * When a rule was written for it. Set only by routing, never by time.
   * Cleared if it becomes unrouted again — a rule withdrawn reopens the question.
   */
  routedAt: string | null;
  /** How many times it has gone from routed back to unrouted. */
  reopenings: number;
}

const key = (k: EscalationKey) => `${k.pathwayId}::${k.versionHash}::${k.factCode}`;

/** The subset of W121's outcome this monitor reads. Kept structural so it cannot re-route. */
export interface ObservedOutcome {
  unrouted: ReadonlyArray<EscalationKey>;
  routed: ReadonlyArray<EscalationKey>;
}

/**
 * Fold one observation into the running record.
 *
 * `firstSeenAt` is preserved across sightings, which is the whole mechanic: an escalation seen
 * again today has not just appeared, and resetting the clock on every observation would mean
 * nothing ever aged. That sounds obvious and is the bug this shape exists to make impossible.
 */
export function observe(
  prior: readonly EscalationSighting[],
  outcome: ObservedOutcome,
  atIso: string,
): EscalationSighting[] {
  const byKey = new Map(prior.map((s) => [key(s), { ...s }]));

  for (const k of outcome.unrouted) {
    const existing = byKey.get(key(k));
    if (!existing) {
      byKey.set(key(k), { ...k, firstSeenAt: atIso, lastSeenAt: atIso, routedAt: null, reopenings: 0 });
      continue;
    }
    existing.lastSeenAt = atIso;
    if (existing.routedAt !== null) {
      // It had a rule and no longer does. The question is live again, and it ages from when it
      // was FIRST asked rather than from today: "outstanding since March, briefly answered in
      // May" is the true shape, and restarting the clock would flatter it.
      existing.routedAt = null;
      existing.reopenings += 1;
    }
  }

  for (const k of outcome.routed) {
    const existing = byKey.get(key(k));
    if (!existing) {
      // Routed the first time it was ever seen: recorded so the history is complete, and closed
      // immediately.
      byKey.set(key(k), { ...k, firstSeenAt: atIso, lastSeenAt: atIso, routedAt: atIso, reopenings: 0 });
      continue;
    }
    existing.lastSeenAt = atIso;
    if (existing.routedAt === null) existing.routedAt = atIso;
  }

  return [...byKey.values()].sort((a, b) => key(a).localeCompare(key(b)));
}

const DAY_MS = 86_400_000;

function wholeDaysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.NaN;
  return Math.floor((to - from) / DAY_MS);
}

export interface OpenEscalation extends EscalationSighting {
  /** Whole days since it was first seen. A fact, deliberately unclassified. */
  ageDays: number;
}

/**
 * Why the open list is empty. Never collapsed into one reassuring answer.
 */
export type EmptyReason =
  /** No pathway verdict reached the monitor. Nothing was looked at. */
  | "nothing_evaluated"
  /** Verdicts were evaluated; none flagged an escalation criterion. */
  | "evaluated_none_flagged"
  /** Everything that flagged has a rule. */
  | "all_routed";

export interface EscalationMonitorReport {
  open: OpenEscalation[];
  /** Null when nothing is open — not zero, which would read as "nothing is waiting". */
  oldestAgeDays: number | null;
  /** Present only when `open` is empty. */
  emptyReason: EmptyReason | null;
  coverage: {
    verdictsEvaluated: number;
    everSeen: number;
    routed: number;
  };
}

export function monitorEscalations(
  sightings: readonly EscalationSighting[],
  atIso: string,
  verdictsEvaluated: number,
): EscalationMonitorReport {
  const open: OpenEscalation[] = sightings
    .filter((s) => s.routedAt === null)
    .map((s) => ({ ...s, ageDays: wholeDaysBetween(s.firstSeenAt, atIso) }))
    // Oldest first. This is recency arithmetic, not prioritisation — the oldest question is the
    // one that has been waiting longest, which is a fact about the record, not about a patient.
    .sort((a, b) => b.ageDays - a.ageDays || key(a).localeCompare(key(b)));

  const routed = sightings.filter((s) => s.routedAt !== null).length;

  return {
    open,
    oldestAgeDays: open.length > 0 ? open[0]!.ageDays : null,
    emptyReason:
      open.length > 0
        ? null
        : verdictsEvaluated === 0
          ? "nothing_evaluated"
          : sightings.length === 0
            ? "evaluated_none_flagged"
            : "all_routed",
    coverage: { verdictsEvaluated, everSeen: sightings.length, routed },
  };
}

export const EMPTY_REASON_COPY: Record<EmptyReason, string> = {
  nothing_evaluated:
    "Nothing was evaluated, so nothing could be flagged. This is not the same as nothing needing attention — no pathway has been run, so the question has not been asked.",
  evaluated_none_flagged:
    "Pathways were evaluated and none flagged an escalation criterion. A criterion only fires on a fact somebody recorded, so this says what is on file, not what is true of anyone.",
  all_routed:
    "Everything that flagged has a rule saying what happens. Nothing is waiting on a decision.",
};

/** The report as prose. Structured object first, rendered from it (the W20 pattern). */
export function renderEscalationMonitor(
  report: EscalationMonitorReport,
  asOf: string,
): string {
  const lines: string[] = [`# Escalations waiting on a decision — ${asOf}`, ``];

  if (report.open.length === 0) {
    lines.push(
      EMPTY_REASON_COPY[report.emptyReason ?? "nothing_evaluated"],
      ``,
      `Evaluated: ${report.coverage.verdictsEvaluated} pathway verdict(s). Escalations recorded to date: ${report.coverage.everSeen}, of which ${report.coverage.routed} have a rule.`,
      ``,
    );
    return lines.join("\n");
  }

  lines.push(
    `${report.open.length} escalation(s) have fired with no rule saying what happens. The oldest`,
    `has been waiting ${report.oldestAgeDays} day(s).`,
    ``,
    `This page reports how long each has been waiting. It does not say whether that is too long:`,
    `deciding what an escalation means, and how soon anyone should act on it, is clinical content`,
    `that has to be signed off rather than a threshold this software picks.`,
    ``,
    `| Days waiting | Pathway | Criterion | Reopened |`,
    `|---|---|---|---|`,
    ...report.open.map(
      (o) => `| ${o.ageDays} | ${o.pathwayId} | ${o.factCode} | ${o.reopenings} |`,
    ),
    ``,
    `Nothing leaves this list by getting old. An escalation stops appearing when somebody writes`,
    `a rule for it, and by no other means.`,
    ``,
    `Evaluated: ${report.coverage.verdictsEvaluated} pathway verdict(s). Escalations recorded to date: ${report.coverage.everSeen}, of which ${report.coverage.routed} have a rule.`,
    ``,
  );

  return lines.join("\n");
}
