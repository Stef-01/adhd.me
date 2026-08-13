// W132: the return report — what comes back from the receiving practice.
//
// W93 measures referral leakage and its worst stage is `attended_no_completion`: the patient
// was seen and nothing came back. This is the thing that comes back, and the unit's gate is
// that recording one closes that stage on replay.
//
// The design question is what a return report is FOR, and the answer is not "a letter". A
// referral loop where both practices believe the other is following up is the classic harm in
// GP-to-GP care, and it is a harm of AMBIGUITY rather than of error: nobody did anything wrong,
// and nobody is watching the patient. So the field that matters most is not the narrative:
//
//   WHO HOLDS ONGOING CARE NOW. It is required, it comes from a closed set, and it has no
//   default — because the dangerous state is exactly the one a default would paper over.
//
// It is DERIVED from the outcome rather than recorded alongside it, which is the move worth
// noting: two fields that can disagree eventually do, and a return report saying "seen, care
// returned to you" in one field and "receiving practice retains" in another is worse than
// either alone. One field is recorded; the other is a function of it.
//
// The narrative follows W131's rule exactly: one prose field, authored by a named clinician at
// a stated time, and nothing in this module generates or templates it. Meherr does not write
// clinical correspondence.
//
// What this module will NOT do is infer a completion. No return report means the loop is open,
// which is precisely what W93 already reports and precisely what a practice needs to see.

import type { PatientId, PracticeId } from "@/domain/types";
import type { ReferralEvent } from "./leakage";
import type { ClinicianNarrative } from "./document";

/**
 * What happened at the receiving practice.
 *
 * Closed, and describing the ENCOUNTER rather than the patient — the same discipline W131 used
 * for referral reasons. "Seen" and "not seen" are facts about an appointment.
 */
export type ReturnOutcome =
  /** Seen, and ongoing care goes back to the referring practice. */
  | "seen_care_returned"
  /** Seen, and the receiving practice keeps ongoing care for this. */
  | "seen_care_retained"
  /** Seen, and both practices hold part of it. */
  | "seen_shared_care"
  /** Not seen — did not attend, or could not be offered an appointment. */
  | "not_seen";

export const ALL_RETURN_OUTCOMES: readonly ReturnOutcome[] = [
  "seen_care_returned",
  "seen_care_retained",
  "seen_shared_care",
  "not_seen",
];

/** Who is watching the patient for this after the referral. */
export type CareHolder = "referring_practice" | "receiving_practice" | "both_practices";

/**
 * Derived, never recorded alongside the outcome.
 *
 * Two fields that can disagree eventually do, and "seen, care returned to you" next to
 * "receiving practice retains" is worse than either alone — a reader has to guess, and the
 * guess decides whether anybody follows the patient up. One field is recorded; this is a
 * function of it, so a contradiction is unrepresentable rather than validated.
 *
 * `not_seen` returns care to the referring practice deliberately: an appointment that did not
 * happen transfers nothing, and the referring GP is still the one watching.
 */
export function ongoingCareAfter(outcome: ReturnOutcome): CareHolder {
  switch (outcome) {
    case "seen_care_returned":
      return "referring_practice";
    case "seen_care_retained":
      return "receiving_practice";
    case "seen_shared_care":
      return "both_practices";
    case "not_seen":
      return "referring_practice";
  }
}

export interface ReturnReport {
  referralId: string;
  fromPracticeId: PracticeId;
  toPracticeId: PracticeId;
  patientId: PatientId;
  outcome: ReturnOutcome;
  /** When the receiving practice completed the report. */
  reportedAt: string;
  /** The receiving clinician. */
  reportedBy: string;
  /** When the patient was seen. Null when they were not. */
  seenOn: string | null;
  /** The receiving clinician's own words. Optional; attributed when present (W131's rule). */
  narrative: ClinicianNarrative | null;
}

export type ReturnRejection =
  | "referral_missing"
  | "practice_missing"
  | "patient_missing"
  | "reporter_missing"
  | "date_missing_or_unreadable"
  | "unknown_outcome"
  | "seen_without_date"
  | "not_seen_with_date"
  | "seen_before_referral"
  | "narrative_unattributed"
  | "narrative_empty";

