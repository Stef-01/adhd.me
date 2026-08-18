// W221: a 30-minute interview transcript → a clinician background the matcher can use.
//
// WHAT THIS IS FOR. The interview instrument (`interview.ts`) is a set of questions someone asks;
// this is what happens to the ANSWERS. A real interview does not arrive as ticked boxes — it
// arrives as thirty minutes of a GP talking about how they work, which is far richer than any
// form and completely unusable until it is turned into facets.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE ONE DESIGN DECISION THAT MATTERS: THIS PROPOSES, A HUMAN DISPOSES.
//
// Nothing here writes a profile. It reads a transcript and produces CANDIDATE facets, each with
// the clinician's own sentence attached, for a person to accept or reject in the console. The
// output type is `ProposedBackground`, not `ClinicianMatchProfile`, and the two are different
// types so that no code path can mistake one for the other — the same device `ClinicianApplication`
// uses to be un-publishable.
//
// THREE REASONS, IN ORDER OF HOW MUCH THEY COST IF IGNORED:
//
//   1. IT IS A CLAIM ABOUT A NAMED PERSON. A facet becomes a sentence a patient reads beside a
//      doctor's registration. An extractor that is 90% right is wrong about one clinician in ten,
//      publicly, in a way that clinician did not say and cannot easily find.
//   2. THE CLINICIAN HAS TO BE ABLE TO SEE WHAT WAS HEARD. W193's declaration posture is that a
//      clinician's profile is what they SAID. Keeping the sentence beside the facet is what makes
//      the read-back at the end of the interview a real check rather than a formality — they are
//      shown "we heard X because you said Y" and can say no.
//   3. IT KEEPS THE PIPELINE EXPLAINABLE END TO END. The finder can already say why a GP was
//      shown. With this, the answer to "why does his profile say that" is also one sentence: he
//      said it, here it is, and a person accepted it.
//
// WHY NOT AN LLM, WHEN AN LLM WOULD OBVIOUSLY READ A TRANSCRIPT BETTER. Because the failure mode
// is not "misses a facet" — a missed facet is caught in read-back. It is "invents a facet the
// clinician did not claim", which read-back catches only if the reviewer is paying attention, and
// which is exactly the kind of error a fluent summary makes invisible. The deterministic reader
// below can only ever propose a facet it can point at a sentence for. When an LLM is added, it
// belongs in this same seam — proposing, with the sentence attached, into the same review queue.

import { EI_QUALITIES, EI_QUALITY_KEYS, type EIQuality } from "@/demo/emotional-fit";
import type { CareArea } from "@/demo/care-archetypes";
import { CARE_AREA_LABELS } from "./types";
import { findCue, tokenise } from "@/matching/read";

/** One line of the transcript, attributed. Who said it decides whether it counts. */
export type TranscriptTurn = {
  speaker: "interviewer" | "clinician";
  text: string;
};

/**
 * A facet the transcript suggests, with the evidence for it.
 *
 * `quote` is not decoration and not a UI nicety. It is the whole control: a proposal a reviewer
 * cannot trace to a sentence is a proposal they cannot check, and one they cannot check they will
 * accept. The type therefore makes it impossible to propose without one.
 */
export type ProposedFacet =
  | { kind: "care"; area: CareArea; label: string; quote: string; cue: string }
  | { kind: "manner"; trait: EIQuality; label: string; quote: string; cue: string };

export type ProposedBackground = {
  /** Never a profile. A person turns this into one, or does not. */
  proposed: ProposedFacet[];
  /**
   * Turns that mentioned nothing the vocabulary covers.
   *
   * KEPT RATHER THAN DISCARDED, because this is the most useful output of the whole pipeline for
   * anybody improving it: thirty minutes of a GP describing their practice, and here are the
   * sentences the vocabulary could not hear. That is the lexicon's to-do list, written by the
   * people it is about, and it is how the closed vocabulary grows without anybody guessing.
   */
  unread: string[];
  /** Interviewer turns are never read. Recorded so the count is auditable. */
  ignoredInterviewerTurns: number;
};

