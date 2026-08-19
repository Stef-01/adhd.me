// W221: how a cue is actually matched against a sentence.
//
// THE PROBLEM THIS SOLVES, DIAGNOSED RATHER THAN GUESSED AT. W221 matched cues as contiguous
// substrings, and a probe over realistic first-person queries put every remaining failure in one
// of two mechanical classes — neither of them semantic, both of them fixable without a model:
//
//   INSERTION.   "my brain has never let me finish anything" misses the cue "never finish
//                anything" because two words sit in the middle of it.
//   INFLECTION.  "she rushes me every time" misses "rushed". "someone who explains things"
//                misses "explain" — the cue is a prefix of the word in the sentence and a
//                space-delimited substring search cannot see it.
//
// Both are morphology and word order, not meaning. A sentence-embedding model would fix them, and
// it would be the wrong tool: it costs a 20MB+ ONNX download, it puts a similarity threshold
// between a patient and a GP, and its output cannot be rendered as W213's one sentence. The
// hybrid-retrieval literature is clear that a well-built sparse matcher is the first stage anyway;
// what W221 shipped was not a well-built sparse matcher, it was `String.includes`.
//
// SO: STEM THE TOKENS, AND MATCH A CUE AS AN ORDERED SUBSEQUENCE WITHIN A WINDOW.
//
// "never finish anything" → [never, finish, anyth] must appear in the sentence in that ORDER, each
// within a few tokens of the last. That accepts "never LET ME finish anything" and rejects a
// sentence that merely contains all three words scattered across two unrelated clauses.
//
// WHY ORDERED-SUBSEQUENCE AND NOT BM25. BM25 scores a bag of words and returns a number, and the
// number would then need a threshold nobody can defend and could not be explained to a patient.
// Ordered subsequence is a PREDICATE: the cue is present or it is not, the answer is the same
// every time, and the reason a facet fired is still "you said this". Precision stays where
// `String.includes` had it — every content word of the cue must be there, in order — while recall
// goes up by the whole insertion-and-inflection class.

/**
 * Words dropped before matching.
 *
 * NEGATIONS ARE DELIBERATELY NOT IN THIS LIST. "not", "no", "never" and "without" are the
 * difference between "not just medication" and "medication" — the cue that means somebody wants
 * alternatives and the cue that means the opposite. A stopword list that swallowed them would
 * make the matcher confidently wrong on the one distinction it most needs to keep.
 */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "for", "with", "that", "this",
  "it", "its", "is", "are", "was", "were", "be", "been", "am", "i", "me", "my", "we", "our",
  "you", "your", "he", "she", "they", "them", "his", "her", "their", "as", "so", "but", "if",
  "then", "than", "there", "here", "have", "has", "had", "do", "does", "did", "get", "got",
  "would", "could", "should", "will", "can", "just", "really", "very", "some", "any", "one",
  "about", "from", "by", "up", "out", "over", "into", "who", "what", "when", "where", "how",
]);

/**
 * A deliberately small suffix stripper.
 *
 * NOT A PORTER STEMMER, and that is a choice rather than a shortcut. Porter conflates aggressively
 * — "university" and "universe" collide — and every collision here is a facet firing on a sentence
 * that did not ask for it, beside a named clinician. This handles the four inflections that
 * actually appeared in the probe (plural, past, progressive, third-person) and stops. A cue and a
 * word must still share a real root; they no longer have to share spelling.
 *
 * The length guards exist so short words are left alone: stripping "es" from "does" or "ing" from
 * "thing" produces a stem that matches nothing anybody meant.
 */
export function stem(word: string): string {
  return canonical(suffixStem(word));
}

