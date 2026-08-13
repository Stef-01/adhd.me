import { describe, expect, it } from "vitest";
import type {
  Appointment,
  AppointmentId,
  AuditEvent,
  ClinicianId,
  Invitation,
  InvitationId,
  OutcomeRecord,
  PatientId,
  PracticeId,
} from "@/domain/types";
import {
  applyRetention,
  DEFAULT_RETENTION,
  deletePatient,
  exportPatientData,
  isSuppressed,
  patientRef,
  type PrivacyDataset,
} from "./privacy";

const NOW = "2026-08-09T04:00:00Z";
const PRAC = "prac-1" as PracticeId;

const invitation = (id: string, patient: string, status: Invitation["status"], sentAt: string | null): Invitation => ({
  id: id as InvitationId,
  practiceId: PRAC,
  patientId: patient as PatientId,
  clinicianId: "c1" as ClinicianId,
  sessionDate: (sentAt ?? NOW).slice(0, 10),
  status,
  sentAt,
});

const appointment = (id: string, patient: string | null, startsAt: string): Appointment => ({
  id: id as AppointmentId,
  practiceId: PRAC,
  clinicianId: "c1" as ClinicianId,
  startsAt,
  status: "attended",
  patientId: patient as PatientId | null,
  generatedByInvitation: patient !== null,
});

const audit = (subjectId: string, at: string): AuditEvent => ({
  practiceId: PRAC,
  kind: "invitation_booked",
  at,
  subjectId,
  detail: "",
});

const outcome = (appointmentId: string): OutcomeRecord => ({
  appointmentId: appointmentId as AppointmentId,
  practiceId: PRAC,
  usefulness: ["preventive_care"],
  clinicianJudgedReasonable: true,
});

const DATASET: PrivacyDataset = {
  invitations: [
    invitation("inv-1", "pat-1", "booked", "2026-08-01T09:00:00Z"),
    invitation("inv-2", "pat-2", "sent", "2026-08-08T09:00:00Z"),
  ],
  appointments: [
    appointment("apt-1", "pat-1", "2026-08-03T09:00:00+10:00"),
    appointment("apt-2", "pat-2", "2026-08-10T09:00:00+10:00"),
  ],
  auditEvents: [audit("inv-1", "2026-08-01T10:00:00Z"), audit("pat-1", "2026-08-01T11:00:00Z"), audit("inv-2", "2026-08-08T10:00:00Z")],
  outcomes: [outcome("apt-1"), outcome("apt-2")],
};

describe("W33 export", () => {
  it("assembles everything held about one patient and nothing about others", () => {
    const data = exportPatientData(DATASET, "pat-1", NOW);
    expect(data.held).toBe(true);
    expect(data.invitations.map((i) => i.id)).toEqual(["inv-1"]);
    expect(data.appointments.map((a) => a.id)).toEqual(["apt-1"]);
    expect(data.auditEvents.map((e) => e.subjectId).sort()).toEqual(["inv-1", "pat-1"]);
    expect(data.outcomes.map((o) => o.appointmentId)).toEqual(["apt-1"]);
  });

  it("reports held=false honestly for an unknown identifier", () => {
    const data = exportPatientData(DATASET, "pat-ghost", NOW);
    expect(data.held).toBe(false);
    expect(data.invitations).toEqual([]);
  });
});

describe("W33 delete", () => {
  const result = deletePatient(DATASET, "pat-1", NOW);

  it("removes the patient's records and unlinks their visits", () => {
    expect(result.dataset.invitations.map((i) => i.id)).toEqual(["inv-2"]);
    const apt1 = result.dataset.appointments.find((a) => a.id === "apt-1");
    expect(apt1?.patientId).toBeNull();
    expect(apt1?.generatedByInvitation).toBe(false);
    expect(result.dataset.auditEvents.map((e) => e.subjectId)).toEqual(["inv-2"]);
    expect(result.dataset.outcomes.map((o) => o.appointmentId)).toEqual(["apt-2"]);
    expect(exportPatientData(result.dataset, "pat-1", NOW).held).toBe(false);
  });

  it("counts what it removed and keeps only a hashed reference", () => {
    expect(result.deletion.removed).toEqual({
      invitations: 1,
      appointments: 1,
      auditEvents: 2,
      outcomes: 1,
      complaints: 0, // this dataset carries none — the store composes the real count
      referrals: 0, // likewise, and W137 composes it in deletePatientEverywhere
    });
    expect(result.deletion.ref).toBe(patientRef("pat-1"));
    expect(result.deletion.ref).not.toContain("pat-1");
    expect(JSON.stringify(result.deletion)).not.toContain("pat-1");
  });

  it("the suppression entry answers for the deleted patient forever", () => {
    expect(isSuppressed([result.suppression], "pat-1")).toBe(true);
    expect(isSuppressed([result.suppression], "pat-2")).toBe(false);
  });

  it("other patients are untouched", () => {
    expect(exportPatientData(result.dataset, "pat-2", NOW)).toEqual(
      exportPatientData(DATASET, "pat-2", NOW),
    );
  });
});

describe("W33 retention", () => {
  it("prunes terminal records past their window; active offers are never pruned", () => {
    const old = "2023-01-01T09:00:00Z"; // far past every window
    const dataset: PrivacyDataset = {
      invitations: [
        invitation("inv-old-done", "pat-1", "expired", old),
        invitation("inv-old-open", "pat-1", "sent", old), // active — retention must not touch it
        invitation("inv-new-done", "pat-1", "booked", "2026-08-01T09:00:00Z"),
      ],
      appointments: [appointment("apt-old", "pat-1", "2019-01-03T09:00:00+10:00")],
      // Audit retention is 7 years — the pruned event must be older than that, not merely old.
      auditEvents: [audit("inv-old-done", "2018-01-01T09:00:00Z"), audit("inv-new-done", "2026-08-01T10:00:00Z")],
      outcomes: [outcome("apt-old")],
    };
    const pruned = applyRetention(dataset, DEFAULT_RETENTION, NOW);
    expect(pruned.invitations.map((i) => i.id)).toEqual(["inv-old-open", "inv-new-done"]);
    expect(pruned.auditEvents.map((e) => e.subjectId)).toEqual(["inv-new-done"]);
    expect(pruned.outcomes).toEqual([]); // apt-old is beyond the 7y outcome window
  });

  it("a record exactly at the boundary is kept (strictly-older pruning)", () => {
    const boundary = new Date(Date.parse(NOW) - DEFAULT_RETENTION.auditEventRetentionDays * 86_400_000).toISOString();
    const dataset: PrivacyDataset = {
      invitations: [],
      appointments: [],
      auditEvents: [audit("x", boundary)],
      outcomes: [],
    };
    expect(applyRetention(dataset, DEFAULT_RETENTION, NOW).auditEvents).toHaveLength(1);
  });
});
