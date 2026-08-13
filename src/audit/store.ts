// W15: usefulness-audit store (mock, synthetic only — same globalThis posture as
// the W7 rail and W11 console stores; Supabase persistence replaces this when the
// live rail lands). Holds attended, invitation-generated appointments awaiting a
// GP audit, plus the outcome records captured so far.
//
// W209 SCOPED IT TO A PRACTICE, and the defect was the one Y4-1 found in complaints, in the
// same shape, one module over:
//
//   `AuditState` carried ONE `practiceId`, the literal `"prac-console"` — an id no console has
//   ever minted (`prac-1`, `prac-2`, …). Every seeded visit therefore belonged to nobody, so the
//   page had to read the whole store to show anything, and did: whichever practice was signed in
//   saw every practice's attended appointments and could record an outcome against any of them.
//   `submitUsefulness` DID authorize — against its own practice — and then wrote to a queue that
//   had no practice at all, so the grant was checked at a boundary the write did not cross.
//
// That is a WRITE across a tenancy boundary, which is worse than the read Y4-1 found: a
// clinician at practice B could record "this appointment was worthwhile" against practice A's
// patient visit, and A's own usefulness tally would carry it.
//
// THE SINGLE-PRACTICE ASSUMPTION WAS IN THE TYPE, so that is where the fix is. `AuditState` no
// longer has a `practiceId`; each visit carries its own, and every read takes the practice as
// the query rather than filtering afterwards (W123's rule — a later filter is a line somebody
// can delete, and the deletion looks like a simplification).

import { validateSubmission, type UsefulnessSubmission, type ValidationError } from "@/audit/usefulness";
import type { AppointmentId, OutcomeRecord, PracticeId } from "@/domain/types";

export interface AuditableVisit {
  appointmentId: AppointmentId;
  /** W209: which practice's appointment this was. Was a single field on the state. */
  practiceId: PracticeId;
  patientLabel: string; // synthetic, de-identified ("Patient 4821") — never a real name
  attendedAt: string; // ISO datetime
}

export interface AuditState {
  visits: AuditableVisit[];
  outcomes: OutcomeRecord[];
}

/**
 * The practice the synthetic queue is seeded for.
 *
 * `prac-1` is what the console's onboarding mints first (W166 generates `prac-${n}`), so the
 * seeded queue and a freshly-onboarded practice are the same one. W181 had to state this
 * explicitly for the booking rail after the unscoped read hid the mismatch for a whole year;
 * stating it here is cheaper than re-learning it. The mock route re-keys it when a spec needs
 * a different practice — a fixture, never a product path.
 */
export const AUDIT_SEED_PRACTICE_ID = "prac-1" as PracticeId;

function seed(): AuditState {
  return {
    visits: [
      { appointmentId: "apt-501" as AppointmentId, practiceId: AUDIT_SEED_PRACTICE_ID, patientLabel: "Patient 4821", attendedAt: "2026-09-01T09:30:00+10:00" },
      { appointmentId: "apt-502" as AppointmentId, practiceId: AUDIT_SEED_PRACTICE_ID, patientLabel: "Patient 7302", attendedAt: "2026-09-01T10:15:00+10:00" },
      { appointmentId: "apt-503" as AppointmentId, practiceId: AUDIT_SEED_PRACTICE_ID, patientLabel: "Patient 1188", attendedAt: "2026-09-02T14:00:00+10:00" },
    ],
    outcomes: [],
  };
}

const globalStore = globalThis as { __careyieldAudit?: AuditState };

export function getAudit(): AuditState {
  globalStore.__careyieldAudit ??= seed();
  return globalStore.__careyieldAudit;
}

export function resetAudit(): AuditState {
  globalStore.__careyieldAudit = seed();
  return globalStore.__careyieldAudit;
}

/** Visits with no outcome recorded yet, for ONE practice — what the one-tap form shows. */
export function pendingVisitsFor(practiceId: PracticeId): AuditableVisit[] {
  const state = getAudit();
  const done = new Set(state.outcomes.map((o) => o.appointmentId));
  return state.visits.filter((v) => v.practiceId === practiceId && !done.has(v.appointmentId));
}

/** One practice's recorded outcomes — the only input the tally should ever see. */
export function outcomesFor(practiceId: PracticeId): OutcomeRecord[] {
  return getAudit().outcomes.filter((o) => o.practiceId === practiceId);
}

export type RecordResult =
  | { ok: true }
  | { ok: false; error: ValidationError | "unknown_visit" | "already_recorded" };

/**
 * Validate and persist one audit submission for a named practice.
 *
 * A visit belonging to ANOTHER practice is refused as `unknown_visit` — deliberately the same
 * answer as a visit that does not exist. A distinct error would confirm that the appointment is
 * real and held somewhere else, which is a disclosure made by an error path (W244's rule, early).
 */
export function recordOutcome(submission: UsefulnessSubmission, practiceId: PracticeId): RecordResult {
  const state = getAudit();
  const visit = state.visits.find(
    (v) => v.appointmentId === submission.appointmentId && v.practiceId === practiceId,
  );
  if (!visit) return { ok: false, error: "unknown_visit" };
  if (state.outcomes.some((o) => o.appointmentId === submission.appointmentId)) {
    return { ok: false, error: "already_recorded" };
  }
  const result = validateSubmission(submission, visit.practiceId);
  if (!result.ok) return { ok: false, error: result.error };
  state.outcomes = [...state.outcomes, result.record];
  return { ok: true };
}
