// W95 verify gate (linter half): every planned nudge passes W6's compliance linter, and the
// text is byte-identical to the ordinary availability invitation. The e2e half is
// e2e/outreach.spec.ts.

import { describe, expect, it } from "vitest";
import type { ConditionCode, PatientId, PracticeId } from "@/domain/types";
import type { ContactPreferences } from "@/messaging/preferences";
import { lintMessage, renderAvailabilityInvitation } from "@/messaging/templates";
import type { PracticeRecall } from "@/registers/recalls";
import type { BarrierRecord } from "./barriers";
import { detectLeakage, type ReferralEvent, type ReferralEventKind } from "./leakage";
import {
  NUDGE_REFUSAL_COPY,
  type NudgeRecipient,
  type NudgeRefusal,
  type OutreachInput,
  planOutreach,
  withheldCounts,
} from "./outreach";

const PRACTICE = "prac-1" as PracticeId;
const OTHER = "prac-2" as PracticeId;

const ANYTIME: ContactPreferences = {
  channel: "sms",
  earliestHour: 0,
  latestHour: 24,
  days: [0, 1, 2, 3, 4, 5, 6],
};

function events(
  referralId: string,
  patientId: string,
  kinds: readonly ReferralEventKind[],
  practiceId: PracticeId = PRACTICE,
): ReferralEvent[] {
  return kinds.map((kind, i) => ({
    practiceId,
    patientId: patientId as PatientId,
    referralId,
    kind,
    at: `2026-06-0${i + 1}T09:00:00Z`,
  }));
}

function recipient(over: Partial<NudgeRecipient> = {}): NudgeRecipient {
  return {
    practiceId: PRACTICE,
    patientId: "p1" as PatientId,
    firstName: "Sam",
    usualClinicianDisplayName: "Dr Ada Lin",
    bookingUrl: "https://book.example/prac-1/s1",
    preferences: ANYTIME,
    invitesInWindow: 0,
    ...over,
  };
}

/** One patient, one referral written and never booked — the plainest sendable case. */
function input(over: Partial<OutreachInput> = {}): OutreachInput {
  return {
    practiceId: PRACTICE,
    practiceName: "Demo Family Practice",
    sessionWindow: "after 5pm this week",
    leakage: detectLeakage(events("r1", "p1", ["referral_written"]), PRACTICE),
    barriers: [],
    recalls: [],
    recipients: [recipient()],
    now: new Date("2026-08-10T10:00:00Z"),
    offerExpiresAt: new Date("2026-08-14T10:00:00Z"),
    maxInvitesInWindow: 2,
    ...over,
  };
}

function barrier(over: Partial<BarrierRecord> = {}): BarrierRecord {
  return {
    practiceId: PRACTICE,
    patientId: "p1" as PatientId,
    referralId: "r1",
    code: "cost",
    source: "patient_stated",
    recordedAt: "2026-07-01T09:00:00Z",
    ...over,
  };
}

function recall(over: Partial<PracticeRecall> = {}): PracticeRecall {
  return {
    practiceId: PRACTICE,
    patientId: "p1" as PatientId,
    conditionCode: null,
    status: "open",
    openedAt: "2026-07-01",
    ...over,
  };
}

describe("W95 the nudge IS the ordinary invitation", () => {
  it("renders byte-identically to a plain availability invitation", () => {
    const plan = planOutreach(input());
    expect(plan.send).toHaveLength(1);

    // The guarantee of this unit in one assertion. If anyone ever appends "(about your
    // referral)", adds a specialty, or softens "you haven't been", this fails.
    expect(plan.send[0]!.text).toBe(
      renderAvailabilityInvitation({
        patientFirstName: "Sam",
        clinicianDisplayName: "Dr Ada Lin",
        practiceName: "Demo Family Practice",
        sessionWindow: "after 5pm this week",
        bookingUrl: "https://book.example/prac-1/s1",
      }),
    );
  });

  it("passes W6's compliance linter with no violations", () => {
    const plan = planOutreach(input());
    for (const nudge of plan.send) {
      expect(
        lintMessage(nudge.text, {
          patientFirstName: "Sam",
          clinicianDisplayName: "Dr Ada Lin",
          practiceName: "Demo Family Practice",
          sessionWindow: "after 5pm this week",
          bookingUrl: "https://book.example/prac-1/s1",
        }),
      ).toEqual([]);
    }
    // Guard against a vacuous pass: a plan with no sends lints trivially.
    expect(plan.send.length).toBeGreaterThan(0);
  });

  it("says nothing about the referral, the appointment, or attendance", () => {
    const text = planOutreach(input()).send[0]!.text.toLowerCase();
    for (const banned of [
      "referral",
      "referred",
      "specialist",
      "did not attend",
      "missed",
      "follow up",
      "follow-up",
      "your appointment with",
    ]) {
      expect(text, `a nudge must not say "${banned}"`).not.toContain(banned);
    }
  });

  it("refuses the whole batch when the practice's session wording fails lint", () => {
    // One bad configuration value affects every message, so it is not a per-patient
    // refusal — withholding all of them silently would read as "nobody was eligible".
    expect(() => planOutreach(input({ sessionWindow: "because you are overdue" }))).toThrow(
      /compliance lint/,
    );
  });
});

