// W110 verify gate: "replay; self-verification refused (W69 rule)."
//
// Replay is tested as a property rather than on one happy path: every PREFIX of a log must
// replay to the state that prefix implies, because a fold that is only correct at the end is
// a fold that will be wrong the first time someone asks what the state was on Tuesday.
//
// Self-verification is tested by exhaustion rather than by example. One test showing a
// clinician cannot verify themselves proves that one call refuses. What the unit claims is
// that no reachable log contains it, so the search below drives every state through every
// event kind and asserts it.

import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  appendVerification,
  EMPTY_VERIFICATION_LOG,
  explainRefusal,
  replayVerification,
  verifiedProvenance,
  type LifecycleState,
  type TransitionRefusal,
  type VerificationEvent,
  type VerificationLog,
} from "./verification";

const CRED = "cred-1";
const SUBJECT = "clin-1";

const submitted = (over: Partial<Extract<VerificationEvent, { kind: "submitted" }>> = {}) =>
  ({
    kind: "submitted",
    at: "2026-01-10",
    credentialId: CRED,
    subjectClinicianId: SUBJECT,
    submittedBy: "manager@a.example",
    ...over,
  }) as VerificationEvent;

const checked = (over: Partial<Extract<VerificationEvent, { kind: "checked" }>> = {}) =>
  ({
    kind: "checked",
    at: "2026-01-12",
    credentialId: CRED,
    checkedBy: "owner@a.example",
    examined: ["ev_00000000deadbeef"],
    ...over,
  }) as VerificationEvent;

const verified = (over: Partial<Extract<VerificationEvent, { kind: "verified" }>> = {}) =>
  ({
    kind: "verified",
    at: "2026-01-14",
    credentialId: CRED,
    verifiedBy: "owner@a.example",
    expiresOn: "2027-01-14",
    ...over,
  }) as VerificationEvent;

const rejected = (over: Partial<Extract<VerificationEvent, { kind: "rejected" }>> = {}) =>
  ({
    kind: "rejected",
    at: "2026-01-13",
    credentialId: CRED,
    rejectedBy: "owner@a.example",
    reason: "certificate did not match the register",
    ...over,
  }) as VerificationEvent;

const withdrawn = (over: Partial<Extract<VerificationEvent, { kind: "withdrawn" }>> = {}) =>
  ({
    kind: "withdrawn",
    at: "2026-01-13",
    credentialId: CRED,
    withdrawnBy: "clin-1",
    reason: "superseded",
    ...over,
  }) as VerificationEvent;

const SAMPLE: Record<VerificationEvent["kind"], () => VerificationEvent> = {
  submitted,
  checked,
  verified,
  rejected,
  withdrawn,
};

/** Append a run of events, failing loudly on the first refusal. */
function build(...events: VerificationEvent[]): VerificationLog {
  return events.reduce((log, event) => {
    const result = appendVerification(log, event);
    if (!result.ok) throw new Error(`refused ${event.kind}: ${result.reason}`);
    return result.log;
  }, EMPTY_VERIFICATION_LOG);
}

describe("W110 replay", () => {
  it("every prefix replays to the state that prefix implies", () => {
    const log = build(submitted(), checked(), verified());
    const expected: readonly string[] = ["submitted", "checked", "verified"];
    for (let n = 1; n <= log.length; n++) {
      const prefix = log.slice(0, n);
      const state = replayVerification(prefix, "2026-06-01");
      expect(state.credentials, `prefix of ${n}`).toHaveLength(1);
      expect(state.credentials[0]?.status, `prefix of ${n}`).toBe(expected[n - 1]);
    }
  });

  it("an empty log replays to nothing, not to a default", () => {
    expect(replayVerification(EMPTY_VERIFICATION_LOG, "2026-06-01").credentials).toEqual([]);
  });

  it("is a pure function of the log — same input, same answer, twice", () => {
    const log = build(submitted(), checked(), verified());
    expect(replayVerification(log, "2026-06-01")).toEqual(replayVerification(log, "2026-06-01"));
  });

  it("the log is append-only: entries are frozen and sequence numbers are contiguous", () => {
    const log = build(submitted(), checked(), verified());
    expect(log.map((e) => e.seq)).toEqual([0, 1, 2]);
    expect(Object.isFrozen(log)).toBe(true);
    expect(() => {
      (log[0] as { at: string }).at = "1999-01-01";
    }).toThrow();
  });

  it("appending never mutates the log it was given", () => {
    const first = build(submitted());
    const second = appendVerification(first, checked());
    expect(second.ok && second.log).toHaveLength(2);
    expect(first).toHaveLength(1);
  });

  it("carries the whole provenance chain, not just the outcome", () => {
    const log = build(submitted(), checked(), verified());
    const record = replayVerification(log, "2026-06-01").credentials[0];
    expect(record).toMatchObject({
      credentialId: CRED,
      subjectClinicianId: SUBJECT,
      submittedBy: "manager@a.example",
      checkedBy: "owner@a.example",
      checkedOn: "2026-01-12",
      verifiedBy: "owner@a.example",
      verifiedOn: "2026-01-14",
      examined: ["ev_00000000deadbeef"],
    });
  });

  it("replays several credentials independently from one log", () => {
    const log = build(
      submitted(),
      submitted({ credentialId: "cred-2", subjectClinicianId: "clin-2" }),
      checked(),
      checked({ credentialId: "cred-2" }),
      verified(),
    );
    const state = replayVerification(log, "2026-06-01");
    expect(state.credentials.map((c) => [c.credentialId, c.status])).toEqual([
      ["cred-1", "verified"],
      ["cred-2", "checked"],
    ]);
  });
});

