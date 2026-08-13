// W71: recall coexistence — never duplicate a recall the practice is already running.
//
// The practice was managing recalls long before Meherr arrived. If a patient is already
// on the practice's own recall list for their diabetes cycle of care, a Meherr offer
// about the same gap is not a second chance to book — it is the practice appearing to
// contact them twice about one thing, which reads as disorganised at best and as pressure
// at worst. W16's contact-frequency caps limit how often we write; this limits whether we
// should write at all.
//
// Two deliberate choices, both erring toward silence:
//
//   * An UNSCOPED recall (no condition recorded) suppresses every gap for that patient.
//     A recall we cannot attribute might be about anything, and guessing it is unrelated
//     is the guess that produces the duplicate. This matches the existing coarse
//     `patient.activeRecall` posture in the eligibility engine rather than loosening it.
//   * Only OPEN recalls suppress. A closed recall is finished work, and treating it as
//     live would silence a register permanently after one completed cycle.
//
// Nothing here is a clinical judgement: it compares condition codes and open/closed status.
// Whether a recall is clinically "the same thing" as a gap is the practice's call, and the
// practice's recall is the one that wins.

import type { ConditionCode, PatientId, PracticeId } from "@/domain/types";
import type { CareGap } from "./caregap";

export type RecallStatus = "open" | "closed";

export interface PracticeRecall {
  practiceId: PracticeId;
  patientId: PatientId;
  /** null when the practice's recall carries no condition — treated as covering everything. */
  conditionCode: ConditionCode | null;
  status: RecallStatus;
  openedAt: string;
  closedAt?: string | null;
}

export type SuppressionReason =
  | "recall_same_condition"
  | "recall_unscoped"
  | "patient_active_recall";

export interface SuppressedGap {
  gap: CareGap;
  reason: SuppressionReason;
  /** When the practice opened the recall that won, where there is one. */
  recallOpenedAt?: string;
}

export interface RecallReconciliation {
  /** Gaps no practice recall is already covering. */
  send: CareGap[];
  /** Gaps withheld, each with the recall that took precedence. */
  suppressed: SuppressedGap[];
}

export interface ReconcileOptions {
  /**
   * Patients carrying the legacy coarse `activeRecall` flag (W3 domain model). Kept as a
   * separate input because it predates condition-scoped recalls and is still what the
   * eligibility engine reads; a patient flagged here has every gap suppressed.
   */
  patientsWithActiveRecall?: ReadonlySet<PatientId>;
}

function isOpen(recall: PracticeRecall): boolean {
  return recall.status === "open";
}

/**
 * Decide which care gaps may be offered, given what the practice is already recalling.
 *
 * Suppression is reported rather than silent: a gap that disappears without a recorded
 * reason is indistinguishable from a bug, and the ops surfaces need to explain to a
 * practice why a register with members produced no offers.
 */
export function reconcileWithRecalls(
  gaps: readonly CareGap[],
  recalls: readonly PracticeRecall[],
  options: ReconcileOptions = {},
): RecallReconciliation {
  // Derived from the gaps themselves: they all belong to one practice by construction
  // (detectCareGaps copies it from the membership). Null only when there are no gaps.
  const practiceId = gaps[0]?.practiceId ?? null;
  const flagged = options.patientsWithActiveRecall ?? new Set<PatientId>();

  // Index the open recalls once: unscoped by patient, scoped by patient+condition.
  const unscoped = new Map<string, PracticeRecall>();
  const scoped = new Map<string, PracticeRecall>();

  for (const recall of recalls) {
    if (!isOpen(recall)) continue;
    // Tenancy: PracticeRecall carries practiceId and it was never read, so a recall owned
    // by one practice could suppress another's care gaps on a colliding patient id. Gaps
    // now carry their practice (W58), so scope against it rather than trusting the caller.
    if (practiceId !== null && recall.practiceId !== practiceId) continue;
    if (recall.conditionCode === null) {
      const existing = unscoped.get(recall.patientId);
      // Keep the earliest open recall, so the reported date is when the practice
      // actually started managing it rather than whichever row happened to be last.
      if (!existing || recall.openedAt < existing.openedAt) unscoped.set(recall.patientId, recall);
      continue;
    }
    const key = `${recall.patientId}::${recall.conditionCode}`;
    const existing = scoped.get(key);
    if (!existing || recall.openedAt < existing.openedAt) scoped.set(key, recall);
  }

  const send: CareGap[] = [];
  const suppressed: SuppressedGap[] = [];

  for (const gap of gaps) {
    if (flagged.has(gap.patientId)) {
      suppressed.push({ gap, reason: "patient_active_recall" });
      continue;
    }

    const sameCondition = scoped.get(`${gap.patientId}::${gap.conditionCode}`);
    if (sameCondition) {
      suppressed.push({
        gap,
        reason: "recall_same_condition",
        recallOpenedAt: sameCondition.openedAt,
      });
      continue;
    }

    const general = unscoped.get(gap.patientId);
    if (general) {
      suppressed.push({ gap, reason: "recall_unscoped", recallOpenedAt: general.openedAt });
      continue;
    }

    send.push(gap);
  }

  return { send, suppressed };
}

/** Suppression tallies for the ops/report surfaces. */
export function suppressionCounts(
  reconciliation: RecallReconciliation,
): Record<SuppressionReason, number> {
  const counts: Record<SuppressionReason, number> = {
    recall_same_condition: 0,
    recall_unscoped: 0,
    patient_active_recall: 0,
  };
  for (const item of reconciliation.suppressed) counts[item.reason] += 1;
  return counts;
}
