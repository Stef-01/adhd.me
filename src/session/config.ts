// W17: session configuration — the practice controls on WHICH availability the
// loop is allowed to offer. Four dials (venture brief §Phase 1 practice controls):
//   - participating clinicians (only their sessions are offered);
//   - fillable appointment types (never offer types the practice keeps for itself);
//   - protected capacity (reserve a fraction of open slots, never offered);
//   - scheduling window (only offer slots whose local start hour is in-window —
//     the quiet-hours / scheduling-window control).
// Pure functions here; honoured by the sim (W12) and, later, the live rail.

import type { Appointment, AppointmentType, ClinicianId } from "@/domain/types";

export const APPOINTMENT_TYPES: readonly AppointmentType[] = ["standard", "long", "telehealth"];

export interface SchedulingWindow {
  /** Inclusive local start hour (0–24). */
  startHour: number;
  /** Exclusive local end hour (0–24). */
  endHour: number;
}

export interface SessionConfig {
  /** Clinician allowlist, or "all" for every participating clinician. */
  participatingClinicianIds: string[] | "all";
  /** Appointment types the loop may fill. */
  fillableTypes: AppointmentType[];
  /** Fraction (0..1) of a session's open slots reserved and never offered. */
  protectedCapacityFraction: number;
  /** Only slots whose local start hour falls in this window are offerable. */
  schedulingWindow: SchedulingWindow;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  participatingClinicianIds: "all",
  fillableTypes: [...APPOINTMENT_TYPES],
  protectedCapacityFraction: 0,
  schedulingWindow: { startHour: 0, endHour: 24 },
};

/**
 * W41: validate a session config before it is stored. W17 built these dials for the
 * sim, where values came from code; the onboarding wizard now lets a practice type
 * them in, so out-of-range input has to be refused rather than silently producing a
 * nonsense offer set (a fraction above 1 would offer negative slots; an inverted
 * window would offer none). Keys mirror the form field names.
 */
export function validateSessionConfig(config: SessionConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  const { protectedCapacityFraction: fraction, schedulingWindow: window } = config;

  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    errors.protectedCapacityFraction = "Protected capacity must be between 0 and 100 percent.";
  }
  for (const [key, hour] of [
    ["startHour", window.startHour],
    ["endHour", window.endHour],
  ] as const) {
    if (!Number.isInteger(hour) || hour < 0 || hour > 24) {
      errors[key] = "Hours must be whole numbers between 0 and 24.";
    }
  }
  if (!errors.startHour && !errors.endHour && window.startHour >= window.endHour) {
    errors.endHour = "The window must end after it starts.";
  }
  if (config.fillableTypes.length === 0) {
    errors.fillableTypes = "Choose at least one appointment type to fill.";
  }
  for (const type of config.fillableTypes) {
    if (!APPOINTMENT_TYPES.includes(type)) errors.fillableTypes = "Unknown appointment type.";
  }
  if (config.participatingClinicianIds !== "all" && config.participatingClinicianIds.length === 0) {
    errors.participatingClinicianIds = "Choose at least one participating clinician.";
  }
  return errors;
}

export function clinicianParticipates(config: SessionConfig, clinicianId: ClinicianId): boolean {
  return (
    config.participatingClinicianIds === "all" ||
    config.participatingClinicianIds.includes(clinicianId)
  );
}

/** Local hour-of-day from an ISO datetime whose offset is the local zone (e.g. "...T09:15:00+10:00"). */
export function localHour(startsAt: string): number {
  return Number(startsAt.slice(11, 13));
}

/** An open slot is offerable if its type is fillable and its start hour is in-window. */
export function isOfferable(appointment: Appointment, config: SessionConfig): boolean {
  if (appointment.status !== "open") return false;
  if (appointment.appointmentType !== undefined && !config.fillableTypes.includes(appointment.appointmentType)) {
    return false;
  }
  const hour = localHour(appointment.startsAt);
  return hour >= config.schedulingWindow.startHour && hour < config.schedulingWindow.endHour;
}

/**
 * The slots the loop may actually offer for one session, after type/window
 * filtering and reserving the protected-capacity fraction. Deterministic:
 * slots are ordered by start time and the latest `protected` ones are held back.
 */
export function offerableSlots(openAppointments: Appointment[], config: SessionConfig): Appointment[] {
  const eligible = openAppointments
    .filter((a) => isOfferable(a, config))
    .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
  const protectedCount = Math.ceil(eligible.length * config.protectedCapacityFraction);
  return eligible.slice(0, eligible.length - protectedCount);
}
