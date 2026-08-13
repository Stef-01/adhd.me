// W4: deterministic eligibility rules engine.
// This is the clinical-safety boundary of Phase 1: a patient the rules exclude can NEVER be
// invited, whatever any later ranking layer prefers (venture brief: AI ranks only within
// deterministic eligibility). Every exclusion returns a reason code for the audit log.

import type { Clinician, ClinicianId, Patient } from "@/domain/types";

export interface EligibilityConfig {
  /** Practice-set floor: never invite someone seen more recently than this. */
  minDaysSinceLastVisit: number;
  /** Never invite a patient with an existing booking inside this window. */
  futureBookingBlockDays: number;
  /** Contact-frequency cap: max invitations per patient in the trailing window. */
  maxInvitesPerQuarter: number;
  /** Restrict to patients whose usual clinician is the one with availability. */
  usualClinicianOnly: boolean;
  /** Restrict to patients flagged with ongoing care needs. */
  chronicCareOnly: boolean;
}

/** The reference config mirrors the venture brief's practice controls. */
export const DEFAULT_CONFIG: EligibilityConfig = {
  minDaysSinceLastVisit: 180,
  futureBookingBlockDays: 60,
  maxInvitesPerQuarter: 2,
  usualClinicianOnly: true,
  chronicCareOnly: false,
};

export type ExclusionReason =
  | "opted_out"
  | "no_sms_consent"
  | "holdout_arm"
  | "active_recall"
  | "future_booking"
  | "seen_too_recently"
  | "never_attended"
  | "not_usual_clinician"
  | "not_chronic_care"
  | "invite_cap_reached"
  | "clinician_not_participating";

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: ExclusionReason };

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.floor((to - from) / 86_400_000);
}

/**
 * Evaluate one patient for an availability invitation with `clinician` on `todayIso`.
 * Order matters: hard consent/safety exclusions first, preference filters last, so the
 * audit log always shows the most serious applicable reason.
 */
export function evaluateEligibility(
  patient: Patient,
  clinician: Clinician,
  config: EligibilityConfig,
  todayIso: string,
  invitesLastQuarter: number,
): EligibilityResult {
  if (!clinician.participating) return { eligible: false, reason: "clinician_not_participating" };
  if (patient.optedOut) return { eligible: false, reason: "opted_out" };
  if (!patient.smsConsent) return { eligible: false, reason: "no_sms_consent" };
  if (patient.holdout) return { eligible: false, reason: "holdout_arm" };
  if (patient.activeRecall) return { eligible: false, reason: "active_recall" };
  if (patient.futureBookingAt !== null) {
    const daysUntil = daysBetween(todayIso, patient.futureBookingAt);
    // A booking in the PAST is not a future booking. daysUntil goes negative for a stale
    // date, and negative is <= the block window, so the old check excluded such a patient
    // for ever — silently, and logged as "future_booking", which was false. Stale
    // futureBookingAt values are ordinary in PMS data (an appointment that happened, or was
    // cancelled without the field being cleared), so this was a patient who could never be
    // contacted again and no report would say why. (W51 audit.)
    if (daysUntil >= 0 && daysUntil <= config.futureBookingBlockDays) {
      return { eligible: false, reason: "future_booking" };
    }
  }
  if (patient.lastAttendedAt === null) {
    // Established-patient product: someone who has never attended is not "returning".
    return { eligible: false, reason: "never_attended" };
  }
  if (daysBetween(patient.lastAttendedAt, todayIso) < config.minDaysSinceLastVisit) {
    return { eligible: false, reason: "seen_too_recently" };
  }
  if (invitesLastQuarter >= config.maxInvitesPerQuarter) {
    return { eligible: false, reason: "invite_cap_reached" };
  }
  if (config.usualClinicianOnly && patient.usualClinicianId !== clinician.id) {
    return { eligible: false, reason: "not_usual_clinician" };
  }
  if (config.chronicCareOnly && !patient.chronicCare) {
    return { eligible: false, reason: "not_chronic_care" };
  }
  return { eligible: true };
}

/** All eligible patients for a clinician's availability, with exclusion tallies for auditing. */
export function eligibleForClinician(
  patients: Patient[],
  clinician: Clinician,
  config: EligibilityConfig,
  todayIso: string,
  invitesLastQuarterByPatient: ReadonlyMap<string, number>,
): { eligible: Patient[]; exclusionTally: Record<ExclusionReason, number> } {
  const eligible: Patient[] = [];
  const exclusionTally = {} as Record<ExclusionReason, number>;
  for (const patient of patients) {
    const result = evaluateEligibility(
      patient,
      clinician,
      config,
      todayIso,
      invitesLastQuarterByPatient.get(patient.id) ?? 0,
    );
    if (result.eligible) eligible.push(patient);
    else exclusionTally[result.reason] = (exclusionTally[result.reason] ?? 0) + 1;
  }
  return { eligible, exclusionTally };
}

export type { ClinicianId };
