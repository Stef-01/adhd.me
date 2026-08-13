// W126 verify gate: "replay reproduces every state transition."
//
// Tested over every PREFIX of the trail, for W110's reason: a fold that is only correct at the
// end is a fold that will be wrong the first time an auditor asks what the state was in March.
// The strong version is the last test in that block — it walks the whole trail one event at a
// time and checks the state after each, so a transition that replay silently drops shows up as
// a state that never changed.

import { describe, expect, it } from "vitest";
import { anchorOf, verifyLogAgainst, type EventLog } from "@/spine/spine";
import {
  appendAudit,
  EMPTY_AUDIT_LOG,
  explainAuditRejection,
  replayAudit,
  verifyAuditLog,
  verifyAuditLogAgainst,
  type AuditRejection,
  type PathwayAuditEvent,
  type PathwayAuditLog,
} from "./audit";

const P = "path-1";
const V = "hash-v1";

const base = { pathwayId: P, versionHash: V };

const EVENTS: PathwayAuditEvent[] = [
  { ...base, kind: "version_drafted", at: "2026-01-01", by: "author@x.example", ordinal: 1 },
  {
    ...base, kind: "attestation_recorded", at: "2026-01-03", by: "reviewer@x.example",
    attestation: "specialist_review", finding: "Placeholder review finding — fixture only.",
  },
  {
    ...base, kind: "attestation_recorded", at: "2026-01-04", by: "founder@x.example",
    attestation: "founder_sign_off", finding: "Placeholder sign-off finding — fixture only.",
  },
  { ...base, kind: "version_published", at: "2026-01-05", by: "author@x.example" },
  {
    ...base, kind: "binding_set", at: "2026-01-06", by: "owner@x.example",
    conditionCode: "placeholder_register_a",
  },
  {
    ...base, kind: "escalation_rule_set", at: "2026-01-07", by: "owner@x.example",
    factCode: "esc_a", action: "notify_usual_gp",
  },
];

function build(...events: PathwayAuditEvent[]): PathwayAuditLog {
  return events.reduce((log, event) => {
    const result = appendAudit(log, event);
    if (!result.ok) throw new Error(`refused ${event.kind}: ${result.reason}`);
    return result.log;
  }, EMPTY_AUDIT_LOG);
}

const only = (log: PathwayAuditLog) => {
  const version = replayAudit(log).versions[0];
  if (!version) throw new Error("expected one version");
  return version;
};

