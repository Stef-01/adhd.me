// W225: the one question worth asking when the words did not separate anybody.
//
// THE GAP THIS FILLS. `matchQuality` made the finder honest — it now says "this is not a ranking"
// when the roster ties and "we could not tell" when nothing was read. Honest, and a dead end. The
// commonest sentence anybody types is "I think I might have ADHD", which reaches only the generic
// assessment facet that every GP declares, so the reader is told the order means nothing and left
// exactly where they started.
//
// Telling somebody you did not understand them is better than pretending you did. Asking them one
// useful question is better than both.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT MAKES A QUESTION WORTH ASKING, and it is not "what do we not know yet".
//
// A question earns its place only if the answer CHANGES THE ORDER. So the candidates are exactly
// the facets on which the current roster DISAGREES: some clinicians declare them, some do not.
// A facet everybody holds cannot separate anybody however interesting it sounds, and a facet
// nobody holds cannot either — asking about it would be collecting data for its own sake, from
// somebody who came here to find a GP.
//
// That has a consequence worth stating plainly: the questions get better as the roster grows and
// there are more real disagreements to find, and with a roster of one there are no questions at
// all. The function returns null in that case rather than inventing something to ask.
//
// IT ASKS, IT DOES NOT INFER. The answer is appended to what the reader said, in their own words,
// and the whole thing is re-read by the same `readNeeds`. Nothing here writes a facet directly.
// That keeps one route into the vocabulary — the sentence the reader owns — so the finder can
// still say "you said this" about every signal it acted on, including the ones it prompted.

import type { Clinician } from "@/demo/clinicians";
import { EI_QUALITIES } from "@/demo/emotional-fit";
import { CARE_AREA_LABELS } from "@/onboarding/types";
import { facetKey, readNeeds, type Facet } from "./needs";

/**
 * A question, and the words that answering it adds to the request.
 *
 * `answer` is phrased as the READER would say it, not as a facet name, because it is appended to
 * their sentence and then re-read. "I want a longer first appointment" is a thing somebody says;
 * "manner:unhurried" is not, and would reach nothing when read back.
 */
export type Clarifier = {
  facetKey: string;
  /** Asked in the second person, because the reader is the one answering. */
  prompt: string;
  /** Appended verbatim to the request when the reader says yes. */
  answer: string;
  /** How many of the roster declare it. Shown in the console, never to a patient. */
  heldBy: number;
};

/**
 * Care facets asked as a question a patient can answer without knowing the vocabulary.
 *
 * Written from the reader's side of the room. "Do you want the physical checks done before
 * anything starts?" is answerable by somebody who has never heard the phrase "baseline screening";
 * "Do you need cardiac screening?" is a question for a clinician.
 */
export const CARE_PROMPTS: Record<string, { prompt: string; answer: string }> = {
  "care:titration": {
    prompt: "Is your dose already something you are working on?",
    answer: "my dose needs titration and follow-up",
  },
  "care:cardiac-screening": {
    prompt: "Do you want the physical checks done before anything starts?",
    answer: "I want the heart and blood pressure baseline checked first",
  },
  "care:substance-history": {
    prompt: "Do you want somewhere you can be honest about drinking or other substances?",
    answer: "I want to be honest about drinking without being judged",
  },
  "care:comorbid-mood": {
    prompt: "Have you been treated for anxiety or low mood before?",
    answer: "I have been on antidepressants and I am not sure it was the right answer",
  },
  "care:sleep": { prompt: "Is your sleep part of this?", answer: "my sleep has never been right" },
  "care:adult-adhd": { prompt: "Is this for you as an adult?", answer: "I am an adult asking for myself" },
  "care:child-adolescent-adhd": { prompt: "Is this for a child or teenager?", answer: "this is for my child" },
  "care:shared-care": {
    prompt: "Are you already seeing a psychiatrist or paediatrician for this?",
    answer: "I need shared care with the psychiatrist I already see",
  },
};

