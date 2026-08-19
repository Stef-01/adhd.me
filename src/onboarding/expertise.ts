// W227 (O22): the interview's free speech, read by the PATIENT'S own reader.
//
// WHERE THIS SITS, STATED PRECISELY, BECAUSE THIS MODULE'S FIRST DRAFT GOT IT WRONG. The tree
// already has a transcript-to-proposals reader: `transcript.ts` (W221) hears CLINICIAN speech
// with a clinician-vocabulary cue list ("paediatric", "co manage", "titrate") and proposes
// facets for human review in the console. This module is NOT a second proposer — a second
// overlapping proposer is the two-lexicon drift W221 exists to prevent. It is the other half
// of the interview's value, which transcript.ts cannot provide: it reads the SAME free speech
// with the PATIENT lexicon (`readNeeds` — the same cues, stemmer and clause rules that read
// "somewhere I can be honest about drinking"), and so answers a different question:
//
//     "Which parts of what this doctor just said could a patient's own words actually reach?"
//
// Two uses, both in the O22 design (docs/ONBOARDING-INTERVIEW.md):
//
//   1. THE CROSS-CHECK. A facet transcript.ts proposes that this reader ALSO reaches is a
//      declaration patients genuinely ask for in their own words — worth confirming first.
//   2. THE REACH-GAP FEED. Expertise the doctor described that reaches NOTHING here is a
//      discovered gap in patient-side reach (the O13 class of failure, found at onboarding
//      time instead of in production). Those sentences go to lexicon review.
//
// The free-text law is unbent: the transcript is internal, never published
// (`src/directory/profile.ts` refuses bios), and every proposal carries a read-back question —
// a proposal is never a declaration, because "I don't do titration" contains "titration" and
// clause rules catch some negations, not all.

import { readNeeds, type NeedSignal } from "@/matching/needs";
import { OFFERED_LANGUAGES } from "@/onboarding/types";

/** One declaration the transcript supports, with the evidence and the read-back question. */
export type DeclarationProposal = {
  /** The facet the doctor's words reached, in the matcher's own vocabulary. */
  facet: NeedSignal["facet"];
  /** The closed-vocabulary label a patient would eventually see beside a match. */
  label: string;
  /** The cue from the transcript that reached the facet — the interviewer's pointer back into it. */
  heard: string;
  /** Read back to the doctor before anything is recorded. A proposal is never a declaration. */
  toConfirm: string;
};

/**
 * Read an interview transcript and propose the declarations it supports.
 *
 * Languages are proposed from the offered list rather than `languageNeeds` because that
 * function's vocabulary is the ROSTER'S declared languages (a patient can only be matched to
 * what exists) — an onboarding doctor is the person who ADDS a language, so their transcript is
 * read against everything the product offers.
 */
export function proposeDeclarations(transcript: string): DeclarationProposal[] {
  const proposals: DeclarationProposal[] = [];

  for (const need of readNeeds(transcript)) {
    if (need.facet.kind === "care") {
      proposals.push({
        facet: need.facet,
        label: need.label,
        heard: need.matched,
        toConfirm: `You mentioned "${need.matched}" — is ${need.label.toLowerCase()} work you see often, sometimes, or not really yours?`,
      });
    } else if (need.facet.kind === "manner") {
      proposals.push({
        facet: need.facet,
        label: need.label,
        heard: need.matched,
        toConfirm: `You said "${need.matched}" — should the profile declare that way of working, knowing patients will read it as your claim?`,
      });
    }
    // Preference facets ("bulk billed", "by phone") are access facts, already asked directly by
    // the structured questions — a transcript mention adds no information a tickbox lacks.
  }

  const lowered = transcript.toLowerCase();
  // OFFERED_LANGUAGES already excludes English (never a match reason, so never a proposal).
  for (const language of OFFERED_LANGUAGES) {
    if (!lowered.includes(language.toLowerCase())) continue;
    proposals.push({
      facet: { kind: "language", language },
      label: `${language}-speaking`,
      heard: language,
      toConfirm: `You mentioned ${language} — do you consult in it, or speak it socially? Only consulting goes on the profile.`,
    });
  }

  return proposals;
}

/**
 * The reach-gap feed: sentences of expertise that the patient lexicon hears NOTHING in.
 *
 * Each of these is a candidate O13 — a real way of describing care that a patient could type
 * tomorrow and get silence for. Reviewed by a person (most gaps are correctly unreadable:
 * biography, logistics, small talk); the ones that are genuine expertise become lexicon cues,
 * which widens patient-side reach at the moment a clinician joins instead of after a
 * production failure.
 */
export function reachGaps(transcript: string): string[] {
  return transcript
    .split(/(?<=[.?!])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .filter((sentence) => proposeDeclarations(sentence).length === 0);
}
