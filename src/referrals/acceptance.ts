// W134: a receiving GP must ACCEPT before becoming a party to the patient's care.
//
// This is W89's hook-3 line written in code. That document's conclusion about GP-to-GP work was
// that a referral must TRANSFER care explicitly rather than blurring it, and the blur has a
// specific shape worth naming: a referral is sent, the receiving practice has not looked at it
// yet, and the referring GP has already stopped watching because they "referred it on". Nobody
// declined anything. Nobody is following the patient.
//
// So the rule is not "record acceptances". It is:
//
//   NO PATIENT-LINKED OBLIGATION EXISTS WITHOUT A RECORDED ACCEPTANCE, and that is enforced by
//   the type. `obligationsFor` takes an `AcceptedReferral`, which is branded and can only be
//   produced from a status that is actually `accepted`. A caller who believes a referral was
//   accepted cannot construct one, so no surface can put a patient on a receiving practice's
//   worklist on the strength of having sent something.
//
// Three consequences follow, each of which is the point rather than a detail:
//
//   SENDING IS NOT TRANSFERRING. Until acceptance the referring practice still holds the
//   patient, and `careHolderWhile` says so for every state. There is no state in which the
//   answer is "nobody".
//
//   SILENCE IS NOT ACCEPTANCE. There is deliberately no timeout that converts an unanswered
//   referral into an accepted one, and no "assumed accepted after N days". An unanswered
//   referral stays `awaiting_acceptance` forever, which is uncomfortable and correct — the
//   discomfort is the signal, and W93's leakage report is where it shows up.
//
//   DECLINING IS AN ACT, NOT AN ABSENCE. A decline is recorded, attributed and reasoned, and it
//   is a different status from never having answered — the same distinction W125 drew between
//   `refused` and `not_recorded`, and for the same reason: they are opposite instructions to
//   the referring practice.

import type { PatientId, PracticeId } from "@/domain/types";
import type { CareHolder } from "./return-report";

interface ActBase {
  referralId: string;
  at: string;
  /** Who did it. Required — an obligation nobody accepted is the thing this unit prevents. */
  by: string;
}

export type AcceptanceAct =
  | (ActBase & {
      kind: "sent";
      fromPracticeId: PracticeId;
      toPracticeId: PracticeId;
      patientId: PatientId;
    })
  | (ActBase & { kind: "accepted"; byPracticeId: PracticeId })
  | (ActBase & { kind: "declined"; byPracticeId: PracticeId; reason: string })
  /** After accepting, the receiving practice gives care back. Their obligation ends. */
  | (ActBase & { kind: "handed_back"; byPracticeId: PracticeId; reason: string });

export type AcceptanceState =
  | "not_sent"
  | "awaiting_acceptance"
  | "accepted"
  | "declined"
  | "handed_back";

export interface AcceptanceStatus {
  state: AcceptanceState;
  referralId: string;
  fromPracticeId: PracticeId | null;
  toPracticeId: PracticeId | null;
  patientId: PatientId | null;
  sentAt: string | null;
  acceptedBy: string | null;
  acceptedAt: string | null;
  endedBy: string | null;
  endedAt: string | null;
  endedReason: string | null;
}

/**
 * Fold the acts into one status.
 *
 * Order-independent by construction: acts are sorted by date before folding, and the terminal
 * acts are checked against the whole set rather than against whichever row happens to be last.
 * That is W129's finding applied before it could happen again — a consent withdrawal was lost
 * to array order there, and an acceptance is the same shape of fact.
 */
export function acceptanceStatus(
  acts: readonly AcceptanceAct[],
  referralId: string,
): AcceptanceStatus {
  // W142 finding. Sorting by date alone is stable, so acts sharing a date resolved by ARRAY
  // ORDER — accept-then-decline gave `declined`, decline-then-accept gave `accepted`. W134's
  // own commit claimed order-independence and tested four orderings, all with distinct dates:
  // the claim was wider than the test, and a practice answering a referral and correcting it
  // the same morning is ordinary rather than exotic.
  //
  // Dates here are day-granular, so a same-day tie is genuinely unorderable. The tie-break is
  // therefore by SAFETY rather than by guess: among acts on the same day, the one that leaves
  // the referring practice watching wins. Not knowing whether a practice took the patient on
  // must never resolve to "they did" — the whole thesis of this unit.
  const SAME_DAY_PRECEDENCE: Record<AcceptanceAct["kind"], number> = {
    sent: 0,
    accepted: 1,
    handed_back: 2,
    declined: 3,
  };
  const mine = [...acts]
    .filter((act) => act.referralId === referralId)
    .sort((a, b) => a.at.localeCompare(b.at) || SAME_DAY_PRECEDENCE[a.kind] - SAME_DAY_PRECEDENCE[b.kind]);

  const status: AcceptanceStatus = {
    state: "not_sent",
    referralId,
    fromPracticeId: null,
    toPracticeId: null,
    patientId: null,
    sentAt: null,
    acceptedBy: null,
    acceptedAt: null,
    endedBy: null,
    endedAt: null,
    endedReason: null,
  };

  for (const act of mine) {
    switch (act.kind) {
      case "sent":
        status.state = status.state === "not_sent" ? "awaiting_acceptance" : status.state;
        status.fromPracticeId = act.fromPracticeId;
        status.toPracticeId = act.toPracticeId;
        status.patientId = act.patientId;
        status.sentAt = act.at;
        break;
      case "accepted":
        // An acceptance after a decline or hand-back is a fresh transfer, not a correction —
        // and it is still an explicit act, which is all this unit insists on.
        status.state = "accepted";
        status.acceptedBy = act.by;
        status.acceptedAt = act.at;
        status.endedBy = null;
        status.endedAt = null;
        status.endedReason = null;
        break;
      case "declined":
      case "handed_back":
        status.state = act.kind === "declined" ? "declined" : "handed_back";
        status.endedBy = act.by;
        status.endedAt = act.at;
        status.endedReason = act.reason;
        break;
    }
  }
  return status;
}