/**
 * Manner facets, asked the same way. The label is the clinician's claim; this is the reader's ask.
 *
 * EXPORTED SO THE COPY LINTER CAN REACH IT. Every string in both tables is patient-facing: the
 * prompt is read by somebody choosing a GP and the answer is written into their own request. Held
 * as module-private consts they would have been the only patient copy in the tree outside the
 * linter's reach, which the W200 census caught on the first run.
 */
export const MANNER_PROMPTS: Record<string, { prompt: string; answer: string }> = {
  "manner:unhurried": {
    prompt: "Do you need a longer first appointment?",
    answer: "I want a longer first appointment and not to be rushed",
  },
  "manner:non_judgmental": {
    prompt: "Is being able to say things without being judged the main thing?",
    answer: "I need to say things without being judged",
  },
  "manner:culturally_attuned": {
    prompt: "Do family or language need to be part of the appointment?",
    answer: "my family and my language need to be part of this",
  },
  "manner:structured": {
    prompt: "Would you rather it was done to a plan, with follow-up booked?",
    answer: "I want it done to a documented plan with follow-up booked",
  },
  "manner:attuned": {
    prompt: "Have you been brushed off about this before?",
    answer: "I have been brushed off before and want to be taken seriously",
  },
  "manner:sense_making": {
    prompt: "Do you want help understanding what is going on, as well as what to do?",
    answer: "I want to understand what is happening to me",
  },
  "manner:collaborative": {
    prompt: "Do you want to decide the options together rather than be told?",
    answer: "I want to talk it through and decide together",
  },
};

function promptFor(key: string): { prompt: string; answer: string } | null {
  return CARE_PROMPTS[key] ?? MANNER_PROMPTS[key] ?? null;
}

/** Every facet a clinician declares, as keys. */
function declaredKeys(clinician: Clinician): Set<string> {
  return new Set<string>([
    ...clinician.careAreas.map((area) => facetKey({ kind: "care", area } as Facet)),
    ...clinician.manner.map((trait) => facetKey({ kind: "manner", trait } as Facet)),
  ]);
}

/**
 * Up to `limit` questions whose answers would actually reorder this roster.
 *
 * Ordered by how evenly the roster splits on them: a facet one of two clinicians holds separates
 * them completely, and that is worth more than one that seven of eight hold. With two clinicians
 * every disagreement is an even split, so the order barely matters today and will matter a lot at
 * twenty.
 */
export function clarifiers(query: string, roster: readonly Clinician[], limit = 3): Clarifier[] {
  if (roster.length < 2) return [];

  const alreadyAsked = new Set(readNeeds(query).map((need) => facetKey(need.facet)));
  const declared = roster.map(declaredKeys);
  const keys = new Set(declared.flatMap((set) => [...set]));

  return [...keys]
    .filter((key) => !alreadyAsked.has(key))
    .map((key) => ({ key, heldBy: declared.filter((set) => set.has(key)).length }))
    // Splits the roster: somebody has it, somebody does not. Anything else cannot reorder.
    .filter((entry) => entry.heldBy > 0 && entry.heldBy < roster.length)
    .map((entry) => {
      const copy = promptFor(entry.key);
      return copy ? { facetKey: entry.key, heldBy: entry.heldBy, ...copy } : null;
    })
    .filter((entry): entry is Clarifier => entry !== null)
    .sort((a, b) => {
      // Closest to an even split first.
      const evenness = (n: number) => Math.abs(n / roster.length - 0.5);
      return evenness(a.heldBy) - evenness(b.heldBy) || a.facetKey.localeCompare(b.facetKey);
    })
    .slice(0, limit);
}

/** Human-readable labels, so the console can show which facet a question is about. */
export function facetLabel(key: string): string {
  const care = CARE_AREA_LABELS.find((area) => `care:${area.id}` === key);
  if (care) return care.label;
  const trait = key.startsWith("manner:") ? key.slice("manner:".length) : null;
  return trait && trait in EI_QUALITIES ? EI_QUALITIES[trait as keyof typeof EI_QUALITIES].label : key;
}
