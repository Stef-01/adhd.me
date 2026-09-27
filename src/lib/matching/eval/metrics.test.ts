import { describe, expect, it } from "vitest";
import type { CorpusEntry } from "@/matching/corpus";
import { extractorReport, gradedEntries } from "@/matching/extractor-quality";
import { facetKey, readNeeds } from "@/matching/needs";
import { facetScore, flipRate, kendallTau, ndcgAt, reciprocalRank, scoreReader } from "./metrics";

const ENTRIES: CorpusEntry[] = [
  { text: "one", reaches: ["care:anxiety", "pref:woman-gp"] },
  { text: "two", reaches: ["care:anxiety"], aspires: ["manner:steadying"], never: ["care:depression"] },
  { text: "three", never: ["care:titration"] },
  { text: "four" },
];
const READS: Record<string, string[]> = {
  one: ["care:anxiety", "manner:attuned", "language:urdu"],
  two: ["care:anxiety", "manner:steadying", "care:depression"],
  three: [],
  four: ["pref:bulk-billing"],
};

describe("scoreReader", () => {
  const score = scoreReader(ENTRIES, (text) => READS[text]!);

  it("gives exact recall on reaches, aspires reach, and a lower-bound precision", () => {
    expect(score.recall).toBe(2 / 3);
    expect(score.aspires).toBe(1);
    // Read (languages left out): anxiety, attuned, anxiety, steadying, depression, bulk-billing.
    // Gold among them: anxiety, anxiety, steadying.
    expect(score.precision).toBe(3 / 6);
    expect(score.never).toBe(1 / 2);
    // "three" read nothing it must not; "one" missed woman-gp; "two" broke a never; "four" read where nothing was asked.
    expect(score.correct).toBe(1 / 4);
  });

  it("gives per-facet precision, recall and F1", () => {
    expect(facetScore(score.perFacet.get("care:anxiety")!)).toEqual({ recall: 1, precision: 1, f1: 1 });
    expect(facetScore(score.perFacet.get("pref:woman-gp")!)).toEqual({ recall: 0, precision: null, f1: null });
    expect(facetScore(score.perFacet.get("care:depression")!)).toEqual({ recall: null, precision: 0, f1: null });
    const half = facetScore({ asked: 2, heard: 1, aspired: 0, aspiredHeard: 0, extracted: 4, right: 1 });
    expect(half.f1).toBeCloseTo((2 * 0.5 * 0.25) / 0.75, 12);
  });

  it("agrees with extractor-quality on the lexicon, which it builds on", () => {
    const report = extractorReport();
    const lexicon = scoreReader(gradedEntries(), (text) => readNeeds(text).map((n) => facetKey(n.facet)));
    expect(lexicon.recall).toBeCloseTo(report.recall, 3);
  });
});

describe("order metrics", () => {
  const gain = new Map([["a", 1], ["b", 1], ["c", 0.5], ["d", 0]]);

  it("NDCG@3 against hand-computed orders", () => {
    expect(ndcgAt(3, ["b", "a", "c", "d"], gain)).toBe(1);
    const got = 0 + 1 / Math.log2(3) + 1 / Math.log2(4);
    const ideal = 1 + 1 / Math.log2(3) + 0.5 / Math.log2(4);
    expect(ndcgAt(3, ["d", "a", "b", "c"], gain)).toBeCloseTo(got / ideal, 12);
    expect(ndcgAt(3, ["a"], new Map([["a", 0]]))).toBeNull();
  });

  it("hit@1 and MRR take the first id with the top gain, ties included", () => {
    expect(reciprocalRank(["b", "c"], gain)).toBe(1);
    expect(reciprocalRank(["c", "d", "a"], gain)).toBe(1 / 3);
    expect(reciprocalRank(["d"], new Map([["d", 0]]))).toBe(0);
  });

  it("Kendall tau for identical, reversed and one-swap orders", () => {
    expect(kendallTau(["a", "b", "c", "d"], ["a", "b", "c", "d"])).toBe(1);
    expect(kendallTau(["a", "b", "c", "d"], ["d", "c", "b", "a"])).toBe(-1);
    expect(kendallTau(["a", "b", "c", "d"], ["b", "a", "c", "d"])).toBeCloseTo(4 / 6, 12);
  });

  it("flip rate over three runs", () => {
    const runs = [
      [["x"], ["y", "z"], []],
      [["x"], ["z", "y"], ["w"]],
      [["x"], ["y", "z"], []],
    ];
    expect(flipRate(runs)).toBe(1 / 3);
    expect(flipRate([[["x"]], [["x"]]])).toBe(0);
  });
});
