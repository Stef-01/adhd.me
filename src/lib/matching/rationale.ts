// "Why this GP": one headline and a few points per presented match, generated from the
// embedding overlap and the declared facts, never from the patient's own sentence.
//
// The concept layer of the embedding is what makes that possible. A shared concept has a label
// from a closed vocabulary ("adult ADHD assessment", "feeling safe to be honest"), so the
// rationale can say what the two texts have in common without quoting either. Everything else
// on the page is a declared fact with a numeral in it (places open, years, a verification date).
// The explanation IS the ranking's evidence: the shared concepts are the dimensions the cosine
// was highest on, and the points are the criteria the breakdown scored.

import { conceptLabel, type ConceptId } from "./embedding";
import type { RankedGP, RankedPatient } from "./ranking";
import type { GP, MatchRationale, Patient } from "./types";

export interface RationaleInput {
  patient: Patient;
  gp: GP;
  similarity: number;
  sharedConcepts: readonly ConceptId[];
  patientRank: RankedGP;
  gpRank: RankedPatient | null;
  distanceKm: number | null;
}

const AGE_GROUP_COPY = {
  children: "children",
  adolescents: "teenagers",
  adults: "adults",
  "older-adults": "older adults",
} as const;

const PHILOSOPHY_COPY = {
  "stimulant-first": "usually starts with a stimulant when medication is the plan",
  "non-stimulant-first": "usually starts with a non-stimulant when medication is the plan",
  "case-by-case": "decides medication case by case",
  "non-prescribing": "does not start medication, and says who can",
} as const;

function asList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function explainMatch(input: RationaleInput): MatchRationale {
  const { patient, gp, sharedConcepts, patientRank, gpRank } = input;
  const labels = sharedConcepts.map(conceptLabel);
  const signals = patient.structuredSignals;
  const points: string[] = [];

  const headline =
    labels.length > 0
      ? `You both talk about ${labels[0]}.`
      : `${gp.shortName} declares what you asked for on the practical side.`;

  if (labels.length > 1) points.push(`Also in common: ${asList(labels.slice(1, 4))}.`);

  if (gp.credentials.ageGroupsTreated.includes(signals.ageGroup)) {
    points.push(`Sees ${AGE_GROUP_COPY[signals.ageGroup]}, which is who this is for.`);
  }

  const matchedComorbidities = signals.comorbidities.filter((c) => gp.credentials.caseloadMix.includes(c));
  if (matchedComorbidities.length > 0) {
    points.push(
      `Declares ${matchedComorbidities.length} of the ${signals.comorbidities.length} things you named alongside ADHD.`,
    );
  }

  if (signals.preferredConsultStyle === "telehealth" && gp.telehealthAvailable) {
    points.push("Telehealth, as you asked.");
  } else if (signals.preferredConsultStyle === "in-person" && input.distanceKm !== null) {
    points.push(`About ${Math.round(input.distanceKm)} km from you.`);
  }

  const capacity = patientRank.breakdown.find((b) => b.criterion === "capacity");
  if (capacity && capacity.raw > 0) points.push(capacity.sentence);

  if (gp.credentials.yearsTreatingAdhd !== null) {
    points.push(`Says they have worked with ADHD for ${gp.credentials.yearsTreatingAdhd} years.`);
  }

  if (gp.credentials.prescribingPhilosophy !== null) {
    points.push(`${gp.shortName} ${PHILOSOPHY_COPY[gp.credentials.prescribingPhilosophy]}.`);
  }

  if (gp.verificationStatus === "verified" && gp.verifiedOn) {
    points.push(`Credentials checked on ${gp.verifiedOn}.`);
  }

  if (gpRank) {
    points.push(`On their side, your request fits what they asked for at ${Math.round(gpRank.score * 100)} of 100.`);
  }

  return { headline, points: points.slice(0, 5), sharedConcepts: labels };
}
