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
import { requestSuggests } from "./clarifier-relevance";
import { facetKey, holdsPreference, readNeeds, type Facet, type Preference } from "./needs";

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
  "care:substance-history": {
    prompt: "Do you want somewhere you can be honest about drinking or other substances?",
    answer: "I want to be honest about drinking without being judged",
  },
  "care:depression": {
    prompt: "Is low mood part of this?",
    answer: "I have been on antidepressants and my mood is still low",
  },
  "care:anxiety": {
    prompt: "Have you been treated for anxiety before?",
    answer: "I was treated for anxiety and I am not sure it was the right answer",
  },
  "care:child-adolescent-adhd": { prompt: "Is this for a child or teenager?", answer: "this is for my child" },
  "care:shared-care": {
    prompt: "Are you already seeing a psychiatrist or paediatrician for this?",
    answer: "I need shared care with the psychiatrist I already see",
  },
  // O33: the five declared care areas that had no question. A facet a clinician can declare
  // but a reader cannot be asked about is separation the roster holds and the product wastes.
  // Same register as the rest of the table: what care somebody WANTS, never a symptom the
  // finder infers — the Q17 boundary the file header already states.
  "care:trauma-informed": {
    prompt: "Is there past trauma this needs to be careful around?",
    answer: "there is past trauma and I want that handled carefully",
  },
  "care:complex-mental-health": {
    prompt: "Is there other mental health history, like bipolar, in the picture?",
    answer: "I also live with bipolar and it is part of the picture",
  },
  "care:autism-adhd": {
    prompt: "Is autism part of this, or something you are exploring alongside ADHD?",
    answer: "I am autistic and want that understood alongside the ADHD",
  },
  "care:emotional-regulation": {
    prompt: "Do you want help with moods and emotions that take over?",
    answer: "my emotions take over and I want help with that",
  },
  "care:non-medication": {
    prompt: "Do you want options beyond medication?",
    answer: "I want alternatives, not just medication",
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
    /* Reworded by O7: "a documented plan with follow-up booked" was being claimed by a
       degenerate strengths cue and never reached manner:structured — the reach pin that now
       re-reads every answer is what caught it. */
    answer: "I want it done properly, with a follow-up plan booked",
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
  // O33: the two manner qualities that had no question. Dormant until a clinician declares
  // them (`clarifiers` only offers facets the roster splits on), but the day one does —
  // Strengths-focused is exactly where the neurodiversity-affirming cohort lands (O30) —
  // the question exists instead of being discovered missing in production.
  "manner:steadying": {
    prompt: "Would a calm, reassuring manner help most?",
    answer: "I need someone calm and reassuring",
  },
  "manner:motivating": {
    prompt: "Do you want it built on your strengths, not only the problems?",
    answer: "build it on my strengths, not just problems",
  },
};

/**
 * Access preferences, asked the same way (O5/F7). These were absent by construction —
 * `declaredKeys` was care ∪ manner — yet they are hard filters or strong lifts with the
 * highest roster variance there is: "do you want a woman GP" splits any mixed roster and is
 * the most-stated preference in real directory search. The module's own principle ("a question
 * earns its place only if the answer changes the order") selects FOR them.
 *
 * `pref:longer-appointment` is deliberately not here: `manner:unhurried` already asks that
 * question in its own words, and two prompts for one answer is the drift this file exists to
 * prevent.
 */
export const PREF_PROMPTS: Record<string, { prompt: string; answer: string }> = {
  "pref:woman-gp": {
    prompt: "Would you rather see a woman GP?",
    answer: "I would prefer a woman doctor",
  },
  "pref:telehealth-first": {
    prompt: "Would you rather the first appointment was by phone or video?",
    answer: "I want the first appointment by phone",
  },
  "pref:bulk-billing": {
    prompt: "Does the appointment need to be bulk billed?",
    answer: "it needs to be bulk billed",
  },
};

/** The preferences a clarifier may ask about. Derived from the prompt table, never wider. */
const ASKABLE_PREFERENCES: readonly Preference[] = ["woman-gp", "telehealth-first", "bulk-billing"];

