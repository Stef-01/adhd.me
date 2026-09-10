// Stage one of the pipeline: candidate generation. Hard filters with a NAMED reason per refusal
// (allocation.ts's posture: you cannot introduce somebody to a full list, and nothing is dropped
// silently), then cosine similarity between the narrative and each surviving bio, returning the
// top ten to fifteen.
//
// Every filter reads a DECLARED fact: the GP's age groups, billing, telehealth, capacity and
// verification status; the patient's stated consult style, billing preference and age group.
// Distance uses the gazetteer; a suburb the gazetteer does not hold is OUR missing row and
// neither excludes nor favours anybody (rankCliniciansNear's law).

import { distanceKm, resolvePlace } from "@/geo/suburbs";
import { cosine, type Embedder } from "./embedding";
import type { Embedding, GP, Patient } from "./types";

export type HardFilterReason =
  | "condition_not_treated"
  | "not_accepting"
  | "no_capacity"
  | "verification_rejected"
  | "age_group_not_treated"
  | "billing_not_accepted"
  | "telehealth_unavailable"
  | "out_of_reach";

/** Reviewer-facing copy for every refusal. A new reason without copy is a type error. */
export const HARD_FILTER_COPY: Readonly<Record<HardFilterReason, string>> = {
  condition_not_treated: "Does not declare this condition.",
  not_accepting: "Books declared closed.",
  no_capacity: "No open places on the list right now.",
  verification_rejected: "Credentials were checked and not accepted.",
  age_group_not_treated: "Does not declare the patient's age group.",
  billing_not_accepted: "Does not accept the billing arrangement asked for.",
  telehealth_unavailable: "Telehealth was asked for and is not offered.",
  out_of_reach: "Outside the distance asked for, and no telehealth to bridge it.",
};

export interface Candidate {
  gp: GP;
  /** Narrative to bio cosine, 0 to 1. */
  similarity: number;
  /** Straight-line km between the two suburbs, or null when either is not in the gazetteer. */
  distanceKm: number | null;
}

export interface ExcludedGP {
  gpId: string;
  reasons: readonly HardFilterReason[];
}

export interface CandidateOptions {
  embedder: Embedder;
  /** How far the patient is prepared to travel for in-person care. */
  radiusKm?: number;
  /** The shortlist floor and ceiling. Fewer than `min` is reported, not padded. */
  min?: number;
  max?: number;
}

export const DEFAULT_RADIUS_KM = 30;
export const SHORTLIST_MIN = 10;
export const SHORTLIST_MAX = 15;

/** Distance between patient and GP, or null when the gazetteer cannot say. */
export function distanceBetween(patient: Patient, gp: GP): number | null {
  const from = resolvePlace(patient.location.suburb);
  const to = resolvePlace(gp.practiceLocation.suburb);
  if (!from || !to) return null;
  return distanceKm(from, to);
}

/** Every hard-filter reason that applies. Empty means the pair proceeds. */
export function hardFilterReasons(patient: Patient, gp: GP, radiusKm = DEFAULT_RADIUS_KM): HardFilterReason[] {
  const reasons: HardFilterReason[] = [];
  if (!gp.conditions.includes(patient.condition)) reasons.push("condition_not_treated");
  if (!gp.acceptingNewPatients) reasons.push("not_accepting");
  if (gp.credentials.caseloadCapacityCurrent <= 0) reasons.push("no_capacity");
  if (gp.verificationStatus === "rejected") reasons.push("verification_rejected");
  if (!gp.credentials.ageGroupsTreated.includes(patient.structuredSignals.ageGroup)) {
    reasons.push("age_group_not_treated");
  }
  const billing = patient.structuredSignals.billingPreference;
  if (billing !== "either" && !gp.preferences.billingAccepted.includes(billing)) {
    reasons.push("billing_not_accepted");
  }
  const style = patient.structuredSignals.preferredConsultStyle;
  const km = distanceBetween(patient, gp);
  const withinReach = km === null || km <= radiusKm;
  if (style === "telehealth" && !gp.telehealthAvailable) reasons.push("telehealth_unavailable");
  if (style === "in-person" && !withinReach) reasons.push("out_of_reach");
  if (style === "either" && !withinReach && !gp.telehealthAvailable) reasons.push("out_of_reach");
  return reasons;
}

/** The text a GP's embedding is built from: the long bio, how they prescribe, and what they declare. */
export function gpBioText(gp: GP): string {
  const c = gp.credentials;
  const declared = [
    ...c.ageGroupsTreated.map((g) => `treats ${g}`),
    ...c.caseloadMix.map((m) => m.replace(/-/g, " ")),
    ...c.communicationStyle.map((s) => s.replace(/_/g, " ")),
    gp.telehealthAvailable ? "telehealth available" : "",
    c.prescribingPhilosophy ? c.prescribingPhilosophy.replace(/-/g, " ") : "",
    c.titrationPace ? `${c.titrationPace} titration` : "",
  ].filter((s) => s.length > 0);
  return [c.bioLongText, c.prescribingPhilosophyText, declared.join(". ")].join(". ");
}

export function embeddingFor(embedder: Embedder, gp: GP): Embedding {
  return gp.bioEmbedding && gp.bioEmbedding.length === embedder.dim ? gp.bioEmbedding : embedder.embed(gpBioText(gp));
}

export function narrativeEmbedding(embedder: Embedder, patient: Patient): Embedding {
  return patient.narrativeEmbedding && patient.narrativeEmbedding.length === embedder.dim
    ? patient.narrativeEmbedding
    : embedder.embed(patient.narrativeText);
}

export interface CandidateResult {
  candidates: readonly Candidate[];
  excluded: readonly ExcludedGP[];
  /** Said when the shortlist is below the floor, so the caller can say it too. */
  note: string | null;
}

/**
 * The shortlist. Deterministic and order-independent: the GPs are sorted by id before anything
 * is compared, ties in similarity break on id (arbitrary on purpose; a tie-break that meant
 * something would be a judgement about who deserves patients).
 */
export function generateCandidates(patient: Patient, gps: readonly GP[], options: CandidateOptions): CandidateResult {
  const radius = options.radiusKm ?? DEFAULT_RADIUS_KM;
  const min = options.min ?? SHORTLIST_MIN;
  const max = options.max ?? SHORTLIST_MAX;
  const narrative = narrativeEmbedding(options.embedder, patient);
  const excluded: ExcludedGP[] = [];
  const scored: Candidate[] = [];
  for (const gp of [...gps].sort((a, b) => a.id.localeCompare(b.id))) {
    const reasons = hardFilterReasons(patient, gp, radius);
    if (reasons.length > 0) {
      excluded.push({ gpId: gp.id, reasons });
      continue;
    }
    scored.push({
      gp,
      similarity: round(cosine(narrative, embeddingFor(options.embedder, gp))),
      distanceKm: distanceBetween(patient, gp),
    });
  }
  scored.sort((a, b) => b.similarity - a.similarity || a.gp.id.localeCompare(b.gp.id));
  const candidates = scored.slice(0, max);
  const note =
    candidates.length < min
      ? `Only ${candidates.length} of ${gps.length} listed GPs pass the stated constraints, below the ${min} the shortlist aims for.`
      : null;
  return { candidates, excluded, note };
}

const round = (value: number) => Math.round(value * 1000) / 1000;
