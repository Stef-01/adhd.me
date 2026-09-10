// The bidirectional matching model (docs/adr/0007, PLAN.md Phase M): the five entities the
// founder's brief names, written so the service in this directory can be generalised to a
// condition other than ADHD by changing `condition` and the vocabularies, not the code.
//
// LAWS CARRIED FROM THE REST OF THE TREE, restated where they bite here:
//
//   G7 / TGA. A patient's narrative is read for what they ASK and what they SAY about their own
//   circumstances (a stated duration, a stated cost constraint). Nothing here infers severity or
//   orders patients against each other by need; the GP-side ranking is fit to the GP's DECLARED
//   caseload preferences and capacity, never a judgement of who is sicker.
//
//   C2. Weights are global and declared; no number is keyed to a named GP.
//
//   W213. Every score carries a breakdown and a sentence built from fixed templates and declared
//   facts. A patient's own words never reach a sentence: the rationale is built from the concept
//   overlap, whose labels are a closed vocabulary (`embedding.ts`).
//
//   Ahpra. `Feedback` is a recorded fact about a match (did the pairing fit, was the referral
//   clinically appropriate), aggregated for the algorithm and shown to patients only as counts of
//   people who said they felt understood. It is not a star rating of a named clinician, and the
//   public surfaces keep to the `no-ratings` rule in `src/compliance/landing.ts`.

import type { CareArea } from "@/demo/care-archetypes";
import type { EIQuality } from "@/demo/emotional-fit";

/** The condition a roster serves. ADHD today; the vocabularies are the only ADHD-specific part. */
export type Condition = "adhd";

export type AgeGroup = "children" | "adolescents" | "adults" | "older-adults";
export const AGE_GROUPS: readonly AgeGroup[] = ["children", "adolescents", "adults", "older-adults"];

export type ConsultStyle = "telehealth" | "in-person" | "either";
export type BillingPreference = "bulk-billing" | "medicare-gap" | "private" | "either";

/** How a GP says they approach medication. Declared, never inferred. */
export type PrescribingPhilosophy =
  | "stimulant-first"
  | "non-stimulant-first"
  | "case-by-case"
  | "non-prescribing";

export type TitrationPace = "gradual" | "standard" | "brisk";

/**
 * A co-occurring presentation the patient names, in the finder's care-area vocabulary so the
 * same reader (`readNeeds`) hears it. Closed: a value here is a CareArea the roster can declare.
 */
export type Comorbidity = Extract<
  CareArea,
  | "depression"
  | "anxiety"
  | "trauma-informed"
  | "complex-mental-health"
  | "autism-adhd"
  | "substance-history"
  | "emotional-regulation"
>;

export const COMORBIDITIES: readonly Comorbidity[] = [
  "depression",
  "anxiety",
  "trauma-informed",
  "complex-mental-health",
  "autism-adhd",
  "substance-history",
  "emotional-regulation",
];

/** A dense vector. Fixed dimension per embedder; L2-normalised so a dot product is a cosine. */
export type Embedding = readonly number[];

export type PatientStatus = "intake" | "matched" | "booked" | "consulted" | "closed";

export type UploadedDocument = {
  id: string;
  /** The checklist item it answers, when it answers one. */
  checklistItemId: string | null;
  name: string;
  uploadedAt: string;
};

/** What the narrative said about the person's own circumstances. Facts they stated, not diagnoses. */
export type StructuredSignals = {
  /** "for about six years" becomes 72. Null when the narrative gives no duration. */
  symptomDurationMonths: number | null;
  /** They said something about shame, judgement or embarrassment around seeking help. */
  stigmaSensitive: boolean;
  /** They said cost is a constraint, or asked for bulk-billing. */
  financialConstraint: boolean;
  comorbidities: readonly Comorbidity[];
  preferredConsultStyle: ConsultStyle;
  billingPreference: BillingPreference;
  ageGroup: AgeGroup;
  /** They said an assessment or diagnosis already exists. */
  priorAssessment: boolean;
  /** They said they are on, or have been on, medication for this condition. */
  medicationHistory: "none" | "current" | "past";
  /** Manner words the narrative asked for (the finder's closed vocabulary). */
  communicationPreference: readonly EIQuality[];
  /** Care areas the narrative asked for, through `readNeeds`. */
  careAsks: readonly CareArea[];
};

export type Patient = {
  id: string;
  name: string;
  contact: { email: string | null; phone: string | null };
  location: { suburb: string; postcode: string | null };
  narrativeText: string;
  narrativeEmbedding: Embedding | null;
  structuredSignals: StructuredSignals;
  documentsUploaded: readonly UploadedDocument[];
  status: PatientStatus;
  condition: Condition;
  createdAt: string;
};

export type VerificationStatus = "pending" | "verified" | "rejected";

