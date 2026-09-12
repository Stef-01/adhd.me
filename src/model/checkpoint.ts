// The waiting checkpoints (Charmaine Bernie, occupational therapist and service-access researcher,
// 2026-09-11).
//
// Her finding is that a wait is survivable and a SILENCE is not: "breached promises erode trust
// quickly — if a quoted wait time passes with no contact, people become angry", and simple, honest,
// consistent communication builds trust cheaply. Her recommended cadence for confirming somebody
// still needs a service, and has not already found care elsewhere, is roughly six months, twelve
// months and two years.
//
// WHAT THIS PRODUCT CAN HONESTLY DO, AND WHAT IT CANNOT. It holds no account, no address and no
// server-side record of anybody. So it cannot reach out, and the half of her recommendation that is
// a PROACTIVE contact — arriving at the promised time whether or not a service can be offered —
// needs a channel this product does not have. That is a decision about what the product is, not a
// screen, and it is recorded as not done in docs/design/finder-ecosystem.md.
//
// The half it can do is stop pretending no time has passed. Somebody who opens this again after
// six months currently sees exactly what they saw on day one, as though they had never been here
// and nothing had elapsed — which is the silence she described, rendered. So: when a checkpoint
// has passed, say so, ask the question she asks, and act on the answer. It is a smaller thing than
// she recommended and it is not nothing, and this comment is the place that says which is which.
//
// The clock starts at onboarding, the first moment the device holds anything about this person.
// Nothing here is a promise about a wait: the app is not holding a place for anybody and the copy
// on the card does not suggest it is. It asks where they got to.

import type { ModelRecord } from "./store";

/** Her cadence, in months. */
export const CHECKPOINTS = [6, 12, 24] as const;
export type CheckpointMonths = (typeof CHECKPOINTS)[number];

/**
 * What a person can say when asked. `found-care` ends the checkpoints for good — she was explicit
 * that the point of the review is partly to find out somebody "hasn't already found care
 * elsewhere", and continuing to ask after they say they have is the opposite of listening.
 */
export type CheckpointAnswer = "still-looking" | "found-care" | "not-now";

export interface Checkpoint {
  readonly months: CheckpointMonths;
  readonly answer: CheckpointAnswer;
  /** ISO datetime. */
  readonly at: string;
}

/** Whole months between two instants, by calendar rather than by dividing days. */
export function monthsBetween(from: Date, to: Date): number {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  // The month only counts once the day of the month has come round.
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * The checkpoint to put in front of somebody now, or null.
 *
 * The LARGEST one that has elapsed and not been answered, so a person who has been away for three
 * years is asked the two-year question once rather than walked through all three. A `not-now`
 * answer skips only its own checkpoint; the next one still comes.
 */
export function dueCheckpoint(record: ModelRecord, now: Date = new Date()): CheckpointMonths | null {
  const startedAt = record.onboarding?.completedAt;
  if (!startedAt) return null;
  const answered = record.checkpoints ?? [];
  // Found care: the question has been answered for good.
  if (answered.some((c) => c.answer === "found-care")) return null;
  const elapsed = monthsBetween(new Date(startedAt), now);
  const seen = new Set(answered.map((c) => c.months));
  const due = CHECKPOINTS.filter((m) => elapsed >= m && !seen.has(m));
  return due.length ? due[due.length - 1]! : null;
}

/** How the checkpoint says its own age. Kept to two words: the card has a budget. */
export const CHECKPOINT_LABEL: Readonly<Record<CheckpointMonths, string>> = {
  6: "Six months",
  12: "A year",
  24: "Two years",
};
