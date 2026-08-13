// W27: PMS read-adapter interface. Every practice-management-system integration
// (Best Practice, Halo, HotDoc, …) is an anti-corruption layer that maps the PMS's
// own shapes onto these normalised Meherr reads. The contract in ./contract is
// the suite EVERY adapter must pass before it ships — so a new PMS is "done" the
// day its adapter is green against the contract, with no surprises downstream.
//
// This unit is read-only and credential-free (founder gate G1): the real BP/Halo
// adapters (W28) arrive behind flags with recorded fixtures; here the only
// implementation is the synthetic adapter over the W3 practice.

import type { Appointment, Patient } from "@/domain/types";

export interface DateRange {
  /** Inclusive ISO date (YYYY-MM-DD). */
  fromIso: string;
  /** Inclusive ISO date (YYYY-MM-DD). */
  toIso: string;
}

/** A slot that was booked and later cancelled — the late-cancellation signal (W30 acts on it). */
export interface Cancellation {
  appointmentId: string;
  clinicianId: string;
  patientId: string;
  startsAt: string; // ISO datetime of the freed slot
  cancelledAt: string; // ISO datetime the cancellation was recorded
}

/** SMS/contact consent as the PMS holds it — provenance matters for compliance (W32). */
export interface ConsentRecord {
  patientId: string;
  smsConsent: boolean;
  capturedAt: string; // ISO datetime
  source: string; // e.g. "pms:intake-form"
}

/**
 * The read surface Meherr needs from any PMS. Read-only by design in Phase 1 —
 * Meherr never writes back to the PMS. All reads are practice-scoped: an adapter
 * instance serves exactly one practice, returned on every row as `practiceId`.
 */
export interface PmsReadAdapter {
  /** Stable identifier for the integration, e.g. "synthetic", "best-practice". */
  readonly name: string;
  /** The practice this adapter reads. */
  readonly practiceId: string;

  listPatients(): Promise<Patient[]>;
  /** Open (bookable) slots whose start date falls within `range`. */
  listOpenSlots(range: DateRange): Promise<Appointment[]>;
  /** Cancellations recorded within `range` (by `cancelledAt`). */
  listCancellations(range: DateRange): Promise<Cancellation[]>;
  /** Consent records, one per patient the adapter knows. */
  listConsents(): Promise<ConsentRecord[]>;
}

/** True when an ISO datetime/date's date-part is within [from, to] inclusive. */
export function withinRange(iso: string, range: DateRange): boolean {
  const date = iso.slice(0, 10);
  return date >= range.fromIso && date <= range.toIso;
}