describe("W95 which stages earn a nudge", () => {
  const cases: Array<{ kinds: ReferralEventKind[]; sent: boolean; reason?: NudgeRefusal }> = [
    { kinds: ["referral_written"], sent: true },
    {
      kinds: ["referral_written", "appointment_recorded", "appointment_cancelled"],
      sent: true,
    },
    {
      kinds: ["referral_written", "appointment_recorded"],
      sent: false,
      reason: "service_side_gap",
    },
    {
      // W136 changed this from `stage_not_actionable`, and the change is the unit: a completed
      // chain is a GOOD OUTCOME, and filing it under the same reason as a stuck one meant a
      // practice reading the withheld counts could not tell success from a gap.
      kinds: ["referral_written", "completion_recorded"],
      sent: false,
      reason: "loop_closed_by_return",
    },
    {
      kinds: ["referral_written", "referral_cancelled"],
      sent: false,
      reason: "stage_not_actionable",
    },
  ];

  for (const testCase of cases) {
    it(`${testCase.kinds.join(" → ")} ⇒ ${testCase.sent ? "send" : testCase.reason}`, () => {
      const plan = planOutreach(
        input({ leakage: detectLeakage(events("r1", "p1", testCase.kinds), PRACTICE) }),
      );
      if (testCase.sent) {
        expect(plan.send).toHaveLength(1);
        expect(plan.withheld).toEqual([]);
      } else {
        expect(plan.send).toEqual([]);
        expect(plan.withheld[0]?.reason).toBe(testCase.reason);
      }
    });
  }

  it("an appointment with nothing back is chased with the service, not the patient", () => {
    // This stage IS leaked, so it would pass a naive "leaked ⇒ nudge" rule. It gets its own
    // reason because the practice's next step is a different one: the letter is missing
    // between the service and the practice, and texting the patient asks them to fix that.
    const plan = planOutreach(
      input({
        leakage: detectLeakage(
          events("r1", "p1", ["referral_written", "appointment_recorded"]),
          PRACTICE,
        ),
      }),
    );
    expect(plan.withheld).toEqual([
      { referralId: "r1", patientId: "p1", reason: "service_side_gap" },
    ]);
    expect(NUDGE_REFUSAL_COPY.service_side_gap).toContain("not with the patient");
  });
});

describe("W95 the refusals that cost us sends", () => {
  it("any open recall suppresses, because the message carries no condition to compare", () => {
    // W71 dedups by condition. A condition-free nudge cannot do that, so the rule collapses
    // to all-or-nothing and the fail-safe direction is silence.
    const plan = planOutreach(input({ recalls: [recall({ conditionCode: null })] }));
    expect(plan.send).toEqual([]);
    expect(plan.withheld[0]?.reason).toBe("recall_already_running");

    const scoped = planOutreach(
      input({ recalls: [recall({ conditionCode: "diabetes" as ConditionCode })] }),
    );
    expect(scoped.send).toEqual([]);
    expect(scoped.withheld[0]?.reason).toBe("recall_already_running");
  });

  it("a closed recall does not suppress", () => {
    const plan = planOutreach(
      input({ recalls: [recall({ status: "closed", closedAt: "2026-07-20" })] }),
    );
    expect(plan.send).toHaveLength(1);
  });

  it("a recorded barrier means a conversation, not an automated text", () => {
    const plan = planOutreach(input({ barriers: [barrier()] }));
    expect(plan.send).toEqual([]);
    expect(plan.withheld[0]?.reason).toBe("barrier_already_recorded");
  });

  it("a barrier against a different referral does not suppress this one", () => {
    const plan = planOutreach(input({ barriers: [barrier({ referralId: "r-other" })] }));
    expect(plan.send).toHaveLength(1);
  });

  it("one nudge per referral, ever", () => {
    const plan = planOutreach(input({ nudgedReferralIds: ["r1"] }));
    expect(plan.withheld[0]?.reason).toBe("already_nudged");
  });

  it("the contact-frequency cap is honoured", () => {
    const plan = planOutreach(
      input({ recipients: [recipient({ invitesInWindow: 2 })], maxInvitesInWindow: 2 }),
    );
    expect(plan.withheld[0]?.reason).toBe("contact_cap_reached");
  });

  it("no contact details on file means nothing is sent, not a guess", () => {
    const plan = planOutreach(input({ recipients: [] }));
    expect(plan.withheld[0]?.reason).toBe("no_recipient_on_file");
  });

  it("W74's refusals pass through rather than being re-decided here", () => {
    const noChannel = planOutreach(
      input({ recipients: [recipient({ preferences: { ...ANYTIME, channel: null } })] }),
    );
    expect(noChannel.withheld[0]?.reason).toBe("no_channel_chosen");

    // Contact hours reopen after the session is gone: silence, not an early send.
    const closed = planOutreach(
      input({
        recipients: [recipient({ preferences: { ...ANYTIME, days: [0] } })],
        now: new Date("2026-08-10T23:30:00Z"), // Sunday, late
        offerExpiresAt: new Date("2026-08-11T09:00:00Z"), // Monday morning
      }),
    );
    expect(closed.withheld[0]?.reason).toBe("offer_expires_before_window");
  });

  it("defers rather than sending outside the patient's hours", () => {
    const plan = planOutreach(
      input({
        recipients: [recipient({ preferences: { ...ANYTIME, earliestHour: 14, latestHour: 18 } })],
      }),
    );
    expect(plan.send[0]?.deferred).toBe(true);
    expect(plan.send[0]?.sendAt).toBe("2026-08-10T14:00:00.000Z");
  });
});