export type ReturnResult =
  | { ok: true; report: ReturnReport }
  | { ok: false; errors: ReturnRejection[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

export interface ReturnInput {
  referralId: string;
  fromPracticeId: string;
  toPracticeId: string;
  patientId: string;
  outcome: string;
  reportedAt: string;
  reportedBy: string;
  seenOn: string | null;
  narrative: ClinicianNarrative | null;
  /** The referral's own date, so a report cannot claim a visit before it was written. */
  referralWrittenOn: string;
}

export function recordReturn(input: ReturnInput): ReturnResult {
  const errors: ReturnRejection[] = [];

  if (input.referralId.trim() === "") errors.push("referral_missing");
  if (input.fromPracticeId.trim() === "" || input.toPracticeId.trim() === "") {
    errors.push("practice_missing");
  }
  if (input.patientId.trim() === "") errors.push("patient_missing");
  if (input.reportedBy.trim() === "") errors.push("reporter_missing");
  if (!ISO_DATE.test(input.reportedAt)) errors.push("date_missing_or_unreadable");

  const known = (ALL_RETURN_OUTCOMES as readonly string[]).includes(input.outcome);
  if (!known) errors.push("unknown_outcome");

  if (known && input.outcome !== "not_seen") {
    // "Seen" with no date is a claim nobody can place in time, and W93's whole measurement is
    // about when things happened.
    if (input.seenOn === null || !ISO_DATE.test(input.seenOn)) errors.push("seen_without_date");
    else if (ISO_DATE.test(input.referralWrittenOn) && input.seenOn < input.referralWrittenOn) {
      errors.push("seen_before_referral");
    }
  }
  if (known && input.outcome === "not_seen" && input.seenOn !== null) {
    errors.push("not_seen_with_date");
  }

  if (input.narrative !== null) {
    if (input.narrative.text.trim() === "") errors.push("narrative_empty");
    if (input.narrative.authoredBy.trim() === "" || !ISO_DATE.test(input.narrative.authoredAt)) {
      errors.push("narrative_unattributed");
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    report: {
      referralId: input.referralId,
      fromPracticeId: input.fromPracticeId as PracticeId,
      toPracticeId: input.toPracticeId as PracticeId,
      patientId: input.patientId as PatientId,
      outcome: input.outcome as ReturnOutcome,
      reportedAt: input.reportedAt,
      reportedBy: input.reportedBy,
      seenOn: input.seenOn,
      narrative: input.narrative,
    },
  };
}

/**
 * The W93 event a return report produces, or null.
 *
 * `not_seen` produces NOTHING, and that is the unit's sharpest edge. A report saying the
 * patient never attended is a real return report — the receiving practice did their part by
 * telling somebody — but it does not close the loop, because the loop is the patient being
 * seen. Emitting a completion for it would move the referral to `completed` and delete it from
 * exactly the report a practice uses to find people who fell through.
 */
export function completionEvent(report: ReturnReport): ReferralEvent | null {
  if (report.outcome === "not_seen") return null;
  return {
    practiceId: report.fromPracticeId,
    patientId: report.patientId,
    referralId: report.referralId,
    kind: "completion_recorded",
    at: report.reportedAt,
  };
}

/** Operator-facing copy. Describes the encounter and the handover, never the patient. */
export const RETURN_OUTCOME_COPY: Record<ReturnOutcome, string> = {
  seen_care_returned: "Seen, and ongoing care comes back to this practice.",
  seen_care_retained: "Seen, and the other practice is keeping ongoing care for this.",
  seen_shared_care: "Seen, and both practices are holding part of it.",
  not_seen: "Not seen. The referral is still open and this practice is still watching.",
};

export const CARE_HOLDER_COPY: Record<CareHolder, string> = {
  referring_practice: "This practice.",
  receiving_practice: "The practice the patient was referred to.",
  both_practices: "Both practices, together.",
};

export function explainReturnRejection(reason: ReturnRejection): string {
  switch (reason) {
    case "referral_missing":
      return "Say which referral this is about.";
    case "practice_missing":
      return "Say which practices are involved.";
    case "patient_missing":
      return "Say who it is about.";
    case "reporter_missing":
      return "Record the clinician reporting back. Nothing in this product writes it for you.";
    case "date_missing_or_unreadable":
      return "Record the date of the report, as YYYY-MM-DD.";
    case "unknown_outcome":
      return `The outcome must be one of: ${ALL_RETURN_OUTCOMES.join(", ")}.`;
    case "seen_without_date":
      return "Record when the patient was seen. 'Seen' with no date cannot be placed in time.";
    case "not_seen_with_date":
      return "This says the patient was not seen but carries a date they were seen on. Check both.";
    case "seen_before_referral":
      return "The visit is dated before the referral was written — check both dates.";
    case "narrative_unattributed":
      return "Clinical notes need the name of the clinician who wrote them and the date.";
    case "narrative_empty":
      return "The clinical notes are empty. Leave them out rather than sending a blank section.";
  }
}
