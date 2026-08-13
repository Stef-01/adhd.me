// W131: the structured referral document.
//
// The unit's gate is "no free-text clinical field that bypasses the content gate", and getting
// it right means being precise about what the content gate is FOR. G5 governs clinical content
// MEHERR publishes — pathway criteria, recall intervals, safety rules — because that content
// carries the product's implicit endorsement and nobody at Meherr is qualified to write it.
//
// A GP writing about their own patient is not that. It is practitioner-to-practitioner
// communication which that GP is professionally responsible for, and a product that refused to
// let a doctor write a sentence about their patient would be wrong in the other direction. So
// the gate is not "no free text". It is:
//
//   NO CLINICAL TEXT THAT MEHERR AUTHORS, TEMPLATES OR GENERATES. Exactly one field carries
//   prose, it is attributed to a named clinician at a stated time, and this module contains no
//   function that produces narrative and no template constant to fill in. That is the bypass
//   the gate exists to close: system-generated clinical wording travelling inside a referral
//   would be Meherr content that never went through W119's sign-off, wearing a GP's name.
//
// Everything else is structured, and two of those choices are load-bearing:
//
//   FACTS ARE REFERENCED, NEVER RESTATED. A referral carries W120's fact CODES, not sentences
//   about them. Restating a recorded fact as prose turns a bookkeeping entry into a clinical
//   assertion somebody has to stand behind, and loses the link to the record it came from.
//
//   THE REASON IS OPERATIONAL, NOT DIAGNOSTIC. The closed `ReferralReason` vocabulary is about
//   scope and capacity — why this practice is asking another one — never about what is wrong
//   with the patient. That is what the narrative and the referenced facts are for.
//
// DELIBERATELY ABSENT: any credential or capability field. The founder's A-or-B ruling on
// whether credential detail may cross a practice boundary is outstanding (docs/GATE-DOSSIER-Q9
// action 1), and a credential field added here before the ruling would MAKE that ruling by
// default — this document's shape is what a referral can carry. A document with no such field
// is valid under either answer, so the decision stays open and moves to W133. That is the same
// gate-safe-intersection reasoning W56 used to ship a loader without values.

/** Why one practice is asking another. Operational: scope and capacity, never diagnosis. */
export type ReferralReason =
  /** The receiving GP does something this practice does not. */
  | "extended_scope"
  /** This practice cannot see the patient in a workable timeframe. */
  | "capacity"
  /** The patient already has a relationship with the receiving practice. */
  | "continuity"
  /** The patient asked. */
  | "patient_preference";

export const ALL_REFERRAL_REASONS: readonly ReferralReason[] = [
  "extended_scope",
  "capacity",
  "continuity",
  "patient_preference",
];

/** What is being asked for. Also closed, also operational. */
export type ReferralRequest = "assessment_and_management" | "procedure" | "shared_care" | "advice_only";

export const ALL_REFERRAL_REQUESTS: readonly ReferralRequest[] = [
  "assessment_and_management",
  "procedure",
  "shared_care",
  "advice_only",
];

/**
 * The referring clinician's own words about their own patient.
 *
 * Attribution is required, not decorative: this is the one field the product does not govern
 * the wording of, so the record of WHO wrote it is what makes that acceptable. Meherr neither
 * generates nor templates this text — see the module note.
 */
export interface ClinicianNarrative {
  text: string;
  authoredBy: string;
  authoredAt: string;
}

export interface ReferralDocument {
  referralId: string;
  fromPracticeId: string;
  toPracticeId: string;
  patientId: string;
  createdAt: string;
  /** The referring clinician. */
  createdBy: string;
  reason: ReferralReason;
  request: ReferralRequest;
  /** A register/condition code from the practice's own catalogue. Null when not register work. */
  conditionCode: string | null;
  /** W120 fact CODES. Referenced, never restated as prose — see the module note. */
  recordedFactCodes: readonly string[];
  /** Optional. When present, it must be attributed. */
  narrative: ClinicianNarrative | null;
}

export type ReferralRejection =
  | "referral_id_missing"
  | "from_practice_missing"
  | "to_practice_missing"
  | "referral_to_self"
  | "patient_missing"
  | "author_missing"
  | "date_missing_or_unreadable"
  | "unknown_reason"
  | "unknown_request"
  | "narrative_unattributed"
  | "narrative_empty"
  | "duplicate_fact_code";

