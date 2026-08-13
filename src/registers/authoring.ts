// W69: the G5 authoring workspace.
//
// This is where clinical content is drafted and reviewed before it can ever drive a message.
// The unit's ledger row permits the workspace to be built while the CONTENT stays gated, and
// that split is the whole design: the machinery is code, the sign-off is a founder act, and
// nothing crosses from one to the other implicitly.
//
// The governing rule is stated once, here, and enforced everywhere below: **content that has
// not been signed off is unusable**. Not "flagged", not "warned about" — unusable. The type
// system is the primary enforcement, because a runtime check can be forgotten at a call site
// and a type cannot:
//
//   - `DraftContent` and `ApprovedContent` are different types, and only `ApprovedContent` is
//     accepted by anything downstream. A draft cannot be passed where approved content is
//     required — that is a compile error, not a lint warning.
//   - The ONLY way to obtain an `ApprovedContent` is `signOff()`, which requires a founder
//     sign-off record. There is no cast, no constructor, and no "force" parameter.
//   - Every state transition is recorded. An audit must be able to answer "who approved this
//     exact text, when, and what did they see", which is the same question W67 answers for
//     message templates and for the same reason.
//
// Review is deliberately multi-stage (draft → reviewed → signed off) because a specialist
// reviewer and the founder are answering different questions: the reviewer asks "is this
// clinically correct?", the founder asks "do we accept the liability of shipping it?".
// Collapsing them would lose the distinction G5 exists to preserve.

import { createHash } from "node:crypto";
import type { ConditionCode } from "@/domain/types";

export type ContentKind = "guideline_interval" | "safety_rule" | "condition_description";

export type ContentState = "draft" | "in_review" | "reviewed" | "signed_off" | "rejected";

export interface ContentRecord {
  id: string;
  conditionCode: ConditionCode;
  kind: ContentKind;
  /** The content itself, as authored. Opaque to this module — it never interprets it. */
  body: string;
  /** SHA-256 of `body`. Any edit changes it and resets the workflow (see `amend`). */
  contentHash: string;
  state: ContentState;
  history: Array<{ at: string; event: string; byEmail: string }>;
  /** Set only by a specialist review. */
  reviewedBy: string | null;
  reviewedAt: string | null;
  /** Set only by founder sign-off. The single gate on usability. */
  signedOffBy: string | null;
  signedOffAt: string | null;
  /** Why it was rejected, when it was. */
  rejectedReason: string | null;
}

/**
 * Content that has cleared G5. This type is unforgeable outside `signOff()` — the branded
 * field cannot be produced by a literal, so `as ApprovedContent` is the only way around it
 * and that is greppable in review.
 */
declare const G5_SIGNED_OFF: unique symbol;

export interface ApprovedContent {
  /** Brand: only signOff()/usableContent() can produce this, so `as` is the only bypass. */
  readonly [G5_SIGNED_OFF]: true;
  record: ContentRecord;
  body: string;
  conditionCode: ConditionCode;
  kind: ContentKind;
}

