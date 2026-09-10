// Stage two, first half: the two rankings the deferred-acceptance loop consumes.
//
//   * The PATIENT side ranks the shortlist: similarity adjusted by the GP's declared current
//     capacity, plus the manner, consult-style and distance facts the narrative asked about.
//   * The GP side ranks incoming patients by fit to the GP's DECLARED caseload preferences and
//     capacity: age group, the comorbidity mix they take, consult style, billing, similarity. A
//     patient below the GP's declared minimum fit is UNACCEPTABLE to that GP (the loop never
//     proposes them), which is the "decline low-fit matches before booking" done up front.
//
// Nothing on the GP side is a judgement about the patient's need. It is fit to a declaration.
// Weights are global (C2), pinned to sum to 1 by a test, and every sub-score carries a sentence
// built from the fixed templates below (W213), with only numerals and declared facts inside.

import type { Candidate } from "./candidates";
import type { GP, Patient } from "./types";

export type PatientCriterion = "similarity" | "capacity" | "communication" | "consultStyle" | "proximity";
export type GPCriterion = "similarity" | "ageGroup" | "comorbidity" | "consultStyle" | "billing" | "capacity";

export const PATIENT_WEIGHTS: Readonly<Record<PatientCriterion, number>> = {
  similarity: 0.5,
  capacity: 0.15,
  communication: 0.15,
  consultStyle: 0.1,
  proximity: 0.1,
};

export const GP_WEIGHTS: Readonly<Record<GPCriterion, number>> = {
  similarity: 0.35,
  ageGroup: 0.2,
  comorbidity: 0.2,
  consultStyle: 0.1,
  billing: 0.1,
  capacity: 0.05,
};

export interface CriterionScore<C extends string> {
  criterion: C;
  weight: number;
  /** 0 to 1 before weighting. */
  raw: number;
  weighted: number;
  sentence: string;
}

export interface RankedGP {
  gpId: string;
  /** Weighted sum of the breakdown, 0 to 1. */
  score: number;
  breakdown: readonly CriterionScore<PatientCriterion>[];
}

export interface RankedPatient {
  patientId: string;
  score: number;
  breakdown: readonly CriterionScore<GPCriterion>[];
  /** False when the GP's declared preferences rule this patient out before any proposal. */
  acceptable: boolean;
  /** Why, when not acceptable. */
  unacceptableBecause: "below_minimum_fit" | "complex_comorbidity_declined" | null;
}

export const PROXIMITY_CAP_KM = 50;

const round = (value: number) => Math.round(value * 1000) / 1000;

function score<C extends string>(criterion: C, weights: Readonly<Record<C, number>>, raw: number, sentence: string): CriterionScore<C> {
  const weight = weights[criterion];
  return { criterion, weight, raw: round(raw), weighted: round(weight * round(raw)), sentence };
}

function capacityScore(gp: GP): { raw: number; sentence: string } {
  const { caseloadCapacityCurrent: current, caseloadCapacityMax: max } = gp.credentials;
  if (max <= 0) return { raw: 0, sentence: "No caseload capacity declared." };
  const raw = Math.min(1, Math.max(0, current / max));
  if (max === 1) return { raw, sentence: current > 0 ? "Books declared open." : "Books declared closed." };
  return { raw, sentence: `${current} of ${max} declared places open.` };
}