function suffixStem(word: string): string {
  if (word.length <= 4) return word;
  if (word.endsWith("ies") && word.length > 5) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ing") && word.length > 6) return trimDouble(word.slice(0, -3));
  if (word.endsWith("ed") && word.length > 5) return trimDouble(word.slice(0, -2));
  if (word.endsWith("es") && word.length > 5) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/**
 * The inflection table (O50, year plan Q1 item 3): explicit canonical forms for the wart
 * families the four suffix rules cannot bridge, found by the corpus rather than imagined.
 *
 * THREE FAMILIES, EACH WITH A NAMED SENTENCE BEHIND IT:
 *
 *   IRREGULARS.     "taken"/"took" share no strippable suffix with "take"; "seen" none with
 *                   "see". The O13 workaround was duplicate cues ("take seriously" AND "takes
 *                   me seriously" AND "taken seriously"); the table makes the family one stem.
 *   LENGTH GUARDS.  "sees" (4 letters) is under the ≤4 floor and "seeing" (6) under the >6
 *                   ing-guard, so neither reduces to "see" — the guards are right in general
 *                   (stripping "does" or "thing" would be worse) and wrong for this one verb.
 *   E-DROPPERS.     Stripping "ed"/"es" from a verb whose base ENDS IN E strands a stem the
 *                   base word itself never reduces to: believed→believ but believe→believe,
 *                   judged→judg but judge→judge, minutes→minut but minute→minute. So
 *                   "nobody ever believes me" could not satisfy the authored pair of
 *                   "believe me", and the unhurried list carries "ten minutes" AND
 *                   "ten minute" as two cues for one phrase.
 *
 * KEYED BY SUFFIX-STEMMED FORM and applied as stem()'s last step, so every caller — cues,
 * sentences, raw skeletons — unifies identically and the O45 pair rule keeps working across
 * inflection. THE TABLE MUST STAY SMALL AND EARNED: this is deliberately not a Porter stemmer
 * (Porter conflates, and every conflation is a facet firing on a sentence that did not ask
 * for it, beside a named clinician). A new entry needs a real sentence somewhere in this
 * tree's tests that the suffix rules demonstrably cannot bridge — the `natural` library's
 * trade-offs were studied for test cases, per the plan, not imported as a dependency.
 */
const INFLECTIONS: Readonly<Record<string, string>> = {
  // take: takes→take already; the rest are irregular.
  taken: "take",
  took: "take",
  // see: every form fails a different way — sees under the length floor, seeing under the
  // ing-guard, seen irregular.
  sees: "see",
  seeing: "see",
  seen: "see",
  // e-dropping verbs and nouns the corpus asks actually use.
  believ: "believe",
  judg: "judge",
  minut: "minute",
};

function canonical(stemmed: string): string {
  return INFLECTIONS[stemmed] ?? stemmed;
}

/** "rushhed" → "rushed" → "rush". Doubling appears when a suffix was added to a short stem. */
function trimDouble(stemmed: string): string {
  const last = stemmed.at(-1);
  return last && last === stemmed.at(-2) && !"aeiou".includes(last) ? stemmed.slice(0, -1) : stemmed;
}

/**
 * Sentence or cue → the tokens matching actually compares. Deterministic and total.
 *
 * APOSTROPHES ARE DELETED, NOT TURNED INTO SPACES, and the difference is not cosmetic. Splitting
 * on the apostrophe turns "don't" into ["don", "t"] and "that's" into ["s"] once "that" is dropped
 * as a stopword. That silently destroyed the single commonest negator in English: the transcript
 * reader's "do not propose from a denial" check could never fire on "I don't do that", because the
 * token `dont` did not exist for it to find. The patient matcher had it too — the cue "won't rush"
 * was being compared as ["won", "t", "rush"].
 *
 * Found by an edge case written for the transcript reader, and it was wrong here, one layer down,
 * for both callers.
 */
export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    // Sentence enders become a boundary marker instead of vanishing (O7/F10). Deleting them
    // meant a two-content-token bridge across a full stop stayed representable: "…heart. Safe…"
    // could satisfy [heart, safe] even after MAX_GAP was tightened for exactly that shape.
    // The marker is a token no word can ever be, and `findCue` refuses to match across it.
    // Commas deliberately do NOT mark a boundary: "alternatives, not just medication" is one
    // clause, and the clarifier appends its answers after a comma.
    .replace(/[.?!;]/g, ` ${CLAUSE_BOUNDARY} `)
    .replace(/[^a-z0-9|\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOPWORDS.has(word))
    .map((word) => (word === CLAUSE_BOUNDARY ? word : stem(word)));
}

/** A token no English word tokenises to, so no cue can contain it and none can cross it. */
export const CLAUSE_BOUNDARY = "|";

/**
 * The same pipeline as `tokenise`, with the stopwords KEPT (O45).
 *
 * Exists for exactly one consumer: the collapsed-cue skeleton check below, which needs to see
 * the function words `tokenise` deletes. Everything else about the two must stay identical —
 * same casing, same apostrophe deletion, same boundary markers, same stemming — because a
 * skeleton compared against a differently-normalised stream would match nothing and the rule
 * would silently turn every collapsed cue off.
 */
export function tokeniseKeepingStopwords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[.?!;]/g, ` ${CLAUSE_BOUNDARY} `)
    .replace(/[^a-z0-9|\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => (word === CLAUSE_BOUNDARY ? word : stem(word)));
}

