// W112 verify gate: "an expired credential is ABSENT, never weak evidence; no-stated-expiry
// does not mean never expires."
//
// Both halves are tested as properties of the OUTPUT rather than of one call. "Absent" is
// only worth anything if there is no shape the result can take that carries an expired
// credential at all — so the tests below check the whole returned set, and check that the
// type has no room for the weakened form.

import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPIRY_POLICY,
  effectiveExpiry,
  liveCredentials,
  reattestationDue,
  reattestationSubmission,
  type ExpiryPolicy,
  type LiveCredential,
} from "./attestation";
import {
  appendVerification,
  EMPTY_VERIFICATION_LOG,
  replayVerification,
  type CredentialLifecycle,
  type ReplayedVerification,
  type VerificationEvent,
  type VerificationLog,
} from "./verification";

function build(...events: VerificationEvent[]): VerificationLog {
  return events.reduce((log, event) => {
    const result = appendVerification(log, event);
    if (!result.ok) throw new Error(`refused ${event.kind}: ${result.reason}`);
    return result.log;
  }, EMPTY_VERIFICATION_LOG);
}

/** A credential taken all the way to verified, with whatever expiry the caller wants. */
function verifiedLog(
  over: { id?: string; subject?: string; expiresOn?: string | null; supersedes?: string } = {},
): VerificationLog {
  const id = over.id ?? "cred-1";
  const subject = over.subject ?? "clin-1";
  return build(
    {
      kind: "submitted",
      at: "2026-01-10",
      credentialId: id,
      subjectClinicianId: subject,
      submittedBy: "manager@a.example",
      ...(over.supersedes ? { supersedes: over.supersedes } : {}),
    },
    { kind: "checked", at: "2026-01-12", credentialId: id, checkedBy: "owner@a.example", examined: [] },
    {
      kind: "verified",
      at: "2026-01-14",
      credentialId: id,
      verifiedBy: "owner@a.example",
      expiresOn: over.expiresOn === undefined ? "2026-12-31" : over.expiresOn,
    },
  );
}

const at = (log: VerificationLog, asOf: string): ReplayedVerification =>
  replayVerification(log, asOf);

const only = (replayed: ReplayedVerification): CredentialLifecycle => {
  const record = replayed.credentials[0];
  if (!record) throw new Error("expected one credential");
  return record;
};

describe("W112 an expired credential is absent, never weak evidence", () => {
  it("is returned while live and simply not returned once expired", () => {
    const log = verifiedLog({ expiresOn: "2026-12-31" });
    expect(liveCredentials(at(log, "2026-12-31")).map((c) => c.credentialId)).toEqual(["cred-1"]);
    expect(liveCredentials(at(log, "2027-01-01"))).toEqual([]);
  });

  it("the result carries no expired credential in ANY form", () => {
    // The gate's real content. Not "the flag says expired" — nothing about it comes back.
    const log = verifiedLog({ expiresOn: "2026-06-30" });
    const serialised = JSON.stringify(liveCredentials(at(log, "2027-01-01")));
    expect(serialised).toBe("[]");
    expect(serialised).not.toContain("cred-1");
    expect(serialised).not.toContain("expired");
  });

  it("has no type that could carry one — a consumer cannot forge currency", () => {
    // Every field below is a plain literal of the right type, so the ONLY thing wrong with
    // this object is the missing brand. That matters: if a field were `string | null` the
    // directive would be satisfied by the nullability and prove nothing about the brand. The
    // type is imported for the same reason — annotating an un-imported name passes on
    // "cannot find name". Both are the W65 trap, where a green test checks nothing.
    // @ts-expect-error — LiveCredential is branded; knowing its fields is not enough.
    const forged: LiveCredential = {
      credentialId: "cred-1",
      subjectClinicianId: "clin-1",
      verifiedBy: "owner@a.example",
      verifiedOn: "2026-01-14",
      expiresOn: "2026-06-30",
      expiryStated: true,
    };
    expect(forged).toBeDefined();
  });

  it("excludes everything short of verified, not just the expired", () => {
    const submitted = build({
      kind: "submitted",
      at: "2026-01-10",
      credentialId: "cred-2",
      subjectClinicianId: "clin-2",
      submittedBy: "manager@a.example",
    });
    const checked = build(
      {
        kind: "submitted",
        at: "2026-01-10",
        credentialId: "cred-3",
        subjectClinicianId: "clin-3",
        submittedBy: "manager@a.example",
      },
      { kind: "checked", at: "2026-01-12", credentialId: "cred-3", checkedBy: "o@a.example", examined: [] },
    );
    const withdrawnLog = build(
      {
        kind: "submitted",
        at: "2026-01-10",
        credentialId: "cred-4",
        subjectClinicianId: "clin-4",
        submittedBy: "manager@a.example",
      },
      { kind: "withdrawn", at: "2026-01-11", credentialId: "cred-4", withdrawnBy: "o", reason: "x" },
    );
    for (const log of [submitted, checked, withdrawnLog]) {
      expect(liveCredentials(at(log, "2026-02-01"))).toEqual([]);
    }
  });

  it("expires at the boundary the same way W110's status does", () => {
    // Two code paths now decide expiry — W110's status and this module's effective date.
    // They must not disagree, or a credential is live in one reader and gone in another.
    const log = verifiedLog({ expiresOn: "2026-06-30" });
    for (const day of ["2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02"]) {
      const replayed = at(log, day);
      const statusSaysLive = only(replayed).status === "verified";
      const setSaysLive = liveCredentials(replayed).length === 1;
      expect(setSaysLive, `disagreement on ${day}`).toBe(statusSaysLive);
    }
  });
});