/** Cues for the care areas, reusing the labels the form and the finder already share. */
const CARE_CUES: ReadonlyArray<{ area: CareArea; label: string; cues: readonly string[] }> = [
  // ADHD
  { area: "adhd-assessment", label: "ADHD assessment", cues: ["assessment", "assess", "diagnose", "diagnosis"] },
  { area: "child-adolescent-adhd", label: "ADHD in children and adolescents", cues: ["children", "adolescents", "teenagers", "paediatric"] },
  { area: "titration", label: "Medication titration and review", cues: ["titration", "titrate", "dose", "dosing"] },
  { area: "shared-care", label: "Shared care with a psychiatrist or paediatrician", cues: ["shared care", "psychiatrist", "co manage"] },
  // Depression and anxiety
  { area: "depression", label: "Depression and low mood", cues: ["depression", "depressed", "low mood", "antidepressant"] },
  { area: "anxiety", label: "Anxiety disorders", cues: ["anxiety", "anxious", "panic", "differential"] },
  // Other mental health
  { area: "trauma-informed", label: "Trauma and PTSD", cues: ["trauma", "trauma informed", "ptsd"] },
  { area: "complex-mental-health", label: "Bipolar and complex mental health", cues: ["bipolar", "psychosis", "complex presentations"] },
  { area: "autism-adhd", label: "Autism and neurodevelopmental", cues: ["autism", "autistic", "audhd"] },
  { area: "substance-history", label: "Substance use", cues: ["substance", "alcohol", "cannabis", "drinking"] },
  { area: "emotional-regulation", label: "Emotional regulation", cues: ["emotional regulation", "rejection sensitivity"] },
  { area: "non-medication", label: "Non-medication and psychological supports", cues: ["non medication", "without medication", "coaching", "behavioural"] },
];

/**
 * NEGATION IS CHECKED BEFORE ANYTHING IS PROPOSED, and this is the failure case that matters most.
 *
 * A GP asked "do you see children?" very often answers "no, I don't see children" — and the word
 * "children" is right there in the sentence. A reader that proposed on keyword presence alone
 * would propose the exact opposite of what the clinician said, attach their own sentence to it as
 * evidence, and look completely credible doing it. That is the worst output this pipeline could
 * produce, so the check is at the point of proposal rather than left to the reviewer.
 */
const NEGATORS = ["not", "dont", "doesnt", "no", "never", "rarely", "refer", "wouldnt", "avoid"];

function isNegated(sentence: readonly string[], at: number): boolean {
  // Within four content tokens before the cue, which covers "I don't really see" and "that's not
  // something I do" without reaching back into a previous clause.
  const from = Math.max(0, at - 4);
  return sentence.slice(from, at).some((token) => NEGATORS.includes(token));
}

/**
 * Read a transcript into proposals.
 *
 * ONLY THE CLINICIAN'S OWN TURNS ARE READ. The interviewer says every facet out loud by asking
 * about it — "do you do the baseline physical screening?" contains the entire cue — so a reader
 * that scanned the whole transcript would propose the full vocabulary for every clinician and
 * attribute it to them. The speaker attribution is not metadata here; it is the control.
 */
export function readTranscript(turns: readonly TranscriptTurn[]): ProposedBackground {
  const proposed: ProposedFacet[] = [];
  const unread: string[] = [];
  const seen = new Set<string>();
  let ignoredInterviewerTurns = 0;

  for (const turn of turns) {
    if (turn.speaker !== "clinician") {
      ignoredInterviewerTurns++;
      continue;
    }

    const sentence = tokenise(turn.text);
    let reachedAnything = false;

    for (const care of CARE_CUES) {
      for (const cue of care.cues) {
        const at = findCue(sentence, tokenise(cue));
        if (!at) continue;
        reachedAnything = true;
        if (isNegated(sentence, at.from)) continue;
        if (seen.has(`care:${care.area}`)) continue;
        seen.add(`care:${care.area}`);
        proposed.push({ kind: "care", area: care.area, label: care.label, quote: turn.text, cue });
        break;
      }
    }

    for (const trait of EI_QUALITY_KEYS) {
      for (const cue of EI_QUALITIES[trait].cues) {
        const at = findCue(sentence, tokenise(cue));
        if (!at) continue;
        reachedAnything = true;
        if (isNegated(sentence, at.from)) continue;
        if (seen.has(`manner:${trait}`)) continue;
        seen.add(`manner:${trait}`);
        proposed.push({ kind: "manner", trait, label: EI_QUALITIES[trait].label, quote: turn.text, cue });
        break;
      }
    }

    if (!reachedAnything && turn.text.trim().length > 0) unread.push(turn.text);
  }

  return { proposed, unread, ignoredInterviewerTurns };
}

/** Care-area labels, so the console can render a proposal the same way the form does. */
export const CARE_LABEL_BY_AREA = new Map(CARE_AREA_LABELS.map((a) => [a.id, a.label]));