describe("W126 replay reproduces every state transition", () => {
  it("rebuilds the whole governance state from the trail alone", () => {
    const version = only(build(...EVENTS));
    expect(version).toMatchObject({
      pathwayId: P,
      versionHash: V,
      ordinal: 1,
      state: "published",
      draftedBy: "author@x.example",
      draftedAt: "2026-01-01",
      publishedBy: "author@x.example",
      publishedAt: "2026-01-05",
    });
    expect(version.attestations.map((a) => a.kind)).toEqual([
      "specialist_review",
      "founder_sign_off",
    ]);
    expect(version.binding).toEqual({
      conditionCode: "placeholder_register_a",
      by: "owner@x.example",
      at: "2026-01-06",
    });
    expect(version.escalationRules).toEqual([
      { factCode: "esc_a", action: "notify_usual_gp", by: "owner@x.example", at: "2026-01-07" },
    ]);
  });

  it("every prefix replays to the state that prefix implies", () => {
    // Walked one event at a time: a transition replay silently drops shows up here as a state
    // that never changed.
    const log = build(...EVENTS);
    const expected = [
      { state: "drafted", attestations: 0, binding: false, rules: 0 },
      { state: "drafted", attestations: 1, binding: false, rules: 0 },
      { state: "drafted", attestations: 2, binding: false, rules: 0 },
      { state: "published", attestations: 2, binding: false, rules: 0 },
      { state: "published", attestations: 2, binding: true, rules: 0 },
      { state: "published", attestations: 2, binding: true, rules: 1 },
    ];
    for (let n = 1; n <= log.length; n++) {
      const version = only(log.slice(0, n));
      expect(
        {
          state: version.state,
          attestations: version.attestations.length,
          binding: version.binding !== null,
          rules: version.escalationRules.length,
        },
        `after ${n} event(s)`,
      ).toEqual(expected[n - 1]);
    }
  });

  it("an empty trail replays to nothing, not to a default", () => {
    expect(replayAudit(EMPTY_AUDIT_LOG).versions).toEqual([]);
  });

  it("is a pure function of the trail", () => {
    const log = build(...EVENTS);
    expect(replayAudit(log)).toEqual(replayAudit(log));
  });

  it("keeps versions of the same pathway separate", () => {
    const log = build(
      EVENTS[0]!,
      { pathwayId: P, versionHash: "hash-v2", kind: "version_drafted", at: "2026-02-01", by: "author@x.example", ordinal: 2 },
      { pathwayId: P, versionHash: "hash-v2", kind: "version_published", at: "2026-02-02", by: "author@x.example" },
    );
    const replayed = replayAudit(log);
    expect(replayed.versions.map((v) => [v.versionHash, v.state])).toEqual([
      ["hash-v1", "drafted"],
      ["hash-v2", "published"],
    ]);
  });

  it("supersedes the version in force when a newer one is published (W129)", () => {
    // The finding: `superseded` was missing from this trail's state model, so a replaced
    // version still read as `published` and the trail disagreed with W118's own model.
    const log = build(
      EVENTS[0]!,
      { ...base, kind: "version_published", at: "2026-01-05", by: "author@x.example" },
      { pathwayId: P, versionHash: "hash-v2", kind: "version_drafted", at: "2026-02-01", by: "author@x.example", ordinal: 2 },
      { pathwayId: P, versionHash: "hash-v2", kind: "version_published", at: "2026-02-02", by: "author@x.example" },
    );
    const replayed = replayAudit(log);
    expect(replayed.versions.map((v) => [v.versionHash, v.state])).toEqual([
      ["hash-v1", "superseded"],
      ["hash-v2", "published"],
    ]);
    // At most one version of a pathway is in force at any instant — W118's own invariant.
    expect(replayed.versions.filter((v) => v.state === "published")).toHaveLength(1);
  });

  it("does not supersede a DIFFERENT pathway's version", () => {
    const log = build(
      EVENTS[0]!,
      { ...base, kind: "version_published", at: "2026-01-05", by: "author@x.example" },
      { pathwayId: "path-2", versionHash: "hash-other", kind: "version_drafted", at: "2026-02-01", by: "author@x.example", ordinal: 1 },
      { pathwayId: "path-2", versionHash: "hash-other", kind: "version_published", at: "2026-02-02", by: "author@x.example" },
    );
    expect(replayAudit(log).versions.map((v) => v.state)).toEqual(["published", "published"]);
  });

  it("a withdrawal after supersession does not resurrect the older version", () => {
    const log = build(
      EVENTS[0]!,
      { ...base, kind: "version_published", at: "2026-01-05", by: "author@x.example" },
      { pathwayId: P, versionHash: "hash-v2", kind: "version_drafted", at: "2026-02-01", by: "author@x.example", ordinal: 2 },
      { pathwayId: P, versionHash: "hash-v2", kind: "version_published", at: "2026-02-02", by: "author@x.example" },
      { pathwayId: P, versionHash: "hash-v2", kind: "version_withdrawn", at: "2026-03-01", by: "founder@x.example", reason: "Placeholder." },
    );
    const replayed = replayAudit(log);
    // Withdrawing the current version leaves NOTHING in force — bringing the old one back is
    // a fresh publication, not an automatic fallback.
    expect(replayed.versions.map((v) => [v.versionHash, v.state])).toEqual([
      ["hash-v1", "superseded"],
      ["hash-v2", "withdrawn"],
    ]);
  });

  it("records a version it never saw drafted rather than ignoring it", () => {
    // An audit trail that silently dropped an orphan event would hide exactly the anomaly an
    // auditor is looking for.
    const log = build({
      pathwayId: P, versionHash: "hash-orphan", kind: "version_published",
      at: "2026-01-01", by: "someone@x.example",
    });
    const version = only(log);
    expect(version.versionHash).toBe("hash-orphan");
    expect(version.draftedAt).toBeNull();
    expect(version.state).toBe("published");
  });
});

