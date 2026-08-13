// W108: the credential record model.
//
// A credential is a claim that someone else checked something. The unit's gate — "no
// credential is representable without a verifier and a date" — is therefore not a validation
// requirement, it is a modelling one: the fields that make a credential *evidence* rather
// than *assertion* are required by the type, so an unverified credential cannot be
// constructed at all. That is the W55/W79 pattern, and it is used here for the same reason:
// a rule the compiler holds cannot be forgotten at a call site under deadline.
//
// The distinction this model exists to protect is the one W79 drew for capability. Interest
// is what a clinician says, experience is what the system derived, competence is what someone
// external verified — and the third is worthless if "verified" can mean "typed in by the
// person it describes". So:
//
//   - `verifiedBy` and `verifiedOn` are non-optional. There is no path to a credential record
//     that omits who checked and when.
//   - `verifiedBy` is an identity, not a free-text string the subject controls, and
//     self-verification is refused (the W69 rule, applied to credentials).
//   - `evidence` is a reference to something a reviewer looked at, not a description of it. A
//     credential with no evidence is a rumour with a date on it.
//
// What this module deliberately does NOT do: decide whether a credential is sufficient for
// anything. That is W82's competence floor and W111's Ahpra check. This is the record.

export type CredentialId = string & { readonly __brand: "CredentialId" };

/** Where the credential came from. Not a free-text field — issuers are named things. */
export interface CredentialIssuer {
  /** Stable identifier, e.g. an accreditation body's code. */
  code: string;
  displayName: string;
  /** The issuer's own reference for this credential, when it has one. */
  reference: string | null;
}

/**
 * What a reviewer actually looked at.
 *
 * `documentRef` points into the W109 evidence vault rather than embedding anything, so a
 * credential record never becomes a place documents accidentally live — and so a credential
 * can be read by code that has no authorization to read evidence.
 */
export interface CredentialEvidence {
  documentRef: string;
  /** What the document is, in the reviewer's words. */
  describedAs: string;
  /** ISO date the document itself is dated, when it carries one. */
  documentDate: string | null;
}

export type CredentialScope =
  /** Applies to a named condition or register. */
  | { kind: "condition"; conditionCode: string }
  /** Applies to a procedure or activity. */
  | { kind: "procedure"; name: string }
  /** General registration or qualification, not scoped to one thing. */
  | { kind: "general" };

/**
 * A verified credential.
 *
 * Every field that makes this evidence is required. The type is the gate.
 */
export interface CredentialRecord {
  id: CredentialId;
  practiceId: string;
  /** Whose credential this is. */
  clinicianId: string;
  issuer: CredentialIssuer;
  scope: CredentialScope;
  /** Required: a credential nobody checked is not a credential. */
  verifiedBy: string;
  /** Required: ISO date. "Verified at some point" is not a verification. */
  verifiedOn: string;
  /** Required, possibly empty — but the ABSENCE of evidence must be a deliberate empty list. */
  evidence: CredentialEvidence[];
  /**
   * Null means no stated expiry, NOT "never expires" — W88 already made that distinction and
   * charged it a staleness cost. Repeated here so the next reader does not re-decide it.
   */
  expiresOn: string | null;
}

export type CredentialRejection =
  | "issuer_missing"
  | "verifier_missing"
  | "verified_date_missing_or_unreadable"
  | "verified_in_the_future"
  | "self_verified"
  | "no_evidence"
  | "evidence_without_reference"
  | "expiry_before_verification";

export type CredentialResult =
  | { ok: true; credential: CredentialRecord }
  | { ok: false; errors: CredentialRejection[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface CredentialInput {
  id: string;
  practiceId: string;
  clinicianId: string;
  issuer: CredentialIssuer;
  scope: CredentialScope;
  verifiedBy: string;
  verifiedOn: string;
  evidence: CredentialEvidence[];
  expiresOn: string | null;
}

/**
 * Build a credential, refusing anything that would be an assertion rather than evidence.
 *
 * Returns every problem rather than the first, because a reviewer fixing a submission one
 * error per round is a reviewer who stops reviewing carefully.
 */
export function recordCredential(input: CredentialInput, todayIso: string): CredentialResult {
  const errors: CredentialRejection[] = [];

  if (input.issuer.code.trim() === "" || input.issuer.displayName.trim() === "") {
    errors.push("issuer_missing");
  }
  if (input.verifiedBy.trim() === "") errors.push("verifier_missing");
  if (!ISO_DATE.test(input.verifiedOn)) errors.push("verified_date_missing_or_unreadable");
  else if (input.verifiedOn > todayIso.slice(0, 10)) errors.push("verified_in_the_future");

  // The W69 rule, applied to credentials: a workflow that permits self-verification produces
  // the paper trail of a check that never happened, which is worse than no check at all
  // because it looks like one.
  if (input.verifiedBy.trim() !== "" && input.verifiedBy.trim() === input.clinicianId.trim()) {
    errors.push("self_verified");
  }

  if (input.evidence.length === 0) errors.push("no_evidence");
  if (input.evidence.some((e) => e.documentRef.trim() === "" || e.describedAs.trim() === "")) {
    errors.push("evidence_without_reference");
  }

  if (input.expiresOn !== null && ISO_DATE.test(input.expiresOn) && ISO_DATE.test(input.verifiedOn)) {
    if (input.expiresOn < input.verifiedOn) errors.push("expiry_before_verification");
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, credential: { ...input, id: input.id as CredentialId } };
}

/** Plain-English refusal, for the reviewer who has to fix it. */
export function explainRejection(reason: CredentialRejection): string {
  switch (reason) {
    case "issuer_missing":
      return "Name the body that issued this credential.";
    case "verifier_missing":
      return "Record who checked this. A credential nobody checked is not a credential.";
    case "verified_date_missing_or_unreadable":
      return "Record the date it was checked, as YYYY-MM-DD.";
    case "verified_in_the_future":
      return "The verification date is in the future — check it.";
    case "self_verified":
      return "A clinician cannot verify their own credential. Someone else has to check it.";
    case "no_evidence":
      return "Attach what was actually looked at. A credential with no evidence is a rumour with a date on it.";
    case "evidence_without_reference":
      return "Every piece of evidence needs a document reference and a description.";
    case "expiry_before_verification":
      return "This credential expires before it was verified — check both dates.";
  }
}
