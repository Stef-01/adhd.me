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
  /** Declared, checked by nobody, and rendered as declared. */
  languages: string[];
  /** Says they have completed the NSW training. See the header. */
  nswAdhdTrained: boolean;
  acceptingNewPatients: boolean;
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
    Record<"fullName" | "ahpraRegistrationNumber" | "email" | "practiceSuburb" | "practiceName" | "careAreas" | "languages" | "consent", string>
  >;
}

/**
 * The languages offered, matching the demo roster so the finder can actually match on them.
 *
 * A free-text language box would let somebody write "a bit of Hindi", which the matcher cannot use
 * and a patient would reasonably rely on.
 */
export const OFFERED_LANGUAGES = [
  "Arabic",
  "Hindi",
  "Igbo",
  "Malayalam",
  "Mandarin",
  "Punjabi",
  "Spanish",
  "Tamil",
  "Vietnamese",
] as const;

/** Care areas as a GP would read them, paired with the union member the finder matches on. */
export const CARE_AREA_LABELS: ReadonlyArray<{ id: CareArea; label: string }> = [
  { id: "adhd-assessment", label: "Assessment" },
  { id: "adult-adhd", label: "Adults" },
  { id: "child-adolescent-adhd", label: "Children and adolescents" },
  { id: "adhd-in-women", label: "Late-recognised presentations in women" },
  { id: "autism-adhd", label: "Co-occurring autism" },
  { id: "titration", label: "Titration and dose follow-up" },
  { id: "shared-care", label: "Shared care with a psychiatrist or paediatrician" },
  { id: "non-medication", label: "Non-medication supports" },
  { id: "emotional-regulation", label: "Emotional regulation" },
  { id: "comorbid-mood", label: "Anxiety and mood differential" },
  { id: "substance-history", label: "Substance-use history" },
  { id: "sleep", label: "Sleep" },
  { id: "cardiac-screening", label: "Baseline cardiovascular screening" },
  { id: "disability-rights", label: "Disability rights and adjustments" },
  { id: "trauma-informed", label: "Trauma-informed assessment" },
  { id: "complex-mental-health", label: "Complex mental health" },
  { id: "student-academic", label: "Study and workplace documentation" },
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
