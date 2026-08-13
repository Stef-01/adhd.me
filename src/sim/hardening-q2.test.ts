// W26 Q2-hardening regressions: the review sweep's critical findings, pinned.

import { beforeEach, describe, expect, it } from "vitest";
import type {
  Appointment,
  AppointmentId,
  ClinicianId,
  Invitation,
  InvitationId,
  PatientId,
  PracticeId,
} from "@/domain/types";
import { bookInvitation, type RailState } from "@/booking/rail";
import { getConsole, onboardPractice, resetConsole } from "@/console/store";
import { checkInvariants, DEFAULT_SIM_CONFIG, runSim } from "./harness";

describe("W26: bookings honour the session-config offerable set (rail allowedSlotIds)", () => {
  const slot = (id: string, time: string): Appointment => ({
    id: id as AppointmentId,
    practiceId: "prac-1" as PracticeId,
    clinicianId: "c1" as ClinicianId,
    startsAt: `2026-08-12T${time}:00+10:00`,
    status: "open",
    patientId: null,
    generatedByInvitation: false,
  });
  const invitation = (id: string, patient: string): Invitation => ({
    id: id as InvitationId,
    practiceId: "prac-1" as PracticeId,
    patientId: patient as PatientId,
    clinicianId: "c1" as ClinicianId,
    sessionDate: "2026-08-12",
    status: "sent",
    sentAt: "2026-08-12T08:00:00Z",
  });
  const state: RailState = {
    appointments: [slot("early", "08:00"), slot("inWindow", "10:00")],
    invitations: [invitation("i1", "p1"), invitation("i2", "p2")],
    auditEvents: [],
  };
  const allowed = new Set(["inWindow"]); // the 08:00 slot is outside the practice's window

  it("books into the allowed set, never the earliest open slot outside it", () => {
    const result = bookInvitation(state, "i1", "2026-08-12T09:00:00Z", allowed);
    if (!result.ok) throw new Error(`refused: ${result.reason}`);
    expect(result.appointmentId).toBe("inWindow");
    const early = result.state.appointments.find((a) => a.id === "early");
    expect(early?.status).toBe("open"); // excluded capacity untouched
  });

  it("the session is full for expiry once the allowed set exhausts, protected slots still open", () => {
    const first = bookInvitation(state, "i1", "2026-08-12T09:00:00Z", allowed);
    if (!first.ok) throw new Error("first booking refused");
    // The only allowed slot is gone: the other outstanding offer expired on fill.
    expect(first.state.invitations.find((i) => i.id === "i2")?.status).toBe("expired");
    const second = bookInvitation(first.state, "i2", "2026-08-12T09:05:00Z", allowed);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("expired");
  });

  it("without an allowed set the rail behaves as before (back-compat)", () => {
    const result = bookInvitation(state, "i1", "2026-08-12T09:00:00Z");
    if (!result.ok) throw new Error("refused");
    expect(result.appointmentId).toBe("early"); // earliest open, old semantics
  });
});

describe("W26: restrictive session config holds across a full sim run", () => {
  it("scheduling window + fillable types are never violated by generated bookings", () => {
    const result = runSim({
      ...DEFAULT_SIM_CONFIG,
      weeks: 4,
      session: {
        participatingClinicianIds: "all",
        fillableTypes: ["standard", "long"],
        protectedCapacityFraction: 0.3,
        schedulingWindow: { startHour: 9, endHour: 17 },
      },
    });
    expect(result.totals.booked).toBeGreaterThan(0); // the loop still runs
    expect(checkInvariants(result)).toEqual([]); // includes the new W17-respect invariant
  });
});

describe("W26: onboarding is create-only (privilege-escalation fix)", () => {
  beforeEach(() => resetConsole());
  const VALID = { name: "Demo Family Practice", timezone: "Australia/Sydney", holdoutPercent: 10 };

  // W166 restated this test, because the plural model changed HOW the property holds without
  // changing the property. W26 refused a second onboarding because there was one practice slot:
  // re-running it OVERWROTE the practice and re-seated the caller as owner. Appending cannot do
  // that, and a stranger creating their own practice is now an ordinary multi-site case, not an
  // attack. So the assertion moves to what actually matters and was always the real point.
  it("a second onboarding cannot touch the first practice or its ownership", () => {
    expect(onboardPractice(VALID, "2026-08-09T02:00:00Z", "owner@demo.example")).toEqual({});
    const first = getConsole().practices[0]!.practice.id;
    onboardPractice(
      { ...VALID, name: "Hijacked Practice", holdoutPercent: 0 },
      "2026-08-09T02:01:00Z",
      "attacker@elsewhere.example",
    );
    const state = getConsole();
    // The original is untouched: same id, same name, same holdout.
    expect(state.practices.find((r) => r.practice.id === first)!.practice).toMatchObject({
      name: "Demo Family Practice",
      holdoutRate: 0.1,
    });
    // And the attacker holds NOTHING over it — the escalation W26 was about.
    expect(state.memberships.filter((m) => m.practiceId === first)).toEqual([
      { practiceId: first, email: "owner@demo.example", role: "owner" },
    ]);
    expect(
      state.memberships.some(
        (m) => m.email === "attacker@elsewhere.example" && m.practiceId === first,
      ),
    ).toBe(false);
  });
});
