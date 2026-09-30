import { describe, expect, it } from "vitest";
import type { CorpusEntry } from "@/matching/corpus";
import { faults, ndcgAt, reciprocalRank, scoreReader } from "./metrics";

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

  it("tallies per tag", () => {
    expect(score.perFacet.get("care:anxiety")).toEqual({ asked: 2, heard: 2, aspired: 0, aspiredHeard: 0, extracted: 2, right: 2 });
    expect(score.perFacet.get("pref:woman-gp")).toEqual({ asked: 1, heard: 0, aspired: 0, aspiredHeard: 0, extracted: 0, right: 0 });
  });

  it("scores only the keys `keep` admits: manner pins are nobody's to read now", () => {
    const care = (key: string) => key.startsWith("care:") || key.startsWith("pref:");
    const scored = scoreReader(ENTRIES, (text) => READS[text]!, care);
    expect(scored.precision).toBe(2 / 4);
    expect(scored.aspires).toBeNull();
    expect(faults(ENTRIES[1]!, READS.two!, care)).toEqual({ missed: [], broke: ["care:depression"], stray: [], extra: [] });
    expect(faults(ENTRIES[3]!, READS.four!, care)).toEqual({ missed: [], broke: [], stray: ["pref:bulk-billing"], extra: [] });
    expect(faults(ENTRIES[0]!, ["care:anxiety", "care:sleep"], care)).toEqual({ missed: ["pref:woman-gp"], broke: [], stray: [], extra: ["care:sleep"] });
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
});