describe("W110 self-verification is unreachable, not discouraged", () => {
  it("the subject cannot check their own credential", () => {
    const log = build(submitted());
    const result = appendVerification(log, checked({ checkedBy: SUBJECT }));
    expect(result).toEqual({ ok: false, reason: "self_verification" });
  });

  it("the subject cannot verify their own credential", () => {
    const log = build(submitted(), checked());
    const result = appendVerification(log, verified({ verifiedBy: SUBJECT }));
    expect(result).toEqual({ ok: false, reason: "self_verification" });
  });

  it("surrounding whitespace does not get anyone around it", () => {
    const log = build(submitted(), checked());
    expect(appendVerification(log, verified({ verifiedBy: `  ${SUBJECT} ` }))).toEqual({
      ok: false,
      reason: "self_verification",
    });
  });

  it("NO reachable log replays to a credential verified by its own subject", () => {
    // The claim the unit actually makes. Breadth-first over every event kind from every
    // reachable state, to a depth that covers the whole machine several times over.
    const actors = [SUBJECT, "owner@a.example"];
    let frontier: VerificationLog[] = [EMPTY_VERIFICATION_LOG];
    const statusesSeen = new Set<string>();

    for (let depth = 0; depth < 5; depth++) {
      const next: VerificationLog[] = [];
      for (const log of frontier) {
        for (const kind of Object.keys(SAMPLE) as VerificationEvent["kind"][]) {
          for (const actor of actors) {
            const base = SAMPLE[kind]();
            const event = {
              ...base,
              ...(kind === "checked" ? { checkedBy: actor } : {}),
              ...(kind === "verified" ? { verifiedBy: actor } : {}),
            } as VerificationEvent;
            const result = appendVerification(log, event);
            if (!result.ok) continue;
            for (const record of replayVerification(result.log, "2026-01-20").credentials) {
              statusesSeen.add(record.status);
              expect(record.verifiedBy, `subject verified itself in ${JSON.stringify(result.log)}`)
                .not.toBe(record.subjectClinicianId);
              expect(record.checkedBy).not.toBe(record.subjectClinicianId);
            }
            next.push(result.log);
          }
        }
      }
      frontier = next;
    }
    // Guards the search itself. A count would be a number picked to match today's machine; a
    // machine that refused everything interesting would still hit a small one. What matters
    // is that the search REACHED every state — including `verified`, the state the property
    // is about — so the assertions above ran somewhere that mattered.
    expect([...statusesSeen].sort()).toEqual([
      "checked",
      "rejected",
      "submitted",
      "verified",
      "withdrawn",
    ]);
  });
});

describe("W116 a duplicate submission cannot erase a verification", () => {
  it("replay ignores a second submitted rather than resetting the record", () => {
    // Unreachable through appendVerification, which refuses it — but replayVerification is
    // exported and total over ANY log, including one rehydrated from storage later, and the
    // failure mode of a reset is silent loss of the provenance the log exists to keep.
    const clean = build(submitted(), checked(), verified());
    const tampered = [...clean, { ...submitted(), seq: clean.length }] as VerificationLog;
    const record = replayVerification(tampered, "2026-06-01").credentials[0];
    expect(record?.status).toBe("verified");
    expect(record?.verifiedBy).toBe("owner@a.example");
    expect(record?.verifiedOn).toBe("2026-01-14");
  });

  it("appendVerification still refuses to create such a log in the first place", () => {
    expect(appendVerification(build(submitted()), submitted())).toEqual({
      ok: false,
      reason: "out_of_order",
    });
  });
});