export function isStopword(word: string): boolean {
  return STOPWORDS.has(word);
}

/**
 * The collapse-aware rule (O45, year plan Q1 item 1).
 *
 * THE DEFECT CLASS. Stopword stripping collapses 33 authored multi-word cues to a single
 * content token, so the shipped matcher is looser than the phrase its author reviewed: "out
 * the door" ships as [door] and fires on "next door to the chemist"; "on edge" ships as
 * [edge] and fires on "school on the edge of town". The cues cannot be re-authored one by one
 * because the INTENDED sentences strip to the same token — precision and recall are coupled
 * at the stopword layer (year plan Q1 item 1's analysis).
 *
 * THE RULE — the plan's "kept function-word skeleton" option: a collapsed cue must also find,
 * somewhere in the same clause-bounded raw stream (stopwords kept, stemming identical), one
 * ADJACENT, IN-ORDER, CONSECUTIVE pair of its authored tokens that includes at least one
 * content word. "out the door" is satisfied by "…rushed me out the door" (the [the, door]
 * pair) and not by "next door to the chemist" (no authored pair survives). Any single pair
 * suffices — not the whole phrase — because contractions and elisions routinely drop the
 * middle of an authored phrase: "what's going on" keeps the [going, on] pair of
 * "what is going on", and demanding the full skeleton would lose it.
 *
 * Requiring the pair to CONTAIN A CONTENT WORD stops a cue's function words alone
 * re-introducing the looseness ("get a" appearing near an unrelated "word" must not fire
 * "get a word in"); adjacency across a clause boundary is impossible by construction, since
 * the boundary is itself a token.
 */
export function collapsedCueSatisfied(
  rawSentence: readonly string[],
  rawCue: readonly string[],
): boolean {
  for (let i = 0; i < rawCue.length - 1; i++) {
    const a = rawCue[i]!;
    const b = rawCue[i + 1]!;
    if (isStopword(a) && isStopword(b)) continue;
    for (let k = 0; k < rawSentence.length - 1; k++) {
      if (rawSentence[k] === a && rawSentence[k + 1] === b) return true;
    }
  }
  return false;
}

/**
 * How many tokens may sit between two consecutive cue tokens.
 *
 * TWO, AND THE FIGURE WAS SET BY A TEST RATHER THAN BY TASTE. It was three, and an edge case
 * written to prove the matcher was strict enough proved the opposite: "my heart is fine and
 * honestly the parking there is safe" matched the cue [heart, safe], because the gap is counted in
 * CONTENT tokens — stopwords are already gone, so three of them is most of a clause, not an
 * insertion. Two accepts "never LET ME finish anything" (one content token inserted) and the
 * possessive and adjective insertions English actually puts inside a phrase, and rejects a cue
 * whose halves are in different clauses.
 */
const MAX_GAP = 2;