describe("W112 no stated expiry does not mean never expires", () => {
  const policy: ExpiryPolicy = { unstatedLifetimeDays: 3 * 365, noticeDays: 90 };

  it("derives an expiry from the verification date", () => {
    const lifecycle = only(at(verifiedLog({ expiresOn: null }), "2026-06-01"));
    expect(effectiveExpiry(lifecycle, policy)).toEqual({ on: "2029-01-13", stated: false });
  });

  it("says the date was derived, so nothing disappears silently", () => {
    const stated = only(at(verifiedLog({ expiresOn: "2026-12-31" }), "2026-06-01"));
    expect(effectiveExpiry(stated, policy)?.stated).toBe(true);
    const unstated = only(at(verifiedLog({ expiresOn: null }), "2026-06-01"));
    expect(effectiveExpiry(unstated, policy)?.stated).toBe(false);
    // And it travels onto the live credential, so a consumer shows what it is acting on.
    expect(liveCredentials(at(verifiedLog({ expiresOn: null }), "2026-06-01"), policy)[0]).toMatchObject({
      expiresOn: "2029-01-13",
      expiryStated: false,
    });
  });

  it("goes absent past the derived date, exactly like a stated one", () => {
    // The gate in one line: W110 leaves this credential `verified` forever; W112 does not.
    const log = verifiedLog({ expiresOn: null });
    expect(only(at(log, "2099-01-01")).status).toBe("verified");
    expect(liveCredentials(at(log, "2029-01-13"), policy)).toHaveLength(1);
    expect(liveCredentials(at(log, "2029-01-14"), policy)).toEqual([]);
    expect(liveCredentials(at(log, "2099-01-01"), policy)).toEqual([]);
  });

  it("returns no expiry for a credential that was never verified", () => {
    // Distinct from "expires far away" — there is nothing to compute from.
    const log = build({
      kind: "submitted",
      at: "2026-01-10",
      credentialId: "cred-9",
      subjectClinicianId: "clin-9",
      submittedBy: "manager@a.example",
    });
    expect(effectiveExpiry(only(at(log, "2026-02-01")), policy)).toBeNull();
  });

  it("a shorter policy only ever removes credentials — safe under any founder ruling", () => {
    // The default is administration, not clinical content, but it is still the founder's to
    // set. This pins the direction of the asymmetry the default was chosen on.
    const log = verifiedLog({ expiresOn: null });
    const asOf = at(log, "2028-01-01");
    const short = liveCredentials(asOf, { unstatedLifetimeDays: 365, noticeDays: 90 });
    const long = liveCredentials(asOf, { unstatedLifetimeDays: 10 * 365, noticeDays: 90 });
    expect(short).toEqual([]);
    expect(long).toHaveLength(1);
  });
});

