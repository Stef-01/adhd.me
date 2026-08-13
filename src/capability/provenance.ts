// W88: capability-graph provenance and review dates.
//
// W79 made the three capability fields structurally distinct — interest is self-reported,
// experience is derived, competence is externally verified — so they can never be conflated.
// This unit adds the dimension W79 left out: **when**, and therefore **whether the record is
// still worth believing**.
//
// The three fields go stale in genuinely different ways, and treating them alike would be the
// error here:
//
//   - INTEREST is a preference. A GP who said "more diabetes" two years ago may have changed
//     their mind, and nobody will tell the system. It decays because people change.
//   - EXPERIENCE is a count over a window. It does not decay so much as EXPIRE: a count of
//     visits from 2024 is not a weaker claim about today, it is a claim about 2024. The
//     window is already in the record (W79), so staleness is measured from `windowTo`, not
//     from when someone last looked at it.
//   - COMPETENCE is a verified fact with an optional expiry. Past `expiresOn` it is not stale,
//     it is VOID — an expired credential is not weak evidence, it is no evidence. And a
//     record with no stated expiry is not "never expires"; W79's comment says so explicitly,
//     and this unit is where that decision gets made: it still ages, and it still needs
//     re-attestation.
//
// So "stale" is not one predicate with one threshold. Each field gets its own rule, its own
// reason string, and — the part that matters downstream — its own answer to whether a
// consumer may still act on it.

import type {
  ClinicianCompetence,
  ClinicianExperience,
  ClinicianInterest,
  ConditionCode,
} from "@/domain/types";

export interface StalenessPolicy {
  /** Interest older than this is flagged for re-confirmation. */
  interestMonths: number;
  /** Experience whose window ENDED longer ago than this no longer describes now. */
  experienceMonths: number;
  /** Competence with no stated expiry still needs re-attestation this often. */
  competenceMonths: number;
}

/**
 * Defaults chosen to be conservative and, more importantly, to be a practice-visible number
 * rather than a hidden constant — W64's posture: a threshold nobody can see is a threshold
 * nobody can disagree with.
 */
export const DEFAULT_STALENESS: StalenessPolicy = {
  interestMonths: 12,
  experienceMonths: 18,
  competenceMonths: 36,
};

export type Freshness = "current" | "stale" | "void";

export interface ProvenanceVerdict {
  freshness: Freshness;
  /** Plain-English, practice-facing. Every verdict explains itself. */
  reason: string;
  /** Months since the date that matters for this field. Null when there is no such date. */
  ageMonths: number | null;
  /**
   * May a consumer (W82's competence floor, W84's routing) still act on this record?
   * `stale` is usable-but-flagged; `void` is not usable at all.
   */
  usable: boolean;
}

