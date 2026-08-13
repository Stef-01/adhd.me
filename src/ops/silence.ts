// W179: a zero is not a fact until it says which zero it is.
//
// The ops console renders "No offers outstanding." That single sentence is true of a practice
// having a quiet week, and equally true of a practice whose PMS feed died on Tuesday. THOSE TWO
// LEAD AN OPERATOR TO OPPOSITE ACTIONS — one to do nothing, one to phone an integration partner —
// and the count cannot tell them apart, because the count is zero in both.
//
// W127 made this point about a page nobody had filled in yet. This is the same lesson against
// LIVE DATA, which is harder in one specific way: an empty pathways table is empty because the
// tree ships no signed content, a fact the code knows for certain. A zero here is the ABSENCE OF
// AN OBSERVATION, and absence has many causes that look identical from the far side.
//
// THE LOAD-BEARING RULE, AND EVERYTHING ELSE FOLLOWS FROM IT:
//
//   THE REASSURING READING REQUIRES PROOF. EVERY ALARMING READING IS REACHABLE BY DEFAULT.
//
// `nothing_eligible` — "the week was quiet, your rules are working, do nothing" — is the only
// cause that demands positive evidence: the feed healthy, the data fresh enough to act on, and
// records actually delivered. It is never a fallback and never an else-branch. Every other cause
// can be arrived at from partial or missing information, because being told to check a feed that
// turns out to be fine costs an operator five minutes, and being told all is well while three
// days of appointments never arrived costs a practice its patients.
//
// THAT IS WHY THIS FAILS TOWARD ALARM. It is the same posture as W36's stale-data guard and W119's
// unusable pathway, pointed at a different question: not "may we act?" but "may we reassure?".
//
// CAUSES ARE A SET, NOT A WINNER. A feed that is down while sending is also paused has two
// answers, and reporting only the first produces the worst outcome available here — an operator
// who fixes one thing, sees the zero persist, and concludes the product is broken. Naming both
// costs a line of copy.
//
// AND ABSENCE OF EVIDENCE IS ITS OWN ANSWER. If nothing was recorded about the feed, the reading
// is `cannot_determine` — not "quiet". This tree's rule since W120: not-recorded is a third value,
// never a synonym for the comfortable one.
//
// OUT OF SCOPE, STATED RATHER THAN OVERLOOKED: a NON-zero count read from a stale feed is also
// misleading, and this module says nothing about it. W36 already refuses to send from stale data,
// so the damage is bounded to display. Widening the reading to qualify every count is a bigger
// change than this unit, and pretending it was covered here would be worse than naming it.

import type { PmsHealth } from "@/pms/resilience";

/**
 * What is known about what ARRIVED, as distinct from what came out.
 *
 * A separate input from the count on purpose. The whole defect is that the count alone cannot
 * distinguish these cases, so a function that could compute a reading from the count by itself
 * would be able to reproduce the bug.
 */
export interface FeedEvidence {
  /**
   * When the feed last delivered successfully — or null for NEVER, which is a different state
   * from "not lately" and points at onboarding rather than at an outage.
   */
  lastSuccessfulReadAt: string | null;
  health: PmsHealth;
  /** Fresh enough to act on. W36's guard; stale data is present but not actionable. */
  usableForSending: boolean;
  /** Records the feed delivered for the window being reported on. */
  recordsArrived: number;
}

export type SilenceCause =
  | "cannot_determine"
  | "never_connected"
  | "feed_down"
  | "feed_stale"
  | "held_by_switch"
  | "nothing_arrived"
  | "nothing_eligible";

/**
 * Display order, most-blocking first.
 *
 * Declared rather than derived from the check order, so reordering the checks for readability
 * cannot silently reorder what an operator reads first.
 */
export const CAUSE_ORDER: readonly SilenceCause[] = [
  "cannot_determine",
  "never_connected",
  "feed_down",
  "feed_stale",
  "held_by_switch",
  "nothing_arrived",
  "nothing_eligible",
];

/**
 * A count, with a zero that cannot exist without its causes.
 *
 * Modelled as a union rather than as `{ count, causes? }` so a caller cannot render a zero
 * without having been handed the reason for it — which is the entire defect, expressed in the
 * type rather than in a code review comment.
 */
export type Reading =
  | { kind: "some"; count: number }
  | { kind: "none"; causes: readonly SilenceCause[] };

/**
 * Why there is nothing to show.
 *
 * `sendingHalted` is separate from the feed evidence because it is OUR state, always knowable
 * even when nothing is known about the feed. A halt is the one cause that is never in doubt.
 */
