// W113 (unit half): the ledger's scoping. The browser half lives in e2e/credentials.spec.ts.
//
// Cross-practice isolation is asserted here rather than in a browser for the reason W83 gave:
// a second practice is not reachable from one browser session, so driving it through the UI
// would be theatre. What a browser CAN show is that a colleague's record is absent from the
// page, and that is where that assertion lives.

import { beforeEach, describe, expect, it } from "vitest";
import {
  logFor,
  ownCredentials,
  practiceCredentials,
  recordEvent,
  resetLedger,
} from "./ledger";

const TODAY = "2026-08-10";

function seed(practiceId: string, credentialId: string, subject: string): void {
  recordEvent(practiceId, {
    kind: "submitted",
    at: "2026-01-10",
    credentialId,
    subjectClinicianId: subject,
    submittedBy: "manager@a.example",
  });
}

beforeEach(resetLedger);

describe("W113 a clinician's own record and nobody else's", () => {
  it("returns only the credentials whose subject is the clinician asked about", () => {
    seed("prac-a", "cred-1", "clin-1");
    seed("prac-a", "cred-2", "clin-2");
    expect(ownCredentials("prac-a", "clin-1", TODAY).map((c) => c.credentialId)).toEqual(["cred-1"]);
    expect(ownCredentials("prac-a", "clin-2", TODAY).map((c) => c.credentialId)).toEqual(["cred-2"]);
  });

  it("returns nothing for a clinician with no credentials, rather than everything", () => {
    // The failure a "filter afterwards" implementation produces when the filter is dropped.
    seed("prac-a", "cred-1", "clin-1");
    expect(ownCredentials("prac-a", "clin-nobody", TODAY)).toEqual([]);
  });

  it("does not reach across practices", () => {
    seed("prac-a", "cred-1", "clin-1");
    seed("prac-b", "cred-2", "clin-1"); // same clinician id, different practice
    expect(ownCredentials("prac-a", "clin-1", TODAY).map((c) => c.credentialId)).toEqual(["cred-1"]);
    expect(ownCredentials("prac-b", "clin-1", TODAY).map((c) => c.credentialId)).toEqual(["cred-2"]);
    expect(practiceCredentials("prac-a", TODAY)).toHaveLength(1);
  });

  it("an unknown practice reads as empty, not as an error or as another practice's log", () => {
    seed("prac-a", "cred-1", "clin-1");
    expect(logFor("prac-zzz")).toEqual([]);
    expect(practiceCredentials("prac-zzz", TODAY)).toEqual([]);
  });
});

describe("W113 the ledger appends through W110's rules", () => {
  it("refuses a transition the machine refuses, and stores nothing", () => {
    seed("prac-a", "cred-1", "clin-1");
    // Verify before check — W110 refuses it, so it must not reach storage either.
    const result = recordEvent("prac-a", {
      kind: "verified",
      at: "2026-01-20",
      credentialId: "cred-1",
      verifiedBy: "owner@a.example",
      expiresOn: null,
    });
    expect(result).toEqual({ ok: false, reason: "out_of_order" });
    expect(logFor("prac-a")).toHaveLength(1);
    expect(ownCredentials("prac-a", "clin-1", TODAY)[0]?.status).toBe("submitted");
  });

  it("refuses self-verification at the ledger, not just in the pure module", () => {
    seed("prac-a", "cred-1", "clin-1");
    recordEvent("prac-a", {
      kind: "checked", at: "2026-01-12", credentialId: "cred-1",
      checkedBy: "owner@a.example", examined: [],
    });
    expect(
      recordEvent("prac-a", {
        kind: "verified", at: "2026-01-14", credentialId: "cred-1",
        verifiedBy: "clin-1", expiresOn: null,
      }),
    ).toEqual({ ok: false, reason: "self_verification" });
  });

  it("withdrawal retracts the claim without deleting the history", () => {
    seed("prac-a", "cred-1", "clin-1");
    expect(
      recordEvent("prac-a", {
        kind: "withdrawn", at: "2026-02-01", credentialId: "cred-1",
        withdrawnBy: "clin-1", reason: "no longer accurate",
      }),
    ).toEqual({ ok: true });
    expect(logFor("prac-a").map((e) => e.kind)).toEqual(["submitted", "withdrawn"]);
    expect(ownCredentials("prac-a", "clin-1", TODAY)[0]).toMatchObject({
      status: "withdrawn",
      endedReason: "no longer accurate",
    });
  });

  it("keeps each practice's log append-only and independent", () => {
    seed("prac-a", "cred-1", "clin-1");
    seed("prac-b", "cred-2", "clin-2");
    expect(logFor("prac-a").map((e) => e.seq)).toEqual([0]);
    expect(logFor("prac-b").map((e) => e.seq)).toEqual([0]);
    seed("prac-a", "cred-3", "clin-1");
    expect(logFor("prac-a").map((e) => e.seq)).toEqual([0, 1]);
    expect(logFor("prac-b")).toHaveLength(1);
  });
});