/** The patient side's ranking of the shortlist, best first. */
export function rankGPsForPatient(
  patient: Patient,
  candidates: readonly Candidate[],
  weights: Readonly<Record<PatientCriterion, number>> = PATIENT_WEIGHTS,
): RankedGP[] {
  const signals = patient.structuredSignals;
  return candidates
    .map((candidate): RankedGP => {
      const gp = candidate.gp;
      const breakdown: CriterionScore<PatientCriterion>[] = [];
      breakdown.push(
        score("similarity", weights, candidate.similarity, `What you wrote and what they declare overlap at ${Math.round(candidate.similarity * 100)} of 100.`),
      );
      const cap = capacityScore(gp);
      breakdown.push(score("capacity", weights, cap.raw, cap.sentence));
      const wanted = signals.communicationPreference;
      if (wanted.length === 0) {
        breakdown.push(score("communication", weights, 1, "No manner was asked for, so nothing to compare."));
      } else {
        const met = wanted.filter((w) => gp.credentials.communicationStyle.includes(w)).length;
        breakdown.push(score("communication", weights, met / wanted.length, `Declares ${met} of the ${wanted.length} ways of working asked for.`));
      }
      const style = signals.preferredConsultStyle;
      if (style === "telehealth") {
        breakdown.push(score("consultStyle", weights, gp.telehealthAvailable ? 1 : 0, gp.telehealthAvailable ? "Telehealth, as asked for." : "No telehealth declared."));
      } else if (style === "in-person") {
        const near = candidate.distanceKm !== null && candidate.distanceKm <= PROXIMITY_CAP_KM;
        breakdown.push(score("consultStyle", weights, near ? 1 : 0.5, near ? "In person, within reach." : "In person was asked for; distance is unresolved or far."));
      } else {
        breakdown.push(score("consultStyle", weights, 1, "Either way suits, so nothing to compare."));
      }
      if (candidate.distanceKm === null) {
        breakdown.push(score("proximity", weights, 0.5, "A location here is not in the gazetteer, so distance is scored at the midpoint."));
      } else {
        const raw = 1 - Math.min(candidate.distanceKm, PROXIMITY_CAP_KM) / PROXIMITY_CAP_KM;
        breakdown.push(score("proximity", weights, raw, `About ${Math.round(candidate.distanceKm)} km away, scored against a ${PROXIMITY_CAP_KM} km range.`));
      }
      return { gpId: gp.id, score: round(breakdown.reduce((sum, b) => sum + b.weighted, 0)), breakdown };
    })
    .sort((a, b) => b.score - a.score || a.gpId.localeCompare(b.gpId));
}

export interface IncomingPatient {
  patient: Patient;
  /** The same cosine the candidate generator computed for this pair. */
  similarity: number;
}

/** The GP side's ranking of incoming patients, best fit to their declaration first. */
export function rankPatientsForGP(
  gp: GP,
  incoming: readonly IncomingPatient[],
  weights: Readonly<Record<GPCriterion, number>> = GP_WEIGHTS,
): RankedPatient[] {
  const prefs = gp.preferences;
  return incoming
    .map(({ patient, similarity }): RankedPatient => {
      const s = patient.structuredSignals;
      const breakdown: CriterionScore<GPCriterion>[] = [];
      breakdown.push(score("similarity", weights, similarity, `The request and the declared profile overlap at ${Math.round(similarity * 100)} of 100.`));
      const ageWanted = prefs.ageGroups.includes(s.ageGroup);
      breakdown.push(score("ageGroup", weights, ageWanted ? 1 : 0.3, ageWanted ? `${s.ageGroup}: an age group asked for.` : `${s.ageGroup}: seen, but not among the age groups asked for.`));
      const complex = s.comorbidities.length >= 2;
      let complexDeclined = false;
      if (s.comorbidities.length === 0) {
        breakdown.push(score("comorbidity", weights, 1, "Nothing named alongside, so nothing to compare."));
      } else if (complex && !prefs.acceptsComplexComorbidity) {
        complexDeclined = true;
        breakdown.push(score("comorbidity", weights, 0, `${s.comorbidities.length} presentations named alongside; complex comorbidity was not asked for.`));
      } else {
        const met = s.comorbidities.filter((c) => gp.credentials.caseloadMix.includes(c)).length;
        breakdown.push(score("comorbidity", weights, met / s.comorbidities.length, `Declares ${met} of the ${s.comorbidities.length} presentations named alongside.`));
      }
      const style = s.preferredConsultStyle;
      const styleOk = style === "either" || prefs.consultStyles.includes(style);
      breakdown.push(score("consultStyle", weights, styleOk ? 1 : 0, styleOk ? "Consult style suits the declared preference." : `${style} was asked for and is not a declared preference.`));
      const billing = s.billingPreference;
      const billingOk = billing === "either" || prefs.billingAccepted.includes(billing);
      breakdown.push(score("billing", weights, billingOk ? 1 : 0, billingOk ? "Billing suits the declared arrangement." : `${billing} was asked for and is not a declared arrangement.`));
      const cap = capacityScore(gp);
      breakdown.push(score("capacity", weights, cap.raw, cap.sentence));
      const total = round(breakdown.reduce((sum, b) => sum + b.weighted, 0));
      const unacceptableBecause = complexDeclined ? "complex_comorbidity_declined" : total < prefs.minimumFit ? "below_minimum_fit" : null;
      return { patientId: patient.id, score: total, breakdown, acceptable: unacceptableBecause === null, unacceptableBecause };
    })
    .sort((a, b) => b.score - a.score || a.patientId.localeCompare(b.patientId));
}