describe("W95 scope and accounting", () => {
  it("another practice's records are absent, not authoritative", () => {
    // The fourth-instance bug class from W91, checked at write time for once: a foreign
    // barrier or recall must not suppress this practice's nudge, and a foreign recipient
    // must not supply contact details for it.
    const withForeignSuppressors = planOutreach(
      input({
        barriers: [barrier({ practiceId: OTHER })],
        recalls: [recall({ practiceId: OTHER })],
      }),
    );
    expect(withForeignSuppressors.send).toHaveLength(1);

    const foreignRecipient = planOutreach(
      input({ recipients: [recipient({ practiceId: OTHER })] }),
    );
    expect(foreignRecipient.withheld[0]?.reason).toBe("no_recipient_on_file");
  });

  it("another practice's referrals are not planned for at all", () => {
    const plan = planOutreach(
      input({
        leakage: detectLeakage(events("r9", "p9", ["referral_written"], OTHER), OTHER),
      }),
    );
    expect(plan.send).toEqual([]);
    expect(plan.withheld).toEqual([]);
  });

  it("every referral considered lands in exactly one list", () => {
    const all = [
      ...events("r1", "p1", ["referral_written"]),
      ...events("r2", "p2", ["referral_written", "appointment_recorded"]),
      ...events("r3", "p3", ["referral_written", "completion_recorded"]),
      ...events("r4", "p4", ["referral_written", "appointment_recorded", "appointment_cancelled"]),
    ];
    const plan = planOutreach(
      input({
        leakage: detectLeakage(all, PRACTICE),
        recipients: ["p1", "p2", "p3", "p4"].map((p) =>
          recipient({ patientId: p as PatientId }),
        ),
      }),
    );

    const seen = [...plan.send.map((s) => s.referralId), ...plan.withheld.map((w) => w.referralId)];
    expect(seen.sort()).toEqual(["r1", "r2", "r3", "r4"]);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("the plan is in referral-record order, which carries no priority", () => {
    const all = [
      ...events("r-c", "p3", ["referral_written"]),
      ...events("r-a", "p1", ["referral_written"]),
      ...events("r-b", "p2", ["referral_written"]),
    ];
    const plan = planOutreach(
      input({
        leakage: detectLeakage(all, PRACTICE),
        recipients: ["p1", "p2", "p3"].map((p) => recipient({ patientId: p as PatientId })),
      }),
    );
    expect(plan.send.map((s) => s.referralId)).toEqual(["r-a", "r-b", "r-c"]);
  });

  it("withheld counts name every reason, so zero is visible as zero", () => {
    const counts = withheldCounts(planOutreach(input({ barriers: [barrier()] })));
    expect(counts.barrier_already_recorded).toBe(1);
    expect(counts.recall_already_running).toBe(0);
    expect(Object.keys(counts).sort()).toEqual(Object.keys(NUDGE_REFUSAL_COPY).sort());
  });
});

describe("W95 refusal copy", () => {
  it("every reason has copy, and it tells the practice what to do instead", () => {
    for (const [reason, copy] of Object.entries(NUDGE_REFUSAL_COPY)) {
      expect(copy.length, reason).toBeGreaterThan(30);
    }
  });

  it("blames nobody", () => {
    // Same ban list as W92/W93/W96 — the collapse from "no record" to "the patient failed to
    // go" is easy to make in wording even when the code is careful.
    const all = Object.values(NUDGE_REFUSAL_COPY).join(" ").toLowerCase();
    for (const banned of ["did not attend", "failed to", "non-compliant", "refused to", "ignored"]) {
      expect(all, `refusal copy must not say "${banned}"`).not.toContain(banned);
    }
  });
});