function promptFor(key: string): { prompt: string; answer: string } | null {
  return CARE_PROMPTS[key] ?? MANNER_PROMPTS[key] ?? PREF_PROMPTS[key] ?? null;
}

/**
 * Every facet a clinician declares or verifiably holds, as keys.
 *
 * Exported for W234's scale report (O142), which needs each clinician's holder signature to count
 * how many genuinely different reorderings the selector has available. It reads this rather than
 * re-deriving it, so the report cannot describe a selector different from the one that runs.
 */
export function declaredKeys(clinician: Clinician): Set<string> {
  return new Set<string>([
    ...clinician.careAreas.map((area) => facetKey({ kind: "care", area } as Facet)),
    // A "sometimes" declaration answers an ask at half weight (O2), so a question about it can
    // still reorder the roster — leaving these out made heldBy disagree with the ranker (O8 review).
    ...(clinician.careAreasSometimes ?? []).map((area) => facetKey({ kind: "care", area } as Facet)),
    ...clinician.manner.map((trait) => facetKey({ kind: "manner", trait } as Facet)),
    // Held preferences count as declarations: gender, telehealth and billing are facts on the
    // record, and a preference nobody holds is correctly never asked about — putting "do you
    // want a woman GP" in front of a reader when no woman is listed sets up a disappointment
    // the roster cannot answer.
    ...ASKABLE_PREFERENCES.filter((preference) => holdsPreference(clinician, preference)).map(
      (preference) => `pref:${preference}`,
    ),
  ]);
}

/**
 * Up to `limit` questions whose answers would actually reorder this roster.
 *
 * Ordered by how evenly the roster splits on them: a facet one of two clinicians holds separates
 * them completely, and that is worth more than one that seven of eight hold.
 *
 * THE EVENNESS SORT IS INERT AT TODAY'S ROSTER SIZE, and this comment used to guess at that
 * ("barely matters today") rather than know it. O142 measured it: on three clinicians every
 * splitting facet is held by one or by two, and |1/3 - 0.5| === |2/3 - 0.5|, so every askable
 * question carries the same evenness and this sort decides nothing whatever. Every bit of
 * real ordering today is done by the greedy holder-signature dedup below (O33).
 *
 * The other half of the old guess — "will matter a lot at twenty" — is earned, and M10 redrew
 * the curve: over a synthetic roster with the real one's marginal rates, distinct evenness goes
 * 1 at three, 4 at eight, then saturates at 5 from twenty on, because the relevance gate bounds
 * the candidates to what the request suggests — roster growth stops manufacturing questions the
 * reader never hinted at. The figures are pinned in scale-fixture.test.ts, so the day the roster
 * or the corpus grows, the pin fails and says so.
 */
