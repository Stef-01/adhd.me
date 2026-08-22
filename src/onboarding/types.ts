// W213: what a GP tells us when they join, and what we are allowed to do with it.
//
// THE SHAPE IS BORROWED FROM THE PUBLIC PROFILE ON PURPOSE. W183 decided what a directory entry
// may contain and refused a free-text bio, a rating, a review and an experience count. An
// onboarding form is where all of those come back, because a form is a place to ask questions and
// every one of them is a natural question to ask. So this collects the fields a `DirectoryProfile`
// can hold and nothing else: an application carrying a paragraph about a clinician's approach
// would be an application for a field that does not exist, and somebody would eventually build it.
//
// EVERY CLAIM IS THE APPLICANT'S UNTIL SOMEBODY CHECKS IT. W193 splits published fields into
// "checkable on a public register" and "the clinician told us". A submission is entirely the
// second kind, including the registration number, which is checkable IN PRINCIPLE but has not been
// checked at the moment it arrives. `ClinicianApplication` is therefore not a profile and cannot
// be published: it is a request, and the type says so by being a different type. Nothing here
// writes to `SHIPPED_DIRECTORY_PROFILES`, which stays empty behind founder gate G6.
//
// THE NSW TRAINING IS A DECLARATION, NOT A CREDENTIAL. There is no public register of who has
// completed it, so the form asks and records the answer as an answer. It does not accept a
// certificate: a field that can hold evidence invites publishing the evidence, and W109 already
// holds documents behind a grant inside a practice tenancy rather than in a signup row.

import type { CareArea } from "@/demo/care-archetypes";
import { EI_QUALITIES, EI_QUALITY_KEYS, type EIQuality } from "@/demo/emotional-fit";
import { MATCHABLE_LANGUAGES } from "@/matching/languages";

/** What a GP is asked. Ordered as the form asks it, so the two cannot drift apart. */
export interface ClinicianApplication {
  id: string;
  /** Their own name, as they gave it. */
  fullName: string;
  /** Checkable on the Ahpra register by anybody, once somebody does. */
  ahpraRegistrationNumber: string;
  email: string;
  /** Suburb only. A street address is precision beyond the question a patient is asking. */
  practiceSuburb: string;
  practiceName: string;
  /** From the closed vocabulary, so an application cannot claim an area the finder cannot match. */
  careAreas: CareArea[];
  /**
   * HOW THEY WORK, which onboarding did not ask for until W221 and which is half of what a patient
   * is actually choosing on.
   *
   * A probe of the finder found that the queries people write are as often about manner as about
   * scope — "I can never get a word in", "somewhere I can be honest about how much I drink" — and
   * a clinician who declares only care areas cannot be matched on any of it. They are then
   * invisible to half the people who would have chosen them, which is a worse outcome for the GP
   * than for the product.
   *
   * Closed vocabulary (`EIQuality`), for the same reason `careAreas` is: a free-text answer here
   * would be the biography W183 refuses, arriving through the form instead of the profile.
   */
  manner: EIQuality[];
  /** Declared, checked by nobody, and rendered as declared. */
  languages: string[];
  /** Says they have completed the NSW training. See the header. */
  nswAdhdTrained: boolean;
  acceptingNewPatients: boolean;
  /**
   * The share of their patients the GP said they would WANT in this kind of work — the number
   * the join hero has them set ("I want N% of my patients to be…"), carried into the
   * application instead of being discarded at the fold.
   *
   * A PREFERENCE, NOT A PROFILE FIELD. This is W81's interest capture arriving through the
   * front door: a statement about the case mix they would take more of. It is internal — no
   * directory profile holds it and none may (a stated ambition rendered publicly reads as a
   * competence claim) — and it feeds only the clinician-side half of matching that the year
   * plan's Q3 reciprocity work needs stated capacity for.
   *
   * ABSENT UNLESS THE GP ACTUALLY SET IT. The hero opens at 30%, and a default nobody touched
   * is not a declaration; recording it as one would manufacture a preference. So the field is
   * optional, and the form only submits it after the control has been used.
   */
  desiredMixPercent?: number;
  submittedAt: string;
  /**
   * Every application arrives here and stays here until a person moves it.
   *
   * There is no automatic transition to published, and that is the point: W183's gate is an Ahpra
   * advertising review, which is a human act. A status enum with an `approved` value that some
   * code path could set would make the gate a variable.
   */
  status: "received";
}

export interface ClinicianFormState {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Partial<
    Record<"fullName" | "ahpraRegistrationNumber" | "email" | "practiceSuburb" | "practiceName" | "careAreas" | "manner" | "languages" | "desiredMixPercent" | "consent", string>
  >;
}

/**
 * The mix values the hero can express, shared with the store's validator so the two cannot
 * drift: 10–50 in steps of 10. The ceiling is deliberate — a hero that let a GP ask for 100%
 * would be selling a caseload this product has no basis to promise.
 */
export const MIX_PERCENT_MIN = 10;
export const MIX_PERCENT_MAX = 50;
export const MIX_PERCENT_STEP = 10;

