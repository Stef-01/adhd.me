// W93 verify gate: replay tests for the referral state machine.

import { describe, expect, it } from "vitest";
import type { PatientId, PracticeId } from "@/domain/types";
import {
  STAGE_COPY,
  type LeakageStage,
  type ReferralEvent,
  type ReferralEventKind,
  detectLeakage,
  replayReferral,
} from "./leakage";

const PRACTICE = "prac-1" as PracticeId;
const OTHER = "prac-2" as PracticeId;

let clock = 0;
function ev(kind: ReferralEventKind, over: Partial<ReferralEvent> = {}): ReferralEvent {
  clock += 1;
  return {
    practiceId: PRACTICE,
    patientId: "p1" as PatientId,
    referralId: "r1",
    kind,
    at: `2026-03-${String(clock).padStart(2, "0")}T09:00:00Z`,
    ...over,
  };
}
function replay(events: ReferralEvent[]) {
  clock = 0;
  return replayReferral("r1", events, PRACTICE);
}

describe("W93 replay to a stage", () => {
  it("a referral with nothing since sits at written_no_appointment", () => {
    const t = replay([ev("referral_written")]);
    expect(t.stage).toBe("written_no_appointment");
    expect(t.leaked).toBe(true);
  });

  it("booked and nothing back sits at attended_no_completion", () => {
    const t = replay([ev("referral_written"), ev("appointment_recorded")]);
    expect(t.stage).toBe("attended_no_completion");
    expect(t.leaked).toBe(true);
  });

  it("booked then cancelled sits at appointment_lost", () => {
    const t = replay([ev("referral_written"), ev("appointment_recorded"), ev("appointment_cancelled")]);
    expect(t.stage).toBe("appointment_lost");
    expect(t.leaked).toBe(true);
  });

  it("rebooking after a cancellation is a real path, not a rejection", () => {
    const t = replay([
      ev("referral_written"),
      ev("appointment_recorded"),
      ev("appointment_cancelled"),
      ev("appointment_recorded"),
    ]);

    expect(t.stage).toBe("attended_no_completion");
    expect(t.rejected).toEqual([]);
  });

  it("a completed chain is not leakage", () => {
    const t = replay([ev("referral_written"), ev("appointment_recorded"), ev("completion_recorded")]);
    expect(t.stage).toBe("completed");
    expect(t.leaked).toBe(false);
    expect(t.completedOn).not.toBeNull();
  });

  it("accepts a completion that arrives with no appointment ever recorded", () => {
    // Some services send a letter and nothing else. Refusing it would invent leakage.
    const t = replay([ev("referral_written"), ev("completion_recorded")]);
    expect(t.stage).toBe("completed");
    expect(t.leaked).toBe(false);
  });

  it("a withdrawn referral is not leakage — someone decided", () => {
    const t = replay([ev("referral_written"), ev("referral_cancelled")]);
    expect(t.stage).toBe("withdrawn");
    expect(t.leaked).toBe(false);
  });

  it("distinguishes the two stopping points, because they need different responses", () => {
    // A booking problem and a correspondence problem are not the same thing.
    const noBooking = replay([ev("referral_written")]).stage;
    const noLetter = replay([ev("referral_written"), ev("appointment_recorded")]).stage;
    expect(noBooking).not.toBe(noLetter);
  });
});

describe("W93 the replay is a replay", () => {
  it("reconstructs from history, not from a current-state field", () => {
    // "booked, cancelled, rebooked, completed" and "booked, completed" both END at
    // completed; only the first is worth a practice's attention, and only a replay
    // can tell them apart.
    const messy = replay([
      ev("referral_written"),
      ev("appointment_recorded"),
      ev("appointment_cancelled"),
      ev("appointment_recorded"),
      ev("completion_recorded"),
    ]);
    const clean = replay([ev("referral_written"), ev("appointment_recorded"), ev("completion_recorded")]);

    expect(messy.stage).toBe(clean.stage);
    expect(messy.applied.length).toBeGreaterThan(clean.applied.length);
    expect(messy.applied.filter((e) => e.kind === "appointment_cancelled")).toHaveLength(1);
  });

  it("rejects an event that cannot apply, with a reason, rather than skipping it", () => {
    const t = replay([ev("appointment_recorded"), ev("referral_written")]);

    expect(t.rejected).toHaveLength(1);
    expect(t.rejected[0]!.reason).toBe("out_of_order");
    expect(t.stage).toBe("written_no_appointment");
  });

  it("rejects a duplicate referral_written", () => {
    const t = replay([ev("referral_written"), ev("referral_written")]);
    expect(t.rejected[0]!.reason).toBe("duplicate");
  });

  it("rejects anything after a terminal stage", () => {
    const t = replay([ev("referral_written"), ev("completion_recorded"), ev("appointment_recorded")]);
    expect(t.rejected[0]!.reason).toBe("after_terminal");
    expect(t.stage).toBe("completed");
  });

  it("accounts for every input event — applied plus rejected", () => {
    const events = [
      ev("appointment_recorded"),
      ev("referral_written"),
      ev("referral_written"),
      ev("appointment_recorded"),
      ev("completion_recorded"),
      ev("appointment_cancelled"),
    ];
    const t = replay(events);
    expect(t.applied.length + t.rejected.length).toBe(events.length);
  });

  it("orders by recorded time, so ingest order cannot change the verdict", () => {
    clock = 0;
    const written = ev("referral_written");
    const booked = ev("appointment_recorded");
    const done = ev("completion_recorded");

    expect(replayReferral("r1", [done, booked, written], PRACTICE).stage).toBe("completed");
    expect(replayReferral("r1", [written, booked, done], PRACTICE).stage).toBe("completed");
  });

  it("never advances on silence — an event that never arrived is not an event", () => {
    // The machine stalls where it was last told, however long ago that was.
    const t = replay([ev("referral_written", { at: "2020-01-01T00:00:00Z" })]);
    expect(t.stage).toBe("written_no_appointment");
  });

  it("ignores another practice's events", () => {
    const t = replayReferral("r1", [ev("referral_written", { practiceId: OTHER })], PRACTICE);
    expect(t.stage).toBe("not_written");
    expect(t.applied).toEqual([]);
  });
});