export function clarifiers(query: string, roster: readonly Clinician[], limit = 3): Clarifier[] {
  // THE ROSTER ARGUMENT MUST BE THE LIST THE READER IS LOOKING AT (O7/F10). `heldBy` and the
  // evenness ordering are computed over exactly what is passed: hand this the full roster while
  // the screen shows a filtered one and the questions stop being about the list they reorder.
  if (roster.length < 2) return [];

  const alreadyAsked = new Set(readNeeds(query).map((need) => facetKey(need.facet)));
  const declared = roster.map(declaredKeys);
  const keys = new Set(declared.flatMap((set) => [...set]));

  /* M10: THE RELEVANCE GATE, AND IT IS NOT OPTIONAL. Splitting the roster earns a facet its
     CANDIDACY; only the request can earn it the QUESTION. A candidate must co-occur with
     something the reader actually said (clarifier-relevance.ts, corpus-derived) — otherwise
     this function is choosing the axis two doctors happen to differ on and asking the reader
     to care about it, which the year plan names as manipulation, and the 1.5× lift then
     rewards the answer as if the reader had raised it themselves.

     THE ONE CARVE-OUT, STATED WITH ITS REASON: a request that reached NOTHING is ungated.
     There is no stated interest to divert from, W225 exists precisely for the reader whose
     words reached nothing, and gating on an empty set would return zero questions for the
     product's commonest dead end. The moment one facet is heard, the gate is live.

     ZERO QUESTIONS IS A DESIGNED OUTCOME, not a failure state. Measured on the real roster:
     "English is my second language and appointments move too fast" reaches unhurried and
     culturally-attuned — everything it suggests is already heard — and the only splitting
     facets left are anxiety, shared care and child assessment. Before this gate the reader
     got those three; now they get none, and none is correct. */
  const reachedKeys = [...alreadyAsked];

  const ranked = [...keys]
    .filter((key) => !alreadyAsked.has(key))
    .filter((key) => reachedKeys.length === 0 || requestSuggests(reachedKeys, key))
    .map((key) => ({ key, heldBy: declared.filter((set) => set.has(key)).length }))
    // Splits the roster: somebody has it, somebody does not. Anything else cannot reorder.
    .filter((entry) => entry.heldBy > 0 && entry.heldBy < roster.length)
    .map((entry) => {
      const copy = promptFor(entry.key);
      return copy ? { facetKey: entry.key, heldBy: entry.heldBy, ...copy } : null;
    })
    .filter((entry): entry is Clarifier => entry !== null)
    /* M10 FOUND THIS LATENT, THE GATE DID NOT CAUSE IT. An answer is re-read by readNeeds, and
       some answers reach more than their own facet: manner:unhurried's answer contains "a longer
       first appointment", which is pref:longer-appointment's own phrase — the file already calls
       those two questions twins where PREF_PROMPTS declines to duplicate the prompt. The key-level
       alreadyAsked check above cannot see that, so "never asks about something the reader already
       said" (the W225 pin) held only because three roster-split questions happened to outrank the
       twin. The relevance gate removed them and the twin rose into the offer. The rule the pin
       always meant is enforced here at the level the pin checks: a candidate whose ANSWER re-reads
       to any facet the reader already stated is a repeat wearing different words. */
    .filter((entry) => readNeeds(entry.answer).every((need) => !alreadyAsked.has(facetKey(need.facet))))
    .sort((a, b) => {
      // Closest to an even split first.
      const evenness = (n: number) => Math.abs(n / roster.length - 0.5);
      return evenness(a.heldBy) - evenness(b.heldBy) || a.facetKey.localeCompare(b.facetKey);
    });

  /**
   * THE OFFERED SET SPANS THE ROSTER, NOT JUST THE ALPHABET (O33). Evenness ties are common —
   * with two clinicians every split is perfectly even — and the old alphabetical tie-break
   * could hand a reader three questions that all separate toward the SAME clinician: three
   * different words for one reordering, and no path to the other GP. Selection is now greedy
   * on the holder signature (WHICH clinicians hold the facet): a question whose answer lifts
   * a different subset of the roster beats a better-alphabetised duplicate. Deterministic,
   * and the W225 pin ("changes who is first, not merely the scores") is the test that forced
   * it — the O33 prompt additions made the degenerate all-one-direction top-3 real.
   */
  const signatureOf = (entry: Clarifier) =>
    declared.map((set) => (set.has(entry.facetKey) ? "1" : "0")).join("");
  const picked: Clarifier[] = [];
  const usedSignatures = new Set<string>();
  for (const entry of ranked) {
    if (picked.length >= limit) break;
    if (!usedSignatures.has(signatureOf(entry))) {
      picked.push(entry);
      usedSignatures.add(signatureOf(entry));
    }
  }
  for (const entry of ranked) {
    if (picked.length >= limit) break;
    if (!picked.includes(entry)) picked.push(entry);
  }
  return picked;
}

/** Human-readable labels, so the console can show which facet a question is about. */
export function facetLabel(key: string): string {
  const care = CARE_AREA_LABELS.find((area) => `care:${area.id}` === key);
  if (care) return care.label;
  const preference = PREF_LABELS[key];
  if (preference) return preference;
  const trait = key.startsWith("manner:") ? key.slice("manner:".length) : null;
  return trait && trait in EI_QUALITIES ? EI_QUALITIES[trait as keyof typeof EI_QUALITIES].label : key;
}

/** Console-facing names for the preference facets, matching the lexicon's own labels. */
const PREF_LABELS: Record<string, string> = {
  "pref:woman-gp": "A woman GP",
  "pref:telehealth-first": "By phone or telehealth",
  "pref:bulk-billing": "Bulk billing",
};