export function explainSilence(
  evidence: FeedEvidence | null,
  sendingHalted: boolean,
): readonly SilenceCause[] {
  const causes = new Set<SilenceCause>();
  if (sendingHalted) causes.add("held_by_switch");

  if (evidence === null) {
    // Nothing was recorded about the feed. That is not a quiet week; it is not knowing.
    causes.add("cannot_determine");
    return order(causes);
  }

  if (evidence.lastSuccessfulReadAt === null) causes.add("never_connected");
  if (evidence.health !== "ok") causes.add("feed_down");
  if (!evidence.usableForSending) causes.add("feed_stale");

  // The reassuring reading, and the only one that has to be earned. Positive on all three:
  // the feed is well, the data is actionable, and records actually came.
  const healthy =
    evidence.lastSuccessfulReadAt !== null && evidence.health === "ok" && evidence.usableForSending;
  if (healthy) causes.add(evidence.recordsArrived > 0 ? "nothing_eligible" : "nothing_arrived");

  // Total by construction: `healthy` is false only when one of the three checks above added a
  // cause, so this can never be empty. Asserted rather than trusted, because an empty causes
  // list would render as a bare zero again — the exact defect, returned by the fix.
  if (causes.size === 0) throw new Error("explainSilence produced no cause for a zero");
  return order(causes);
}

const order = (causes: Set<SilenceCause>): SilenceCause[] =>
  CAUSE_ORDER.filter((cause) => causes.has(cause));

/** The reading for a count. A zero arrives with its causes or does not arrive. */
export function readCount(
  count: number,
  evidence: FeedEvidence | null,
  sendingHalted: boolean,
): Reading {
  if (count > 0) return { kind: "some", count };
  return { kind: "none", causes: explainSilence(evidence, sendingHalted) };
}

export interface CauseCopy {
  /** What this zero IS. */
  headline: string;
  /** Why the operator is seeing it. */
  detail: string;
  /** What to do about it — different for every cause, because that is the point. */
  action: string;
}

/**
 * Operator copy, one entry per cause.
 *
 * Typed `Record<SilenceCause, …>` so adding a cause to the union fails the build until its copy
 * exists. A new cause silently inheriting another's sentence is how two states start rendering
 * the same and the distinction quietly dies.
 *
 * Operational language only: what the software observed and what to do next. No clinical claim,
 * and no judgement about the practice — "nothing was eligible" is a fact about the rules, not
 * about anybody's care.
 */
export const SILENCE_COPY: Record<SilenceCause, CauseCopy> = {
  cannot_determine: {
    headline: "We can't tell you why this is empty",
    detail:
      "Nothing has been recorded about this practice's appointment feed, so we don't know whether it is quiet or whether nothing reached us. We would rather say that than guess.",
    action: "Read this as unknown, not as a quiet period. Ask us to check the connection.",
  },
  never_connected: {
    headline: "This practice's feed has never delivered",
    detail:
      "We have no record of a successful read from your practice software at any point. This looks like setup that hasn't finished, not an outage.",
    action: "Finish connecting the practice software before reading anything into these numbers.",
  },
  feed_down: {
    headline: "The appointment feed is not answering",
    detail:
      "Reads from your practice software are failing right now. Anything below reflects the last data we had, not what your books look like today.",
    action: "Check the connection to your practice software. Nothing here is current.",
  },
  feed_stale: {
    headline: "The appointment feed is behind",
    detail:
      "We have data, but it is older than we will act on. Offering an appointment from stale data risks inviting someone into a slot you have already filled, so we hold off.",
    action: "No action needed if this clears shortly. If it persists, check the connection.",
  },
  held_by_switch: {
    headline: "Sending is switched off",
    detail:
      "A kill switch or a practice pause is in place, so no invitations are going out. This is a deliberate setting, not a fault.",
    action: "Release the switch on this page when you want sending to resume.",
  },
  nothing_arrived: {
    headline: "The feed is healthy and had nothing to send us",
    detail:
      "Your practice software answered normally and reported no appointments in this window — a closed period or an empty book, rather than a problem with the connection.",
    action: "No action needed. This is the feed working and the book being empty.",
  },
  nothing_eligible: {
    headline: "A quiet period — nothing to do",
    detail:
      "Your practice software delivered current data and nobody in it met your eligibility rules for this window. The connection is well and the rules ran.",
    action: "No action needed. Adjust eligibility rules only if you expected more.",
  },
};
