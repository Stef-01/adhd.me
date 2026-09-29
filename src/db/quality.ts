// Demonstrated quality (founder, 2026-09-28: finding a clinician "based on fit, needs and demonstrated
// quality"; asked how, "a full ranking factor"): how a clinician's visits went, from the stars people
// give afterwards on the finder and on /match, as one number the ranking multiplies fit by.
//
// Bounded and slow, as the per-ask weights are (./learn.ts): silent until MIN_VISITS rated visits,
// each clinician's mean shrunk toward everybody's by PRIOR_VISITS imaginary average visits, and the
// multiplier within MAX_QUALITY of 1, in steps of STEP so that two clinicians whose visits went about
// as well stay level (and distance still orders them). The ranking multiplies the fit a clinician
// declared by it and never touches the access and language tier (src/demo/clinicians.ts): quality
// scales evidence and never creates it. Nobody sees a rating or this number on any screen.

import type { RatingRecord } from "./finder";

/** Rated visits a clinician needs before their visits count at all. */
export const MIN_VISITS = 8;
/** Imaginary average visits each clinician's mean starts from, so a few real ones barely move it. */
const PRIOR_VISITS = 8;
/** The most quality can move a clinician's fit, up or down. */
export const MAX_QUALITY = 0.15;
/** The multiplier moves in steps this size. */
const STEP = 0.05;
/** Everybody's mean starts from twenty imaginary four-star visits, so early ratings cannot set it. */
const GLOBAL_PRIOR = { visits: 20, stars: 4 };

export interface ClinicianSignal {
  clinicianId: string;
  visits: number;
  /** The stars summed over those visits. */
  stars: number;
}

/** Visits and summed stars per clinician: the shape the clinician_rating_signal view gives too. */
export function clinicianSignals(ratings: readonly Pick<RatingRecord, "clinicianId" | "stars">[]): ClinicianSignal[] {
  const by = new Map<string, ClinicianSignal>();
  for (const r of ratings) {
    const held = by.get(r.clinicianId) ?? { clinicianId: r.clinicianId, visits: 0, stars: 0 };
    held.visits += 1;
    held.stars += r.stars;
    by.set(r.clinicianId, held);
  }
  return [...by.values()].sort((a, b) => a.clinicianId.localeCompare(b.clinicianId));
}

/**
 * A multiplier per clinician with enough visits: a star above or below everybody's mean, after
 * shrinking, is the whole bound. Clinicians without enough visits, or level with everybody, are
 * absent, which the ranking reads as 1.
 */
export function clinicianQuality(signals: readonly ClinicianSignal[]): Record<string, number> {
  const visits = signals.reduce((n, s) => n + s.visits, 0);
  const mean = (signals.reduce((sum, s) => sum + s.stars, 0) + GLOBAL_PRIOR.visits * GLOBAL_PRIOR.stars) / (visits + GLOBAL_PRIOR.visits);
  const quality: Record<string, number> = {};
  for (const s of signals) {
    if (s.visits < MIN_VISITS) continue;
    const shrunk = (s.stars + PRIOR_VISITS * mean) / (s.visits + PRIOR_VISITS);
    const shift = Math.max(-1, Math.min(1, shrunk - mean)) * MAX_QUALITY;
    const multiplier = Math.round((1 + Math.round(shift / STEP) * STEP) * 1000) / 1000;
    if (multiplier !== 1) quality[s.clinicianId] = multiplier;
  }
  return quality;
}
