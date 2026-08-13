import { describe, expect, it } from "vitest";
import { bookInvitation, type RailState } from "@/booking/rail";
import type {
  AppointmentId,
  ClinicianId,
  InvitationId,
  InvitationStatus,
  PatientId,
  PracticeId,
} from "@/domain/types";

const PRACTICE = "p1" as PracticeId;
const CLINICIAN = "c1" as ClinicianId;
const SESSION = "2026-09-01";
const NOW = "2026-08-26T10:00:00+10:00";

function makeState(openSlots: number, invitationStatuses: InvitationStatus[]): RailState {
  return {
    appointments: Array.from({ length: openSlots }, (_, i) => ({
      id: `apt-${i}` as AppointmentId,
      practiceId: PRACTICE,
      clinicianId: CLINICIAN,
      startsAt: `${SESSION}T09:${String(i).padStart(2, "0")}:00+10:00`,
      status: "open" as const,
      patientId: null,
      generatedByInvitation: false,
    })),
    invitations: invitationStatuses.map((status, i) => ({
      id: `inv-${i}` as InvitationId,
      practiceId: PRACTICE,
      patientId: `pat-${i}` as PatientId,
      clinicianId: CLINICIAN,
      sessionDate: SESSION,
      status,
      sentAt: status === "queued" ? null : "2026-08-25T09:00:00+10:00",
    })),
    auditEvents: [],
  };
}

describe("bookInvitation", () => {
  it("books the earliest open slot and marks it invitation-generated", () => {
    const result = bookInvitation(makeState(2, ["sent", "sent"]), "inv-0", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.appointmentId).toBe("apt-0");
    const slot = result.state.appointments.find((a) => a.id === "apt-0");
    expect(slot).toMatchObject({ status: "booked", patientId: "pat-0", generatedByInvitation: true });
    expect(result.state.invitations.find((i) => i.id === "inv-0")?.status).toBe("booked");
    expect(result.state.auditEvents.map((e) => e.kind)).toEqual(["invitation_booked"]);
  });

  it("leaves other offers live while capacity remains", () => {
    const result = bookInvitation(makeState(2, ["sent", "sent", "sent"]), "inv-0", NOW);
    if (!result.ok) throw new Error("expected booking to succeed");
    expect(result.state.invitations.find((i) => i.id === "inv-1")?.status).toBe("sent");
    expect(result.state.invitations.find((i) => i.id === "inv-2")?.status).toBe("sent");
  });

  it("expires every remaining offer when the last slot fills", () => {
    const first = bookInvitation(makeState(2, ["sent", "sent", "sent"]), "inv-0", NOW);
    if (!first.ok) throw new Error("expected first booking to succeed");
    const second = bookInvitation(first.state, "inv-1", NOW);
    if (!second.ok) throw new Error("expected second booking to succeed");
    expect(second.state.invitations.map((i) => i.status)).toEqual(["booked", "booked", "expired"]);
    expect(
      second.state.auditEvents.filter((e) => e.kind === "invitation_expired").map((e) => e.subjectId),
    ).toEqual(["inv-2"]);
  });

  it("refuses when the session is already full", () => {
    const result = bookInvitation(makeState(0, ["sent"]), "inv-0", NOW);
    expect(result).toMatchObject({ ok: false, reason: "session_full" });
  });

  it("refuses expired, opted-out, already-booked and unknown invitations", () => {
    const state = makeState(2, ["expired", "opted_out", "booked"]);
    expect(bookInvitation(state, "inv-0", NOW)).toMatchObject({ ok: false, reason: "expired" });
    expect(bookInvitation(state, "inv-1", NOW)).toMatchObject({ ok: false, reason: "opted_out" });
    expect(bookInvitation(state, "inv-2", NOW)).toMatchObject({ ok: false, reason: "already_booked" });
    expect(bookInvitation(state, "inv-99", NOW)).toMatchObject({ ok: false, reason: "not_found" });
  });

  it("does not mutate the input state", () => {
    const state = makeState(1, ["sent", "sent"]);
    const snapshot = JSON.parse(JSON.stringify(state));
    bookInvitation(state, "inv-0", NOW);
    expect(state).toEqual(snapshot);
  });
});
