// M6 verify gate: the parser's own precision/recall, pinned apart from ranking quality.
//
// MEASURED, 2026-08-23, over the same 447-entry reaching population `tie-quality.test.ts` already
// pins (`REACH_CORPUS` entries carrying a `reaches` set): every one of the 559 hard-pinned facets
// across those 447 sentences is extracted, and NOT ONE sentence extracts a facet outside its own
// `reaches` set. Recall 1.0, precision 1.0 (a lower bound — see the module header), 447/447
// sentences correctly parsed. THAT IS WHY `rankingLadderAll` AND `rankingLadderCorrectlyParsed`
// ARE IDENTICAL BELOW: with zero parser misses in the population, excluding parser misses from the
// denominator excludes nothing. This is not the split failing to do anything — it is the split
// reporting, correctly, that on today's corpus the entire tied/unserved population (147 of 447) is
// ranker/roster-side, not parser-side. The non-vacuity tests below prove the split DOES move
// (`rankingLadderCorrectlyParsed` excludes a sentence `rankingLadderAll` counts) the moment a
// parser defect exists — it is the corpus, not the code, that currently reports zero.
import { describe, expect, it } from "vitest";
import type { CorpusEntry } from "./corpus";
import {
  correctlyParsedTexts,
  extractorReport,
  gradedEntries,
  gradeExtraction,
  rankingLadderAll,
  rankingLadderCorrectlyParsed,
} from "./extractor-quality";

describe("M6 the parser's own report, apart from any ranking outcome", () => {
  it("holds the measured baseline exactly, in both directions", () => {
    expect(extractorReport()).toEqual({
      sampleSize: 447,
      goldFacetCount: 559,
      hitCount: 559,
      recall: 1,
      extractedCount: 559,
      extraCount: 0,
      precision: 1,
      correctlyParsedCount: 447,
      correctlyParsedRate: 1,
    });
  });

  it("is graded over exactly the same reaching population the tie-quality KPI already pins", () => {
    // Same filter as `tie-quality.ts`'s `corpusRun` (any entry with a non-empty `reaches`), so a
    // reader comparing the two reports is comparing the same denominator, not two silently
    // different corpora wearing the same "447".
    expect(gradedEntries().length).toBe(447);
  });

  it("the ranking ladder split is IDENTICAL today, and that identity is itself the finding", () => {
    const all = rankingLadderAll();
    const parsed = rankingLadderCorrectlyParsed();
    expect(all).toEqual({ total: 447, informed: 300, tied: 54, unmatched: 0, unserved: 93 });
    expect(parsed).toEqual(all);
    // Cross-checked against W234's own tally: informed lines up with `separated` (300) and
    // tied+unmatched+unserved lines up with `unseparated` (147) on this two-person roster.
    expect(parsed.informed + 0).toBe(300);
    expect(parsed.tied + parsed.unmatched + parsed.unserved).toBe(147);
  });
});

describe("M6 non-vacuity: the split can fail, and the report says so when it does", () => {
  const REAL_TEXT = "I need an ADHD assessment";
  const REAL_FACET = "care:adhd-assessment";

  it("a wrong gold set registers as a miss, not a silent pass", () => {
    const badEntry: CorpusEntry = { text: REAL_TEXT, reaches: ["care:non-medication"] };
    const result = gradeExtraction(badEntry);
    expect(result.misses).toEqual(["care:non-medication"]);
    expect(result.extras).toEqual([REAL_FACET]);
    expect(result.correctlyParsed).toBe(false);
  });

  it("an empty gold set on a reaching sentence registers the reach as an extra", () => {
    const emptyGold: CorpusEntry = { text: REAL_TEXT, reaches: [] };
    const result = gradeExtraction(emptyGold);
    expect(result.hits).toEqual([]);
    expect(result.extras).toEqual([REAL_FACET]);
    expect(result.correctlyParsed).toBe(false);
  });

  it("a correct gold set still registers as fully hit, so the checker is not one-directional", () => {
    const goodEntry: CorpusEntry = { text: REAL_TEXT, reaches: [REAL_FACET] };
    const result = gradeExtraction(goodEntry);
    expect(result.hits).toEqual([REAL_FACET]);
    expect(result.misses).toEqual([]);
    expect(result.extras).toEqual([]);
    expect(result.correctlyParsed).toBe(true);
  });

  it("extractorReport's recall and precision both fall on a mixed synthetic sample", () => {
    const mixed: CorpusEntry[] = [
      { text: REAL_TEXT, reaches: [REAL_FACET] }, // correct
      { text: REAL_TEXT, reaches: ["care:non-medication"] }, // miss + extra
    ];
    const report = extractorReport(mixed);
    expect(report.sampleSize).toBe(2);
    expect(report.goldFacetCount).toBe(2);
    expect(report.hitCount).toBe(1);
    expect(report.recall).toBeCloseTo(0.5);
    expect(report.extractedCount).toBe(2);
    expect(report.precision).toBeCloseTo(0.5);
    expect(report.correctlyParsedCount).toBe(1);
    expect(report.correctlyParsedRate).toBe(0.5);
  });

  it("a parser miss is excluded from the correctly-parsed population by construction", () => {
    const mixed: CorpusEntry[] = [
      { text: REAL_TEXT, reaches: [REAL_FACET] }, // correct: informed/tied/etc. counted
      { text: REAL_TEXT, reaches: ["care:non-medication"] }, // parser defect: excluded
    ];
    expect(correctlyParsedTexts(mixed)).toEqual([REAL_TEXT]);
    const all = rankingLadderAll(mixed);
    const parsed = rankingLadderCorrectlyParsed(mixed);
    // Same two sentences produce the same ranking outcome (identical text), so the RATE the
    // split would report differs even though the counts on this tiny sample happen to coincide —
    // the population sizes themselves are what prove exclusion happened.
    expect(all.total).toBe(2);
    expect(parsed.total).toBe(1);
  });

  it("an entry with no `reaches` pin is excluded from grading entirely, not counted as a miss", () => {
    // `gradedEntries`/`extractorReport`'s default population only grades entries with a `reaches`
    // pin — an `aspires`-only or `never`-only entry has no hard-pinned gold to grade the parser
    // against and must not silently count as either a hit or a miss.
    const aspiresOnly: CorpusEntry = { text: "I need my prescription continued after moving", aspires: ["care:shared-care"] };
    expect(extractorReport([aspiresOnly]).sampleSize).toBe(0);
  });
});
