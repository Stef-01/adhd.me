// Builders for the matching tests: a GP and a patient with every field declared, overridable.
// Synthetic by construction; nothing here names a real person.

import { LexicalEmbedder } from "./embedding";
import type { GP, Patient, StructuredSignals } from "./types";

export const embedder = new LexicalEmbedder();

export function signals(overrides: Partial<StructuredSignals> = {}): StructuredSignals {
  return {
    symptomDurationMonths: null,
    stigmaSensitive: false,
    financialConstraint: false,
    comorbidities: [],
    preferredConsultStyle: "either",
    billingPreference: "either",
    ageGroup: "adults",
    priorAssessment: false,
    medicationHistory: "none",
    communicationPreference: [],
    careAsks: [],
    ...overrides,
  };
}

export function patient(overrides: Partial<Patient> & { signals?: Partial<StructuredSignals> } = {}): Patient {
  const { signals: s, ...rest } = overrides;
  return {
    id: "p-1",
    name: "Example person",
    contact: { email: null, phone: null },
    location: { suburb: "Epping", postcode: null },
    narrativeText: "I want an adult ADHD assessment and I do not want to be rushed.",
    narrativeEmbedding: null,
    structuredSignals: signals(s),
    documentsUploaded: [],
    status: "intake",
    condition: "adhd",
    createdAt: "2026-09-09T00:00:00.000Z",
    ...rest,
  };
}

export function gp(overrides: Omit<Partial<GP>, "credentials" | "preferences"> & { credentials?: Partial<GP["credentials"]>; preferences?: Partial<GP["preferences"]> } = {}): GP {
  const { credentials, preferences, ...rest } = overrides;
  return {
    id: "gp-1",
    name: "Dr Example",
    shortName: "Dr Example",
    practice: "Example Practice",
    practiceLocation: { suburb: "Epping", postcode: null },
    practiceId: null,
    telehealthAvailable: true,
    acceptingNewPatients: true,
    credentials: {
      racgpSpecificInterestsMember: true,
      aadpaTrained: true,
      stateAdhdTrained: null,
      yearsTreatingAdhd: 6,
      caseloadCapacityCurrent: 4,
      caseloadCapacityMax: 8,
      ageGroupsTreated: ["adults", "older-adults"],
      caseloadMix: ["anxiety", "depression"],
      prescribingPhilosophy: "case-by-case",
      titrationPace: "gradual",
      prescribingPhilosophyText: "Decides medication case by case after the assessment.",
      communicationStyle: ["unhurried", "collaborative"],
      bioLongText: "Sees adults for ADHD assessment, unhurried first appointments, titration reviewed on a schedule.",
      videoIntroUrl: null,
      evidence: [],
      ...credentials,
    },
    preferences: {
      ageGroups: ["adults", "older-adults"],
      consultStyles: ["telehealth", "in-person"],
      billingAccepted: ["bulk-billing", "medicare-gap", "private"],
      acceptsComplexComorbidity: true,
      minimumFit: 0.3,
      ...preferences,
    },
    bioEmbedding: null,
    verificationStatus: "verified",
    verifiedBy: "example verifier",
    verifiedOn: "2026-08-01",
    ratingAggregate: null,
    conditions: ["adhd"],
    languages: [],
    appointmentLength: "Long first appointment",
    realPerson: false,
    image: null,
    ...rest,
  };
}
