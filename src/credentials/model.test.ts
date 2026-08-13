// W108 verify gate: no credential is representable without a verifier and a date.
//
// The gate is a modelling claim, so it is tested two ways: the TYPE refuses to describe an
// unverified credential (checked at compile time, below), and the constructor refuses to
// build one. Only the second can be asserted at runtime, but both matter — a rule the
// compiler holds cannot be forgotten at a call site under deadline.

import { describe, expect, it } from "vitest";
import {
  explainRejection,
  recordCredential,
  type CredentialEvidence,
  type CredentialInput,
  type CredentialRecord,
} from "./model";

const TODAY = "2026-08-10";

const evidence = (over: Partial<CredentialEvidence> = {}): CredentialEvidence => ({
  documentRef: "vault/doc-1",
  describedAs: "Certificate issued by the accrediting body",
  documentDate: "2026-01-15",
  ...over,
});

const input = (over: Partial<CredentialInput> = {}): CredentialInput => ({
  id: "cred-1",
  practiceId: "prac-1",
  clinicianId: "clin-1",
  issuer: { code: "ISSUER-1", displayName: "Example Accrediting Body", reference: "REF-9" },
  scope: { kind: "general" },
  verifiedBy: "registrar@example.org",
  verifiedOn: "2026-02-01",
  evidence: [evidence()],
  expiresOn: "2028-02-01",
  ...over,
});

describe("W108 the type requires provenance", () => {
  it("a well-formed credential records who checked, when, and what they saw", () => {
    const result = recordCredential(input(), TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.credential.verifiedBy).toBe("registrar@example.org");
    expect(result.credential.verifiedOn).toBe("2026-02-01");
    expect(result.credential.evidence).toHaveLength(1);
  });

  it("verifiedBy and verifiedOn are non-optional in the type", () => {
    // Compile-time half of the gate: omitting either is a type error, not a lint warning.
    // @ts-expect-error — a credential without a verifier is not representable.
    const missingVerifier: CredentialRecord = { ...(input() as unknown as CredentialRecord), verifiedBy: undefined };
    // @ts-expect-error — nor is one without a verification date.
    const missingDate: CredentialRecord = { ...(input() as unknown as CredentialRecord), verifiedOn: undefined };
    expect(missingVerifier).toBeDefined();
    expect(missingDate).toBeDefined();
  });
});

describe("W108 refusals", () => {
  it.each([
    ["an absent verifier", { verifiedBy: "  " }, "verifier_missing"],
    ["an unreadable date", { verifiedOn: "Feb 2026" }, "verified_date_missing_or_unreadable"],
    ["a future verification", { verifiedOn: "2027-01-01" }, "verified_in_the_future"],
    ["no evidence at all", { evidence: [] }, "no_evidence"],
    ["evidence with no reference", { evidence: [evidence({ documentRef: "" })] }, "evidence_without_reference"],
    ["an unnamed issuer", { issuer: { code: "", displayName: "", reference: null } }, "issuer_missing"],
    ["expiry before verification", { expiresOn: "2025-01-01" }, "expiry_before_verification"],
  ])("refuses %s", (_label, over, expected) => {
    const result = recordCredential(input(over), TODAY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain(expected);
  });

  it("refuses self-verification — the W69 rule, applied to credentials", () => {
    // A workflow permitting self-verification produces the paper trail of a check that never
    // happened, which is worse than no check because it looks like one.
    const result = recordCredential(input({ verifiedBy: "clin-1" }), TODAY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("self_verified");
  });

  it("reports every problem at once, not the first", () => {
    const result = recordCredential(
      input({ verifiedBy: "", verifiedOn: "nonsense", evidence: [] }),
      TODAY,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.sort()).toEqual([
      "no_evidence", "verified_date_missing_or_unreadable", "verifier_missing",
    ]);
  });

  it("every refusal explains what to do about it", () => {
    const reasons = [
      "issuer_missing", "verifier_missing", "verified_date_missing_or_unreadable",
      "verified_in_the_future", "self_verified", "no_evidence",
      "evidence_without_reference", "expiry_before_verification",
    ] as const;
    for (const reason of reasons) {
      expect(explainRejection(reason).length).toBeGreaterThan(20);
    }
  });
});

describe("W108 what it deliberately does not decide", () => {
  it("accepts a credential with no stated expiry, without calling it permanent", () => {
    // W88 already ruled that "no stated expiry" is not "never expires" and charged it a
    // staleness cost. This model records the null and leaves that judgement where it lives.
    const result = recordCredential(input({ expiresOn: null }), TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.credential.expiresOn).toBeNull();
  });

  it("does not judge whether the credential is sufficient for anything", () => {
    // Sufficiency is W82's competence floor and W111's register check. This is the record.
    const result = recordCredential(input({ scope: { kind: "condition", conditionCode: "placeholder_register_a" } }), TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.credential)).not.toContain("sufficient");
    expect(Object.keys(result.credential)).not.toContain("level");
  });

  it("keeps evidence as a REFERENCE, so a credential can be read without vault access", () => {
    const result = recordCredential(input(), TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialised = JSON.stringify(result.credential);
    expect(serialised).toContain("vault/doc-1");
    // The document itself never lives here.
    expect(serialised).not.toContain("base64");
    expect(result.credential.evidence[0]).not.toHaveProperty("content");
  });
});
