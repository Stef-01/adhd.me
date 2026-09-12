// The two questions that separate pathways, asked before any list is shown.
//
// Charmaine Bernie's first driver is identification and navigation — "helping people work out what
// they actually need and how to access it" — and her evidence for the cost of getting it wrong is
// concrete: children left on an autism assessment waitlist for two years when it was never the
// right list. She tested "which GP can diagnose ADHD" herself and found very little useful.
//
// Three parts of that triage already existed: the kinds of care a search reaches
// (app/finder-stages/results-stage.tsx), what each kind is for (`inAWord` in ./professions.ts),
// and a cold page that answers instead of asking (app/support-path.tsx). This is the fourth, and
// the one the audit recorded as a flow rather than a component: the questions whose answers change
// WHICH LIST a person should be looking at, rather than which row of one list comes first.
//
// TWO QUESTIONS, NOT TEN, AND NOT THREE. `src/matching/clarify.ts` already states the rule that
// governs this file: a question earns its place only if the answer changes the answer. These two
// each move somebody to a different professional and a different first step. A third — how long
// they have been waiting, how much they can spend, whether autism is in the picture — changes the
// words on the card at best, and a question that does not change the answer is a toll on somebody
// who came here because they did not know where to start. The audit calls the questionnaire-first
// version of this page the identification problem served back to the person who has it; two taps
// is the most this may ever cost.
//
// IT ROUTES, IT DOES NOT DIAGNOSE. Every row below names a kind of professional and the thing to
// ask them for. Nothing here decides whether somebody has ADHD, and nothing here is a claim about
// what treatment suits them — `src/compliance/party-to-care.ts` draws that line and the copy in
// this file is swept by the patient rules like every other patient-facing string.

// NOT src/pathways/ — that is the B2B governance of a clinical pathway version, signed and
// audited, and it shares only the word. This is the patient's side: which kind of care a person
// should be looking at at all.

import type { Profession } from "./professions";

/** Who the care is for. The coarsest fork there is: it changes the profession, not the order. */
export const CARE_FOR = ["me", "child"] as const;
export type CareFor = (typeof CARE_FOR)[number];

/** Where somebody is up to. The fork the wrong-waitlist problem turns on. */
export const CARE_STAGE = ["finding-out", "medication", "day-to-day"] as const;
export type CareStage = (typeof CARE_STAGE)[number];

/** The question text, held beside the answers so the screen renders the register rather than its own copy. */
export const FOR_LABELS: Readonly<Record<CareFor, string>> = {
  me: "Me",
  child: "A child or teenager",
};

export const STAGE_LABELS: Readonly<Record<CareStage, string>> = {
  "finding-out": "Still finding out",
  medication: "On medication, sorting the dose",
  "day-to-day": "The day-to-day is hard",
};

export interface Pathway {
  readonly for: CareFor;
  readonly stage: CareStage;
  /** The heading on the answer: where this goes, in a few words. */
  readonly lead: string;
  /** The one thing to do first, phrased as the person would do it. */
  readonly firstStep: string;
  /** The kind of professional that step goes through. Opens the finder narrowed to it. */
  readonly through: Profession;
  /**
   * The thing worth knowing that is not the step — usually the list this is NOT, because landing on
   * the wrong one is the failure this whole page exists to prevent. Optional: a row with nothing
   * true to add here says nothing, rather than padding to match its neighbours.
   */
  readonly note?: string;
}

/**
 * Every combination, because a flow with a hole in it routes somebody nowhere.
 *
 * The Australian shape is why four of six go through a GP and that is not a failure of the table:
 * the GP is the gateway to an adult assessment in NSW and Queensland and to a paediatric referral
 * everywhere, so the useful thing a triage can tell most people is WHAT TO ASK FOR when they get
 * there. The two rows that do not are the two her second driver is about — support that does not
 * wait on a diagnosis.
 */
export const PATHWAYS: readonly Pathway[] = [
  {
    for: "me",
    stage: "finding-out",
    lead: "Start with a GP.",
    firstStep: "Book a long appointment and ask for an ADHD assessment.",
    through: "gp",
    note: "In NSW and Queensland a GP can do the whole assessment.",
  },
  {
    for: "me",
    stage: "medication",
    lead: "A GP who does dose follow-up.",
    firstStep: "Ask for shared care with whoever started it.",
    through: "gp",
  },
  {
    for: "me",
    stage: "day-to-day",
    lead: "You can start this now.",
    firstStep: "A psychologist, an OT or a coach, without a referral.",
    through: "psychologist",
    note: "None of it waits on an assessment.",
  },
  {
    for: "child",
    stage: "finding-out",
    lead: "A GP referral, to a paediatrician.",
    firstStep: "Ask for a paediatrician who assesses ADHD, by name.",
    through: "gp",
    note: "The autism assessment list is a different list.",
  },
  {
    for: "child",
    stage: "medication",
    lead: "The paediatrician holds the dose.",
    firstStep: "Ask your GP about shared care between those appointments.",
    through: "gp",
  },
  {
    for: "child",
    stage: "day-to-day",
    lead: "School and home, not a clinic.",
    firstStep: "An occupational therapist works on the doing part.",
    through: "occupational-therapist",
    note: "A psychologist is the other door.",
  },
];

/** The pathway for a pair of answers. Total, by construction — see the table's own test. */
export function pathwayFor(who: CareFor, stage: CareStage): Pathway {
  const found = PATHWAYS.find((p) => p.for === who && p.stage === stage);
  /* istanbul ignore next — the table is exhaustive and the test proves it; this is the type's tail. */
  if (!found) throw new Error(`no pathway for ${who}/${stage}`);
  return found;
}