export function contentHash(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export function draft(
  input: { id: string; conditionCode: ConditionCode; kind: ContentKind; body: string },
  byEmail: string,
  at: string,
): ContentRecord {
  return {
    id: input.id,
    conditionCode: input.conditionCode,
    kind: input.kind,
    body: input.body,
    contentHash: contentHash(input.body),
    state: "draft",
    history: [{ at, event: "drafted", byEmail }],
    reviewedBy: null,
    reviewedAt: null,
    signedOffBy: null,
    signedOffAt: null,
    rejectedReason: null,
  };
}

export type TransitionError =
  | "wrong_state"
  | "reviewer_cannot_be_author"
  | "founder_signoff_requires_review"
  | "content_changed_since_review";

export type TransitionResult =
  | { ok: true; record: ContentRecord }
  | { ok: false; error: TransitionError };

export function submitForReview(record: ContentRecord, byEmail: string, at: string): TransitionResult {
  if (record.state !== "draft" && record.state !== "rejected") return { ok: false, error: "wrong_state" };
  return {
    ok: true,
    record: {
      ...record,
      state: "in_review",
      rejectedReason: null,
      history: [...record.history, { at, event: "submitted for review", byEmail }],
    },
  };
}

/**
 * A specialist reviewer attests the content is clinically correct.
 *
 * The author cannot review their own content. That is not ceremony: the entire value of the
 * review is that a second person looked, and a workflow that permits self-review provides
 * the paper trail of a check that never happened.
 */
export function review(record: ContentRecord, byEmail: string, at: string): TransitionResult {
  if (record.state !== "in_review") return { ok: false, error: "wrong_state" };
  const author = record.history.find((h) => h.event === "drafted")?.byEmail;
  if (author !== undefined && author === byEmail) {
    return { ok: false, error: "reviewer_cannot_be_author" };
  }
  return {
    ok: true,
    record: {
      ...record,
      state: "reviewed",
      reviewedBy: byEmail,
      reviewedAt: at,
      history: [...record.history, { at, event: "reviewed by specialist", byEmail }],
    },
  };
}

export function reject(record: ContentRecord, reason: string, byEmail: string, at: string): TransitionResult {
  if (record.state === "signed_off") return { ok: false, error: "wrong_state" };
  return {
    ok: true,
    record: {
      ...record,
      state: "rejected",
      rejectedReason: reason,
      history: [...record.history, { at, event: `rejected: ${reason}`, byEmail }],
    },
  };
}

/**
 * Founder sign-off — the G5 gate itself.
 *
 * Requires a completed specialist review, and requires the content to be UNCHANGED since
 * that review: signing off text nobody reviewed is precisely the outcome the gate exists to
 * prevent, and an edit between review and sign-off is how that happens by accident.
 */
export function signOff(record: ContentRecord, founderEmail: string, at: string): TransitionResult {
  if (record.state !== "reviewed") {
    return { ok: false, error: record.reviewedAt === null ? "founder_signoff_requires_review" : "wrong_state" };
  }
  if (record.contentHash !== contentHash(record.body)) {
    return { ok: false, error: "content_changed_since_review" };
  }
  return {
    ok: true,
    record: {
      ...record,
      state: "signed_off",
      signedOffBy: founderEmail,
      signedOffAt: at,
      history: [...record.history, { at, event: "founder sign-off (G5)", byEmail: founderEmail }],
    },
  };
}

/**
 * Any edit resets the workflow to draft and clears both attestations.
 *
 * The alternative — editing in place while keeping a sign-off — would mean the founder's
 * approval silently transferred to text they never saw. Same reasoning as W67's content-hash
 * keying, applied to clinical content instead of message copy.
 */
export function amend(record: ContentRecord, body: string, byEmail: string, at: string): ContentRecord {
  return {
    ...record,
    body,
    contentHash: contentHash(body),
    state: "draft",
    reviewedBy: null,
    reviewedAt: null,
    signedOffBy: null,
    signedOffAt: null,
    history: [...record.history, { at, event: "amended — review and sign-off cleared", byEmail }],
  };
}

/**
 * The ONLY door from the workspace to the rest of the product.
 *
 * Returns null for anything not signed off, so a caller cannot obtain usable content by
 * mistake; there is no variant that returns the body regardless.
 */
export function usableContent(record: ContentRecord): ApprovedContent | null {
  if (record.state !== "signed_off" || record.signedOffAt === null) return null;
  if (record.contentHash !== contentHash(record.body)) return null; // tampered after sign-off
  return {
    record,
    body: record.body,
    conditionCode: record.conditionCode,
    kind: record.kind,
  } as ApprovedContent;
}

/** Everything usable in a workspace. Empty until the founder signs something off. */
export function usableFrom(records: readonly ContentRecord[]): ApprovedContent[] {
  return records.map(usableContent).filter((c): c is ApprovedContent => c !== null);
}

/**
 * The shipped workspace. EMPTY, and a test pins it: no clinical content exists in this tree,
 * so nothing is signed off and nothing is usable. The workspace is the deliverable; the
 * content waits for the founder.
 */
export const SHIPPED_WORKSPACE: readonly ContentRecord[] = [];
