import { describe, expect, it } from "vitest";
import type { Invitation, InvitationId, PatientId, PracticeId, ClinicianId } from "@/domain/types";
import { handleStop, MockSmsAdapter } from "./adapter";
import {
  lintMessage,
  renderAvailabilityInvitation,
  renderCompliant,
  type MessageContext,
} from "./templates";

const CTX: MessageContext = {
  patientFirstName: "Alex",
  clinicianDisplayName: "Dr Chen",
  practiceName: "Synthetic Family Practice",
  sessionWindow: "after 5pm this week",
  bookingUrl: "https://book.example/t/abc123",
};

describe("W6 messaging + compliance linter", () => {
  it("the canonical invitation passes lint", () => {
    const text = renderAvailabilityInvitation(CTX);
    expect(lintMessage(text, CTX)).toEqual([]);
    expect(renderCompliant(CTX)).toBe(text);
  });

  const violating: Array<[string, string]> = [
    ["no-overdue-framing", "Hi Alex, you are overdue for a visit."],
    ["no-urgency", "Please book urgently."],
    ["no-clinical-necessity", "You must be seen this week."],
    ["no-deterioration", "Your health may deteriorate."],
    ["no-diagnosis-or-condition", "About your blood pressure."],
    ["no-test-results-bait", "Your test results are in."],
    ["no-benefit-claims", "See our expert doctors."],
    ["no-checkup-prompting", "Time for your annual health check."],
  ];

  for (const [rule, bad] of violating) {
    it(`blocks: ${rule}`, () => {
      const text = `${bad} ${CTX.practiceName} Book: ${CTX.bookingUrl} — reply STOP to opt out.`;
      expect(lintMessage(text, CTX).map((v) => v.rule)).toContain(rule);
    });
  }

  it("requires practice identification, opt-out, and booking link", () => {
    const rules = lintMessage("Hi Alex, appointments are available this week.", CTX).map((v) => v.rule);
    expect(rules).toEqual(
      expect.arrayContaining(["identifies-practice", "has-opt-out", "has-booking-link"]),
    );
  });

  it("W25: the telehealth variant is distinct and still passes lint", () => {
    const inPerson = renderAvailabilityInvitation(CTX);
    const telehealth = renderAvailabilityInvitation({ ...CTX, telehealth: true });
    expect(telehealth).not.toBe(inPerson);
    expect(telehealth.toLowerCase()).toContain("telehealth");
    expect(lintMessage(telehealth, CTX)).toEqual([]);
    expect(renderCompliant({ ...CTX, telehealth: true })).toBe(telehealth);
  });

  it("mock adapter records sends without side effects", async () => {
    const adapter = new MockSmsAdapter();
    await adapter.send({ to: "synthetic-pat-1", body: renderCompliant(CTX), invitationId: "inv-1" });
    expect(adapter.sent).toHaveLength(1);
    expect(adapter.sent[0]?.to).toBe("synthetic-pat-1");
  });

  it("STOP is terminal: patient opted out, outstanding invitations closed", () => {
    const practiceId = "prac-1" as PracticeId;
    const patient = {
      id: "pat-1" as PatientId,
      practiceId,
      usualClinicianId: null,
      smsConsent: true,
      optedOut: false,
      lastAttendedAt: "2025-01-01",
      futureBookingAt: null,
      activeRecall: false,
      chronicCare: false,
      holdout: false,
    };
    const invitations: Invitation[] = (["queued", "sent", "booked"] as const).map((status, i) => ({
      id: `inv-${i}` as InvitationId,
      practiceId,
      patientId: patient.id,
      clinicianId: "cli-1" as ClinicianId,
      sessionDate: "2026-08-11",
      status,
      sentAt: null,
    }));
    const result = handleStop(patient, invitations);
    expect(result.patient.optedOut).toBe(true);
    expect(result.invitations.map((i) => i.status)).toEqual(["opted_out", "opted_out", "booked"]);
  });
});