describe("W110 the state machine", () => {
  it("the declared table IS the behaviour, for every state and every event", () => {
    // Drives each state through all five event kinds and compares what was accepted against
    // ALLOWED_TRANSITIONS. A table that drifts from the code stops being documentation.
    const reach: Record<LifecycleState, () => VerificationLog> = {
      none: () => EMPTY_VERIFICATION_LOG,
      submitted: () => build(submitted()),
      checked: () => build(submitted(), checked()),
      verified: () => build(submitted(), checked(), verified()),
      rejected: () => build(submitted(), rejected()),
      withdrawn: () => build(submitted(), withdrawn()),
    };

    for (const [state, reachIt] of Object.entries(reach) as [LifecycleState, () => VerificationLog][]) {
      const log = reachIt();
      const accepted = (Object.keys(SAMPLE) as VerificationEvent["kind"][]).filter((kind) => {
        // Later timestamps so the ordering rule never masks a transition rule.
        const event = { ...SAMPLE[kind](), at: "2026-03-01" } as VerificationEvent;
        return appendVerification(log, event).ok;
      });
      expect(accepted.sort(), `state ${state}`).toEqual([...ALLOWED_TRANSITIONS[state]].sort());
    }
  });

  it("verification requires a check — there is no path from submitted straight to verified", () => {
    const log = build(submitted());
    expect(appendVerification(log, verified())).toEqual({ ok: false, reason: "out_of_order" });
  });

  it("rejected and withdrawn are terminal", () => {
    for (const ending of [rejected(), withdrawn()]) {
      const log = build(submitted(), ending);
      for (const kind of Object.keys(SAMPLE) as VerificationEvent["kind"][]) {
        const event = { ...SAMPLE[kind](), at: "2026-03-01" } as VerificationEvent;
        expect(appendVerification(log, event), `${ending.kind} then ${kind}`).toEqual({
          ok: false,
          reason: "terminal",
        });
      }
    }
  });

  it("refuses a step dated before the one it follows", () => {
    const log = build(submitted(), checked());
    expect(appendVerification(log, verified({ at: "2026-01-11" }))).toEqual({
      ok: false,
      reason: "timestamp_before_previous",
    });
  });

  it("refuses an event with no credential", () => {
    expect(appendVerification(EMPTY_VERIFICATION_LOG, submitted({ credentialId: " " }))).toEqual({
      ok: false,
      reason: "credential_missing",
    });
  });

  it("explains every refusal it can produce", () => {
    const reasons: TransitionRefusal[] = [
      "out_of_order",
      "self_verification",
      "terminal",
      "timestamp_before_previous",
      "credential_missing",
    ];
    for (const reason of reasons) {
      expect(explainRefusal(reason).length, reason).toBeGreaterThan(10);
    }
  });
});

describe("W110 expiry is computed, never transitioned", () => {
  it("has no expire event at all — nothing has to run for a credential to expire", () => {
    // The property, asserted where it lives: the event union's kinds.
    expect(Object.keys(SAMPLE).sort()).toEqual([
      "checked",
      "rejected",
      "submitted",
      "verified",
      "withdrawn",
    ]);
  });

  it("the same log reads verified before the date and expired after it", () => {
    const log = build(submitted(), checked(), verified({ expiresOn: "2026-06-30" }));
    expect(replayVerification(log, "2026-06-29").credentials[0]?.status).toBe("verified");
    expect(replayVerification(log, "2026-06-30").credentials[0]?.status).toBe("verified");
    expect(replayVerification(log, "2026-07-01").credentials[0]?.status).toBe("expired");
  });

  it("no stated expiry does not mean never expires — it means no date to compare", () => {
    // W88 drew this line and W108 restated it. Here it means the status stays `verified` and
    // the null travels with it, so W112 can apply its own rule rather than inherit a guess.
    const log = build(submitted(), checked(), verified({ expiresOn: null }));
    const record = replayVerification(log, "2099-01-01").credentials[0];
    expect(record?.status).toBe("verified");
    expect(record?.expiresOn).toBeNull();
  });

  it("an expired credential hands back NO provenance, not weaker provenance", () => {
    const log = build(submitted(), checked(), verified({ expiresOn: "2026-06-30" }));
    const live = replayVerification(log, "2026-06-01").credentials[0];
    const dead = replayVerification(log, "2026-07-01").credentials[0];
    expect(live && verifiedProvenance(live)).toEqual({
      verifiedBy: "owner@a.example",
      verifiedOn: "2026-01-14",
    });
    // The W88 rule: void, not stale. Downstream gets nothing to soften.
    expect(dead && verifiedProvenance(dead)).toBeNull();
  });

  it("gives no provenance for anything short of verified", () => {
    for (const log of [build(submitted()), build(submitted(), checked()), build(submitted(), rejected())]) {
      const record = replayVerification(log, "2026-06-01").credentials[0];
      expect(record && verifiedProvenance(record)).toBeNull();
    }
  });
});

describe("W110 one person doing both steps", () => {
  it("is recorded rather than refused", () => {
    // Deliberate: a two-clinician practice where the owner collects AND confirms is the
    // ordinary case, and a rule that blocks it buys a second pair of eyes by inviting a
    // second account. The rule that stops the actual fraud is the self-verification one.
    const log = build(submitted({ submittedBy: "owner@a.example" }), checked(), verified());
    const record = replayVerification(log, "2026-06-01").credentials[0];
    expect(record?.status).toBe("verified");
    expect(record?.singleHandled).toBe(true);
  });

  it("is false when two people were involved", () => {
    const log = build(submitted(), checked(), verified());
    expect(replayVerification(log, "2026-06-01").credentials[0]?.singleHandled).toBe(false);
  });
});
