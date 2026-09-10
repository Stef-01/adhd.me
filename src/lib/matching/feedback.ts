// The feedback loop: post-consult mutual feedback recorded per match, aggregated per GP, and fed
// back into the patient-side weights so the algorithm learns which criteria predicted "I felt
// understood".
//
// WHAT THIS IS NOT. It is not a star rating of a named clinician, and nothing here produces one:
// the aggregate a patient may see is a count of people who said they felt understood, in a
// sentence (`feltUnderstoodCopy`), and the `no-ratings` rule in `src/compliance/landing.ts`
// still governs every public surface. The per-record numbers exist for the loop and the GP's
// own dashboard.
//
// THE LEARNING IS BOUNDED AND SAYABLE. `learnWeights` moves each global weight by at most half of
// itself, in the direction of that criterion's correlation with the fit the patient reported,
// then renormalises to sum 1. It refuses to learn from fewer than `MIN_SAMPLES` records, and
// it returns the weights it started from in that case rather than a guess. Every adjustment is
// a number a reviewer can recompute from the records (W213), and no weight is ever keyed to a
// GP (C2).

import { PATIENT_WEIGHTS, type PatientCriterion } from "./ranking";
import type { Feedback, GP, Match, Rating, RatingAggregate, ScoredCriterion } from "./types";

export const MIN_SAMPLES = 8;
/** A weight may move by at most this share of itself per learning pass. */
export const MAX_SHIFT = 0.5;

const round = (value: number) => Math.round(value * 1000) / 1000;

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

export function isRating(value: unknown): value is Rating {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

/** Aggregate every record for one GP. Null when there is nothing to count. */
export function aggregateFeedback(records: readonly Feedback[]): RatingAggregate | null {
  const patient = records.flatMap((r) => (r.from === "patient" && r.patientRating ? [r.patientRating] : []));
  const gp = records.flatMap((r) => (r.from === "gp" && r.gpRating ? [r.gpRating] : []));
  if (patient.length === 0 && gp.length === 0) return null;
  return {
    count: patient.length + gp.length,
    patientCount: patient.length,
    gpCount: gp.length,
    feltUnderstoodShare: patient.length === 0 ? 0 : round(patient.filter((p) => p.fit >= 4).length / patient.length),
    communicationMean: round(mean(patient.map((p) => p.communication))),
    clinicalAppropriatenessMean: round(mean(patient.map((p) => p.clinicalAppropriateness))),
    gpAppropriateShare: gp.length === 0 ? 0 : round(gp.filter((g) => g.clinicalAppropriateness >= 4).length / gp.length),
    capacityFitMean: round(mean(gp.map((g) => g.capacityFit))),
  };
}

/** Records that belong to one GP, through the matches. */
export function feedbackForGP(gpId: string, matches: readonly Match[], records: readonly Feedback[]): Feedback[] {
  const mine = new Set(matches.filter((m) => m.gpId === gpId).map((m) => m.id));
  return records.filter((r) => mine.has(r.matchId));
}

/**
 * The one sentence a patient-facing page may say. Counts, not scores; below five records it
 * says only that people have been matched here, because a share of three is a testimonial with
 * a denominator.
 */
export function feltUnderstoodCopy(aggregate: RatingAggregate | null): string | null {
  if (!aggregate) return null;
  const patients = aggregate.patientCount;
  if (patients < 5) return null;
  const felt = Math.round(aggregate.feltUnderstoodShare * patients);
  return `Of ${patients} people matched here who told us how it went, ${felt} said they felt understood.`;
}

export interface LearningSample {
  breakdown: readonly ScoredCriterion[];
  /** The fit the patient reported for this match. */
  fit: Rating;
}

/** Join matches to their patient-side feedback so the loop has a breakdown beside each fit. */
export function learningSamples(matches: readonly Match[], records: readonly Feedback[]): LearningSample[] {
  const byMatch = new Map(matches.map((m) => [m.id, m]));
  return records.flatMap((r) => {
    if (r.from !== "patient" || !r.patientRating) return [];
    const match = byMatch.get(r.matchId);
    if (!match) return [];
    return [{ breakdown: match.patientBreakdown, fit: r.patientRating.fit }];
  });
}

/** Pearson correlation, 0 when either side has no variance. */
function correlation(xs: readonly number[], ys: readonly number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i++) {
    const a = xs[i]! - mx;
    const b = ys[i]! - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

export interface LearnedWeights {
  weights: Readonly<Record<PatientCriterion, number>>;
  /** Per criterion, the correlation the shift was based on. Empty when nothing was learned. */
  evidence: Readonly<Partial<Record<PatientCriterion, number>>>;
  learnedFrom: number;
  note: string;
}

export function learnWeights(
  samples: readonly LearningSample[],
  base: Readonly<Record<PatientCriterion, number>> = PATIENT_WEIGHTS,
): LearnedWeights {
  if (samples.length < MIN_SAMPLES) {
    return {
      weights: base,
      evidence: {},
      learnedFrom: samples.length,
      note: `${samples.length} of the ${MIN_SAMPLES} records needed before the weights move. Unchanged.`,
    };
  }
  const fits = samples.map((s) => (s.fit - 3) / 2);
  const evidence: Partial<Record<PatientCriterion, number>> = {};
  const shifted: Record<PatientCriterion, number> = { ...base };
  for (const criterion of Object.keys(base) as PatientCriterion[]) {
    const raws = samples.map((s) => s.breakdown.find((b) => b.criterion === criterion)?.raw ?? 0);
    const corr = round(correlation(raws, fits));
    evidence[criterion] = corr;
    shifted[criterion] = base[criterion] * (1 + MAX_SHIFT * Math.max(-1, Math.min(1, corr)));
  }
  const total = Object.values(shifted).reduce((a, b) => a + b, 0);
  const weights = Object.fromEntries(
    (Object.keys(shifted) as PatientCriterion[]).map((c) => [c, round(shifted[c] / total)]),
  ) as Record<PatientCriterion, number>;
  return {
    weights,
    evidence,
    learnedFrom: samples.length,
    note: `Weights moved from ${samples.length} records; each by at most half of itself, then renormalised.`,
  };
}

/** A GP with its aggregate attached, for the profile and dashboard. */
export function withAggregate(gp: GP, matches: readonly Match[], records: readonly Feedback[]): GP {
  return { ...gp, ratingAggregate: aggregateFeedback(feedbackForGP(gp.id, matches, records)) };
}
