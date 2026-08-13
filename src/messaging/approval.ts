// W67: template approval workflow.
//
// A practice is legally the sender of these messages. Before any template text reaches a
// patient, someone at that practice with the authority to say so must have approved THAT
// EXACT text — not a template with the same name, not an earlier version of it.
//
// The design follows from one question: what happens when the code is wrong? Every
// mechanism here fails closed, because the alternative failure is an unapproved message
// arriving on a patient's phone, which cannot be recalled.
//
//   - Approval is keyed by CONTENT HASH, not by template name or a version counter. Editing
//     a template's text changes its hash and therefore silently revokes its approval. A
//     version number can be forgotten to bump; a hash cannot.
//   - `assertSendable` throws rather than returning a boolean, so a caller that forgets to
//     check the result still cannot send. A boolean that nobody reads is not a gate.
//   - Approval is per practice. One practice approving text grants nothing to another, for
//     the same reason W18 scopes everything else by membership.
//   - An approval can be withdrawn, and withdrawal is immediate and terminal for that
//     version. Re-approving requires a fresh act.

import { createHash } from "node:crypto";
import type { PracticeId } from "@/domain/types";

export interface TemplateApproval {
  practiceId: PracticeId;
  templateId: string;
  /** SHA-256 of the exact approved text. Identity IS the content. */
  contentHash: string;
  approvedByEmail: string;
  approvedAt: string;
  /** Set when withdrawn; a withdrawn approval never authorises a send again. */
  withdrawnAt: string | null;
  /** What the approver actually saw, kept so an audit can reconstruct the decision. */
  approvedText: string;
}

export function templateHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export type SendRefusal =
  | "no_approval_on_record"
  | "text_changed_since_approval"
  | "approval_withdrawn"
  | "approved_for_another_practice";

export interface ApprovalDecision {
  sendable: boolean;
  reason: SendRefusal | null;
  approval: TemplateApproval | null;
}

/**
 * Is this exact text approved for this practice?
 *
 * Deliberately returns the REASON, so the console can tell a practice manager "the wording
 * changed since it was approved" rather than a bare refusal — the difference between a
 * usable product and one people work around.
 */
export function evaluateSendable(
  approvals: readonly TemplateApproval[],
  practiceId: PracticeId,
  templateId: string,
  text: string,
): ApprovalDecision {
  const hash = templateHash(text);
  const forTemplate = approvals.filter((a) => a.templateId === templateId);

  // A LIVE approval is looked for first. Withdrawn records stay in the list as history, so
  // matching on hash alone would let an old withdrawal mask a later re-approval of the same
  // text — refusing a send the practice has explicitly authorised.
  const matching = forTemplate.filter(
    (a) => a.practiceId === practiceId && a.contentHash === hash,
  );
  const live = matching.find((a) => a.withdrawnAt === null);
  if (live) return { sendable: true, reason: null, approval: live };
  if (matching.length > 0) {
    // Report the most recent withdrawal, which is the one a manager will be asking about.
    // W167: tie-broken on the approver, so two withdrawals recorded at the same instant report
    // the same one whichever order the store returns them in. A manager asking "who withdrew
    // this" must not get a different name on a refresh.
    const latest = matching.reduce((a, b) => {
      const at = a.withdrawnAt ?? "";
      const bt = b.withdrawnAt ?? "";
      if (at === bt) return a.approvedByEmail <= b.approvedByEmail ? a : b;
      return at > bt ? a : b;
    });
    return { sendable: false, reason: "approval_withdrawn", approval: latest };
  }

  // Distinguish the three ways a send can be unapproved, because they need different fixes.
  const otherPractice = forTemplate.find(
    (a) => a.contentHash === hash && a.practiceId !== practiceId && a.withdrawnAt === null,
  );
  if (otherPractice) {
    return { sendable: false, reason: "approved_for_another_practice", approval: null };
  }
  const staleForPractice = forTemplate.find(
    (a) => a.practiceId === practiceId && a.withdrawnAt === null,
  );
  if (staleForPractice) {
    return { sendable: false, reason: "text_changed_since_approval", approval: staleForPractice };
  }
  return { sendable: false, reason: "no_approval_on_record", approval: null };
}

/**
 * The gate. Throws unless this exact text is approved for this practice.
 *
 * Callers on the send path use THIS, not `evaluateSendable`: a thrown error cannot be
 * ignored by forgetting to read a return value.
 */
export function assertSendable(
  approvals: readonly TemplateApproval[],
  practiceId: PracticeId,
  templateId: string,
  text: string,
): TemplateApproval {
  const decision = evaluateSendable(approvals, practiceId, templateId, text);
  if (!decision.sendable || decision.approval === null) {
    throw new Error(
      `template ${templateId} is not approved for ${practiceId}: ${decision.reason ?? "unknown"}`,
    );
  }
  return decision.approval;
}

export interface ApproveInput {
  practiceId: PracticeId;
  templateId: string;
  text: string;
  byEmail: string;
  at: string;
}

/**
 * Record an approval. Approving text that is already approved is a no-op rather than a
 * duplicate row, so a double-click cannot produce two records of one decision.
 */
export function approveTemplate(
  approvals: readonly TemplateApproval[],
  input: ApproveInput,
): TemplateApproval[] {
  const hash = templateHash(input.text);
  const existing = approvals.find(
    (a) =>
      a.practiceId === input.practiceId &&
      a.templateId === input.templateId &&
      a.contentHash === hash,
  );
  if (existing && existing.withdrawnAt === null) return [...approvals];

  // Re-approving previously withdrawn text opens a NEW record; the withdrawal stays as
  // history, because "this was withdrawn on the 3rd and re-approved on the 5th" is exactly
  // what an audit needs to see.
  return [
    ...approvals,
    {
      practiceId: input.practiceId,
      templateId: input.templateId,
      contentHash: hash,
      approvedByEmail: input.byEmail,
      approvedAt: input.at,
      withdrawnAt: null,
      approvedText: input.text,
    },
  ];
}

/** Withdraw every live approval for a template at a practice. */
export function withdrawApproval(
  approvals: readonly TemplateApproval[],
  practiceId: PracticeId,
  templateId: string,
  at: string,
): TemplateApproval[] {
  return approvals.map((a) =>
    a.practiceId === practiceId && a.templateId === templateId && a.withdrawnAt === null
      ? { ...a, withdrawnAt: at }
      : a,
  );
}

/** Plain-English refusal, for the console. */
export function explainRefusal(reason: SendRefusal): string {
  switch (reason) {
    case "no_approval_on_record":
      return "This message has not been approved yet. Someone at the practice needs to read and approve the exact wording before it can be sent.";
    case "text_changed_since_approval":
      return "The wording has changed since it was approved. Approve the new wording before sending.";
    case "approval_withdrawn":
      return "Approval for this wording was withdrawn. It needs to be approved again before sending.";
    case "approved_for_another_practice":
      return "This wording is approved at another practice, which does not approve it here. Your practice needs to approve it itself.";
  }
}
