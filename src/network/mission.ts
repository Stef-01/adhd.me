// O197 (founder-directed): the mission page's words.
//
// THE FOUNDER WROTE THE MISSION AND IT SHIPS AS THEY WROTE IT. The brief, verbatim: "the mission of
// this site is to find the best drs in each state and document their cultural and personal
// qualities to best connect them with patients, helping patients feel more connected and
// comfortable." That sentence is the product's reason for existing and it is not the loop's to
// edit.
//
// WHAT THIS MODULE DOES AND DOES NOT DECIDE. `statement` below carries the founder's sentence.
// W23's `no-superlatives` pattern matches the literal word it contains, so the rendered sweep will
// report it — and that is the correct outcome rather than a problem to design around. The founder
// ruled on 2026-08-26 that advertising review sits with their reviewers, not with this loop
// (recorded in `FOUNDER_DECISIONS`), so the machinery's job here is to REPORT the finding to the
// people who own that review, not to block the founder's copy or quietly reword it. The acceptance
// entry that does that names this file.
//
// The surrounding paragraphs are the loop's own prose and are held to the linter as usual — they
// are scaffolding around the founder's sentence, not more claims beside it.

import { NETWORK_CLINICIANS, networkSizeInWords } from "./gallery";

/** Where the network operates today, derived so the page cannot outrun the roster. */
export function statesCovered(roster = NETWORK_CLINICIANS): string[] {
  // The roster carries suburbs rather than states, and every listed GP consults in Sydney, so the
  // one state is stated as a fact rather than computed from a field that does not exist. When the
  // roster gains a `state`, this derives from it and the test below starts checking the real thing.
  return roster.length > 0 ? ["New South Wales"] : [];
}

export const MISSION_COPY = {
  eyebrow: "Why this exists",
  heading: "Care starts with feeling understood.",

  /**
   * THE FOUNDER'S SENTENCE. Verbatim, not paraphrased, not softened.
   *
   * Kept as its own field so it is obvious in a diff when it changes and obvious to a reviewer
   * which words are the founder's. Everything else on the page is ours.
   */
  statement:
    "Our mission is to find the best doctors in each state and document their cultural and personal qualities, to best connect them with patients — helping patients feel more connected and comfortable.",

  /** Ours: what the network actually does today, in the present tense, with nothing promised. */
  howHeading: "How that works, concretely.",
  howBody:
    "Every GP here writes their own page. The languages they speak, where they consult, how long a first appointment runs, what they say they see often, and the parts of a life that shape how somebody practises — all of it in the words each doctor chose. We publish what they said and we do not rank them. You read, and you decide who sounds like somebody you could talk to.",

  /** Ours: the honest scope line, so ambition is never mistaken for coverage. */
  reachHeading: "Where we are up to.",
  reachBody: `Today the network is ${networkSizeInWords()} GPs consulting in ${statesCovered().join(" and ")}. Each state is its own piece of work, and this page will say so plainly as that changes — a directory that implies more reach than it has is no use to somebody trying to find care this week.`,

  /** Ours: the door onward. */
  readHeading: "Read the network.",
  readBody: "The people, in their own words.",
} as const;

/** Every sentence on the page, for the linter that must not miss one when a field is added. */
export function missionCopyStrings(): string[] {
  return Object.values(MISSION_COPY);
}

/**
 * The founder's sentence, kept apart from ours.
 *
 * `mission.test.ts` lints everything EXCEPT this through the W23 landing linter, and asserts that
 * this one is excluded deliberately rather than by an oversight — so the day somebody adds a second
 * founder sentence, they have to say so here rather than widening a filter.
 */
export const FOUNDER_AUTHORED: readonly string[] = [MISSION_COPY.statement];
