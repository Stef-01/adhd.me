// W135 verify gate: "replay; no inference from silence."
//
// The second half is tested as a property over the CROSS PRODUCT of both machines' states,
// because combining two state machines is exactly where inference creeps in — the combiner is
// under constant pressure to produce one tidy answer, and every gap is an invitation to fill
// it. The property: no combination of inputs produces a conclusion that no event supports.

import { describe, expect, it } from "vitest";
import type { PatientId, PracticeId } from "@/domain/types";
import { trackReferral, describeOutstanding } from "./tracking";
import type { AcceptanceAct } from "./acceptance";
import type { ReferralEvent } from "./leakage";

const FROM = "prac-a" as PracticeId;
const TO = "prac-b" as PracticeId;
const PATIENT = "pat-1" as PatientId;
const REF = "ref-1";

const ev = (kind: ReferralEvent["kind"], at: string): ReferralEvent => ({
  practiceId: FROM,
  patientId: PATIENT,
  referralId: REF,
  kind,
  at,
});

const sent = (at = "2026-02-01"): AcceptanceAct => ({
  kind: "sent", referralId: REF, at, by: "clin-a",
  fromPracticeId: FROM, toPracticeId: TO, patientId: PATIENT,
});
const accepted = (at = "2026-02-03"): AcceptanceAct => ({
  kind: "accepted", referralId: REF, at, by: "clin-b", byPracticeId: TO,
});
const declined = (at = "2026-02-03"): AcceptanceAct => ({
  kind: "declined", referralId: REF, at, by: "clin-b", byPracticeId: TO, reason: "Placeholder.",
});

const CHAINS: Record<string, ReferralEvent[]> = {
  not_written: [],
  written_no_appointment: [ev("referral_written", "2026-02-01")],
  attended_no_completion: [ev("referral_written", "2026-02-01"), ev("appointment_recorded", "2026-02-10")],
  appointment_lost: [
    ev("referral_written", "2026-02-01"),
    ev("appointment_recorded", "2026-02-10"),
    ev("appointment_cancelled", "2026-02-11"),
  ],
  completed: [
    ev("referral_written", "2026-02-01"),
    ev("appointment_recorded", "2026-02-10"),
    ev("completion_recorded", "2026-02-20"),
  ],
};

const ACTS: Record<string, AcceptanceAct[]> = {
  none: [],
  sent: [sent()],
  accepted: [sent(), accepted()],
  declined: [sent(), declined()],
};

const track = (events: ReferralEvent[], acts: AcceptanceAct[]) =>
  trackReferral(REF, FROM, events, acts);

describe("W135 no inference from silence", () => {
  it("never reports accepted without an acceptance act, across every combination", () => {
    // The property, over the cross product of both machines. An appointment is evidence that
    // somebody booked something, not that a practice took the patient on.
    let checked = 0;
    for (const events of Object.values(CHAINS)) {
      for (const [actName, acts] of Object.entries(ACTS)) {
        const tracking = track(events, acts);
        if (actName !== "accepted") {
          expect(tracking.acceptance, `${actName} read as accepted`).not.toBe("accepted");
        }
        checked++;
      }
    }
    expect(checked).toBe(20);
  });

  it("reports `unknown` rather than guessing when no acceptance act exists", () => {
    // `unknown` is a REPORTED value, not a missing one, and it is a different claim from
    // `not_sent`: one says nobody recorded anything, the other says a decision was recorded.
    for (const events of Object.values(CHAINS)) {
      expect(track(events, []).acceptance).toBe("unknown");
    }
    expect(track(CHAINS.completed!, []).acceptance).toBe("unknown");
  });

  it("never reports completed without a completion event", () => {
    for (const [name, events] of Object.entries(CHAINS)) {
      for (const acts of Object.values(ACTS)) {
        if (name !== "completed") {
          expect(track(events, acts).stage, name).not.toBe("completed");
        }
      }
    }
  });

  it("leaves care with the referring practice when the handover was never recorded", () => {
    // An unrecorded handover is not a handover, however far along the clinical chain is.
    expect(track(CHAINS.attended_no_completion!, []).careHolder).toBe("referring_practice");
    expect(track(CHAINS.completed!, []).careHolder).toBe("referring_practice");
  });
});