/** True only for the exact values the hero's control can produce. */
export function isDeclarableMixPercent(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIX_PERCENT_MIN &&
    value <= MIX_PERCENT_MAX &&
    value % MIX_PERCENT_STEP === 0
  );
}

/**
 * One language vocabulary for onboarding and matching. A language may be offered here before a
 * listed GP speaks it: that is how the finder can name a roster gap rather than ignore the ask.
 */
export const OFFERED_LANGUAGES = MATCHABLE_LANGUAGES;

/** The three headings the care areas sit under, in display order. Mental health, streamlined. */
export type CareAreaGroup = "ADHD" | "Depression and anxiety" | "Other mental health";
export const CARE_AREA_GROUPS: readonly CareAreaGroup[] = ["ADHD", "Depression and anxiety", "Other mental health"];

/**
 * Care areas as a GP would read them, grouped, paired with the union member the finder matches on.
 *
 * STREAMLINED ACROSS MENTAL HEALTH rather than a long list of ADHD sub-areas: a practicing GP sees
 * mental health as conditions, not as the seventeen procedural slices the finder was first built
 * from. The `group` is display only; the `id` is still the closed vocabulary the matcher scores,
 * and ADHD assessment remains the anchor every listing holds.
 */
export const CARE_AREA_LABELS: ReadonlyArray<{ id: CareArea; label: string; group: CareAreaGroup }> = [
  { id: "adhd-assessment", label: "ADHD assessment", group: "ADHD" },
  { id: "child-adolescent-adhd", label: "ADHD in children and adolescents", group: "ADHD" },
  { id: "titration", label: "Medication titration and dose follow-up", group: "ADHD" },
  { id: "shared-care", label: "Shared care with a psychiatrist or paediatrician", group: "ADHD" },
  { id: "depression", label: "Depression and low mood", group: "Depression and anxiety" },
  { id: "anxiety", label: "Anxiety disorders", group: "Depression and anxiety" },
  { id: "trauma-informed", label: "Trauma and PTSD", group: "Other mental health" },
  { id: "complex-mental-health", label: "Bipolar and complex mental health", group: "Other mental health" },
  { id: "autism-adhd", label: "Autism and neurodevelopmental", group: "Other mental health" },
  { id: "substance-history", label: "Substance use", group: "Other mental health" },
  { id: "emotional-regulation", label: "Emotional regulation", group: "Other mental health" },
  { id: "non-medication", label: "Non-medication and psychological supports", group: "Other mental health" },
];

/**
 * Fields this form deliberately does not have, with the reason.
 *
 * W183's `REFUSED_FIELDS` pattern. Held as data so a future version has to delete a stated refusal
 * rather than quietly add an input, and so the test can assert the form matches this list.
 */
export const REFUSED_APPLICATION_FIELDS: Readonly<Record<string, string>> = {
  bio: "A free-text biography is where a rating, a testimonial and a competence claim all reappear in prose. Focus areas are a closed vocabulary precisely so there is no unlinted paragraph.",
  yearsExperience: "Looks like a fact and reads as a competence claim. W193 refuses to publish activity volume for the same reason.",
  certificateUpload: "Evidence belongs in a practice's credential vault behind a grant, not in a signup row. A field that can hold a certificate invites publishing it.",
  patientsSeen: "A volume figure is a performance claim, and partly a measure of how a practice allocates work rather than of the clinician.",
  streetAddress: "A patient is asking which suburb, not which building. Precision beyond the question is disclosure without purpose.",
  fees: "Fees are the practice's to state, on the practice's own terms, and a fee captured at signup is stale the day it changes.",
};

/** What each quality asks, in the clinician's language. See `MANNER_LABELS` below. */
const MANNER_ASKS: Record<EIQuality, string> = {
  attuned: "I take patients seriously, especially those dismissed or misdiagnosed before.",
  steadying: "I'm comfortable settling and managing anxious or distressed patients.",
  sense_making: "I help patients understand what's going on, not just manage today's problem.",
  motivating: "I build management plans around the patient's existing strengths and routines.",
  unhurried: "I offer longer first appointments for complex presentations.",
  non_judgmental: "I take substance-use and lifestyle histories without judgement.",
  collaborative: "I make decisions together with the patient, not for them.",
  culturally_attuned: "I work comfortably with family involvement and cultural or language context.",
  structured: "I work to a documented baseline with scheduled follow-up.",
};

/**
 * The manner questions, as a GP reads them.
 *
 * PHRASED AS A FACT ABOUT THE DAY, NOT AS A SELF-DESCRIPTION, which is the hardest and most
 * important thing about asking these. "Do you book a longer first appointment?" has a true answer;
 * "are you unhurried?" has only a flattering one. Labels come from `EI_QUALITIES` so the form, the
 * matcher and the reason a patient reads are the same words.
 */
export const MANNER_LABELS: ReadonlyArray<{ id: EIQuality; label: string; ask: string }> = EI_QUALITY_KEYS.map(
  (id) => ({
    id,
    label: EI_QUALITIES[id].label,
    ask: MANNER_ASKS[id],
  }),
);
