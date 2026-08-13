// W82: the competence floor — enthusiasm never outranks it.
//
// The brief's §5 law: interest may influence ranking ONLY after a competence floor is met.
// This is the load-bearing safety property of the whole capability graph, because it is the
// one place the three W79 fields meet. Get it wrong in the obvious way — add interest to a
// score and sort — and a clinician who is keen but unqualified outranks one who is qualified
// but indifferent. That is precisely the outcome the separation exists to prevent.
//
// So the ordering is LEXICOGRAPHIC, not additive. Candidates are partitioned by whether they
// clear the floor, and interest is only ever consulted INSIDE the cleared group. There is no
// weight, no bonus and no arithmetic that could let a large enough interest close the gap,
// because the two quantities are never added: a below-floor clinician sorts after every
// above-floor one no matter what either of them wants.
//
// What "clears the floor" means is deliberately a practice setting, not our judgement. A
// practice may require a verified credential, or a minimum number of attended visits, or
// both. What CareYield fixes is the shape of the rule, never its threshold.

import type {
  ClinicianCompetence,
  ClinicianExperience,
  ClinicianId,
  ClinicianInterest,
  ConditionCode,
  PracticeId,
} from "@/domain/types";

export interface CompetenceFloor {
  /** Attended visits required for this condition. 0 disables the experience requirement. */
  minAttendedVisits: number;
  /** When true, a current verified credential is required as well. */
  requireVerifiedCredential: boolean;
}

export const DEFAULT_FLOOR: CompetenceFloor = {
  minAttendedVisits: 0,
  requireVerifiedCredential: false,
};

export interface Candidate {
  clinicianId: ClinicianId;
  /** Derived only (W80). Absent means unmeasured, not zero. */
  experience: ClinicianExperience | null;
  /** Externally verified only (W79). */
  competence: ClinicianCompetence | null;
  /** Self-reported only (W81). */
  interest: ClinicianInterest | null;
}

export type FloorFailure = "insufficient_experience" | "no_verified_credential" | "credential_expired";

export interface FloorVerdict {
  clears: boolean;
  /** Every reason the candidate fell short, for explainability (W86 renders these). */
  failures: FloorFailure[];
}

function credentialCurrent(competence: ClinicianCompetence | null, onIso: string): boolean {
  if (competence === null) return false;
  if (competence.expiresOn === null) return true;
  return competence.expiresOn >= onIso;
}

/**
 * Does this candidate clear the floor for this condition?
 *
 * Absent experience counts as zero attended visits here — "unmeasured" cannot be treated as
 * "sufficient", or a clinician with no telemetry would clear every floor by default.
 */
/**
 * Records belonging to another practice are treated as ABSENT, not as valid.
 *
 * W91 found this missing: a Candidate carries experience/competence/interest records that
 * each name a practice, and nothing checked them, so another practice's 500 attended visits
 * could clear this practice's floor. Fail-closed is the only safe reading — a foreign record
 * is not evidence about this panel.
 */
function ownedBy<T extends { practiceId: PracticeId }>(
  record: T | null,
  practiceId: PracticeId | undefined,
): T | null {
  if (record === null) return null;
  if (practiceId !== undefined && record.practiceId !== practiceId) return null;
  return record;
}

export function clearsFloor(
  candidate: Candidate,
  floor: CompetenceFloor,
  onIso: string,
  /** Scope. Omit only for single-tenant data, per the convention W65 set. */
  practiceId?: PracticeId,
): FloorVerdict {
  const failures: FloorFailure[] = [];

  const experience = ownedBy(candidate.experience, practiceId);
  const competence = ownedBy(candidate.competence, practiceId);

  const attended = experience?.attendedVisits ?? 0;
  if (attended < floor.minAttendedVisits) failures.push("insufficient_experience");

  if (floor.requireVerifiedCredential) {
    if (competence === null) failures.push("no_verified_credential");
    else if (!credentialCurrent(competence, onIso)) failures.push("credential_expired");
  }

  return { clears: failures.length === 0, failures };
}

export interface RankedCandidate {
  clinicianId: ClinicianId;
  clearsFloor: boolean;
  failures: FloorFailure[];
  /** Only ever set for candidates that cleared. Null below the floor, by construction. */
  interestStrength: number | null;
  attendedVisits: number;
}

/**
 * Rank candidates for a condition under the §5 law.
 *
 * Lexicographic and in this order:
 *   1. clears the floor (all who clear come before all who do not — no exceptions);
 *   2. stated interest, strongest first, CONSULTED ONLY INSIDE THE CLEARED GROUP;
 *   3. attended visits, as a stable and defensible tiebreak;
 *   4. clinician id, so the order is total and reproducible.
 *
 * Below-floor candidates are RETURNED rather than dropped — W86 has to explain why someone
 * was not chosen, and a silently missing candidate cannot be explained.
 */
export function rankByCapability(
  candidates: readonly Candidate[],
  floor: CompetenceFloor,
  onIso: string,
  practiceId?: PracticeId,
): RankedCandidate[] {
  const ranked: RankedCandidate[] = candidates.map((candidate) => {
    const verdict = clearsFloor(candidate, floor, onIso, practiceId);
    return {
      clinicianId: candidate.clinicianId,
      clearsFloor: verdict.clears,
      failures: verdict.failures,
      // Interest is not merely ignored below the floor — it is not carried at all, so no
      // downstream consumer can reintroduce it into a comparison.
      interestStrength: verdict.clears
        ? (ownedBy(candidate.interest, practiceId)?.strength ?? null)
        : null,
      attendedVisits: ownedBy(candidate.experience, practiceId)?.attendedVisits ?? 0,
    };
  });

  return ranked.sort((a, b) => {
    if (a.clearsFloor !== b.clearsFloor) return a.clearsFloor ? -1 : 1;
    const ai = a.interestStrength ?? 0;
    const bi = b.interestStrength ?? 0;
    if (ai !== bi) return bi - ai;
    if (a.attendedVisits !== b.attendedVisits) return b.attendedVisits - a.attendedVisits;
    return (a.clinicianId as string).localeCompare(b.clinicianId as string);
  });
}

/** The candidates a practice may actually route to — those above the floor, in order. */
export function eligibleForRouting(ranked: readonly RankedCandidate[]): RankedCandidate[] {
  return ranked.filter((c) => c.clearsFloor);
}

export const FLOOR_FAILURE_COPY: Record<FloorFailure, string> = {
  insufficient_experience: "has not seen enough of this work yet for this practice's threshold",
  no_verified_credential: "has no verified credential recorded for this",
  credential_expired: "has a verified credential that has passed its review date",
};

export type { ConditionCode };
