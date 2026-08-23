// M6: grade the parser and the ranker separately (F8).
//
// THE DEFECT. `matchQuality`'s ladder (informed/tied/unmatched/unserved) is the only number this
// tree has ever produced for "did the finder do its job", and it collapses two different systems
// into one report: `unmatched` means the LEXICON never reached a facet at all, `tied`/`unserved`
// mean the lexicon DID reach something and the RANKER could not (or the roster could not) act on
// it. A lexicon widening and a weighting change both move this one headline, and nothing before
// this unit could say which of the two moved it — the exact attribution gap Q-M's own organising
// finding names (F2/F5/F6's shape: one idea, two computations, and the gap between them is where
// the harm lives — here the "idea" is request quality, computed once by the parser and once by
// the ranker, with no seam between them).
//
// THE GOLD SET ALREADY EXISTS; THIS UNIT DOES NOT AUTHOR ONE. W231's reach corpus
// (`corpus.ts`) already hand-labels, per sentence, the facets it MUST reach (`reaches`) — a hard
// pin `corpus.test.ts` already enforces one entry at a time. What has never existed is an
// AGGREGATE precision/recall number for the parser alone, or a ranking-quality number computed
// only over the requests the parser got exactly right. Both are added here, over the same corpus,
// against the same labels — no new hand-labeling, no change to the lexicon or the ranker.
//
// PRECISION IS A LOWER BOUND, NAMED AS ONE. `never` (corpus.ts) only lists SOME of the facets a
// sentence must not reach, not all of them — so an `extras` hit here is real evidence of an
// unaccounted-for extraction (a facet neither pinned as required nor declared forbidden), but a
// sentence with zero declared `never` facets and zero extras is not proven clean, only unproven
// dirty. Precision computed this way can only ever be an upper estimate of the truth; recall,
// resting on the `reaches` hard pins `corpus.test.ts` already fails the build on, is exact.
//
// STRUCTURAL BLINDNESS, NAMED RATHER THAN FIXED. Every gold facet here — `reaches`, and every
// facet an extraction can be scored an "extra" against — is drawn from the SAME closed vocabulary
// `corpus.test.ts`'s `VALID_KEYS` enumerates. A real need for which the vocabulary has no facet at
// all is invisible to this measurement by construction: it cannot appear in `gold`, so it cannot
// register as a miss, and if the parser (reasonably) extracts nothing for it, that sentence reads
// as a correctly-parsed, fully-recalled success. This is the ceiling every number in this module
// sits under — the gap the appraisal (`docs/MATCHING-APPRAISAL-O182.md`) already named as the one
// this kind of gold-label measurement structurally cannot see, and no amount of corpus growth
// closes it, because the corpus is written in the same vocabulary the facets are.

import { REACH_CORPUS, type CorpusEntry } from "./corpus";
import { readNeeds, facetKey } from "./needs";
import { matchQuality, type MatchQuality } from "@/demo/clinicians";

/**
 * Entries with a hard-pinned `reaches` set — the only ones with real gold to grade against. Every
 * function below applies this filter itself rather than trusting the caller applied it, so an
 * `aspires`-only or `never`-only entry can never slip in and register as a free, trivially-correct
 * "0 gold, 0 extracted" pass that inflates `correctlyParsedRate` without grading anything.
 */
function withGold(entries: readonly CorpusEntry[]): readonly CorpusEntry[] {
  return entries.filter((entry) => (entry.reaches?.length ?? 0) > 0);
}

/** Every corpus entry the extractor can be graded on — anything with a hard-pinned `reaches` set. */
export function gradedEntries(): readonly CorpusEntry[] {
  return withGold(REACH_CORPUS);
}

export interface ExtractionResult {
  text: string;
  /** The hard-pinned facets this sentence must reach — the only labels this unit trusts as gold. */
  gold: readonly string[];
  /** What `readNeeds` actually extracted, by facet key. */
  extracted: readonly string[];
  /** gold ∩ extracted. */
  hits: readonly string[];
  /** gold \ extracted — a hard-pin failure if this is ever non-empty; `corpus.test.ts` fails first. */
  misses: readonly string[];
  /** extracted \ gold — an unaccounted-for extraction; a lower-bound false-positive signal. */
  extras: readonly string[];
  /** No miss and no extra: the parser's output for this sentence is exactly its gold set. */
  correctlyParsed: boolean;
}

