// W92: referral capture — referrals written but not completed.
//
// A referral that was written and never acted on is the clearest signal a practice has that
// something fell through, and it is invisible in the PMS without going looking. This module
// reads what the PMS already holds; it does not decide what anyone should do about it.
//
// Three boundaries, all of which the later leakage work (W93) depends on being right here:
//
//   1. READ-ONLY, AND FROM INGESTED DATA ONLY. Referrals are facts the practice recorded, the
//      same posture as W57's condition flags. Nothing here creates, edits or infers a referral.
//   2. "NOT COMPLETED" IS AN ABSENCE, NOT A JUDGEMENT. It means no completion has been
//      recorded against the referral, which is not the same as the patient not having gone.
//      A specialist letter that never came back looks identical to an appointment never made,
//      and this module refuses to distinguish them because the data cannot. `outstanding`
//      says "no completion recorded", never "the patient did not attend".
//   3. NO CLINICAL READING. A referral's specialty is carried as an opaque code. Nothing
//      ranks referrals by urgency or infers anything about the patient's condition from the
//      fact of one — that would be the symptom-inference boundary (G7) by another route.

import type { PatientId, PracticeId } from "@/domain/types";

/** What the PMS recorded. Every state is an observation, not an interpretation. */
export type ReferralState =
  | "written" // recorded by the practice, nothing since
  | "appointment_recorded" // an appointment with the referred-to service is on file
  | "completed" // a completion (letter, discharge, result) came back
  | "cancelled"; // the practice or patient withdrew it

export interface Referral {
  practiceId: PracticeId;
  patientId: PatientId;
  /** PMS identifier — stable across ingests, so re-ingesting cannot duplicate. */
  referralId: string;
  /** Opaque service code. Never interpreted clinically here. */
  specialtyCode: string;
  writtenOn: string;
  state: ReferralState;
  /** When the state last changed, per the PMS. */
  stateAtIso: string;
  /** Present only for states that record one. */
  completedOn?: string | null;
}

export interface CaptureWindow {
  fromIso: string;
  toIso: string;
}

export interface OutstandingReferral {
  referral: Referral;
  /** Whole days between the referral being written and the observation date. */
  ageDays: number;
  /**
   * Why it is outstanding, in observational terms only. Never "the patient did not go".
   */
  basis: "no_appointment_recorded" | "appointment_but_no_completion";
}

export interface CaptureResult {
  outstanding: OutstandingReferral[];
  /** Referrals excluded, with why — nothing disappears silently. */
  excluded: Array<{ referralId: string; reason: "completed" | "cancelled" | "outside_window" | "other_practice" }>;
}

const DAY_MS = 86_400_000;

function wholeDaysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.NaN;
  return Math.floor((to - from) / DAY_MS);
}

/**
 * Find referrals written in the window with no completion recorded.
 *
 * `minAgeDays` exists because a referral written yesterday is not evidence of anything; a
 * practice asking "what has fallen through" does not mean "what happened this morning". The
 * default is deliberately conservative and the value is the caller's to set.
 */
export function captureOutstanding(
  referrals: readonly Referral[],
  practiceId: PracticeId,
  window: CaptureWindow,
  observedOnIso: string,
  minAgeDays = 30,
): CaptureResult {
  const outstanding: OutstandingReferral[] = [];
  const excluded: CaptureResult["excluded"] = [];

  for (const referral of referrals) {
    if (referral.practiceId !== practiceId) {
      excluded.push({ referralId: referral.referralId, reason: "other_practice" });
      continue;
    }
    const written = referral.writtenOn.slice(0, 10);
    if (written < window.fromIso || written > window.toIso) {
      excluded.push({ referralId: referral.referralId, reason: "outside_window" });
      continue;
    }
    if (referral.state === "completed") {
      excluded.push({ referralId: referral.referralId, reason: "completed" });
      continue;
    }
    if (referral.state === "cancelled") {
      // A withdrawn referral did not fall through — someone decided.
      excluded.push({ referralId: referral.referralId, reason: "cancelled" });
      continue;
    }

    const ageDays = wholeDaysBetween(referral.writtenOn, observedOnIso);
    // An unparseable or future date is a data error, not evidence of a gap.
    if (Number.isNaN(ageDays) || ageDays < 0) {
      excluded.push({ referralId: referral.referralId, reason: "outside_window" });
      continue;
    }
    if (ageDays < minAgeDays) continue;

    outstanding.push({
      referral,
      ageDays,
      basis:
        referral.state === "appointment_recorded"
          ? "appointment_but_no_completion"
          : "no_appointment_recorded",
    });
  }

  // Oldest first: this is recency arithmetic, never clinical prioritisation.
  outstanding.sort((a, b) => {
    if (a.ageDays !== b.ageDays) return b.ageDays - a.ageDays;
    return a.referral.referralId.localeCompare(b.referral.referralId);
  });

  return { outstanding, excluded };
}

/** Counts per specialty code, for the practice-facing summary. */
export function outstandingBySpecialty(
  result: CaptureResult,
): Array<{ specialtyCode: string; count: number }> {
  const counts = new Map<string, number>();
  for (const o of result.outstanding) {
    counts.set(o.referral.specialtyCode, (counts.get(o.referral.specialtyCode) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([specialtyCode, count]) => ({ specialtyCode, count }))
    .sort((a, b) => b.count - a.count || a.specialtyCode.localeCompare(b.specialtyCode));
}

export const OUTSTANDING_BASIS_COPY: Record<OutstandingReferral["basis"], string> = {
  no_appointment_recorded:
    "No appointment with the referred service is recorded. The practice has no record either way of whether one was made.",
  appointment_but_no_completion:
    "An appointment is recorded but nothing has come back. A letter that never arrived looks the same as a visit that did not happen.",
};
