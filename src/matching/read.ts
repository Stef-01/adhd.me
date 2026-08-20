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
  // O53, corpus tranche two's finds. "kids" sits at four letters, under the stem floor, so
  // "my kid's teacher" never met the cue "my kid" (the sees-family failure again). And
  // trimDouble strips past-tense double consonants that the present tense KEEPS — "dismissed"
  // → dismis while "dismiss" stays dismiss (the ss-guard protects it from s-stripping), so
  // the cue and the present-tense ask could never meet; "embarrassed" is the same family.
  kids: "kid",
  dismis: "dismiss",
  embarras: "embarrass",
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
  // Stopwords are dropped BEFORE stemming, as they always were: a word that merely STEMS into
  // a stopword ("gets" → "get") is content and must survive. The O55 budget caps what remains.
  return splitWords(text)
    .filter((word) => word === CLAUSE_BOUNDARY || !STOPWORDS.has(word))
    .map((word) => (word === CLAUSE_BOUNDARY ? word : stem(word)))
    .slice(0, MAX_READ_TOKENS);
}

/** The shared split: lowercased, boundary-marked words, not yet stemmed or filtered. */
function splitWords(text: string): string[] {
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
    .filter((word) => word.length > 0);
}

/** A token no English word tokenises to, so no cue can contain it and none can cross it. */
export const CLAUSE_BOUNDARY = "|";

/**
 * The reader's budget (O55, year plan Q2 item 6): how much of a request is read.
 *
 * A real request is a sentence or three; the corpus's longest entries tokenise to under
 * thirty content tokens. Four hundred is more than ten times that — nothing anybody types in
 * good faith gets truncated — and it turns the reader's worst case from "proportional to
 * whatever arrived" into a constant, so a 10k-word paste cannot stall the finder. A request
 * longer than the cap is read as its opening; that partial read is the DOCUMENTED behaviour,
 * pinned in both directions by the fuzz suite, never a silent one.
 *
 * The raw cap is deliberately larger: stopwords survive in the raw stream, so the same text
 * yields more raw tokens than content tokens. Keeping the raw window at least as long as the
 * content window (in the same text) means the O45 skeleton check can only ever look WITHIN
 * what the capped content read saw — it confirms cues findCue matched, and findCue matched
 * inside the content cap.
 */
export const MAX_READ_TOKENS = 400;
export const MAX_RAW_TOKENS = 1200;

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
  // Same split as `tokenise`, stopwords kept, with the raw half of the O55 budget.
  return splitWords(text)
    .map((word) => (word === CLAUSE_BOUNDARY ? word : stem(word)))
    .slice(0, MAX_RAW_TOKENS);
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
 * The raw-RUN demand (O94) — the mechanism O84 refused until it earned a second case.
 *
 * THE CLASS. A collapsed cue's any-pair rule (O45) is satisfiable by a [the, noun] pair,
 * and "the noun" appears everywhere: O84 measured "room with me" hearing "in the room
 * with someone", and O87 found the same weakness already LIVING in "over the phone" —
 * "the phone menu hung up on me twice" satisfied [the, phone] and a logistics complaint
 * reached telehealth. One case was over-engineering; two is a class.
 *
 * THE RULE, opt-in per cue (never blanket): the cue's FULL authored token run must appear
 * contiguously in the raw stream. Blanket strengthening stays refused for O45's original
 * reason — "what's going on" relies on any-pair because contractions elide the middle —
 * so a cue joins the demanding set only when its phrasing has no contraction form and its
 * pairs have measured leaks. Membership lives beside the cue wiring in needs.ts.
 */
