// W24: usual-GP continuity metrics. The brief's clinical argument is that filling
// gaps must not fragment care — so we measure it: (1) the share of attended visits
// that happened with the patient's usual GP, split generated vs organic so the
// product's effect on continuity is visible; (2) a Usual Provider of Care (UPC)
// index per panel — visit concentration, independent of who is nominated usual GP.

import type { Appointment, Patient } from "@/domain/types";

export interface ContinuityConfig {
  /** Minimum attended visits in the window before a patient's UPC is meaningful. */
  minVisitsForUpc: number;
}

export const DEFAULT_CONTINUITY_CONFIG: ContinuityConfig = { minVisitsForUpc: 2 };

export interface UsualGpShare {
  /** Attended visits by patients who have a nominated usual GP. */
  appointments: number;
  withUsualGp: number;
  /** withUsualGp / appointments; null when there is no denominator. */
  share: number | null;
}

export interface ContinuityReport {
  overall: UsualGpShare;
  generated: UsualGpShare;
  organic: UsualGpShare;
  panel: {
    /** Patients with >= minVisitsForUpc attended visits (usual GP not required). */
    qualifyingPatients: number;
    /** Mean UPC across qualifying patients; null when none qualify. */
    meanUpc: number | null;
  };
}

/** UPC index for one patient's attended visits: max share seen by a single clinician. */
export function upcIndex(visitClinicianIds: readonly string[]): number | null {
  if (visitClinicianIds.length === 0) return null;
  const counts = new Map<string, number>();
  for (const id of visitClinicianIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return Math.max(...counts.values()) / visitClinicianIds.length;
}

function emptyShare(): { appointments: number; withUsualGp: number } {
  return { appointments: 0, withUsualGp: 0 };
}

function finalise(s: { appointments: number; withUsualGp: number }): UsualGpShare {
  return { ...s, share: s.appointments === 0 ? null : s.withUsualGp / s.appointments };
}

/**
 * Continuity over attended visits at one practice. Visits by unknown patients or at
 * other practices never count. Usual-GP share counts only patients with a nominated
 * usual GP; UPC counts every patient with enough visits.
 */
export function continuityReport(
  practiceId: string,
  patients: readonly Patient[],
  appointments: readonly Appointment[],
  config: ContinuityConfig,
): ContinuityReport {
  const patientById = new Map(patients.filter((p) => p.practiceId === practiceId).map((p) => [p.id, p]));
  const overall = emptyShare();
  const generated = emptyShare();
  const organic = emptyShare();
  const visitsByPatient = new Map<string, string[]>();

  for (const a of appointments) {
    if (a.practiceId !== practiceId || a.status !== "attended" || a.patientId === null) continue;
    const patient = patientById.get(a.patientId);
    if (!patient) continue;

    const visits = visitsByPatient.get(patient.id) ?? [];
    visits.push(a.clinicianId);
    visitsByPatient.set(patient.id, visits);

    if (patient.usualClinicianId === null) continue; // no nominated GP — no affinity to measure
    const bucket = a.generatedByInvitation ? generated : organic;
    const match = a.clinicianId === patient.usualClinicianId;
    overall.appointments++;
    bucket.appointments++;
    if (match) {
      overall.withUsualGp++;
      bucket.withUsualGp++;
    }
  }

  const upcs: number[] = [];
  for (const visits of visitsByPatient.values()) {
    if (visits.length < config.minVisitsForUpc) continue;
    const upc = upcIndex(visits);
    if (upc !== null) upcs.push(upc);
  }

  return {
    overall: finalise(overall),
    generated: finalise(generated),
    organic: finalise(organic),
    panel: {
      qualifyingPatients: upcs.length,
      meanUpc: upcs.length === 0 ? null : upcs.reduce((a, b) => a + b, 0) / upcs.length,
    },
  };
}
