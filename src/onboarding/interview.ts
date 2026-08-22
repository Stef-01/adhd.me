// W221: the clinician interview, as data.
//
// THIRTY MINUTES WITH A GP HAS TO LEAVE THEM MATCHABLE. That is the whole specification, and it
// is the reason this file exists rather than a document describing an interview somebody runs
// from memory. See docs/MATCHING-PLAN.md §5 for the budget it is cut to.
//
// THE RULE THAT MAKES IT DESIGNABLE, AND THE ONE THE TESTS ENFORCE IN BOTH DIRECTIONS:
//
//     every question maps to exactly one facet the matcher consumes,
//     and every facet the matcher consumes has a question.
//
// Neither half is decoration. Without the first, an interview grows questions that feel
// professional and change no match — which is how a thirty-minute conversation becomes ninety.
// Without the second, a clinician finishes onboarding with a profile that cannot be matched on a
// dimension patients actually ask about, and nobody finds out until somebody types it into the
// finder and gets a worse answer than they should have. `interview.test.ts` fails on either.
//
// WHY MULTI-SELECT EVERYWHERE, AND WHY THAT IS NOT LAZINESS. `src/directory/profile.ts` refuses a
// free-text biography, and its reasoning is that a bio "is where every refusal above reappears in
// prose" — the field nobody can lint and everybody wants. A free-text interview answer is that
// same field with an interviewer's handwriting on it. THE FORM IS THE ENFORCEMENT POINT, not a
// linter downstream of it: what cannot be typed cannot be published.
//
// WHY THREE STATES RATHER THAN A TICKBOX. "Often / sometimes / not me" carries information a
// boolean throws away. A GP who *sometimes* sees co-occurring autism should rank below one who
// sees it often and above one who does not see it at all, and a tickbox forces them to overclaim
// or disappear. Clinicians also answer three-state honestly and binaries defensively, which is
// the difference between a profile that matches well and one that is quietly inflated.

import type { CareArea } from "@/demo/care-archetypes";
import { MANNER_TRAITS, type MannerTrait } from "@/matching/needs";

/** How often a clinician says they see something. Ordered; the matcher may weight by it later. */
export type Frequency = "often" | "sometimes" | "not-me";

export const FREQUENCIES: readonly Frequency[] = ["often", "sometimes", "not-me"];

/**
 * What a question is FOR — the facet it fills.
 *
 * `identity` and `declaration` blocks do not feed the matcher; they feed the profile and the
 * disclosure. They are marked as such so the completeness test can tell "this question fills no
 * facet on purpose" from "somebody added a question that changes nothing".
 */
export type QuestionTarget =
  | { kind: "care"; area: CareArea }
  | { kind: "manner"; trait: MannerTrait }
  | { kind: "access"; field: "languages" | "telehealthFirstAppointment" | "appointmentLength" | "billing" | "wheelchairAccessible" }
  | { kind: "identity"; field: string }
  | { kind: "declaration"; field: string };

export type Question = {
  id: string;
  /** Asked out loud, in the clinician's language rather than the product's. */
  ask: string;
  /**
   * What the interviewer must say before recording the answer, where the answer becomes something
   * a patient will read. W193's rule is that a declaration is rendered as a declaration; a
   * clinician cannot consent to that if nobody told them at the time.
   */
  saidAloud?: string;
  answer: "frequency" | "multi-select" | "single-select" | "short-text" | "yes-no";
  options?: readonly string[];
  target: QuestionTarget;
  /** Minutes, for the budget. */
  minutes: number;
};

/**
 * The care areas asked about, in the order a GP would think about them: the reason somebody comes,
 * then who they are, then what else is in the room, then what happens after.
 */