export function collapsedCueRunPresent(
  rawSentence: readonly string[],
  rawCue: readonly string[],
): boolean {
  outer: for (let k = 0; k + rawCue.length <= rawSentence.length; k++) {
    for (let i = 0; i < rawCue.length; i++) {
      if (rawSentence[k + i] !== rawCue[i]) continue outer;
    }
    return true;
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
 * Where every desire-negation trigger COMPLETES in this sentence (O81).
 *
 * The scanner half of what was `negatedWant`: same phrases, same one-inserted-content-token
 * allowance ("don't actually want"), same refusal to cross a clause boundary mid-phrase.
 * Split out because O81 changed WHO decides scope: the old per-cue check asked "is any
 * trigger shortly before me?", which made one trigger suppress EVERY cue within its lead —
 * the O78 audit's headline defect ("I don't want a woman GP, bulk billing matters more"
 * lost bulk-billing). Binding is now done once per trigger, over all candidate spans, in
 * `suppressedByDesireNegation` below.
 */
export function desireNegationEnds(sentence: readonly string[]): number[] {
  const ends = new Set<number>();
  for (const phrase of DESIRE_NEGATIONS) {
    for (let start = 0; start < sentence.length; start++) {
      if (sentence[start] !== phrase[0]) continue;
      let at = start;
      let matched = 1;
      while (matched < phrase.length) {
        const want = phrase[matched]!;
        let next = -1;
        // Within the phrase itself one inserted content token is allowed ("don't actually want").
        for (let k = at + 1; k <= Math.min(at + 2, sentence.length - 1); k++) {
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
      if (matched === phrase.length) ends.add(at);
    }
  }
  return [...ends].sort((a, b) => a - b);
}

/**
 * CONSUME-ONCE SCOPE (O81, the rule the O78 audit designed): a desire negation spends
 * itself on the NEAREST following candidate span, and only that one.
 *
 * WHY NEAREST AND NOT EVERYTHING-IN-LEAD. "I don't want a woman GP, bulk billing matters
 * more" refuses ONE thing; the old everything-in-lead scope suppressed both asks, and the
 * audit ruled out the tempting alternative — a shorter lead — because "don't want anyone
 * touching the dose" is a real refusal with two inserted content words. Linguistically the
 * negation governs its object; the nearest matched span is the closest computable proxy for
 * that object with no model and no threshold.
 *
 * Scope per trigger is unchanged from O40: forward only, at most MAX_NEGATION_LEAD content
 * tokens between trigger end and span start, never across a clause boundary. What changed
 * is arity: one trigger, one binding.
 *
 * MANNER SPENDS THE NEGATION WITHOUT BEING SUPPRESSED. Spans are passed with a `negatable`
 * flag (care/pref true, manner false — O40's exemption). When the nearest span is a manner
 * ask, the trigger has found its object — "I don't want to feel rushed" IS the unhurried
 * ask — and nothing further suppresses: the negation is spent, not skipped. Treating manner
 * as invisible instead would hand the old defect back one step later ("don't want to feel
 * rushed about the dose" would refuse the dose).
 *
 * Returns the indices (into `spans`) that are suppressed. Two cues matching at the same
 * start position are the same object said twice, so all negatable spans at the nearest
 * start suppress together.
 */
export function suppressedByDesireNegation(
  sentence: readonly string[],
  spans: readonly { from: number; negatable: boolean }[],
): Set<number> {
  const suppressed = new Set<number>();
  for (const end of desireNegationEnds(sentence)) {
    let nearestFrom = Infinity;
    for (const span of spans) {
      if (span.from <= end) continue;
      if (span.from - end - 1 > MAX_NEGATION_LEAD) continue;
      let boundaryBetween = false;
      for (let k = end + 1; k < span.from; k++) {
        if (sentence[k] === CLAUSE_BOUNDARY) {
          boundaryBetween = true;
          break;
        }
      }
      if (boundaryBetween) continue;
      if (span.from < nearestFrom) nearestFrom = span.from;
    }
    if (nearestFrom === Infinity) continue;
    spans.forEach((span, index) => {
      if (span.from === nearestFrom && span.negatable) suppressed.add(index);
    });
  }
  return suppressed;
}

/**
 * A bare negator IMMEDIATELY before a care/preference cue is a refusal (O72).
 *
 * The gap O68's corpus pin named: O40 covers explicit desire phrases ("don't want", "no
 * interest"), and the O53 tight rule constrains cues whose OWN first token is a negator —
 * but "not bulk billing, I am happy to pay for time" slipped both, reaching the exact
 * opposite of its ask. Adjacency IS the idiom here, the same finding O53 made from the
 * other side: "not <cue>" negates; "not the usual bulk billing crowd" (a gap) does not,
 * and tightening past adjacency is how "never LET ME finish anything" got broken once.
 *
 * The set was {no, not} at O72, every exclusion a pinned lesson:
 *   - "never" excluded — history and complaint, not refusal ("never had an assessment").
 *   - contracted verb negators excluded — "won't do titration" is a complaint, i.e. a want.
 * MANNER stays exempt at the call site exactly as O40: "not rushed" is the unhurried ask.
 * A cue whose own phrase begins with a negator is untouched — this looks BEFORE the span.
 *
 * "WITHOUT" JOINED AT O91, and the original exclusion turned out to be protecting nothing.
 * O72 kept it out for "what can we do without medication" — but that sentence reaches
 * through a cue whose OWN phrase starts with the negator ("without medication"), which
 * this check never touches. Meanwhile the corpus caught the cost of the exclusion: "do
 * any GPs do the whole thing without a psychiatrist referral" — an independence ask, the
 * product's premise — read as a shared-care want. Measured over the 500-entry corpus, the
 * extension moves exactly that pin and nothing else.
 *
 * THE DOUBLE-NEGATIVE GUARD, designed against the one shape scouting found: "I can't do
 * this without bulk billing" NEEDS bulk billing — "can't … without X" is a want wearing
 * two negatives. A need-marker token earlier in the same clause stands the suppression
 * down. The guard reads the content stream (the markers are content tokens or kept
 * negators, never stopwords).
 */
const BARE_NEGATORS = new Set(["no", "not", "without"]);
const NEED_MARKERS = new Set(["cant", "cannot", "not", "no", "never", "wont"]);

export function bareNegatorBefore(sentence: readonly string[], cueFrom: number): boolean {
  if (cueFrom === 0) return false;
  const before = sentence[cueFrom - 1];
  if (before === undefined || !BARE_NEGATORS.has(before)) return false;
  if (before !== "without") return true;
  for (let k = cueFrom - 2; k >= 0; k--) {
    const token = sentence[k]!;
    if (token === CLAUSE_BOUNDARY) break;
    if (NEED_MARKERS.has(token)) return false;
  }
  return true;
}

/**
 * The "not just" veto (O72's own corpus finding, caught while building the rule above).
 *
 * Stopword-stripping erases the difference between refusal and ADDITION: "assess me for
 * ADHD, not just the anxiety" strips to […, not, anxiety] — indistinguishable from a
 * refusal, yet the idiom means "anxiety AND MORE", the same shape as the authored cue
 * "not just medication". So the veto reads the RAW stream (stopwords kept, the O45 trick):
 * a "not just" bigram whose few following same-clause tokens include the cue's first
 * authored word is an addition, and the suppression stands down. "not bulk billing, I am
 * happy to pay" carries no "just" and stays a refusal.
 */
export function softenedNotJust(rawSentence: readonly string[], cueFirstRawStem: string): boolean {
  for (let i = 0; i + 1 < rawSentence.length; i++) {
    if (rawSentence[i] !== "not" || rawSentence[i + 1] !== "just") continue;
    for (let k = i + 2; k <= Math.min(i + 4, rawSentence.length - 1); k++) {
      if (rawSentence[k] === CLAUSE_BOUNDARY) break;
      if (rawSentence[k] === cueFirstRawStem) return true;
    }
  }
  return false;
}

/**
 * Conversational hedges (O76, the rule O75's corpus pin demanded).
 *
 * THE DEFECT CLASS. People soften requests with filler that happens to contain cue words:
 * "a she not a he, if that makes sense" fires the sense_making cue, though the hedge asks
 * for nothing — it is an apology for phrasing, not a request for a doctor who explains.
 * Stopword-stripping makes the hedge INDISTINGUISHABLE from the ask in the content stream
 * (both are [make, sense]), so like O45's skeletons and O72's veto, the rule reads the RAW
 * stream, where "if that" survives to mark the idiom.
 *
 * THE RULE: a cue whose whole matched span sits INSIDE a hedge idiom's span claims nothing.
 * Span-precision is the point — "help me make sense of thirty years, if that makes sense"
 * keeps reaching, because findCue matched the genuine ask before the hedge, not the filler.
 *
 * THE SET STAYS SMALL AND EARNED, O50's law: one idiom, with the corpus sentence that earned
 * it pinned in reach.test.ts §O76. "does that make sense", "if you know what I mean" and kin
 * join only when a real sentence somewhere in this tree's tests demonstrates them firing.
 * Phrases are written as tokeniseKeepingStopwords leaves them ("makes" arrives as "make").
 */
const HEDGE_IDIOMS: ReadonlyArray<readonly string[]> = [
  ["if", "that", "make", "sense"],
];

/**
 * Whether the cue span (content-stream indices) lies wholly inside a hedge idiom.
 *
 * The content stream is the raw stream minus stopwords, in order, with clause boundaries
 * kept by both — so the span maps across by a single walk. If the two streams diverge (the
 * O55 caps trim them at different lengths on absurd input), the mapping bails toward NOT
 * suppressing: a hedge rule that could silence a real ask on a 10k-word paste would cost
 * more than the filler it catches.
 */
export function withinHedge(
  sentence: readonly string[],
  rawSentence: readonly string[],
  cueFrom: number,
  cueTo: number,
): boolean {
  const span = mapSpanToRaw(sentence, rawSentence, cueFrom, cueTo);
  if (!span) return false;
  const { rawFrom, rawTo } = span;

  for (const idiom of HEDGE_IDIOMS) {
    for (let h = 0; h + idiom.length <= rawSentence.length; h++) {
      if (
        idiom.every((word, k) => rawSentence[h + k] === word) &&
        rawFrom >= h &&
        rawTo < h + idiom.length
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Content-stream span → raw-stream span (O76, shared by every raw-stream rule that needs to
 * know WHERE a cue sat, not just what surrounds it).
 *
 * The content stream is the raw stream minus stopwords, in order, with clause boundaries
 * kept by both — so the span maps across by a single walk. If the two streams diverge (the
 * O55 caps trim them at different lengths on absurd input), the mapping returns null and
 * every caller bails toward NOT suppressing: a rule that could silence a real ask on a
 * 10k-word paste would cost more than what it catches.
 */
function mapSpanToRaw(
  sentence: readonly string[],
  rawSentence: readonly string[],
  cueFrom: number,
  cueTo: number,
): { rawFrom: number; rawTo: number } | null {
  let rawFrom = -1;
  let rawTo = -1;
  let ci = 0;
  for (let ri = 0; ri < rawSentence.length && ci <= cueTo; ri++) {
    const token = rawSentence[ri]!;
    if (token !== CLAUSE_BOUNDARY && isStopword(token)) continue;
    if (sentence[ci] !== token) return null;
    if (ci === cueFrom) rawFrom = ri;
    if (ci === cueTo) rawTo = ri;
    ci++;
  }
  return rawFrom === -1 || rawTo === -1 ? null : { rawFrom, rawTo };
}

/**
 * The on-behalf rule (O77, the rule O75's second corpus pin demanded).
 *
 * THE DEFECT CLASS. The culturally_attuned facet hears family-PRESENCE asks through cues
 * like "my mum" and "my family" — a relative in the room, family views that shape the
 * appointment. But the on-behalf register uses the same words for a different person
 * entirely: "booking on behalf of my mum" names the PATIENT being booked for, and reading
 * it as a cultural-context ask hands a facet to a sentence that never asked for one.
 * Stopword-stripping erases the governor ("for", "on behalf of" — all function words), so
 * like O45's skeletons, O72's veto and O76's hedges, the rule reads the RAW stream.
 *
 * THE RULE, adjacency-tight exactly as O72 found negation to be: the token straight before
 * the cue's raw span (skipping the possessive "my" the family cues are authored with) is
 * the governor "for", or the pair "behalf of". "for my mum" is on-behalf; "my mum will be
 * in the room" has no governor and stays a presence ask; "I want my mum in the room for
 * this" keeps reaching because the "for" governs "this", not the family reference.
 *
 * SCOPE IS THE CALLER'S, and the child facet is exempt BY DESIGN: "this is for my
 * teenager" IS the child-adolescent ask — on-behalf is that facet's entire register, the
 * same shape as O40's manner exemption. Only the culturally_attuned reading is suppressed.
 */
export function onBehalfBefore(
  sentence: readonly string[],
  rawSentence: readonly string[],
  cueFrom: number,
  cueTo: number,
): boolean {
  const span = mapSpanToRaw(sentence, rawSentence, cueFrom, cueTo);
  if (!span) return false;

  let g = span.rawFrom - 1;
  if (g >= 0 && rawSentence[g] === "my") g--;
  if (g < 0) return false;
  if (rawSentence[g] === "for") return true;
  return rawSentence[g] === "of" && g >= 1 && rawSentence[g - 1] === "behalf";
}

/**
 * Reported refusal (O83, the O78 audit's second queued rule): somebody ELSE's "no" is a
 * complaint, not the reader's refusal.
 *
 * THE GAP THIS CLOSES. O40 and O72 both read complaints as wants — "my GP won't do
 * titration" reaches — but "they said no to titration and I want it anyway" reached
 * nothing, because the bare-negator adjacency rule fired on a refusal that was REPORTED,
 * not made. A reporting verb directly before the negator marks reported speech, and the
 * suppression stands down. Adjacency-tight in the content stream, O72's own law: the verb
 * sits straight before the negator ("said no", "told ... no" once stopwords drop "me"),
 * and a gap is not the idiom.
 *
 * THE SELF-REPORT BOUNDARY, read from the raw stream (this family's trick, because the
 * subject pronoun is a stopword the content stream erased): "I said no to titration" is
 * the reader's OWN standing refusal, so the suppression stands. The subject search walks
 * BACK from the verb over stopwords — auxiliaries ride between subject and verb ("I have
 * said no", "I would have just said no") — and settles on the first thing that is not
 * one: "i"/"ive" means self; any content word ("my GP said no"), a clause boundary, or
 * the sentence start means somebody else. If the two streams have diverged under the O55
 * caps the check bails toward keeping the suppression — the conservative side here is
 * the one that refuses, since the veto widens reach.
 *
 * THE VERB SET IS SMALL AND EARNED (O50's law): {said, told}, each with a demonstrating
 * corpus sentence pinned in the commit that added it. "says"/"tell" stems join only with
 * their own sentences.
 */
const REPORTING_VERBS = new Set(["said", "told"]);
const SELF_REPORTERS = new Set(["i", "ive"]);

export function reportedRefusal(
  sentence: readonly string[],
  rawSentence: readonly string[],
  cueFrom: number,
): boolean {
  if (cueFrom < 2) return false;
  const reporter = sentence[cueFrom - 2];
  if (reporter === undefined || !REPORTING_VERBS.has(reporter)) return false;
  const span = mapSpanToRaw(sentence, rawSentence, cueFrom - 2, cueFrom - 2);
  if (!span) return false;
  for (let k = span.rawFrom - 1; k >= 0; k--) {
    const token = rawSentence[k]!;
    if (token === CLAUSE_BOUNDARY) return true;
    if (SELF_REPORTERS.has(token)) return false;
    if (!isStopword(token)) return true;
  }
  return true;
}

/**
 * Negators that BIND TIGHTLY when they open a cue (O53). "no medication" is an adjacency
 * idiom: the corpus caught "no interest in coaching, the medication is working" reaching
 * `non-medication` through [no, …2 words…, medication] — the negator negating something else
 * entirely. When a cue's first token is one of these, its second token must be ADJACENT.
 *
 * DETERMINER-NEGATORS ONLY, on the evidence. "never" and the contracted verb negators spread
 * naturally with adverbs and objects — "never LET ME finish anything" is the insertion class's
 * own founding example, and "won't ever judge" is ordinary speech — so tightening them would
 * hand back the recall W221 bought. The drift defect the corpus caught is specific to
 * "no"/"not"/"without" + noun, where adjacency IS the idiom.
 */
const TIGHT_NEGATORS = new Set(["no", "not", "without"]);

/** Whether a cue's own first token is one of the tight negators (exported for O92's rule). */
export function isTightNegator(word: string): boolean {
  return TIGHT_NEGATORS.has(word);
}

/**
 * `from` (O78): where the search starts. The audit found that returning only the FIRST
 * occurrence made every suppression rule sentence-global by accident — a cue negated,
 * hedged or on-behalf-governed at its first occurrence was dead for the whole text, so
 * "I don't want titration. but titration support is exactly what I came for" read as
 * nothing. readNeeds now retries from past a refused occurrence; every existing caller
 * passes nothing and keeps first-occurrence behaviour.
 */
/**
 * The deprivation determiner (O92, O87's second pinned false positive).
 *
 * THE DEFECT CLASS. Cues that carry their own negator — "without medication", "without a
 * script", "no medication" — mean DECLINING the thing. But the same words with a
 * possessive or definite determiner mean LACKING it: "the medication shortage keeps
 * leaving me without MY script" is deprivation, a complaint about supply, not a
 * preference for non-medication care. The determiner that separates the two readings is
 * a stopword, erased before matching — so like every rule in this family, the check
 * reads the RAW stream, where "my" and "the" survive.
 *
 * THE RULE: for a cue whose own FIRST token is a tight negator, map the matched span into
 * the raw stream and read what sits between the negator and the first matched content
 * token after it. A possessive or definite determiner ({my, your, our, his, her, their,
 * the}) marks deprivation, and the cue claims nothing. Indefinite ("a", "any") or bare
 * keeps the declining read — "what can we do without medication" and "not a script" are
 * untouched, which is the boundary O91 measured this family against.
 */
const DEPRIVATION_DETERMINERS = new Set(["my", "your", "our", "his", "her", "their", "the"]);

export function lackingNotDeclining(
  sentence: readonly string[],
  rawSentence: readonly string[],
  cueFrom: number,
  cueTo: number,
): boolean {
  const span = mapSpanToRaw(sentence, rawSentence, cueFrom, cueTo);
  if (!span) return false;
  for (let k = span.rawFrom + 1; k < rawSentence.length; k++) {
    const token = rawSentence[k]!;
    if (token === CLAUSE_BOUNDARY) return false;
    if (DEPRIVATION_DETERMINERS.has(token)) return true;
    // The first non-determiner content word ends the determiner slot either way.
    if (!isStopword(token)) return false;
  }
  return false;
}

export function findCue(
  sentence: readonly string[],
  cue: readonly string[],
  from = 0,
): { from: number; to: number } | null {
  if (cue.length === 0) return null;

  for (let start = from; start <= sentence.length - 1; start++) {
    if (sentence[start] !== cue[0]) continue;

    let at = start;
    let matched = 1;
    while (matched < cue.length) {
      const want = cue[matched]!;
      let next = -1;
      const windowEnd =
        matched === 1 && TIGHT_NEGATORS.has(cue[0]!)
          ? at + 1
          : Math.min(at + 1 + MAX_GAP, sentence.length - 1);
      for (let k = at + 1; k <= Math.min(windowEnd, sentence.length - 1); k++) {
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
