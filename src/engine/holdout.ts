// W8: holdout engine — assigns every patient to an arm (holdout control vs invitable) by
// stable hashing, at the practice-configured holdout rate. The holdout arm is the measurement
// backbone: incrementality (W9) is only credible if assignment is deterministic, unbiased and
// auditable. No RNG here — the hash of (practice, patient) IS the draw, so re-running
// assignment can never reshuffle arms.

import type { AuditEvent, Patient, Practice } from "@/domain/types";

export type Arm = "holdout" | "invite";

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// murmur3 finalizer: FNV alone clusters on near-identical keys like "pat-1"/"pat-2";
// mixing restores uniformity, which the balance test asserts statistically.
function fmix32(input: number): number {
  let h = input;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Deterministic draw in [0, 1) for one patient at one practice. Salted by practice id so
 * the same patient panel produces independent arms at different practices.
 */
export function assignmentUnit(practiceId: string, patientId: string): number {
  return fmix32(fnv1a32(`${practiceId}:${patientId}`)) / 4_294_967_296;
}

/**
 * Arm for one patient. Threshold hashing makes rate changes monotone: raising the rate only
 * adds holdouts (units between old and new threshold); it never releases an existing one.
 */
export function assignArm(practiceId: string, patientId: string, holdoutRate: number): Arm {
  return assignmentUnit(practiceId, patientId) < holdoutRate ? "holdout" : "invite";
}

export interface HoldoutAssignment {
  /** Panel with `holdout` flags set to the computed arm (new array; input untouched). */
  patients: Patient[];
  /** One audit event per patient whose stored arm changed — the exclusion audit trail. */
  auditEvents: AuditEvent[];
}

/**
 * Assign the whole panel for a practice. Emits an audit event only where the stored flag
 * differs from the computed arm, so a re-run at an unchanged rate is a no-op with an empty
 * trail — the stability property W9's attribution depends on.
 */
export function assignHoldout(
  patients: Patient[],
  practice: Practice,
  atIso: string,
): HoldoutAssignment {
  const auditEvents: AuditEvent[] = [];
  const assigned = patients.map((patient) => {
    const holdout = assignArm(practice.id, patient.id, practice.holdoutRate) === "holdout";
    if (holdout !== patient.holdout) {
      auditEvents.push({
        practiceId: practice.id,
        kind: "holdout_assigned",
        at: atIso,
        subjectId: patient.id,
        detail: `arm=${holdout ? "holdout" : "invite"} rate=${practice.holdoutRate}`,
      });
      return { ...patient, holdout };
    }
    return patient;
  });
  return { patients: assigned, auditEvents };
}
