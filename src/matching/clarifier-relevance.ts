// M10 (Q-M item 18): the request must suggest a clarifier before the roster's splits may choose it.
//
// THE DEFECT. `clarifiers()` picks questions by how evenly the roster splits on them, and the
// query's only role is to EXCLUDE facets already asked for. Whatever gets asked then earns the
// 1.5× stated-importance lift on confirmation (`STATED_IMPORTANCE_LIFT`). So the lift applies to
// whatever the selector happened to ask — and the selector's reasons are entirely roster-side.
// Measured on the real roster before this unit: a reader who typed "English is my second language
// and appointments move too fast" was asked about anxiety, shared care and child assessment —
// three questions with nothing to do with anything they said, offered because those are the axes
// this roster happens to split on. The year plan names that shape precisely: "interrogating a
// reader about the one axis two doctors happen to differ on, which is a fair description of
// manipulation. The relevance gate is not optional."
//
// WHAT "THE REQUEST SUGGESTS IT MATTERS" MEANS HERE, and why it is measured rather than authored.
// The reach corpus is this tree's record of how real requests hold facets together: 559 authored
// sentences, 90 of which reach two or more facets at once. When "I want to be honest about
// drinking" and "without being judged" arrive in one breath across several entries, the corpus is
// evidence that a reader who said one may care about the other. So facet A suggests facet B when
// they co-occur in at least MIN_COOCCURRENCE corpus entries' `reaches` sets. No adjacency is
// hand-authored: the map is derived from the corpus at module load, grows when the corpus does,
// and can be printed. The alternative — a hand-written "these facets go together" table — would
// be this product authoring claims about which health concerns accompany which, which is exactly
// the kind of content the corpus exists to ground in observed phrasing instead.
//
// TWO BLIND SPOTS, NAMED RATHER THAN GLOSSED.
// (1) Corpus `reaches` sets carry no `language:` keys (languageNeeds reads a separate vocabulary),
//     so a stated language need suggests nothing through this map today. The day corpus gold
//     includes language keys, the map widens by itself; until then a language-led request relies
//     on whatever else it reached (in the measured cases above, `manner:culturally_attuned` is
//     reached directly by the same sentence, so the loss is a question that was already excluded
//     as asked).
// (2) A facet that only ever appears alone in the corpus suggests nothing and is suggested by
//     nothing — rare facets gate hard. That is the conservative side: the cost of a missing edge
//     is one fewer question, never a wrong one.

import { REACH_CORPUS, type CorpusEntry } from "./corpus";

/**
 * How many corpus entries must hold two facets together before one suggests the other.
 *
 * Two, not one: a single entry is one authored example — the pattern, not evidence of a pattern.
 * At one, every multi-facet entry becomes an edge and the gate admits 140 ordered pairs; at two
 * it admits 54, and the measured effect on the tied queue (see the test) is that the offers which
 * survive are the ones a human reader would call related while the ones removed are the
 * interrogation-shaped ones. At three the generic-assessment entry query starts losing questions,
 * which is W225's main use case. Two is a judgement, and these are the figures behind it.
 */
export const MIN_COOCCURRENCE = 2;

/**
 * Ordered co-occurrence counts over the corpus's `reaches` sets: "a→b" appears once per entry
 * whose gold set holds both. Built with both orders present so lookups need no normalisation;
 * the relation is symmetric by construction.
 */
export function cooccurrenceCounts(corpus: readonly CorpusEntry[] = REACH_CORPUS): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of corpus) {
    if (!entry.reaches?.length) continue;
    const keys = [...new Set(entry.reaches)];
    for (const a of keys) {
      for (const b of keys) {
        if (a === b) continue;
        const edge = `${a}→${b}`;
        counts.set(edge, (counts.get(edge) ?? 0) + 1);
      }
    }
  }
  return counts;
}

const CORPUS_COUNTS = cooccurrenceCounts();

/**
 * Does the request — represented by the facet keys it reached — suggest this candidate facet?
 *
 * True when any reached facet co-occurs with the candidate in at least MIN_COOCCURRENCE corpus
 * entries. A request that reached nothing suggests nothing through this function; the caller
 * owns that case (clarify.ts states the carve-out and its reason).
 */
export function requestSuggests(
  reachedKeys: readonly string[],
  candidateKey: string,
  counts: Map<string, number> = CORPUS_COUNTS,
): boolean {
  return reachedKeys.some((reached) => (counts.get(`${reached}→${candidateKey}`) ?? 0) >= MIN_COOCCURRENCE);
}
