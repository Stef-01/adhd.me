// W109: the evidence vault — the documents a credential rests on.
//
// W108 made a credential unrepresentable without a verifier and a date, and pointed its
// evidence at a `documentRef` rather than embedding anything. This is what that ref points
// at, and it is a separate module for exactly the reason W108 gave: a credential can then be
// read by code that has no authorization to read evidence. Most of the console needs to know
// THAT a credential was verified. Almost none of it needs the scan of someone's certificate.
//
// The unit's gate is "no route serves an evidence document without authorization". A gate
// phrased that way is normally met by remembering to check on every route — which is a
// promise about future diffs, and the W51 lesson is that promises about future diffs are the
// thing that fails. So it is met by the API instead:
//
//   THERE IS NO WAY TO GET BYTES WITHOUT A `VaultGrant`, AND NO WAY TO GET A `VaultGrant`
//   WITHOUT `authorize()`. The grant is branded with a `unique symbol` no caller can produce,
//   so a route that skips the check does not fail review — it fails to compile. That is the
//   W69 shape (only `usableContent()` can mint approved content) applied to a different
//   question.
//
// Two further decisions worth stating, because both look like details and are not:
//
//   A MISS AND A NEIGHBOUR'S DOCUMENT ARE THE SAME ANSWER. Reading a ref that belongs to
//   another practice returns `not_found`, never `forbidden`. W105 went the other way — 403,
//   not 404, for the community interest register — and the difference is which fact is
//   sensitive. There, the register's existence was already public and only the contents were
//   withheld. Here the EXISTENCE of a credentialing document for a named clinician at another
//   practice is itself the disclosure, and `forbidden` confirms it. There is no branch that
//   could distinguish the two cases: the lookup matches ref and practice in one step, so the
//   code that answers does not know.
//
//   THE SUMMARY IS NOT THE DOCUMENT. `listEvidence` returns metadata with no content field at
//   all (the type omits it), so a console listing a clinician's evidence never loads the
//   bytes and cannot leak them through a serialised prop. W83's coarseness argument, applied
//   to a payload rather than a panel.
//
// Clinicians are deliberately NOT granted `read_credential_evidence` — see `openVault`.

import { authorize, type Membership } from "@/tenancy/tenancy";

/**
 * Proof that `authorize()` said yes. Cannot be constructed outside this module: the brand is
 * a `unique symbol` that is never exported, so `readEvidence(someObjectLiteral, ref)` is a
 * type error rather than a code review finding.
 */
declare const VAULT_GRANT: unique symbol;

export interface VaultGrant {
  readonly [VAULT_GRANT]: true;
  /** Every read through this grant is scoped to this practice and no other. */
  readonly practiceId: string;
  /** Who opened it. Stamped onto uploads rather than trusted from the caller (W111's rule). */
  readonly email: string;
}

/** What a vault can hold. Narrow on purpose: an evidence document is a scan, not a web page. */
export const ALLOWED_CONTENT_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
export type EvidenceContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

/** 8 MB. A certificate scan that exceeds this is a scan of the wrong thing. */
export const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;

/**
 * Actual UTF-8 bytes, not string length.
 *
 * W116 finding: this module used `content.length`, which counts UTF-16 code units. For
 * anything but ASCII that is not the byte count — 2x for accented Latin, 2x for most emoji —
 * so a constant named MAX_EVIDENCE_*BYTES* was admitting multiples of its stated limit, and
 * `byteLength` was recording a number that was not bytes. A size guard that measures
 * something other than what it says is a guard nobody can reason about.
 */
export function evidenceByteLength(content: string): number {
  return Buffer.byteLength(content, "utf8");
}

export interface EvidenceDocument {
  ref: string;
  practiceId: string;
  /** The W108 credential this is evidence for. */
  credentialId: string;
  /** Whose credential it is. Not the uploader. */
  subjectClinicianId: string;
  filename: string;
  contentType: EvidenceContentType;
  byteLength: number;
  /** Taken from the grant, never from the input. */
  uploadedBy: string;
  uploadedOn: string;
  /** Synthetic in this build (G2/G6). Real documents need the founder's ruling, not a unit. */
  content: string;
}

/**
 * What a listing returns. `content` is absent from the TYPE, not merely unset — so no caller
 * can accidentally hand a document's bytes to a client that only asked what exists.
 */
export type EvidenceSummary = Omit<EvidenceDocument, "content">;

interface VaultState {
  documents: EvidenceDocument[];
}

const globalStore = globalThis as { __adhdMeEvidenceVault?: VaultState };

function state(): VaultState {
  globalStore.__adhdMeEvidenceVault ??= { documents: [] };
  return globalStore.__adhdMeEvidenceVault;
}

export function resetVault(): void {
  globalStore.__adhdMeEvidenceVault = { documents: [] };
}

export type VaultDenial = "no_membership" | "role_denied";

export type VaultOpen = { ok: true; grant: VaultGrant } | { ok: false; reason: VaultDenial };

/**
 * The only way into the vault.
 *
 * `read_credential_evidence` is granted to owners and managers — the people who run
 * credentialing — and NOT to clinicians. That is a decision, not an omission:
 *
 *   - A clinician reading a colleague's credentialing file is not something a practice asked
 *     for, and "clinician" is the role every clinical user holds, so granting it there grants
 *     it to everyone.
 *   - A clinician reading their OWN file is a subject-access right and should exist, but it
 *     needs the signed-in person tied to a clinician id by something better than a role. W113
 *     is where that belongs, and it must solve it by scoping reads to the subject — NOT by
 *     adding `clinician` to this grant, which would hand every clinician every file.
 *
 * Refs are content-derived rather than sequential for the same forward reason: a subject-only
 * read that hands out guessable refs is an enumeration of everyone else's documents.
 */
