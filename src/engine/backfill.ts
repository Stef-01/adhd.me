// W30: late-cancellation fast path. A booked slot freed close to its start time is
// the highest-value moment in the product — capacity that WILL go unused unless it is
// backfilled now, not at the next weekly cycle. This module classifies late
// cancellations and builds a minimal single-slot backfill pool through exactly the
// same safety stack as the weekly path: W17 offerability, W4 eligibility, W5 ranking.

import type { Appointment, Clinician, Invitation, InvitationId, Patient } from "@/domain/types";
import { eligibleForClinician, type EligibilityConfig } from "@/engine/eligibility";
import { batchSize, rankCandidates, type PoolConfig } from "@/engine/pool";
import { isOfferable, type SessionConfig } from "@/session/config";

export interface BackfillConfig {
  /** A cancellation within this many hours of the slot's start counts as late. */
  lateWindowHours: number;
}

export const DEFAULT_BACKFILL_CONFIG: BackfillConfig = { lateWindowHours: 48 };

/** Late = the freed slot starts within the window after the cancellation moment. */
export function isLateCancellation(
  slotStartsAtIso: string,
  cancelledAtIso: string,
  config: BackfillConfig,
): boolean {
  const startMs = Date.parse(slotStartsAtIso);
  const cancelledMs = Date.parse(cancelledAtIso);
  if (Number.isNaN(startMs) || Number.isNaN(cancelledMs)) return false;
  const hoursUntilStart = (startMs - cancelledMs) / 3_600_000;
  return hoursUntilStart >= 0 && hoursUntilStart <= config.lateWindowHours;
}

export interface BackfillPoolResult {
  invitations: Invitation[];
  /** Why no invitations were produced, when they weren't. */
  skipped: "slot_not_offerable" | "no_eligible_patients" | null;
}

/**
 * Build the backfill pool for ONE freed slot. The slot must itself be offerable under
 * the session config (a practice's protected/out-of-window capacity stays protected
 * even when freed by a cancellation); candidates come from the same eligibility rules
 * and ranking as the weekly path, sized by the pool calculator for a single slot.
 */
export function buildBackfillPool(
  freedSlot: Appointment,
  clinician: Clinician,
  patients: Patient[],
  eligibility: EligibilityConfig,
  session: SessionConfig,
  pool: PoolConfig,
  todayIso: string,
  invitesLastQuarterByPatient: ReadonlyMap<string, number>,
  sentAtIso: string,
): BackfillPoolResult {
  if (!isOfferable(freedSlot, session)) {
    return { invitations: [], skipped: "slot_not_offerable" };
  }
  const { eligible } = eligibleForClinician(
    patients,
    clinician,
    eligibility,
    todayIso,
    invitesLastQuarterByPatient,
  );
  if (eligible.length === 0) return { invitations: [], skipped: "no_eligible_patients" };
  const sessionDate = freedSlot.startsAt.slice(0, 10);
  const invitations = rankCandidates(eligible)
    .slice(0, batchSize(1, pool))
    .map((patient, i) => ({
      id: `inv-bf-${freedSlot.id}-${i}` as InvitationId,
      practiceId: clinician.practiceId,
      patientId: patient.id,
      clinicianId: clinician.id,
      sessionDate,
      status: "queued" as const,
      sentAt: sentAtIso,
    }));
  return { invitations, skipped: null };
}