/** Whole months between two ISO dates — same rule as W58, so ages are comparable. */
function monthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const to = new Date(`${toIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return Number.NaN;
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return months;
}

function unreadable(): ProvenanceVerdict {
  // Fail closed: a record whose own date cannot be read is not evidence of anything.
  return { freshness: "void", reason: "The date on this record cannot be read.", ageMonths: null, usable: false };
}

export function interestFreshness(
  record: ClinicianInterest,
  todayIso: string,
  policy: StalenessPolicy = DEFAULT_STALENESS,
): ProvenanceVerdict {
  const age = monthsBetween(record.statedAt, todayIso);
  if (Number.isNaN(age)) return unreadable();
  if (age < 0) {
    return { freshness: "stale", reason: "Stated in the future — check the record.", ageMonths: age, usable: false };
  }
  if (age < policy.interestMonths) {
    return { freshness: "current", reason: `Stated ${age} month(s) ago.`, ageMonths: age, usable: true };
  }
  // Still usable: a preference nobody has re-confirmed is weak, not wrong, and dropping it
  // would silently reshape a panel view the practice never asked to change.
  return {
    freshness: "stale",
    reason: `Stated ${age} month(s) ago — worth asking whether it still holds.`,
    ageMonths: age,
    usable: true,
  };
}

export function experienceFreshness(
  record: ClinicianExperience,
  todayIso: string,
  policy: StalenessPolicy = DEFAULT_STALENESS,
): ProvenanceVerdict {
  // Measured from the END of the window the count covers, not from computedAt: recomputing
  // an old window today does not make it describe today, and computedAt would say it did.
  const age = monthsBetween(record.windowTo, todayIso);
  if (Number.isNaN(age)) return unreadable();
  if (age < 0) {
    return {
      freshness: "current",
      reason: "The counting window has not closed yet.",
      ageMonths: age,
      usable: true,
    };
  }
  if (age < policy.experienceMonths) {
    return {
      freshness: "current",
      reason: `Counts visits up to ${record.windowTo}.`,
      ageMonths: age,
      usable: true,
    };
  }
  return {
    freshness: "stale",
    reason: `Counts visits up to ${record.windowTo}, ${age} month(s) ago — it describes that period, not now.`,
    ageMonths: age,
    usable: true,
  };
}

export function competenceFreshness(
  record: ClinicianCompetence,
  todayIso: string,
  policy: StalenessPolicy = DEFAULT_STALENESS,
): ProvenanceVerdict {
  if (record.expiresOn !== null) {
    const untilExpiry = monthsBetween(todayIso, record.expiresOn);
    if (Number.isNaN(untilExpiry)) return unreadable();
    if (record.expiresOn < todayIso.slice(0, 10)) {
      // Void, not stale. An expired credential is not weak evidence; it is none.
      return {
        freshness: "void",
        reason: `Expired on ${record.expiresOn}.`,
        ageMonths: monthsBetween(record.expiresOn, todayIso),
        usable: false,
      };
    }
    return {
      freshness: "current",
      reason: `Verified by ${record.attestedBy}, valid until ${record.expiresOn}.`,
      ageMonths: monthsBetween(record.verifiedOn, todayIso),
      usable: true,
    };
  }

  // No stated expiry. W79 is explicit that this means "no stated expiry", NOT "never
  // expires" — so it still ages, and this is the unit that decides what that costs.
  const age = monthsBetween(record.verifiedOn, todayIso);
  if (Number.isNaN(age)) return unreadable();
  if (age < 0) {
    return { freshness: "void", reason: "Verified in the future — check the record.", ageMonths: age, usable: false };
  }
  if (age < policy.competenceMonths) {
    return {
      freshness: "current",
      reason: `Verified by ${record.attestedBy} ${age} month(s) ago; no stated expiry.`,
      ageMonths: age,
      usable: true,
    };
  }
  return {
    freshness: "stale",
    reason: `Verified ${age} month(s) ago with no stated expiry — due for re-attestation.`,
    ageMonths: age,
    usable: true,
  };
}

export interface FlaggedProfile {
  clinicianId: string;
  conditionCode: ConditionCode;
  field: "interest" | "experience" | "competence";
  verdict: ProvenanceVerdict;
}

export interface CapabilityRecords {
  interests: readonly ClinicianInterest[];
  experience: readonly ClinicianExperience[];
  competence: readonly ClinicianCompetence[];
}

/**
 * Every record that is not `current`, with why. This is the practice-facing output: "these
 * are the profile entries you should look at", not a silent downgrade of a ranking nobody
 * can see the reason for.
 */
export function flagStaleProfiles(
  records: CapabilityRecords,
  todayIso: string,
  policy: StalenessPolicy = DEFAULT_STALENESS,
): FlaggedProfile[] {
  const flagged: FlaggedProfile[] = [];
  for (const r of records.interests) {
    const verdict = interestFreshness(r, todayIso, policy);
    if (verdict.freshness !== "current") {
      flagged.push({ clinicianId: r.clinicianId as string, conditionCode: r.conditionCode, field: "interest", verdict });
    }
  }
  for (const r of records.experience) {
    const verdict = experienceFreshness(r, todayIso, policy);
    if (verdict.freshness !== "current") {
      flagged.push({ clinicianId: r.clinicianId as string, conditionCode: r.conditionCode, field: "experience", verdict });
    }
  }
  for (const r of records.competence) {
    const verdict = competenceFreshness(r, todayIso, policy);
    if (verdict.freshness !== "current") {
      flagged.push({ clinicianId: r.clinicianId as string, conditionCode: r.conditionCode, field: "competence", verdict });
    }
  }
  // Void first — those are the ones that change what the system may do, not just what it
  // should ask about.
  return flagged.sort((a, b) => {
    if (a.verdict.freshness !== b.verdict.freshness) return a.verdict.freshness === "void" ? -1 : 1;
    return `${a.clinicianId}${a.conditionCode}${a.field}`.localeCompare(
      `${b.clinicianId}${b.conditionCode}${b.field}`,
    );
  });
}

/** Competence a consumer may act on — the input W82's floor should read. */
export function usableCompetence(
  records: readonly ClinicianCompetence[],
  todayIso: string,
  policy: StalenessPolicy = DEFAULT_STALENESS,
): ClinicianCompetence[] {
  return records.filter((r) => competenceFreshness(r, todayIso, policy).usable);
}