const CARE_QUESTIONS: ReadonlyArray<{ area: CareArea; ask: string }> = [
  // ADHD
  { area: "adhd-assessment", ask: "Do you take patients through an ADHD assessment yourself?" },
  { area: "child-adolescent-adhd", ask: "Children and adolescents, as well as adults?" },
  { area: "titration", ask: "Do you carry titration and dose review yourself?" },
  { area: "shared-care", ask: "Shared care with a treating psychiatrist or paediatrician?" },
  // Depression and anxiety
  { area: "depression", ask: "Depression and low mood?" },
  { area: "anxiety", ask: "Anxiety disorders, including working anxiety and ADHD apart?" },
  // Other mental health
  { area: "trauma-informed", ask: "Trauma and PTSD, where the history itself is hard to tell?" },
  { area: "complex-mental-health", ask: "Bipolar, psychosis or other complex presentations, coordinated with a psychiatrist?" },
  { area: "autism-adhd", ask: "Autism and other neurodevelopmental presentations?" },
  { area: "substance-history", ask: "Taking a substance history as part of the safety picture?" },
  { area: "emotional-regulation", ask: "Rejection sensitivity and emotional regulation?" },
  { area: "non-medication", ask: "Patients who want options other than medication?" },
];

/**
 * The manner questions.
 *
 * THESE ARE THE HARDEST QUESTIONS TO ASK WELL and the most valuable answers in the interview,
 * because every one of them is a way of asking "what are you like", which invites a flattering
 * answer. Each is therefore phrased as a fact about how the clinician's day is ACTUALLY
 * ORGANISED — appointment length, what is written down, who is in the room — rather than as a
 * self-description. "Do you book longer first appointments?" has a true answer; "are you
 * unhurried?" has only a nice one.
 */
const MANNER_QUESTIONS: ReadonlyArray<{ trait: MannerTrait; ask: string }> = [
  { trait: "attuned", ask: "When somebody arrives having been brushed off before, how does that go in your room?" },
  { trait: "steadying", ask: "If somebody is anxious or overwhelmed at the start, what do you do first?" },
  { trait: "sense_making", ask: "Do you help people join the dots on what has been going on, or focus on the decision in front of you?" },
  { trait: "motivating", ask: "Do people usually leave with a plan they can act on, and does it build on what already works for them?" },
  { trait: "unhurried", ask: "Do you book a longer first appointment for this, and roughly how long?" },
  { trait: "non_judgmental", ask: "How do you open the substance and coping questions?" },
  { trait: "collaborative", ask: "Do you talk through the options and decide with the patient, or recommend and explain if asked?" },
  { trait: "culturally_attuned", ask: "Do family and language usually come into the room with the patient in your practice?" },
  { trait: "structured", ask: "Do you work to a documented baseline and a review schedule, or review when something comes up?" },
];