describe("W126 revocation and withdrawal are transitions, not deletions", () => {
  it("marks a revoked attestation instead of removing it", () => {
    // The review really did happen. An audit that cannot see a withdrawn sign-off cannot
    // answer why a pathway stopped being usable.
    const log = build(...EVENTS, {
      ...base, kind: "attestation_revoked", at: "2026-03-01", by: "founder@x.example",
      attestation: "founder_sign_off", reason: "Placeholder revocation reason.",
    });
    const version = only(log);
    expect(version.attestations).toHaveLength(2);
    const signOff = version.attestations.find((a) => a.kind === "founder_sign_off");
    expect(signOff).toMatchObject({
      revokedAt: "2026-03-01",
      revokedReason: "Placeholder revocation reason.",
      at: "2026-01-04",
    });
  });

  it("revokes the live attestation of that kind, not the first ever recorded", () => {
    const log = build(
      ...EVENTS,
      { ...base, kind: "attestation_revoked", at: "2026-03-01", by: "founder@x.example", attestation: "founder_sign_off", reason: "First revocation." },
      { ...base, kind: "attestation_recorded", at: "2026-03-02", by: "founder@x.example", attestation: "founder_sign_off", finding: "Re-signed after review." },
      { ...base, kind: "attestation_revoked", at: "2026-03-03", by: "founder@x.example", attestation: "founder_sign_off", reason: "Second revocation." },
    );
    const signOffs = only(log).attestations.filter((a) => a.kind === "founder_sign_off");
    expect(signOffs.map((a) => a.revokedReason)).toEqual(["First revocation.", "Second revocation."]);
  });

  it("keeps the draft and publish record after a withdrawal", () => {
    const log = build(...EVENTS, {
      ...base, kind: "version_withdrawn", at: "2026-04-01", by: "founder@x.example",
      reason: "Placeholder withdrawal reason.",
    });
    const version = only(log);
    expect(version.state).toBe("withdrawn");
    expect(version.publishedAt).toBe("2026-01-05");
    expect(version.withdrawnReason).toBe("Placeholder withdrawal reason.");
  });
});

describe("W126 the trail refuses what it cannot audit", () => {
  it.each<[Partial<PathwayAuditEvent>, AuditRejection]>([
    [{ by: "  " }, "attributed_to_nobody"],
    [{ at: "" }, "undated"],
  ])("refuses %o with %s", (over, expected) => {
    const event = { ...EVENTS[0]!, ...over } as PathwayAuditEvent;
    expect(appendAudit(EMPTY_AUDIT_LOG, event)).toEqual({ ok: false, reason: expected });
  });

  it("refuses an event dated before the one it follows", () => {
    const log = build(EVENTS[0]!);
    const backdated = { ...EVENTS[3]!, at: "2025-12-31" };
    expect(appendAudit(log, backdated)).toEqual({ ok: false, reason: "out_of_order" });
  });

  it("stores nothing when it refuses", () => {
    const log = build(EVENTS[0]!);
    expect(appendAudit(log, { ...EVENTS[1]!, by: "" }).ok).toBe(false);
    expect(log).toHaveLength(1);
  });

  it("explains every refusal it can produce", () => {
    for (const reason of ["attributed_to_nobody", "undated", "out_of_order"] as AuditRejection[]) {
      expect(explainAuditRejection(reason).length, reason).toBeGreaterThan(15);
    }
  });
});

describe("W126 on W10's spine, not an imitation of it", () => {
  it("is append-only: entries frozen, sequence contiguous", () => {
    const log = build(...EVENTS);
    expect(log.map((e) => e.seq)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(Object.isFrozen(log)).toBe(true);
    expect(() => {
      (log[0] as { at: string }).at = "1999-01-01";
    }).toThrow();
  });

  it("is verified by W10's own contiguity check", () => {
    const log = build(...EVENTS);
    expect(verifyAuditLog(log)).toBe(true);
    // An interior deletion breaks contiguity and is caught.
    expect(verifyAuditLog([log[0]!, log[2]!, log[3]!])).toBe(false);
  });

  it("detects truncation against an anchor, which W10 says is the only way it becomes visible", () => {
    const log = build(...EVENTS);
    const anchor = anchorOf(log as unknown as EventLog);
    expect(verifyAuditLogAgainst(log, anchor)).toEqual({ ok: true });
    // Dropping the tail leaves 0..n-k-1 perfectly contiguous — invisible without the anchor.
    const truncated = log.slice(0, 3);
    expect(verifyAuditLog(truncated)).toBe(true);
    expect(verifyAuditLogAgainst(truncated, anchor)).toEqual({
      ok: false,
      reason: "truncated",
      at: 3,
    });
  });

  it("uses the same function W10 uses, so the two cannot drift apart", () => {
    // The reason for generalising verifySequenceAgainst rather than copying four lines: an
    // integrity check that exists twice gets fixed once, and the copy then guarantees less.
    const log = build(...EVENTS);
    const anchor = anchorOf(log as unknown as EventLog);
    expect(verifyAuditLogAgainst(log.slice(0, 2), anchor)).toEqual(
      verifyLogAgainst(log.slice(0, 2) as unknown as EventLog, anchor),
    );
  });

  it("carries no patient identity at all", () => {
    // W110's rule. This trail is a CONTENT governance document a reviewer, regulator or
    // indemnifier may read; patient ids in it would make every reader of a pathway's history
    // a reader of who agreed to it. Consent has its own record, attached to the patient.
    const serialised = JSON.stringify(build(...EVENTS));
    expect(serialised).not.toContain("patientId");
    expect(serialised).not.toContain("consent");
    for (const event of EVENTS) {
      expect(Object.keys(event)).not.toContain("patientId");
    }
  });
});