/**
 * Who is watching the patient, at every state.
 *
 * There is no state in which the answer is "nobody", and none in which it is the receiving
 * practice alone before they accepted. That is the blur this unit exists to prevent.
 */
export function careHolderWhile(status: AcceptanceStatus): CareHolder {
  switch (status.state) {
    case "not_sent":
    case "awaiting_acceptance":
    case "declined":
    case "handed_back":
      return "referring_practice";
    case "accepted":
      return "both_practices";
  }
}

/**
 * Proof that a receiving practice took this on.
 *
 * Branded with a `unique symbol` this module never exports, so it cannot be constructed by a
 * caller who believes a referral was accepted. This is the whole gate: `obligationsFor`
 * requires one, and `acceptedReferral` is the only source.
 */
declare const RECORDED_ACCEPTANCE: unique symbol;

export interface AcceptedReferral {
  readonly [RECORDED_ACCEPTANCE]: true;
  readonly referralId: string;
  readonly patientId: PatientId;
  readonly acceptingPracticeId: PracticeId;
  readonly acceptedBy: string;
  readonly acceptedAt: string;
}

/** Null for every state that is not `accepted`. There is no second producer. */
export function acceptedReferral(status: AcceptanceStatus): AcceptedReferral | null {
  if (status.state !== "accepted") return null;
  if (status.patientId === null || status.toPracticeId === null) return null;
  if (status.acceptedBy === null || status.acceptedAt === null) return null;
  return {
    referralId: status.referralId,
    patientId: status.patientId,
    acceptingPracticeId: status.toPracticeId,
    acceptedBy: status.acceptedBy,
    acceptedAt: status.acceptedAt,
  } as unknown as AcceptedReferral;
}

/**
 * What the SOFTWARE does once a practice has taken a patient on.
 *
 * Operational, closed, and deliberately not clinical: this says what the product will do, never
 * what anybody must do for the patient. That is W114 and W121's rule, and it matters more here
 * because the word "obligation" invites the other reading.
 */
export type ReferralObligation =
  /** The patient's referral appears on the receiving practice's work list. */
  | "appears_on_receiving_worklist"
  /** W132's return report is outstanding for this referral. */
  | "return_report_outstanding";

export const ALL_REFERRAL_OBLIGATIONS: readonly ReferralObligation[] = [
  "appears_on_receiving_worklist",
  "return_report_outstanding",
];

export interface PatientLinkedObligation {
  obligation: ReferralObligation;
  referralId: string;
  patientId: PatientId;
  practiceId: PracticeId;
  since: string;
}

/**
 * The obligations a recorded acceptance creates.
 *
 * Takes `AcceptedReferral` and nothing else, so there is no argument list that produces an
 * obligation from an unaccepted referral. A caller cannot reach this function without having
 * gone through `acceptedReferral`, and that returns null for every other state.
 */
export function obligationsFor(accepted: AcceptedReferral): PatientLinkedObligation[] {
  return ALL_REFERRAL_OBLIGATIONS.map((obligation) => ({
    obligation,
    referralId: accepted.referralId,
    patientId: accepted.patientId,
    practiceId: accepted.acceptingPracticeId,
    since: accepted.acceptedAt,
  }));
}

export const ACCEPTANCE_STATE_COPY: Record<AcceptanceState, string> = {
  not_sent: "Not sent yet. This practice is watching the patient.",
  awaiting_acceptance:
    "Sent, and the other practice has not answered. They are not looking after this patient yet — this practice still is.",
  accepted: "Accepted. Both practices are holding part of this until a return report comes back.",
  declined: "Declined. Care never moved, and this practice is still watching the patient.",
  handed_back: "Handed back. The other practice has ended their part and this practice is watching again.",
};

export const OBLIGATION_COPY: Record<ReferralObligation, string> = {
  appears_on_receiving_worklist: "The referral is on the receiving practice's work list.",
  return_report_outstanding: "A return report is outstanding for this referral.",
};