describe("W112 re-attestation", () => {
  it("gives notice before expiry rather than after", () => {
    const log = verifiedLog({ expiresOn: "2026-12-31" });
    expect(reattestationDue(at(log, "2026-09-01"))).toEqual([]);
    const soon = reattestationDue(at(log, "2026-10-05"));
    expect(soon.map((d) => [d.credentialId, d.urgency])).toEqual([["cred-1", "due_soon"]]);
  });

  it("keeps raising a lapsed credential — absent is not forgotten", () => {
    // The counterweight to absolute expiry: a credential that just vanishes is a support
    // ticket, so the thing that vanished still appears on the work list.
    const log = verifiedLog({ expiresOn: "2026-12-31" });
    const lapsed = reattestationDue(at(log, "2027-03-01"));
    expect(lapsed.map((d) => d.urgency)).toEqual(["lapsed"]);
    expect(liveCredentials(at(log, "2027-03-01"))).toEqual([]);
  });

  it("raises a derived expiry as well as a stated one, and says which", () => {
    const log = verifiedLog({ expiresOn: null });
    const due = reattestationDue(at(log, "2029-01-01"));
    expect(due).toEqual([
      {
        credentialId: "cred-1",
        subjectClinicianId: "clin-1",
        urgency: "due_soon",
        expiresOn: "2029-01-13",
        expiryStated: false,
      },
    ]);
  });

  it("stops raising one that a live successor has renewed", () => {
    const log = build(
      ...verifiedLog({ id: "cred-1", expiresOn: "2026-12-31" }).map((e) => e as VerificationEvent),
      {
        kind: "submitted",
        at: "2026-11-01",
        credentialId: "cred-1b",
        subjectClinicianId: "clin-1",
        submittedBy: "manager@a.example",
        supersedes: "cred-1",
      },
      { kind: "checked", at: "2026-11-02", credentialId: "cred-1b", checkedBy: "owner@a.example", examined: [] },
      {
        kind: "verified",
        at: "2026-11-03",
        credentialId: "cred-1b",
        verifiedBy: "owner@a.example",
        expiresOn: "2028-12-31",
      },
    );
    const due = reattestationDue(at(log, "2026-12-01"));
    expect(due).toEqual([]);
    // The renewal is what counts now; the predecessor is simply gone once its date passes.
    expect(liveCredentials(at(log, "2027-06-01")).map((c) => c.credentialId)).toEqual(["cred-1b"]);
  });

  it("keeps raising one whose replacement never got verified", () => {
    const log = build(
      ...verifiedLog({ id: "cred-1", expiresOn: "2026-12-31" }).map((e) => e as VerificationEvent),
      {
        kind: "submitted",
        at: "2026-11-01",
        credentialId: "cred-1b",
        subjectClinicianId: "clin-1",
        submittedBy: "manager@a.example",
        supersedes: "cred-1",
      },
    );
    // A submitted-but-unverified renewal must not silence the warning — that is exactly how a
    // credential lapses while everyone believes it was handled.
    expect(reattestationDue(at(log, "2026-12-01")).map((d) => d.credentialId)).toEqual(["cred-1"]);
  });

  it("builds a renewal that names its predecessor rather than reopening it", () => {
    const previous = only(at(verifiedLog({ expiresOn: "2026-12-31" }), "2026-11-01"));
    const event = reattestationSubmission({
      previous,
      newCredentialId: "cred-1b",
      submittedBy: "manager@a.example",
      at: "2026-11-01",
    });
    expect(event).toEqual({
      kind: "submitted",
      at: "2026-11-01",
      credentialId: "cred-1b",
      subjectClinicianId: "clin-1",
      submittedBy: "manager@a.example",
      supersedes: "cred-1",
    });
    // And the predecessor's own history is untouched by the renewal.
    const log = build(
      ...verifiedLog({ expiresOn: "2026-12-31" }).map((e) => e as VerificationEvent),
      event,
    );
    const old = at(log, "2026-11-02").credentials.find((c) => c.credentialId === "cred-1");
    expect(old?.verifiedOn).toBe("2026-01-14");
    expect(old?.status).toBe("verified");
  });

  it("the default policy gives a quarter's notice and a three-year unstated life", () => {
    expect(DEFAULT_EXPIRY_POLICY).toEqual({ unstatedLifetimeDays: 1095, noticeDays: 90 });
  });
});