describe("W93 practice summary", () => {
  it("counts referrals by stage and totals the leaked ones", () => {
    clock = 0;
    const events: ReferralEvent[] = [
      { ...ev("referral_written"), referralId: "a" },
      { ...ev("referral_written"), referralId: "b" },
      { ...ev("appointment_recorded"), referralId: "b" },
      { ...ev("referral_written"), referralId: "c" },
      { ...ev("appointment_recorded"), referralId: "c" },
      { ...ev("completion_recorded"), referralId: "c" },
    ];
    const summary = detectLeakage(events, PRACTICE);

    expect(summary.byStage.written_no_appointment).toBe(1);
    expect(summary.byStage.attended_no_completion).toBe(1);
    expect(summary.byStage.completed).toBe(1);
    expect(summary.leaked).toBe(2);
  });

  it("has copy for every stage that describes the record, not the person", () => {
    const stages: LeakageStage[] = [
      "not_written", "written_no_appointment", "appointment_lost",
      "attended_no_completion", "completed", "withdrawn",
    ];
    for (const stage of stages) {
      const copy = STAGE_COPY[stage];
      expect(copy.length, stage).toBeGreaterThan(20);
      for (const banned of ["did not attend", "failed", "ignored", "refused to", "non-compliant"]) {
        expect(copy.toLowerCase(), `${stage} must not blame the patient`).not.toContain(banned);
      }
    }
  });
});

describe("W155 Y3-2: a same-day chain is not resolved by storage order", () => {
  // The ordinary case, not an edge one: the patient books at reception on the way out, so the
  // referral and the appointment carry the same date. Delivered booked-first, the fold used to
  // reject the booking and report a referral that went nowhere.
  const same = (kind: ReferralEventKind): ReferralEvent => ({
    practiceId: "prac-1" as PracticeId,
    patientId: "pat-1" as PatientId,
    referralId: "ref-1",
    kind,
    at: "2026-03-01",
  });

  it("reaches the same verdict whichever order the rows arrive in", () => {
    const rows = [same("referral_written"), same("appointment_recorded")];
    for (const order of [rows, [...rows].reverse()]) {
      const timeline = replayReferral("ref-1", order, "prac-1" as PracticeId);
      expect(timeline.stage).toBe("attended_no_completion");
      expect(timeline.rejected).toEqual([]);
      expect(timeline.applied.map((e) => e.kind)).toEqual([
        "referral_written",
        "appointment_recorded",
      ]);
    }
  });

  it("still completes a same-day written-booked-completed chain in either order", () => {
    const rows = [
      same("completion_recorded"),
      same("referral_written"),
      same("appointment_recorded"),
    ];
    for (const order of [rows, [...rows].reverse()]) {
      const timeline = replayReferral("ref-1", order, "prac-1" as PracticeId);
      expect(timeline.stage).toBe("completed");
      expect(timeline.leaked).toBe(false);
      expect(timeline.rejected).toEqual([]);
    }
  });

  it("does not reorder events that carry different dates", () => {
    // The tie-break must apply to ties only — a booking dated before its referral is a real
    // disagreement in the record and must stay visible as one.
    const timeline = replayReferral(
      "ref-1",
      [
        { ...same("appointment_recorded"), at: "2026-02-01" },
        { ...same("referral_written"), at: "2026-03-01" },
      ],
      "prac-1" as PracticeId,
    );
    expect(timeline.rejected.map((r) => r.reason)).toEqual(["out_of_order"]);
    expect(timeline.stage).toBe("written_no_appointment");
  });
});