export type ReferralResult =
  | { ok: true; document: ReferralDocument }
  | { ok: false; errors: ReferralRejection[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

export interface ReferralInput {
  referralId: string;
  fromPracticeId: string;
  toPracticeId: string;
  patientId: string;
  createdAt: string;
  createdBy: string;
  reason: string;
  request: string;
  conditionCode: string | null;
  recordedFactCodes: readonly string[];
  narrative: ClinicianNarrative | null;
}

/**
 * Build a referral, refusing anything that could not be stood behind.
 *
 * Every problem at once, for W108's reason. Note what is NOT validated: the narrative's
 * wording. That is the referring clinician's professional communication and this module has no
 * business editing it — what it insists on is that somebody's name is against it.
 */
export function buildReferral(input: ReferralInput, todayIso: string): ReferralResult {
  const errors: ReferralRejection[] = [];

  if (input.referralId.trim() === "") errors.push("referral_id_missing");
  if (input.fromPracticeId.trim() === "") errors.push("from_practice_missing");
  if (input.toPracticeId.trim() === "") errors.push("to_practice_missing");
  if (
    input.fromPracticeId.trim() !== "" &&
    input.fromPracticeId.trim() === input.toPracticeId.trim()
  ) {
    // A referral to yourself is not a referral, and recording one would put a second copy of
    // the patient's care in a rail designed to hand it over.
    errors.push("referral_to_self");
  }
  if (input.patientId.trim() === "") errors.push("patient_missing");
  if (input.createdBy.trim() === "") errors.push("author_missing");
  if (!ISO_DATE.test(input.createdAt)) errors.push("date_missing_or_unreadable");

  if (!(ALL_REFERRAL_REASONS as readonly string[]).includes(input.reason)) {
    errors.push("unknown_reason");
  }
  if (!(ALL_REFERRAL_REQUESTS as readonly string[]).includes(input.request)) {
    errors.push("unknown_request");
  }

  if (input.narrative !== null) {
    if (input.narrative.text.trim() === "") errors.push("narrative_empty");
    if (
      input.narrative.authoredBy.trim() === "" ||
      !ISO_DATE.test(input.narrative.authoredAt)
    ) {
      // W122's rule: text nobody can attribute is text nobody can question — and here it is
      // also the only thing making an ungoverned field acceptable at all.
      errors.push("narrative_unattributed");
    }
  }

  if (new Set(input.recordedFactCodes).size !== input.recordedFactCodes.length) {
    errors.push("duplicate_fact_code");
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    document: {
      referralId: input.referralId,
      fromPracticeId: input.fromPracticeId,
      toPracticeId: input.toPracticeId,
      patientId: input.patientId,
      createdAt: input.createdAt,
      createdBy: input.createdBy,
      reason: input.reason as ReferralReason,
      request: input.request as ReferralRequest,
      conditionCode: input.conditionCode,
      recordedFactCodes: [...input.recordedFactCodes],
      narrative: input.narrative,
    },
  };
}

/** Operator-facing labels. Describe the ASK, never the patient. */
export const REFERRAL_REASON_COPY: Record<ReferralReason, string> = {
  extended_scope: "The receiving practice does something this one does not.",
  capacity: "This practice cannot see the patient in a workable timeframe.",
  continuity: "The patient already has a relationship with the receiving practice.",
  patient_preference: "The patient asked to be seen there.",
};

export const REFERRAL_REQUEST_COPY: Record<ReferralRequest, string> = {
  assessment_and_management: "Assessment and ongoing management.",
  procedure: "A procedure.",
  shared_care: "Shared care alongside this practice.",
  advice_only: "Advice, with the patient staying here.",
};

export function explainReferralRejection(reason: ReferralRejection): string {
  switch (reason) {
    case "referral_id_missing":
      return "Give the referral an identifier.";
    case "from_practice_missing":
      return "Say which practice is referring.";
    case "to_practice_missing":
      return "Say which practice is being referred to.";
    case "referral_to_self":
      return "A practice cannot refer to itself.";
    case "patient_missing":
      return "Say who the referral is about.";
    case "author_missing":
      return "Record the referring clinician. A referral nobody signed is not a referral.";
    case "date_missing_or_unreadable":
      return "Record the date, as YYYY-MM-DD.";
    case "unknown_reason":
      return `The reason must be one of: ${ALL_REFERRAL_REASONS.join(", ")}.`;
    case "unknown_request":
      return `The request must be one of: ${ALL_REFERRAL_REQUESTS.join(", ")}.`;
    case "narrative_unattributed":
      return "Clinical notes need the name of the clinician who wrote them and the date. Nothing in this product writes them for you.";
    case "narrative_empty":
      return "The clinical notes are empty. Leave them out rather than sending a blank section.";
    case "duplicate_fact_code":
      return "The same recorded fact is listed twice.";
  }
}
