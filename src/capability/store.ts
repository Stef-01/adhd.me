// W81: interest store (mock, synthetic only — globalThis, same posture as the other
// phase-1 stores). Holds what clinicians have said about the case mix they would take on.

import type { ClinicianId, ConditionCode, PracticeId } from "@/domain/types";
import { emptyInterestState, type InterestState } from "./interest";

const globalStore = globalThis as { __careyieldInterest?: InterestState };

export function getInterestState(): InterestState {
  globalStore.__careyieldInterest ??= emptyInterestState();
  return globalStore.__careyieldInterest;
}

export function resetInterestState(): InterestState {
  globalStore.__careyieldInterest = emptyInterestState();
  return globalStore.__careyieldInterest;
}

/** Convenience for the mock route: everything one clinician has stated. */
export function statedBy(practiceId: PracticeId, clinicianId: ClinicianId) {
  return Object.values(getInterestState().byKey).filter(
    (i) => i.practiceId === practiceId && i.clinicianId === clinicianId,
  );
}

export type { ConditionCode };