export function openVault(
  memberships: readonly Membership[],
  email: string,
  practiceId: string,
): VaultOpen {
  const decision = authorize(memberships, email, practiceId, "read_credential_evidence");
  if (!decision.allowed) return { ok: false, reason: decision.reason };
  return { ok: true, grant: { practiceId, email } as unknown as VaultGrant };
}

function fnv1a(input: string, basis: number): number {
  let h = basis;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Content-derived, ~64-bit, and carrying no practice or clinician identifier — a ref can
 * appear in a URL without saying whose document it is or where it lives.
 *
 * Deriving it from the content also makes re-uploading the identical file to the identical
 * credential land on the identical ref, which is why `duplicate_ref` is a refusal a caller
 * can safely ignore rather than a collision to worry about.
 */
function deriveRef(practiceId: string, credentialId: string, filename: string, content: string): string {
  const key = `${practiceId} ${credentialId} ${filename} ${content}`;
  const hi = fnv1a(key, 0x811c9dc5).toString(16).padStart(8, "0");
  const lo = fnv1a(key, 0x01000193).toString(16).padStart(8, "0");
  return `ev_${hi}${lo}`;
}

export interface EvidenceInput {
  credentialId: string;
  subjectClinicianId: string;
  filename: string;
  contentType: string;
  content: string;
  uploadedOn: string;
}

export type EvidenceRejection =
  | "credential_missing"
  | "subject_missing"
  | "filename_missing"
  | "empty_content"
  | "unsupported_content_type"
  | "too_large"
  | "duplicate_ref";

export type StoreResult =
  | { ok: true; summary: EvidenceSummary }
  | { ok: false; errors: EvidenceRejection[] };

/**
 * Add a document to the practice the grant was opened for.
 *
 * `practiceId` and `uploadedBy` come from the GRANT and are not fields on the input, so
 * writing into another practice's vault is unrepresentable rather than validated — the same
 * move W108 made with `verifiedBy`.
 */
export function storeEvidence(grant: VaultGrant, input: EvidenceInput): StoreResult {
  const errors: EvidenceRejection[] = [];

  if (input.credentialId.trim() === "") errors.push("credential_missing");
  if (input.subjectClinicianId.trim() === "") errors.push("subject_missing");
  if (input.filename.trim() === "") errors.push("filename_missing");
  if (input.content.length === 0) errors.push("empty_content");
  if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(input.contentType)) {
    // Not theoretical: a vault that accepts text/html and a route that serves it back is a
    // stored-XSS surface handed to whoever can upload. Narrow list, checked at the door.
    errors.push("unsupported_content_type");
  }
  if (evidenceByteLength(input.content) > MAX_EVIDENCE_BYTES) errors.push("too_large");

  const ref = deriveRef(grant.practiceId, input.credentialId, input.filename, input.content);
  if (state().documents.some((d) => d.ref === ref)) errors.push("duplicate_ref");

  if (errors.length > 0) return { ok: false, errors };

  const document: EvidenceDocument = {
    ref,
    practiceId: grant.practiceId,
    credentialId: input.credentialId,
    subjectClinicianId: input.subjectClinicianId,
    filename: input.filename,
    contentType: input.contentType as EvidenceContentType,
    byteLength: evidenceByteLength(input.content),
    uploadedBy: grant.email,
    uploadedOn: input.uploadedOn,
    content: input.content,
  };
  state().documents.push(document);
  return { ok: true, summary: summarise(document) };
}

function summarise(document: EvidenceDocument): EvidenceSummary {
  const { content: _content, ...summary } = document;
  return summary;
}

export type ReadResult =
  | { found: true; document: EvidenceDocument }
  | { found: false; reason: "not_found" };

/**
 * Read a document's bytes.
 *
 * The lookup matches ref AND practice in one step. That is the isolation guarantee in its
 * whole: there is no branch in which this function knows that a ref exists somewhere else, so
 * there is nothing for a future refactor to accidentally start reporting.
 */
export function readEvidence(grant: VaultGrant, ref: string): ReadResult {
  const document = state().documents.find(
    (d) => d.ref === ref && d.practiceId === grant.practiceId,
  );
  return document ? { found: true, document } : { found: false, reason: "not_found" };
}

/** Metadata for one credential's evidence. Never loads content — the type has no room for it. */
export function listEvidence(grant: VaultGrant, credentialId: string): EvidenceSummary[] {
  return state()
    .documents.filter((d) => d.practiceId === grant.practiceId && d.credentialId === credentialId)
    .map(summarise);
}

/** Every document held for one clinician at the grant's practice. Metadata only. */
export function listEvidenceForClinician(grant: VaultGrant, clinicianId: string): EvidenceSummary[] {
  return state()
    .documents.filter(
      (d) => d.practiceId === grant.practiceId && d.subjectClinicianId === clinicianId,
    )
    .map(summarise);
}

/** Plain-English refusal, for whoever has to fix the upload. */
export function explainEvidenceRejection(reason: EvidenceRejection): string {
  switch (reason) {
    case "credential_missing":
      return "Say which credential this document is evidence for.";
    case "subject_missing":
      return "Say whose credential this is.";
    case "filename_missing":
      return "Give the document a filename.";
    case "empty_content":
      return "The document is empty.";
    case "unsupported_content_type":
      return `Evidence must be one of: ${ALLOWED_CONTENT_TYPES.join(", ")}.`;
    case "too_large":
      return `Documents are limited to ${MAX_EVIDENCE_BYTES / (1024 * 1024)} MB.`;
    case "duplicate_ref":
      return "This exact document is already attached to this credential.";
  }
}
