// W81: interest capture — a clinician states the case mix they would take more of.
//
// This is the ONLY self-reported input to the capability graph, and W79's whole design is
// about keeping it in its lane. Two rules follow from that and are enforced here rather than
// left to the console:
//
//   1. A CLINICIAN STATES THEIR OWN INTEREST. Not the practice manager on their behalf, and
//      not one clinician for another. An interest is a claim about a preference, and a claim
//      someone else made is not that person's preference — it is an instruction dressed as
//      one. `saveInterest` requires the acting clinician to be the subject.
//   2. INTEREST IS NEVER A CAPABILITY. The strength scale is bounded 1–5 and its labels are
//      about appetite ("would take some" … "would take much more"), never about skill. There
//      is no "expert" rung, because a self-reported expert rung is exactly the claim Ahpra
//      advertising rules and W79's separation both exist to prevent.
//
// Interest does not affect ranking on its own. W82 holds the law that it may only influence
// ranking once a competence floor is met; nothing here reaches the ranker.

import type {
  ClinicianId,
  ClinicianInterest,
  ConditionCode,
  PracticeId,
} from "@/domain/types";

export const MIN_STRENGTH = 1;
export const MAX_STRENGTH = 5;

/**
 * Appetite, not ability. Every label is about how much of this work the clinician would
 * take on — a test pins that none of them describes skill.
 */
export const STRENGTH_LABELS: Readonly<Record<number, string>> = {
  1: "Would take the occasional one",
  2: "Happy to take some",
  3: "Would take a regular share",
  4: "Would take more than my share",
  5: "Would take as much as the practice has",
};

export interface InterestState {
  /** Keyed by practiceId::clinicianId::conditionCode — scoped, per W78's finding. */
  byKey: Record<string, ClinicianInterest>;
}

export type SaveInterestResult =
  | { ok: true; interest: ClinicianInterest }
  | { ok: false; reason: "not_own_interest" | "strength_out_of_range" | "unknown_condition" };

function key(practiceId: string, clinicianId: string, conditionCode: string): string {
  return `${practiceId}::${clinicianId}::${conditionCode}`;
}

export function emptyInterestState(): InterestState {
  return { byKey: {} };
}

export interface SaveInterestInput {
  state: InterestState;
  practiceId: PracticeId;
  /** Who is performing the write. Must be the subject. */
  actingClinicianId: ClinicianId;
  subjectClinicianId: ClinicianId;
  conditionCode: ConditionCode;
  strength: number;
  knownConditions: readonly ConditionCode[];
  atIso: string;
}

export function saveInterest(input: SaveInterestInput): SaveInterestResult {
  if (input.actingClinicianId !== input.subjectClinicianId) {
    // A preference someone else recorded for you is not your preference.
    return { ok: false, reason: "not_own_interest" };
  }
  if (
    !Number.isInteger(input.strength) ||
    input.strength < MIN_STRENGTH ||
    input.strength > MAX_STRENGTH
  ) {
    return { ok: false, reason: "strength_out_of_range" };
  }
  if (!input.knownConditions.includes(input.conditionCode)) {
    // Refuse an unknown code rather than recording interest in a register that does not
    // exist — the same posture W60 takes on a stale form post.
    return { ok: false, reason: "unknown_condition" };
  }

  const interest: ClinicianInterest = {
    practiceId: input.practiceId,
    clinicianId: input.subjectClinicianId,
    conditionCode: input.conditionCode,
    strength: input.strength,
    // Pinned to the literal W79's CHECK admits: an interest row is self-reported by
    // definition and cannot be stamped as anything else.
    source: "clinician_self_reported",
    statedAt: input.atIso,
  };

  input.state.byKey[key(input.practiceId, input.subjectClinicianId, input.conditionCode)] = interest;
  return { ok: true, interest };
}

/** Clear a stated interest. Absence means "not stated", never strength 0. */
export function clearInterest(
  state: InterestState,
  practiceId: PracticeId,
  clinicianId: ClinicianId,
  conditionCode: ConditionCode,
): void {
  delete state.byKey[key(practiceId, clinicianId, conditionCode)];
}

/** One clinician's stated interests, strongest first then by condition for stability. */
export function interestsFor(
  state: InterestState,
  practiceId: PracticeId,
  clinicianId: ClinicianId,
): ClinicianInterest[] {
  return Object.values(state.byKey)
    .filter((i) => i.practiceId === practiceId && i.clinicianId === clinicianId)
    .sort((a, b) => {
      if (a.strength !== b.strength) return b.strength - a.strength;
      return (a.conditionCode as string).localeCompare(b.conditionCode as string);
    });
}

export function interestIn(
  state: InterestState,
  practiceId: PracticeId,
  clinicianId: ClinicianId,
  conditionCode: ConditionCode,
): ClinicianInterest | null {
  return state.byKey[key(practiceId, clinicianId, conditionCode)] ?? null;
}
