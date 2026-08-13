// W33: data-retention + privacy controls. Three pure capabilities over the platform's
// patient-touching records:
//   export  — everything held about one patient, assembled for an APP 12 access request;
//   delete  — removal of the patient's identifiable records, leaving a hashed deletion
//             record (proof without re-identification) and a suppression entry so a
//             deleted patient is never re-contacted by a later PMS re-ingest;
//   retention — age-based pruning of terminal records per practice-configurable windows.
// Deletion and suppression records are deliberately EXEMPT from retention: they are the
// evidence the obligation was met.

import { createHash } from "node:crypto";
import type { Appointment, AuditEvent, Invitation, OutcomeRecord } from "@/domain/types";

export interface RetentionConfig {
  /** Terminal invitations (expired/opted_out/booked) older than this are purged. */
  invitationRetentionDays: number;
  /** Audit events older than this are purged. */
  auditEventRetentionDays: number;
  /** Outcome records whose appointment is older than this are purged. */
  outcomeRetentionDays: number;
}

/** Defaults follow the health-records posture: keep clinical-adjacent records 7 years. */
export const DEFAULT_RETENTION: RetentionConfig = {
  invitationRetentionDays: 730,
  auditEventRetentionDays: 2555,
  outcomeRetentionDays: 2555,
};

export interface PrivacyDataset {
  invitations: Invitation[];
  appointments: Appointment[];
  auditEvents: AuditEvent[];
  outcomes: OutcomeRecord[];
}

/** One-way reference to a patient — provable identity match, no stored identifier. */
export function patientRef(patientId: string): string {
  return createHash("sha256").update(`careyield:patient:${patientId}`).digest("hex");
}

export interface SuppressionEntry {
  ref: string; // patientRef
  at: string;
}

export function isSuppressed(suppressions: readonly SuppressionEntry[], patientId: string): boolean {
  const ref = patientRef(patientId);
  return suppressions.some((s) => s.ref === ref);
}

export interface PatientExport {
  patientId: string;
  generatedAt: string;
  held: boolean;
  invitations: Invitation[];
  appointments: Appointment[];
  auditEvents: AuditEvent[];
  outcomes: OutcomeRecord[];
}

function patientAuditEvents(dataset: PrivacyDataset, patientId: string): AuditEvent[] {
  const invitationIds = new Set(
    dataset.invitations.filter((i) => i.patientId === patientId).map((i) => i.id as string),
  );
  return dataset.auditEvents.filter(
    (e) => e.subjectId === patientId || invitationIds.has(e.subjectId),
  );
}

/** Everything held about one patient, assembled for an access/export request. */
export function exportPatientData(
  dataset: PrivacyDataset,
  patientId: string,
  nowIso: string,
): PatientExport {
  const invitations = dataset.invitations.filter((i) => i.patientId === patientId);
  const appointments = dataset.appointments.filter((a) => a.patientId === patientId);
  const appointmentIds = new Set(appointments.map((a) => a.id as string));
  const outcomes = dataset.outcomes.filter((o) => appointmentIds.has(o.appointmentId as string));
  const auditEvents = patientAuditEvents(dataset, patientId);
  return {
    patientId,
    generatedAt: nowIso,
    held: invitations.length + appointments.length + auditEvents.length + outcomes.length > 0,
    invitations,
    appointments,
    auditEvents,
    outcomes,
  };
}

export interface DeletionRecord {
  /** Hashed reference — the record proves deletion without retaining the identifier. */
  ref: string;
  at: string;
  removed: {
    invitations: number;
    appointments: number;
    auditEvents: number;
    outcomes: number;
    /** W43 complaint links scrubbed. Composed by the store — this dataset has none. */
    complaints: number;
    /** W137 GP-to-GP referrals removed, on BOTH sides. Composed by the store, as above. */
    referrals: number;
  };
}

export interface DeletionResult {
  dataset: PrivacyDataset;
  deletion: DeletionRecord;
  suppression: SuppressionEntry;
}

/**
 * Remove a patient's identifiable records. Attended appointments lose their patient
 * link (the slot's history stays, the person does not); invitations, their audit
 * events, and their outcome records are removed outright.
 */
export function deletePatient(
  dataset: PrivacyDataset,
  patientId: string,
  nowIso: string,
): DeletionResult {
  const auditToRemove = new Set(patientAuditEvents(dataset, patientId));
  const ownAppointments = dataset.appointments.filter((a) => a.patientId === patientId);
  const appointmentIds = new Set(ownAppointments.map((a) => a.id as string));
  const removed = {
    invitations: dataset.invitations.filter((i) => i.patientId === patientId).length,
    appointments: ownAppointments.length,
    auditEvents: auditToRemove.size,
    outcomes: dataset.outcomes.filter((o) => appointmentIds.has(o.appointmentId as string)).length,
    complaints: 0, // filled by deletePatientEverywhere, which owns the complaints store
    referrals: 0, // likewise — the GP-to-GP rail is another store, composed there (W137)
  };
  return {
    dataset: {
      invitations: dataset.invitations.filter((i) => i.patientId !== patientId),
      appointments: dataset.appointments.map((a) =>
        a.patientId === patientId ? { ...a, patientId: null, generatedByInvitation: false } : a,
      ),
      auditEvents: dataset.auditEvents.filter((e) => !auditToRemove.has(e)),
      outcomes: dataset.outcomes.filter((o) => !appointmentIds.has(o.appointmentId as string)),
    },
    deletion: { ref: patientRef(patientId), at: nowIso, removed },
    suppression: { ref: patientRef(patientId), at: nowIso },
  };
}

const TERMINAL_INVITATION = new Set(["expired", "opted_out", "booked"]);

function olderThan(iso: string, nowIso: string, days: number): boolean {
  const ageMs = Date.parse(nowIso) - Date.parse(iso);
  return ageMs > days * 86_400_000;
}

/** Age-based pruning. Active (queued/sent) invitations are never pruned. */
export function applyRetention(
  dataset: PrivacyDataset,
  config: RetentionConfig,
  nowIso: string,
): PrivacyDataset {
  const appointmentStart = new Map(dataset.appointments.map((a) => [a.id as string, a.startsAt]));
  return {
    invitations: dataset.invitations.filter((i) => {
      if (!TERMINAL_INVITATION.has(i.status)) return true;
      const anchor = i.sentAt ?? `${i.sessionDate}T00:00:00Z`;
      return !olderThan(anchor, nowIso, config.invitationRetentionDays);
    }),
    appointments: dataset.appointments,
    auditEvents: dataset.auditEvents.filter(
      (e) => !olderThan(e.at, nowIso, config.auditEventRetentionDays),
    ),
    outcomes: dataset.outcomes.filter((o) => {
      const start = appointmentStart.get(o.appointmentId as string);
      return start === undefined || !olderThan(start, nowIso, config.outcomeRetentionDays);
    }),
  };
}