describe("W135 waiting is an item, not a status", () => {
  it("names the party and the date rather than calling it stalled", () => {
    const tracking = track(CHAINS.attended_no_completion!, ACTS.accepted!);
    expect(tracking.outstanding).toContainEqual({
      from: "receiving_practice",
      what: "send_a_return_report",
      since: "2026-02-01",
    });
    expect(describeOutstanding(tracking)[0]).toContain("Waiting on the other practice since 2026-02-01");
  });

  it("raises an unanswered referral as its own outstanding item", () => {
    const tracking = track(CHAINS.written_no_appointment!, ACTS.sent!);
    expect(tracking.outstanding.map((o) => o.what).sort()).toEqual([
      "answer_the_referral",
      "book_an_appointment",
    ]);
  });

  it("puts a cancelled appointment back on the REFERRING practice", () => {
    // Nobody else is watching: the receiving practice has nothing booked and no obligation to
    // chase, so a rebook is the referrer's to raise.
    expect(track(CHAINS.appointment_lost!, ACTS.accepted!).outstanding).toContainEqual({
      from: "referring_practice",
      what: "rebook_after_cancellation",
      since: "2026-02-01",
    });
  });

  it("produces nothing rather than 'on track' when nothing is outstanding", () => {
    // "On track" is a conclusion, and this module draws none.
    const tracking = track(CHAINS.completed!, ACTS.accepted!);
    expect(tracking.outstanding).toEqual([]);
    expect(describeOutstanding(tracking)).toEqual([]);
  });

  it("has copy for every outstanding kind", () => {
    const seen = new Set<string>();
    for (const events of Object.values(CHAINS)) {
      for (const acts of Object.values(ACTS)) {
        for (const item of track(events, acts).outstanding) seen.add(item.what);
      }
    }
    expect([...seen].sort()).toEqual([
      "answer_the_referral",
      "book_an_appointment",
      "rebook_after_cancellation",
      "send_a_return_report",
    ]);
    for (const line of describeOutstanding(track(CHAINS.attended_no_completion!, ACTS.sent!))) {
      expect(line.length).toBeGreaterThan(20);
    }
  });
});

describe("W135 a disagreement is reported, never resolved", () => {
  it("flags a completed referral nobody recorded accepting", () => {
    // A combiner that silently prefers one machine hides the one thing worth looking at.
    const tracking = track(CHAINS.completed!, []);
    expect(tracking.conflicts).toHaveLength(1);
    expect(tracking.conflicts[0]?.what).toContain("no practice ever recorded accepting it");
    // And it does NOT quietly upgrade the acceptance to make the picture tidy.
    expect(tracking.acceptance).toBe("unknown");
    expect(tracking.stage).toBe("completed");
  });

  it("flags a patient seen on a referral the receiving practice declined", () => {
    const tracking = track(CHAINS.attended_no_completion!, ACTS.declined!);
    expect(tracking.conflicts[0]?.what).toContain("declined the referral");
    expect(tracking.acceptance).toBe("declined");
    expect(tracking.stage).toBe("attended_no_completion");
  });

  it("reports no conflict when the two machines agree", () => {
    expect(track(CHAINS.completed!, ACTS.accepted!).conflicts).toEqual([]);
    expect(track(CHAINS.written_no_appointment!, ACTS.sent!).conflicts).toEqual([]);
  });

  it("keeps both machines' answers visible alongside the conflict", () => {
    const tracking = track(CHAINS.completed!, ACTS.sent!);
    expect(tracking.conflicts[0]).toMatchObject({
      clinicalChain: "completed",
      professionalChain: "awaiting_acceptance",
    });
  });
});

describe("W135 replay", () => {
  it("is a pure function of the two event sets", () => {
    expect(track(CHAINS.completed!, ACTS.accepted!)).toEqual(track(CHAINS.completed!, ACTS.accepted!));
  });

  it("does not depend on the order of either set", () => {
    // W129's rule, applied to both inputs at once.
    const events = CHAINS.completed!;
    const acts = ACTS.accepted!;
    expect(track([...events].reverse(), [...acts].reverse())).toEqual(track(events, acts));
    expect(track([...events].reverse(), acts)).toEqual(track(events, acts));
  });

  it("ignores another referral's events and acts entirely", () => {
    const other = { ...ev("completion_recorded", "2026-02-20"), referralId: "ref-other" };
    const otherAct = { ...accepted(), referralId: "ref-other" };
    expect(track([...CHAINS.written_no_appointment!, other], [sent(), otherAct])).toMatchObject({
      stage: "written_no_appointment",
      acceptance: "awaiting_acceptance",
    });
  });
});