/**
 * Where a cue occurs in a sentence, or null.
 *
 * Returns the token span so the caller can stop a second cue re-reading the same words — the same
 * guarantee the substring matcher got from claiming character ranges, kept for the same reason:
 * one clause should produce one facet, not three overlapping ones.
 */
/**
 * Desire-negation triggers (O40, year plan Q1 item 4).
 *
 * NEGEX'S CONVENTION, NOT ITS MODEL: explicit trigger PHRASES with a bounded scope, kept as a
 * rule list a reviewer can read. Bare negators are DELIBERATELY not triggers, because in
 * first-person patient language they usually sit inside the want rather than around it: "my GP
 * won't do titration" is a complaint that wants titration, "I've never had an assessment, and I
 * want one" is history, and "no one listens to me" is the manner ask itself. What reliably
 * marks a refusal is a negated DESIRE VERB — don't want, not looking for, don't need, no
 * interest — and that is the whole list. Phrases are written as tokenise() leaves them
 * ("do not want" arrives as [not, want] once "do" is stopword-stripped).
 */
const DESIRE_NEGATIONS: ReadonlyArray<readonly string[]> = [
  ["dont", "want"],
  ["not", "want"],
  ["dont", "need"],
  ["not", "need"],
  ["dont", "look"],
  ["not", "look"],
  ["no", "interest"],
  ["not", "interest"],
  ["not", "after"],
  ["rather", "not"],
];

/** Content tokens allowed between a trigger's last word and the cue it negates. */
const MAX_NEGATION_LEAD = 3;

/**
 * Whether the cue starting at `cueFrom` sits in the scope of a desire negation.
 *
 * Scope is NegEx's: forward from the trigger, ending at the clause boundary — "they don't want
 * to help. My dose keeps wearing off" negates nothing in the second sentence. The trigger must
 * complete shortly before the cue (MAX_NEGATION_LEAD content tokens), so a negation at the far
 * end of a long clause does not swallow an unrelated ask. Only tokens BEFORE the cue span are
 * read: a negator inside the cue's own words ("not working", "no medication") is part of what
 * the cue means, never a negation of it.
 */
export function negatedWant(sentence: readonly string[], cueFrom: number): boolean {
  let clauseFrom = cueFrom;
  while (clauseFrom > 0 && sentence[clauseFrom - 1] !== CLAUSE_BOUNDARY) clauseFrom--;

  for (const phrase of DESIRE_NEGATIONS) {
    for (let start = clauseFrom; start < cueFrom; start++) {
      if (sentence[start] !== phrase[0]) continue;
      let at = start;
      let matched = 1;
      while (matched < phrase.length) {
        const want = phrase[matched]!;
        let next = -1;
        // Within the phrase itself one inserted content token is allowed ("don't actually want").
        for (let k = at + 1; k <= Math.min(at + 2, cueFrom - 1); k++) {
          if (sentence[k] === CLAUSE_BOUNDARY) break;
          if (sentence[k] === want) {
            next = k;
            break;
          }
        }
        if (next === -1) break;
        at = next;
        matched++;
      }
      if (matched === phrase.length && cueFrom - at - 1 <= MAX_NEGATION_LEAD) return true;
    }
  }
  return false;
}

export function findCue(
  sentence: readonly string[],
  cue: readonly string[],
): { from: number; to: number } | null {
  if (cue.length === 0) return null;

  for (let start = 0; start <= sentence.length - 1; start++) {
    if (sentence[start] !== cue[0]) continue;

    let at = start;
    let matched = 1;
    while (matched < cue.length) {
      const want = cue[matched]!;
      let next = -1;
      for (let k = at + 1; k <= Math.min(at + 1 + MAX_GAP, sentence.length - 1); k++) {
        // A clause boundary ends the window outright: however small the gap, "heart. Safe"
        // is two statements, not a phrase (O7/F10).
        if (sentence[k] === CLAUSE_BOUNDARY) break;
        if (sentence[k] === want) {
          next = k;
          break;
        }
      }
      if (next === -1) break;
      at = next;
      matched++;
    }

    if (matched === cue.length) return { from: start, to: at };
  }
  return null;
}