/** One entry's extraction, graded against its own `reaches` pin. */
export function gradeExtraction(entry: CorpusEntry): ExtractionResult {
  const gold = entry.reaches ?? [];
  const goldSet = new Set(gold);
  const extracted = readNeeds(entry.text).map((need) => facetKey(need.facet));
  const extractedSet = new Set(extracted);
  const hits = gold.filter((facet) => extractedSet.has(facet));
  const misses = gold.filter((facet) => !extractedSet.has(facet));
  const extras = extracted.filter((facet) => !goldSet.has(facet));
  return {
    text: entry.text,
    gold,
    extracted,
    hits,
    misses,
    extras,
    correctlyParsed: misses.length === 0 && extras.length === 0,
  };
}

export interface ExtractorReport {
  sampleSize: number;
  goldFacetCount: number;
  hitCount: number;
  /** hitCount / goldFacetCount — exact, resting on the same hard pins `corpus.test.ts` enforces. */
  recall: number;
  extractedCount: number;
  extraCount: number;
  /** hitCount / extractedCount — a lower bound; see the module header. */
  precision: number;
  correctlyParsedCount: number;
  correctlyParsedRate: number;
}

/** The parser's own number, computed once, apart from any ranking outcome. */
export function extractorReport(entries: readonly CorpusEntry[] = gradedEntries()): ExtractorReport {
  const results = withGold(entries).map(gradeExtraction);
  const goldFacetCount = results.reduce((sum, r) => sum + r.gold.length, 0);
  const hitCount = results.reduce((sum, r) => sum + r.hits.length, 0);
  const extractedCount = results.reduce((sum, r) => sum + r.extracted.length, 0);
  const extraCount = results.reduce((sum, r) => sum + r.extras.length, 0);
  const correctlyParsedCount = results.filter((r) => r.correctlyParsed).length;
  return {
    sampleSize: results.length,
    goldFacetCount,
    hitCount,
    recall: goldFacetCount === 0 ? 0 : Math.round((hitCount / goldFacetCount) * 1000) / 1000,
    extractedCount,
    extraCount,
    precision: extractedCount === 0 ? 0 : Math.round((hitCount / extractedCount) * 1000) / 1000,
    correctlyParsedCount,
    correctlyParsedRate:
      results.length === 0 ? 0 : Math.round((correctlyParsedCount / results.length) * 1000) / 1000,
  };
}

/** The sentences the parser got exactly right — the population ranking quality is graded over below. */
export function correctlyParsedTexts(entries: readonly CorpusEntry[] = gradedEntries()): readonly string[] {
  return withGold(entries).filter((entry) => gradeExtraction(entry).correctlyParsed).map((entry) => entry.text);
}

export interface RankingLadderTally {
  total: number;
  informed: number;
  tied: number;
  unmatched: number;
  unserved: number;
}

function tallyLadder(texts: readonly string[]): RankingLadderTally {
  const tally: RankingLadderTally = { total: texts.length, informed: 0, tied: 0, unmatched: 0, unserved: 0 };
  for (const text of texts) tally[matchQuality(text) as MatchQuality] += 1;
  return tally;
}

/** The collapsed ladder over every graded request — the number the product has always reported. */
export function rankingLadderAll(entries: readonly CorpusEntry[] = gradedEntries()): RankingLadderTally {
  return tallyLadder(withGold(entries).map((entry) => entry.text));
}

/**
 * M6's split number: the same ladder, restricted to requests the parser parsed exactly right.
 * `unmatched` here can only mean the roster/ranker could not act on a correctly-heard request —
 * never a parser miss, because a parser miss is excluded from the denominator by construction.
 */
export function rankingLadderCorrectlyParsed(entries: readonly CorpusEntry[] = gradedEntries()): RankingLadderTally {
  return tallyLadder(correctlyParsedTexts(entries));
}
