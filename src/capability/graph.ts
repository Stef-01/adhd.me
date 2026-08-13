// W83: capability graph views.
//
// Named `graph` rather than `store` because W81 already owns src/capability/store.ts for the
// interest store — two builders reached for the same filename in the same hour.
//
// The unit is "GP sees their own profile; practice sees the panel view", and the interesting
// part is that those are two DIFFERENT questions about the same data, with different
// disclosure rules — not one query rendered twice.
//
//   - `ownProfile` answers "what does the system believe about me?". A clinician is entitled
//     to see their own record in full, including what was DERIVED about them (W80's case-mix
//     counts) rather than only what they typed in. A capability graph a clinician cannot
//     inspect is one they cannot correct.
//   - `panelView` answers "who in this practice can take this work?". It is a management
//     view, so it is deliberately COARSER: it reports whether each field is present and
//     fresh, not the raw visit counts. A practice manager deciding routing does not need
//     one GP's visit tallies to make that decision, and showing them turns a capability
//     graph into a productivity board — which is not what W79 built and not something a
//     clinician consented to when they stated an interest.
//
// Isolation is by practice id at every accessor, the same posture W60 holds for registers:
// one practice's capability graph is not visible to another, and the store is keyed so that
// a missing filter is a missing ROW rather than a leak.

import type {
  ClinicianCompetence,
  ClinicianExperience,
  ClinicianId,
  ClinicianInterest,
  ConditionCode,
  PracticeId,
} from "@/domain/types";
import {
  competenceFreshness,
  experienceFreshness,
  interestFreshness,
  type Freshness,
  type StalenessPolicy,
} from "./provenance";

export interface CapabilityState {
  interests: ClinicianInterest[];
  experience: ClinicianExperience[];
  competence: ClinicianCompetence[];
}

const globalStore = globalThis as { __meherrCapability?: CapabilityState };

function initial(): CapabilityState {
  return { interests: [], experience: [], competence: [] };
}

export function getCapability(): CapabilityState {
  globalStore.__meherrCapability ??= initial();
  return globalStore.__meherrCapability;
}

export function resetCapability(): CapabilityState {
  globalStore.__meherrCapability = initial();
  return globalStore.__meherrCapability;
}

/** Record a clinician's stated interest. Replaces any previous statement for that pair. */
export function stateInterest(record: ClinicianInterest): void {
  const state = getCapability();
  state.interests = [
    ...state.interests.filter(
      (i) =>
        !(
          i.practiceId === record.practiceId &&
          i.clinicianId === record.clinicianId &&
          i.conditionCode === record.conditionCode
        ),
    ),
    record,
  ];
}

export function putExperience(records: readonly ClinicianExperience[]): void {
  getCapability().experience = [...records];
}

export function putCompetence(records: readonly ClinicianCompetence[]): void {
  getCapability().competence = [...records];
}

export interface OwnProfileRow {
  conditionCode: ConditionCode;
  interest: { strength: number; statedAt: string; freshness: Freshness; reason: string } | null;
  /** Full detail — a clinician may see what was derived about them, not just what they typed. */
  experience: { attendedVisits: number; windowFrom: string; windowTo: string; freshness: Freshness; reason: string } | null;
  competence: { credential: string; attestedBy: string; expiresOn: string | null; freshness: Freshness; reason: string } | null;
}

/**
 * What one clinician sees about themselves. Scoped to practice AND clinician, so it cannot
 * return another person's row even if the caller passes the wrong id — there is no path here
 * that widens.
 */
export function ownProfile(
  practiceId: PracticeId,
  clinicianId: ClinicianId,
  todayIso: string,
  policy?: StalenessPolicy,
): OwnProfileRow[] {
  const state = getCapability();
  const mine = <T extends { practiceId: PracticeId; clinicianId: ClinicianId }>(rows: readonly T[]) =>
    rows.filter((r) => r.practiceId === practiceId && r.clinicianId === clinicianId);

  const interests = mine(state.interests);
  const experience = mine(state.experience);
  const competence = mine(state.competence);

  const codes = [
    ...new Set([
      ...interests.map((r) => r.conditionCode as string),
      ...experience.map((r) => r.conditionCode as string),
      ...competence.map((r) => r.conditionCode as string),
    ]),
  ].sort();

  return codes.map((code) => {
    const i = interests.find((r) => (r.conditionCode as string) === code);
    const e = experience.find((r) => (r.conditionCode as string) === code);
    const c = competence.find((r) => (r.conditionCode as string) === code);
    const iv = i ? interestFreshness(i, todayIso, policy) : null;
    const ev = e ? experienceFreshness(e, todayIso, policy) : null;
    const cv = c ? competenceFreshness(c, todayIso, policy) : null;
    return {
      conditionCode: code as ConditionCode,
      interest: i && iv ? { strength: i.strength, statedAt: i.statedAt, freshness: iv.freshness, reason: iv.reason } : null,
      experience:
        e && ev
          ? { attendedVisits: e.attendedVisits, windowFrom: e.windowFrom, windowTo: e.windowTo, freshness: ev.freshness, reason: ev.reason }
          : null,
      competence:
        c && cv
          ? { credential: c.credential, attestedBy: c.attestedBy, expiresOn: c.expiresOn, freshness: cv.freshness, reason: cv.reason }
          : null,
    };
  });
}

export interface PanelCell {
  clinicianId: ClinicianId;
  conditionCode: ConditionCode;
  /** Present-and-fresh, present-but-stale, or absent. Deliberately NOT the underlying counts. */
  interest: Freshness | "absent";
  experience: Freshness | "absent";
  competence: Freshness | "absent";
}

/**
 * What the practice sees across its panel — coarser on purpose.
 *
 * It reports whether each field is present and fresh, never the raw visit counts. A manager
 * deciding who can take work does not need one GP's tallies to decide it, and surfacing them
 * would turn a capability graph into a productivity board. That is a different product, and
 * not one a clinician agreed to when they stated an interest.
 */
export function panelView(
  practiceId: PracticeId,
  todayIso: string,
  policy?: StalenessPolicy,
): PanelCell[] {
  const state = getCapability();
  const here = <T extends { practiceId: PracticeId }>(rows: readonly T[]) =>
    rows.filter((r) => r.practiceId === practiceId);

  const interests = here(state.interests);
  const experience = here(state.experience);
  const competence = here(state.competence);

  const pairs = new Map<string, { clinicianId: ClinicianId; conditionCode: ConditionCode }>();
  for (const r of [...interests, ...experience, ...competence]) {
    pairs.set(`${r.clinicianId}::${r.conditionCode}`, {
      clinicianId: r.clinicianId,
      conditionCode: r.conditionCode,
    });
  }

  return [...pairs.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, pair]) => {
      const i = interests.find((r) => r.clinicianId === pair.clinicianId && r.conditionCode === pair.conditionCode);
      const e = experience.find((r) => r.clinicianId === pair.clinicianId && r.conditionCode === pair.conditionCode);
      const c = competence.find((r) => r.clinicianId === pair.clinicianId && r.conditionCode === pair.conditionCode);
      return {
        clinicianId: pair.clinicianId,
        conditionCode: pair.conditionCode,
        interest: i ? interestFreshness(i, todayIso, policy).freshness : ("absent" as const),
        experience: e ? experienceFreshness(e, todayIso, policy).freshness : ("absent" as const),
        competence: c ? competenceFreshness(c, todayIso, policy).freshness : ("absent" as const),
      };
    });
}
