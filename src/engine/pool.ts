// W5: invitation pool builder — turns one clinician's open session capacity plus the eligible
// panel into the SMALLEST invitation batch expected to fill it (venture brief: send the fewest
// messages that fill the capacity; offers expire when the session books out).

import type { Appointment, Clinician, Invitation, InvitationId, Patient } from "@/domain/types";

export interface PoolConfig {
  /** Expected booking rate per invitation sent (calibrated from history; conservative default). */
  expectedResponseRate: number;
  /** Safety ceiling on batch size per session, whatever the arithmetic says. */
  maxInvitesPerSession: number;
}

export const DEFAULT_POOL_CONFIG: PoolConfig = {
  expectedResponseRate: 0.25,
  maxInvitesPerSession: 40,
};

/**
 * Rank eligible patients for a session. Deterministic, explainable, no ML:
 * chronic-care patients first, then longest since last visit, id as tiebreak.
 * (Ranking refines with real response data in later units — but only ever *within*
 * the eligible set from W4.)
 */
export function rankCandidates(eligible: Patient[]): Patient[] {
  return [...eligible].sort((a, b) => {
    if (a.chronicCare !== b.chronicCare) return a.chronicCare ? -1 : 1;
    const aSeen = a.lastAttendedAt ?? "9999-12-31";
    const bSeen = b.lastAttendedAt ?? "9999-12-31";
    if (aSeen !== bSeen) return aSeen < bSeen ? -1 : 1; // older date = longer overdue = first
    return a.id < b.id ? -1 : 1;
  });
}

/** Smallest batch expected to fill `openSlots`, honouring the safety ceiling. */
export function batchSize(openSlots: number, config: PoolConfig): number {
  if (openSlots <= 0) return 0;
  // A non-positive or non-finite response rate makes `needed` negative, zero or NaN, and
  // Math.min then hands slice() a value that invites nearly the whole eligible panel —
  // the safety ceiling silently inverted into a mass send. Refuse instead: a rate that
  // cannot size a batch is a misconfiguration, and sending nothing is the safe answer.
  // (W51 audit, medium.)
  if (!Number.isFinite(config.expectedResponseRate) || config.expectedResponseRate <= 0) return 0;
  const needed = Math.ceil(openSlots / config.expectedResponseRate);
  if (!Number.isFinite(needed) || needed <= 0) return 0;
  return Math.min(needed, Math.max(0, config.maxInvitesPerSession));
}

export function buildInvitationPool(
  sessionDate: string,
  clinician: Clinician,
  openAppointments: Appointment[],
  eligible: Patient[],
  config: PoolConfig,
  /**
   * W61 seam: how to order the eligible set. Defaults to W5's ranking, so every existing
   * caller and every committed golden is byte-unchanged. A gap-aware ranker (W61) slots in
   * here; whatever is passed must be a PERMUTATION of `eligible` — ordering is not the
   * place to add or remove a recipient.
   */
  rank: (eligible: Patient[]) => Patient[] = rankCandidates,
): Invitation[] {
  const slots = openAppointments.filter(
    (a) => a.clinicianId === clinician.id && a.status === "open" && a.startsAt.startsWith(sessionDate),
  ).length;
  const size = batchSize(slots, config);
  return rank(eligible)
    .slice(0, size)
    .map((patient, i) => ({
      id: `inv-${sessionDate}-${clinician.id}-${i}` as InvitationId,
      practiceId: clinician.practiceId,
      patientId: patient.id,
      clinicianId: clinician.id,
      sessionDate,
      status: "queued" as const,
      sentAt: null,
    }));
}

/**
 * Expire outstanding offers once the session's open capacity is exhausted.
 * Returns a NEW array (no mutation) with queued/sent invitations expired when full.
 */
export function expireOnFill(
  invitations: Invitation[],
  remainingOpenSlots: number,
): Invitation[] {
  if (remainingOpenSlots > 0) return invitations;
  return invitations.map((inv) =>
    inv.status === "queued" || inv.status === "sent" ? { ...inv, status: "expired" } : inv,
  );
}