/** What a GP declares about training, experience and how they work. Null means "not declared". */
export type GPCredentials = {
  racgpSpecificInterestsMember: boolean | null;
  aadpaTrained: boolean | null;
  /** State ADHD prescribing training (NSW's, today). Distinct from AADPA's course. */
  stateAdhdTrained: boolean | null;
  yearsTreatingAdhd: number | null;
  /** Open places on the list right now. The capacity slider on the GP dashboard writes this. */
  caseloadCapacityCurrent: number;
  caseloadCapacityMax: number;
  ageGroupsTreated: readonly AgeGroup[];
  /** Presentations the GP declares they take alongside the condition. */
  caseloadMix: readonly Comorbidity[];
  prescribingPhilosophy: PrescribingPhilosophy | null;
  titrationPace: TitrationPace | null;
  prescribingPhilosophyText: string;
  communicationStyle: readonly EIQuality[];
  bioLongText: string;
  videoIntroUrl: string | null;
  /** Evidence documents uploaded for verification, by name. Contents never enter this tree. */
  evidence: readonly { id: string; name: string; uploadedAt: string }[];
};

/** What a GP says about the matches they want to receive. The bidirectional half. */
export type GPPreferences = {
  ageGroups: readonly AgeGroup[];
  consultStyles: readonly Exclude<ConsultStyle, "either">[];
  billingAccepted: readonly Exclude<BillingPreference, "either">[];
  /** Willing to take complex comorbidity (more than one named presentation alongside). */
  acceptsComplexComorbidity: boolean;
  /**
   * Below this GP-side fit (0 to 1) the GP would rather not be proposed at all. Declared once on
   * the dashboard; the deferred-acceptance loop treats a patient below it as unacceptable, which
   * is the "decline low-fit matches before booking" the brief asks for, done before the proposal
   * rather than after.
   */
  minimumFit: number;
};

export type RatingAggregate = {
  /** Feedback records counted, both sides. */
  count: number;
  patientCount: number;
  gpCount: number;
  /** Share of patients who gave fit 4 or 5, "felt understood". 0 to 1. */
  feltUnderstoodShare: number;
  communicationMean: number;
  clinicalAppropriatenessMean: number;
  /** Share of GP-side records saying the referral was clinically appropriate (4 or 5). */
  gpAppropriateShare: number;
  capacityFitMean: number;
};

export type GP = {
  id: string;
  name: string;
  shortName: string;
  practice: string;
  practiceLocation: { suburb: string; postcode: string | null };
  telehealthAvailable: boolean;
  acceptingNewPatients: boolean;
  credentials: GPCredentials;
  preferences: GPPreferences;
  bioEmbedding: Embedding | null;
  verificationStatus: VerificationStatus;
  verifiedBy: string | null;
  verifiedOn: string | null;
  ratingAggregate: RatingAggregate | null;
  conditions: readonly Condition[];
  /** Languages beside English. */
  languages: readonly string[];
  appointmentLength: string;
  /** True when the entry is a real person (the roster's law); otherwise an invented example. */
  realPerson: boolean;
  /** Image path when the roster supplies one. */
  image: string | null;
  /** The console practice that has claimed this profile, or null while nobody has (M5 scoping). */
  practiceId: string | null;
};

/** One criterion of a ranking, as the ranking module scores it. Mirrored here to keep types acyclic. */
export type ScoredCriterion = { criterion: string; weight: number; raw: number; weighted: number; sentence: string };

export type MatchStatus = "proposed" | "accepted" | "declined" | "completed" | "withdrawn";

export type MatchRationale = {
  headline: string;
  points: readonly string[];
  /** Concept labels shared by the narrative and the bio, best first. */
  sharedConcepts: readonly string[];
};

export type Match = {
  id: string;
  patientId: string;
  gpId: string;
  /** The patient side's ranking score for this GP, 0 to 1. */
  patientRankScore: number;
  /** The GP side's ranking score for this patient, 0 to 1. */
  gpRankScore: number;
  /** Narrative to bio cosine, 0 to 1. */
  similarity: number;
  /** 1 = the patient's first choice among those presented. */
  position: number;
  matchStatus: MatchStatus;
  rationale: MatchRationale;
  /** The patient side's scored breakdown, kept so the feedback loop can learn from it. */
  patientBreakdown: readonly ScoredCriterion[];
  createdAt: string;
  decidedAt: string | null;
  /** Given by the GP when declining, from a closed list. */
  declineReason: DeclineReason | null;
};

export type DeclineReason = "no_capacity" | "outside_scope" | "age_group" | "needs_specialist" | "other";

export type Rating = 1 | 2 | 3 | 4 | 5;

export type PatientFeedback = {
  /** Did this person feel understood by this GP. */
  fit: Rating;
  communication: Rating;
  clinicalAppropriateness: Rating;
};

export type GPFeedback = {
  /** Was the referral clinically appropriate for what the GP does. */
  clinicalAppropriateness: Rating;
  /** Did the match fit the capacity the GP had declared. */
  capacityFit: Rating;
};

export type Feedback = {
  id: string;
  matchId: string;
  from: "patient" | "gp";
  patientRating: PatientFeedback | null;
  gpRating: GPFeedback | null;
  freeTextFeedback: string;
  createdAt: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  /** Why the first appointment goes better with it, in plain words. */
  why: string;
  required: boolean;
  done: boolean;
  /** Which of the narrative's signals asked for it. Empty for the items everybody gets. */
  triggeredBy: readonly string[];
};

export type DocumentChecklist = {
  id: string;
  patientId: string;
  items: readonly ChecklistItem[];
  generatedAt: string;
};
