// Patient-safe labels for the closed vocabularies, one place, so a page and a form agree.

import type { EIQuality } from "@/demo/emotional-fit";
import type { AgeGroup, BillingPreference, Comorbidity, ConsultStyle, DeclineReason, PrescribingPhilosophy, TitrationPace, VerificationStatus } from "./types";

export const AGE_GROUP_LABELS: Readonly<Record<AgeGroup, string>> = {
  children: "Children",
  adolescents: "Teenagers",
  adults: "Adults",
  "older-adults": "Older adults",
};

export const COMORBIDITY_LABELS: Readonly<Record<Comorbidity, string>> = {
  depression: "Low mood",
  anxiety: "Anxiety",
  "trauma-informed": "A trauma history",
  "complex-mental-health": "Complex presentations, held with a psychiatrist",
  "autism-adhd": "Autism alongside ADHD",
  "substance-history": "A history with alcohol or drugs",
  "emotional-regulation": "Emotional regulation",
};

export const PHILOSOPHY_LABELS: Readonly<Record<PrescribingPhilosophy, string>> = {
  "stimulant-first": "Stimulant first, when medication is the plan",
  "non-stimulant-first": "Non-stimulant first, when medication is the plan",
  "case-by-case": "Case by case",
  "non-prescribing": "Does not start ADHD medication",
};

export const PACE_LABELS: Readonly<Record<TitrationPace, string>> = {
  gradual: "Gradual: smaller steps, more reviews",
  standard: "Standard: the usual schedule",
  brisk: "Brisk, where it is safe to",
};

export const CONSULT_STYLE_LABELS: Readonly<Record<ConsultStyle, string>> = {
  telehealth: "Telehealth",
  "in-person": "In person",
  either: "Either",
};

export const BILLING_LABELS: Readonly<Record<BillingPreference, string>> = {
  "bulk-billing": "Bulk-billed",
  "medicare-gap": "Medicare rebate with a gap",
  private: "Private fee",
  either: "Any",
};

export const DECLINE_REASON_LABELS: Readonly<Record<DeclineReason, string>> = {
  no_capacity: "No capacity after all",
  outside_scope: "Outside what I see",
  age_group: "Not an age group I see",
  needs_specialist: "Needs a psychiatrist or paediatrician first",
  other: "Another reason",
};

export const VERIFICATION_LABELS: Readonly<Record<VerificationStatus, string>> = {
  pending: "Credentials declared, not yet checked",
  verified: "Credentials checked",
  rejected: "Credentials not accepted",
};

export const MANNER_LABELS: Readonly<Record<EIQuality, string>> = {
  attuned: "Notices how you are",
  steadying: "Keeps things settled",
  sense_making: "Helps it make sense",
  motivating: "Leaves you with a plan",
  unhurried: "Gives you time",
  non_judgmental: "No judgement",
  collaborative: "Decides with you",
  culturally_attuned: "Understands your background",
  structured: "Reviews on a schedule",
};

/** A declared boolean, said three ways. */
export function declaredCopy(value: boolean | null, yes: string, no: string): string {
  return value === null ? "Not declared" : value ? yes : no;
}
