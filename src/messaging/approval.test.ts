// W67 verify gate: an unapproved template cannot be sent, fail-closed.
//
// Every test here is really the same question asked from a different angle: if this code is
// wrong, does an unapproved message reach a patient's phone? So the suite leans on the ways
// approval can silently lapse — an edit, a withdrawal, another practice's approval, a
// whitespace change — rather than on the happy path.

import { describe, expect, it } from "vitest";
import type { PracticeId } from "@/domain/types";
import {
  approveTemplate,
  assertSendable,
  evaluateSendable,
  explainRefusal,
  templateHash,
  withdrawApproval,
  type TemplateApproval,
} from "./approval";

import { foldIsOrderIndependent } from "@/quality/order-independence";

const A = "prac-a" as PracticeId;
const B = "prac-b" as PracticeId;
const TPL = "availability-invitation";
const TEXT = "Hi Sam, Dr Lee has appointments available. Reply STOP to opt out.";
const AT = "2026-08-10T09:00:00Z";

const approved = (text = TEXT, practiceId = A): TemplateApproval[] =>
  approveTemplate([], { practiceId, templateId: TPL, text, byEmail: "owner@x", at: AT });

describe("W167 two withdrawals at the same instant pick the same one", () => {
  it("the reported withdrawal does not change with row order", () => {
    // W167's register names this fold. `evaluateSendable` reports "the most recent withdrawal,
    // which is the one a manager will be asking about" — and with two recorded at the same
    // instant it used to report whichever the store listed first, so a manager asking who
    // withdrew this would get a different answer on a refresh.
    const at = "2026-08-11T00:00:00Z";
    const tied: TemplateApproval[] = ["zoe@x", "ada@x"].map((byEmail) => ({
      practiceId: A,
      templateId: TPL,
      contentHash: templateHash(TEXT),
      approvedByEmail: byEmail,
      approvedAt: AT,
      withdrawnAt: at,
      approvedText: TEXT,
    }));

    const result = foldIsOrderIndependent(
      (rows) => evaluateSendable(rows as TemplateApproval[], A, TPL, TEXT).approval?.approvedByEmail ?? null,
      tied,
    );
    expect(result.stable, `forward ${result.forward} vs reversed ${result.reversed}`).toBe(true);
    expect(result.forward).toBe("ada@x");
  });
});

describe("W67 nothing sends without an approval", () => {
  it("refuses with no approval on record", () => {
    const d = evaluateSendable([], A, TPL, TEXT);
    expect(d.sendable).toBe(false);
    expect(d.reason).toBe("no_approval_on_record");
  });

  it("assertSendable throws, so a caller who ignores the result still cannot send", () => {
    // A boolean nobody reads is not a gate. This is the send-path API for that reason.
    expect(() => assertSendable([], A, TPL, TEXT)).toThrow(/not approved/);
  });

  it("allows exactly the approved text", () => {
    expect(assertSendable(approved(), A, TPL, TEXT).approvedText).toBe(TEXT);
  });
});

describe("W67 approval is bound to the content, not the name", () => {
  it("editing the text silently revokes approval", () => {
    const edited = `${TEXT} Book now!`;
    const d = evaluateSendable(approved(), A, TPL, edited);
    expect(d.sendable).toBe(false);
    expect(d.reason).toBe("text_changed_since_approval");
    expect(() => assertSendable(approved(), A, TPL, edited)).toThrow();
  });

  it("even a whitespace-only change requires re-approval", () => {
    // Deliberate: "approximately the approved text" is not a standard anyone can audit.
    const d = evaluateSendable(approved(), A, TPL, `${TEXT} `);
    expect(d.reason).toBe("text_changed_since_approval");
  });

  it("the hash is of the content, so identical text approved anywhere hashes the same", () => {
    expect(templateHash(TEXT)).toBe(templateHash(TEXT));
    expect(templateHash(TEXT)).not.toBe(templateHash(`${TEXT}!`));
  });
});

describe("W67 approval is per practice", () => {
  it("one practice's approval grants nothing to another", () => {
    const d = evaluateSendable(approved(TEXT, B), A, TPL, TEXT);
    expect(d.sendable).toBe(false);
    expect(d.reason).toBe("approved_for_another_practice");
  });

  it("each practice approving separately lets each send", () => {
    let approvals = approved(TEXT, A);
    approvals = approveTemplate(approvals, { practiceId: B, templateId: TPL, text: TEXT, byEmail: "owner@b", at: AT });
    expect(evaluateSendable(approvals, A, TPL, TEXT).sendable).toBe(true);
    expect(evaluateSendable(approvals, B, TPL, TEXT).sendable).toBe(true);
  });
});

describe("W67 withdrawal is immediate and terminal for that version", () => {
  it("a withdrawn approval stops authorising sends", () => {
    const withdrawn = withdrawApproval(approved(), A, TPL, "2026-08-11T00:00:00Z");
    const d = evaluateSendable(withdrawn, A, TPL, TEXT);
    expect(d.sendable).toBe(false);
    expect(d.reason).toBe("approval_withdrawn");
    expect(() => assertSendable(withdrawn, A, TPL, TEXT)).toThrow(/approval_withdrawn/);
  });

  it("withdrawal does not reach another practice", () => {
    let approvals = approved(TEXT, A);
    approvals = approveTemplate(approvals, { practiceId: B, templateId: TPL, text: TEXT, byEmail: "owner@b", at: AT });
    approvals = withdrawApproval(approvals, A, TPL, "2026-08-11T00:00:00Z");
    expect(evaluateSendable(approvals, A, TPL, TEXT).sendable).toBe(false);
    expect(evaluateSendable(approvals, B, TPL, TEXT).sendable).toBe(true);
  });

  it("re-approving opens a new record and keeps the withdrawal as history", () => {
    let approvals = withdrawApproval(approved(), A, TPL, "2026-08-11T00:00:00Z");
    approvals = approveTemplate(approvals, { practiceId: A, templateId: TPL, text: TEXT, byEmail: "owner@x", at: "2026-08-12T00:00:00Z" });
    expect(approvals).toHaveLength(2);
    expect(approvals.filter((a) => a.withdrawnAt !== null)).toHaveLength(1);
    expect(evaluateSendable(approvals, A, TPL, TEXT).sendable).toBe(true);
  });
});

describe("W67 recording an approval", () => {
  it("is idempotent — a double-click does not record two decisions", () => {
    const once = approved();
    const twice = approveTemplate(once, { practiceId: A, templateId: TPL, text: TEXT, byEmail: "owner@x", at: AT });
    expect(twice).toHaveLength(1);
  });

  it("keeps what the approver actually saw", () => {
    // An audit has to be able to reconstruct the decision, not just that one happened.
    const [record] = approved();
    expect(record?.approvedText).toBe(TEXT);
    expect(record?.approvedByEmail).toBe("owner@x");
    expect(record?.contentHash).toBe(templateHash(TEXT));
  });
});

describe("W67 refusals are explained, not just refused", () => {
  it.each([
    ["no_approval_on_record", /has not been approved/],
    ["text_changed_since_approval", /wording has changed/],
    ["approval_withdrawn", /was withdrawn/],
    ["approved_for_another_practice", /approve it itself/],
  ] as const)("%s reads as something a practice manager can act on", (reason, shape) => {
    expect(explainRefusal(reason)).toMatch(shape);
  });
});