export const INTERVIEW: readonly Question[] = [
  // ── Identity and registration (4 min) ────────────────────────────────────────────────────
  { id: "name", ask: "Your name as you want patients to see it.", answer: "short-text", target: { kind: "identity", field: "displayName" }, minutes: 1 },
  { id: "ahpra", ask: "Your AHPRA registration number.", answer: "short-text", target: { kind: "identity", field: "ahpraRegistrationNumber" }, minutes: 1 },
  { id: "practice", ask: "Which practice, and which suburb?", answer: "short-text", target: { kind: "identity", field: "practice" }, minutes: 1 },
  { id: "accepting", ask: "Are you taking new patients for this right now?", answer: "yes-no", target: { kind: "identity", field: "acceptingNewPatients" }, minutes: 1 },

  // ── Scope (8 min) ────────────────────────────────────────────────────────────────────────
  ...CARE_QUESTIONS.map(({ area, ask }) => ({
    id: `care:${area}`,
    ask,
    answer: "frequency" as const,
    options: FREQUENCIES,
    target: { kind: "care" as const, area },
    minutes: 7 / CARE_QUESTIONS.length,
    saidAloud: "Answer for what you actually see, not what you could see. Patients read this as what you do often.",
  })),

  // ── Manner (6 min) ───────────────────────────────────────────────────────────────────────
  ...MANNER_QUESTIONS.map(({ trait, ask }) => ({
    id: `manner:${trait}`,
    ask,
    answer: "frequency" as const,
    options: FREQUENCIES,
    target: { kind: "manner" as const, trait },
    minutes: 7 / MANNER_QUESTIONS.length,
  })),

  // ── Access (6 min) ───────────────────────────────────────────────────────────────────────
  { id: "languages", ask: "Which languages can you consult in, well enough to do an assessment in?", answer: "multi-select", target: { kind: "access", field: "languages" }, minutes: 2,
    saidAloud: "This is only shown to somebody who asks for that language." },
  { id: "telehealth", ask: "Can the FIRST appointment be by phone or video, or does it need to be in the room?", answer: "single-select", options: ["First appointment can be remote", "First must be in person"], target: { kind: "access", field: "telehealthFirstAppointment" }, minutes: 1 },
  { id: "length", ask: "How long is a first appointment for this, and is a longer one bookable?", answer: "short-text", target: { kind: "access", field: "appointmentLength" }, minutes: 1 },
  { id: "billing", ask: "Billing for a first appointment, and who is bulk billed if anyone?", answer: "short-text", target: { kind: "access", field: "billing" }, minutes: 1 },
  { id: "access", ask: "Is the practice wheelchair accessible?", answer: "yes-no", target: { kind: "access", field: "wheelchairAccessible" }, minutes: 1 },

  // ── Declarations (3 min) ─────────────────────────────────────────────────────────────────
  { id: "training", ask: "Have you completed the NSW or Queensland ADHD training?", answer: "yes-no", target: { kind: "declaration", field: "nswAdhdTrained" }, minutes: 2,
    saidAloud: "We record this as something you have told us. There is no public register to check it against, so every page that shows it says you declared it. We do not want a copy of the certificate." },
  { id: "agreement", ask: "Are you happy for this to be published as your directory profile?", answer: "yes-no", target: { kind: "declaration", field: "publicationAgreement" }, minutes: 1,
    saidAloud: "Nothing is published until the Ahpra advertising review is done, and you can withdraw at any time." },

  // ── Read-back (2 min) ────────────────────────────────────────────────────────────────────
  { id: "readback", ask: "Here is your profile as a patient will see it. Is this you?", answer: "yes-no", target: { kind: "declaration", field: "readBackConfirmed" }, minutes: 2,
    saidAloud: "Read it back as written, not as summarised. This is the cheapest check on the whole pipeline and the last one before somebody chooses a GP on it." },
];

/** Total interview length, in minutes. Pinned by the test against the thirty-minute budget. */
export function interviewMinutes(): number {
  // Rounded to a tenth. The per-question figures are fractions of a block (7 minutes over 17 scope
  // questions), and summing them in binary gives 30.00000000000001 — a budget assertion that fails
  // on float representation rather than on the interview being too long.
  return Math.round(INTERVIEW.reduce((total, question) => total + question.minutes, 0) * 10) / 10;
}

/**
 * WHAT ONBOARDING PRODUCES — the profile the matcher consumes, and nothing beyond it.
 *
 * Deliberately NOT the full `Clinician` record: `about`, `matchLine`, `fitSignals` and the rest
 * are surface copy authored elsewhere and reviewed, and letting an interview write them would put
 * an unlinted paragraph about a named clinician into the tree through the side door W183 shut.
 */
export type ClinicianMatchProfile = {
  clinicianId: string;
  careAreas: ReadonlyArray<{ area: CareArea; frequency: Frequency }>;
  manner: ReadonlyArray<{ trait: MannerTrait; frequency: Frequency }>;
  languages: readonly string[];
  telehealthFirstAppointment: boolean;
  wheelchairAccessible: boolean;
  /** Declared, never checked. Rendered as a declaration on every surface. */
  nswAdhdTrained: boolean;
  readBackConfirmed: boolean;
};

/**
 * The facets a completed interview must be able to fill.
 *
 * Exported so the test can compare it against both the interview and the matcher, which is what
 * makes "thirty minutes leaves them matchable" a checked property rather than an intention.
 */
export const MATCHABLE_FACETS = {
  care: CARE_QUESTIONS.map((q) => q.area),
  manner: MANNER_TRAITS,
} as const;
