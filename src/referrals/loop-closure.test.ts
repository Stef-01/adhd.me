// W136 verify gate: "the outreach plan withholds with a reason, and the reason is the
// completion."
//
// The emphasis is on the second clause. W95 already withheld a completed referral — as
// `stage_not_actionable`, alongside `not_written` and `referral_cancelled`. True, and
// misleading: it filed the outcome the whole rail exists to produce under the same reason as a
// chain nobody can act on, so the withheld counts could not distinguish success from a gap.
// This unit is that distinction, and these tests are about the REASON rather than the silence.

import { describe, expect, it } from "vitest";
import type { PatientId, PracticeId } from "@/domain/types";
import { detectLeakage, type ReferralEvent } from "./leakage";
import {
  NUDGE_REFUSAL_COPY,
  planOutreach,
  withheldCounts,
  type NudgeRecipient,
  type OutreachInput,
} from "./outreach";
import { completionEvent, recordReturn, type ReturnInput } from "./return-report";
import type { ContactPreferences } from "@/messaging/preferences";

const ANYTIME: ContactPreferences = {
  channel: "sms",
  earliestHour: 0,
  latestHour: 24,
  days: [0, 1, 2, 3, 4, 5, 6],
};

const PRACTICE = "prac-a" as PracticeId;
const PATIENT = "pat-1" as PatientId;

const ev = (kind: ReferralEvent["kind"], at: string, referralId = "ref-1"): ReferralEvent => ({
  practiceId: PRACTICE,
  patientId: PATIENT,
  referralId,
  kind,
  at,
});

const recipient = (over: Partial<NudgeRecipient> = {}): NudgeRecipient => ({
  practiceId: PRACTICE,
  patientId: PATIENT,
  firstName: "Sam",
  usualClinicianDisplayName: "Dr Demo",
  bookingUrl: "https://example.test/book/abc",
  preferences: ANYTIME,
  invitesInWindow: 0,
  ...over,
});

const input = (over: Partial<OutreachInput> = {}): OutreachInput => ({
  practiceId: PRACTICE,
  practiceName: "Demo Family Practice",
  sessionWindow: "next week",
  leakage: detectLeakage([], PRACTICE),
  barriers: [],
  recalls: [],
  recipients: [recipient()],
  now: new Date("2026-03-01T09:00:00Z"),
  offerExpiresAt: new Date("2026-03-08T09:00:00Z"),
  maxInvitesInWindow: 3,
  ...over,
});

/** A return report built the only way one can be built. */
function closedReferral(over: Partial<ReturnInput> = {}) {
  const result = recordReturn({
    referralId: "ref-1",
    fromPracticeId: PRACTICE,
    toPracticeId: "prac-b",
    patientId: PATIENT,
    outcome: "seen_care_returned",
    reportedAt: "2026-02-20",
    reportedBy: "clin-b",
    seenOn: "2026-02-15",
    narrative: null,
    referralWrittenOn: "2026-02-01",
    ...over,
  });
  if (!result.ok) throw new Error(`fixture rejected: ${result.errors.join(", ")}`);
  return result.report;
}

const OPEN_CHAIN = [ev("referral_written", "2026-02-01")];

describe("W136 a completed return stops outreach, and the reason is the completion", () => {
  it("withholds with loop_closed_by_return once the completion event has landed", () => {
    const completion = completionEvent(closedReferral())!;
    const plan = planOutreach(
      input({ leakage: detectLeakage([...OPEN_CHAIN, completion], PRACTICE) }),
    );
    expect(plan.send).toEqual([]);
    expect(plan.withheld).toEqual([
      { referralId: "ref-1", patientId: PATIENT, reason: "loop_closed_by_return" },
    ]);
  });

  it("does NOT file it as stage_not_actionable — the whole point of the unit", () => {
    const completion = completionEvent(closedReferral())!;
    const counts = withheldCounts(
      planOutreach(input({ leakage: detectLeakage([...OPEN_CHAIN, completion], PRACTICE) })),
    );
    expect(counts.loop_closed_by_return).toBe(1);
    expect(counts.stage_not_actionable).toBe(0);
  });

  it("stops the nudge on the return report alone, before the event is folded in", () => {
    // The plumbing case that matters: `completed` is DERIVED from a completion event, so a
    // return report written but not yet folded into the chain would leave it looking open —
    // and the patient would be chased about something that is finished.
    const stillOpen = detectLeakage(OPEN_CHAIN, PRACTICE);
    expect(stillOpen.timelines[0]?.stage).toBe("written_no_appointment");

    const plan = planOutreach(input({ leakage: stillOpen, closedReferralIds: ["ref-1"] }));
    expect(plan.send).toEqual([]);
    expect(plan.withheld[0]?.reason).toBe("loop_closed_by_return");
  });

  it("still sends when the chain is genuinely open", () => {
    // The control. Without it, a module that withheld everything would pass every test above.
    const plan = planOutreach(input({ leakage: detectLeakage(OPEN_CHAIN, PRACTICE) }));
    expect(plan.send.map((n) => n.referralId)).toEqual(["ref-1"]);
    expect(plan.withheld).toEqual([]);
  });

  it("closes only the referral that came back, not the patient's others", () => {
    const events = [
      ev("referral_written", "2026-02-01", "ref-1"),
      ev("referral_written", "2026-02-02", "ref-2"),
    ];
    const plan = planOutreach(
      input({ leakage: detectLeakage(events, PRACTICE), closedReferralIds: ["ref-1"] }),
    );
    expect(plan.withheld.map((w) => [w.referralId, w.reason])).toEqual([
      ["ref-1", "loop_closed_by_return"],
    ]);
    expect(plan.send.map((n) => n.referralId)).toEqual(["ref-2"]);
  });

  it("a not_seen return does NOT close the loop", () => {
    // W132's sharpest edge, carried through: a report saying the patient never attended is a
    // real return report, but the loop is the patient being seen. Chasing them is still right.
    expect(completionEvent(closedReferral({ outcome: "not_seen", seenOn: null }))).toBeNull();
    const plan = planOutreach(input({ leakage: detectLeakage(OPEN_CHAIN, PRACTICE) }));
    expect(plan.send.map((n) => n.referralId)).toEqual(["ref-1"]);
  });

  it("says the completion in words a practice reads, not just in a code", () => {
    const copy = NUDGE_REFUSAL_COPY.loop_closed_by_return;
    expect(copy).toContain("return report came back");
    expect(copy).toContain("finished");
    expect(copy).toContain("not being chased");
  });

  it("counts it separately from every other reason", () => {
    // A reason that shares a bucket with another is a reason nobody can act on differently.
    const completion = completionEvent(closedReferral())!;
    const counts = withheldCounts(
      planOutreach(input({ leakage: detectLeakage([...OPEN_CHAIN, completion], PRACTICE) })),
    );
    const nonZero = Object.entries(counts).filter(([, n]) => n > 0);
    expect(nonZero).toEqual([["loop_closed_by_return", 1]]);
  });
});
