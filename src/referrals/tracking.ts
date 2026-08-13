// W135: where is this referral, really.
//
// Two machines already answer part of it. W93 replays the clinical chain — written, booked,
// attended, completed — and W134 replays the professional one: sent, accepted, declined,
// handed back. Neither is the whole answer, and a practice asking "where is this referral" is
// asking about both at once.
//
// The unit's gate is "no inference from silence", and combining two state machines is exactly
// where that rule gets broken, because a combiner is under constant pressure to produce one
// tidy answer. The pressure shows up in three specific temptations, and this module refuses
// all three:
//
//   1. FILLING A GAP. If W134 has no acts at all, the referral is not "assumed accepted"
//      because W93 shows an appointment — it is `unknown`, and `unknown` is a reported value
//      rather than a missing one. An appointment is evidence that somebody booked something,
//      not that a practice took the patient on.
//
//   2. RESOLVING A DISAGREEMENT. When the two machines contradict each other — a return report
//      for a referral nobody ever accepted — this reports the CONTRADICTION rather than picking
//      a winner. A combiner that silently prefers one machine is a combiner that hides the one
//      thing worth looking at, and every disagreement here is a real workflow fault somewhere.
//
//   3. TURNING WAITING INTO A CONCLUSION. Silence is reported as an outstanding item WITH THE
//      PARTY IT IS OUTSTANDING FROM, never as a status. "Waiting on the receiving practice
//      since February" is actionable; "stalled" is a verdict nobody recorded.

import {
  acceptanceStatus,
  careHolderWhile,
  type AcceptanceAct,
  type AcceptanceState,
} from "./acceptance";
import { replayReferral, type LeakageStage, type ReferralEvent } from "./leakage";
import type { CareHolder } from "./return-report";
import type { PracticeId } from "@/domain/types";

/** Who a practice is waiting on, and since when. Never a verdict about the wait. */
export interface Outstanding {
  from: "referring_practice" | "receiving_practice";
  what:
    | "book_an_appointment"
    | "answer_the_referral"
    | "send_a_return_report"
    | "rebook_after_cancellation";
  since: string | null;
}

/** A place the two machines disagree. Reported, never resolved — see the module note. */
export interface TrackingConflict {
  what: string;
  clinicalChain: LeakageStage;
  professionalChain: AcceptanceState;
}

export interface ReferralTracking {
  referralId: string;
  /** W93's answer. */
  stage: LeakageStage;
  /**
   * W134's answer, or `unknown` when no acceptance act exists at all.
   *
   * `unknown` is a REPORTED value, not a missing one. A referral with an appointment and no
   * acceptance record is not accepted-by-implication; nobody wrote it down.
   */
  acceptance: AcceptanceState | "unknown";
  careHolder: CareHolder;
  outstanding: Outstanding[];
  conflicts: TrackingConflict[];
}

export function trackReferral(
  referralId: string,
  practiceId: PracticeId,
  events: readonly ReferralEvent[],
  acts: readonly AcceptanceAct[],
): ReferralTracking {
  const timeline = replayReferral(referralId, events, practiceId);
  const mineActs = acts.filter((act) => act.referralId === referralId);
  const status = acceptanceStatus(acts, referralId);

  // No acts at all is `unknown`, which is a different claim from `not_sent`: one says nobody
  // recorded anything, the other says a decision was recorded that it has not been sent.
  const acceptance: AcceptanceState | "unknown" = mineActs.length === 0 ? "unknown" : status.state;

  const outstanding: Outstanding[] = [];
  if (acceptance === "awaiting_acceptance") {
    outstanding.push({
      from: "receiving_practice",
      what: "answer_the_referral",
      since: status.sentAt,
    });
  }
  switch (timeline.stage) {
    case "written_no_appointment":
      outstanding.push({ from: "receiving_practice", what: "book_an_appointment", since: timeline.writtenOn });
      break;
    case "appointment_lost":
      outstanding.push({ from: "referring_practice", what: "rebook_after_cancellation", since: timeline.writtenOn });
      break;
    case "attended_no_completion":
      outstanding.push({ from: "receiving_practice", what: "send_a_return_report", since: timeline.writtenOn });
      break;
    default:
      break;
  }

  const conflicts: TrackingConflict[] = [];
  if (timeline.stage === "completed" && (acceptance === "unknown" || acceptance === "awaiting_acceptance")) {
    conflicts.push({
      what: "a return report closed this referral, but no practice ever recorded accepting it",
      clinicalChain: timeline.stage,
      professionalChain: acceptance === "unknown" ? "not_sent" : acceptance,
    });
  }
  if (timeline.stage === "attended_no_completion" && acceptance === "declined") {
    conflicts.push({
      what: "the patient was seen, but the receiving practice's record says they declined the referral",
      clinicalChain: timeline.stage,
      professionalChain: acceptance,
    });
  }

  // Care holder comes from W134, because it is the professional chain that governs who is
  // watching — with the deliberate exception that an unknown acceptance leaves it with the
  // referrer. An unrecorded handover is not a handover.
  const careHolder: CareHolder = acceptance === "unknown" ? "referring_practice" : careHolderWhile(status);

  return { referralId, stage: timeline.stage, acceptance, careHolder, outstanding, conflicts };
}

export const OUTSTANDING_COPY: Record<Outstanding["what"], string> = {
  book_an_appointment: "An appointment has not been booked.",
  answer_the_referral: "The referral has not been answered.",
  send_a_return_report: "The patient was seen and no return report has come back.",
  rebook_after_cancellation: "The appointment was cancelled and nothing has been rebooked.",
};

export const PARTY_COPY: Record<Outstanding["from"], string> = {
  referring_practice: "this practice",
  receiving_practice: "the other practice",
};

/**
 * One line per outstanding item, naming the party and the date.
 *
 * Deliberately produces nothing when nothing is outstanding, rather than "on track" — that
 * would be a conclusion, and the whole point is that this module draws none.
 */
export function describeOutstanding(tracking: ReferralTracking): string[] {
  return tracking.outstanding.map(
    (item) =>
      `${OUTSTANDING_COPY[item.what]} Waiting on ${PARTY_COPY[item.from]}${item.since ? ` since ${item.since}` : ""}.`,
  );
}
