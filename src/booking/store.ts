// W7: in-memory mock rail store behind the booking pages. Synthetic data only —
// deterministic seed, resettable via the mock API. Survives dev-mode module reloads
// through globalThis. Replaced by Supabase persistence when the live rail lands.

import { bookInvitation, type BookingResult, type RailState } from "@/booking/rail";
import type {
  AppointmentId,
  AppointmentType,
  ClinicianId,
  InvitationId,
  PatientId,
  PracticeId,
} from "@/domain/types";
import {
  DEFAULT_PREFERENCES,
  validatePreferences,
  type ContactPreferences,
} from "@/messaging/preferences";

export interface RailStore {
  state: RailState;
  practiceName: string;
  clinicianName: string;
  /**
   * W74: contact preferences the patient set for themselves.
   *
   * Keyed by `practiceId::patientId`, not by patient id alone. W65's hardening found the
   * unscoped version of this bug twice (W71 recalls, W64 closures): a patient id that
   * collided across practices let one practice's data act on another's. Here the damage
   * would be quieter and worse — one practice's patient could impose their quiet hours on
   * a different practice's patient, or reveal that they had set any.
   */
  contactPreferences: Record<string, ContactPreferences>;
}

/** W25: seed the rail with an in-person or a telehealth session (same shape). */
export type RailScenario = "standard" | "telehealth";

export const SEED_SESSION_DATE = "2026-09-01";

/**
 * The practice the synthetic rail is seeded for.
 *
 * Exported since W181: the console generates its own ids (`prac-${n}`), so the seed's practice
 * and a signed-in practice are different by construction. `queueView` used to fold the whole
 * rail with no filter, which hid that — the ops page showed this practice's invitations to
 * whoever was signed in. Fixtures that need the two to line up now say so explicitly.
 */
export const SEED_PRACTICE_ID = "prac-demo" as PracticeId;
const PRACTICE_ID = SEED_PRACTICE_ID;
const CLINICIAN_ID = "clin-demo" as ClinicianId;

function seed(scenario: RailScenario = "standard"): RailStore {
  const appointmentType: AppointmentType = scenario === "telehealth" ? "telehealth" : "standard";
  const slot = (n: number, time: string) => ({
    id: `apt-${n}` as AppointmentId,
    practiceId: PRACTICE_ID,
    clinicianId: CLINICIAN_ID,
    startsAt: `${SEED_SESSION_DATE}T${time}:00+10:00`,
    status: "open" as const,
    patientId: null,
    generatedByInvitation: false,
    appointmentType,
  });
  const invitation = (label: string, patient: number) => ({
    id: `inv-${label}` as InvitationId,
    practiceId: PRACTICE_ID,
    patientId: `pat-${patient}` as PatientId,
    clinicianId: CLINICIAN_ID,
    sessionDate: SEED_SESSION_DATE,
    status: "sent" as const,
    sentAt: "2026-08-25T09:00:00+10:00",
  });
  return {
    practiceName: "Demo Family Practice",
    clinicianName: "Dr Amara Lee",
    state: {
      appointments: [slot(1, "09:00"), slot(2, "09:15")],
      invitations: [invitation("a", 1), invitation("b", 2), invitation("c", 3)],
      auditEvents: [],
    },
    contactPreferences: {},
  };
}

const globalStore = globalThis as { __careyieldRail?: RailStore };

export function getStore(): RailStore {
  globalStore.__careyieldRail ??= seed();
  return globalStore.__careyieldRail;
}

export function resetStore(scenario: RailScenario = "standard"): RailStore {
  globalStore.__careyieldRail = seed(scenario);
  return globalStore.__careyieldRail;
}

/** The appointment type offered in an invitation's session (telehealth vs in-person). */
export function sessionAppointmentType(store: RailStore, invitation: { clinicianId: string; sessionDate: string }): AppointmentType | undefined {
  const inSession = store.state.appointments.find(
    (a) => a.clinicianId === invitation.clinicianId && a.startsAt.slice(0, 10) === invitation.sessionDate,
  );
  return inSession?.appointmentType;
}

/**
 * W74: record what a patient said about being contacted. Refuses an invalid window
 * rather than storing something that would silence them or open a 24-hour one.
 */
function preferenceKey(practiceId: string, patientId: string): string {
  return `${practiceId}::${patientId}`;
}

export function saveContactPreferences(
  practiceId: string,
  patientId: string,
  prefs: ContactPreferences,
): { ok: boolean; errors: string[] } {
  const validation = validatePreferences(prefs);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  getStore().contactPreferences[preferenceKey(practiceId, patientId)] = prefs;
  return { ok: true, errors: [] };
}

/** What we may do for this patient — their own answer, or the conservative default. */
export function contactPreferencesFor(
  practiceId: string,
  patientId: string,
): ContactPreferences {
  return getStore().contactPreferences[preferenceKey(practiceId, patientId)] ?? DEFAULT_PREFERENCES;
}

/** Book against the shared store, committing the new state on success or refusal. */
export function bookInStore(invitationId: string, at: string): BookingResult {
  const store = getStore();
  const result = bookInvitation(store.state, invitationId, at);
  store.state = result.state;
  return result;
}
