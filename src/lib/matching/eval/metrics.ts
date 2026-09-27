// The numbers every level is graded by: the reader's recall and precision against the corpus pins,
// per facet and in total, and an order's NDCG@3, hit@1, MRR, Kendall tau and flip rate.

import type { CorpusEntry } from "@/matching/corpus";
import { gradeExtraction } from "@/matching/extractor-quality";

export type Tally = { asked: number; heard: number; aspired: number; aspiredHeard: number; extracted: number; right: number };

export type ReaderScore = {
  entries: number;
  /** Heard of `reaches`. */
  recall: number | null;
  /** Heard of `aspires`. */
  aspires: number | null;
  /** Read keys that are in `reaches` or `aspires`. A lower bound: `never` lists some wrong keys, not all. */
  precision: number | null;
  /** Entries that read a `never` key, of the entries that pin one. */
  never: number | null;
  /** Every gold key heard, no `never` key read, and nothing read where nothing was asked. */
  correct: number | null;
  perFacet: Map<string, Tally>;
};

const rate = (part: number, whole: number) => (whole === 0 ? null : part / whole);

/** Language keys are left out: the corpus cannot pin them. */
export function scoreReader(entries: readonly CorpusEntry[], read: (text: string) => readonly string[]): ReaderScore {
  const perFacet = new Map<string, Tally>();
  const total: Tally = { asked: 0, heard: 0, aspired: 0, aspiredHeard: 0, extracted: 0, right: 0 };
  const count = (facet: string, field: keyof Tally) => {
    const row = perFacet.get(facet) ?? { asked: 0, heard: 0, aspired: 0, aspiredHeard: 0, extracted: 0, right: 0 };
    row[field] += 1;
    total[field] += 1;
    perFacet.set(facet, row);
  };
  let pinned = 0;
  let broken = 0;
  let correct = 0;
  for (const entry of entries) {
    const graded = gradeExtraction(entry, (text) => read(text).filter((key) => !key.startsWith("language:")));
    const got = new Set(graded.extracted);
    const aspires = entry.aspires ?? [];
    const gold = new Set([...graded.gold, ...aspires]);
    for (const facet of graded.gold) count(facet, "asked");
    for (const facet of graded.hits) count(facet, "heard");
    for (const facet of aspires) count(facet, "aspired");
    for (const facet of aspires.filter((f) => got.has(f))) count(facet, "aspiredHeard");
    for (const facet of got) count(facet, "extracted");
    for (const facet of [...got].filter((f) => gold.has(f))) count(facet, "right");
    const brokeNever = (entry.never ?? []).some((facet) => got.has(facet));
    if (entry.never?.length) pinned += 1;
    if (brokeNever) broken += 1;
    if ([...gold].every((f) => got.has(f)) && !brokeNever && (gold.size > 0 || got.size === 0)) correct += 1;
  }
  return {
    entries: entries.length,
    recall: rate(total.heard, total.asked),
    aspires: rate(total.aspiredHeard, total.aspired),
    precision: rate(total.right, total.extracted),
    never: rate(broken, pinned),
    correct: rate(correct, entries.length),
    perFacet,
  };
}

/** One facet's recall over its gold (`reaches` and `aspires`), precision, and F1. */
export function facetScore(t: Tally): { recall: number | null; precision: number | null; f1: number | null } {
  const recall = rate(t.heard + t.aspiredHeard, t.asked + t.aspired);
  const precision = rate(t.right, t.extracted);
  const f1 = recall === null || precision === null || recall + precision === 0 ? null : (2 * recall * precision) / (recall + precision);
  return { recall, precision, f1 };
}

/** Null when no id has any gain: there is no order to get right. */
export function ndcgAt(k: number, order: readonly string[], gain: ReadonlyMap<string, number>): number | null {
  const dcg = (gains: readonly number[]) => {
    let sum = 0;
    gains.slice(0, k).forEach((g, i) => (sum += g / Math.log2(i + 2)));
    return sum;
  };
  const ideal = dcg([...gain.values()].sort((a, b) => b - a));
  return ideal === 0 ? null : dcg(order.map((id) => gain.get(id) ?? 0)) / ideal;
}

/** Reciprocal rank of the first id with the top gain; hit@1 is this being 1. */
export function reciprocalRank(order: readonly string[], gain: ReadonlyMap<string, number>): number {
  const best = Math.max(0, ...gain.values());
  const at = order.findIndex((id) => best > 0 && gain.get(id) === best);
  return at < 0 ? 0 : 1 / (at + 1);
}

/** Kendall's tau-a between two orders of the same ids: 1 identical, -1 reversed. */
export function kendallTau(a: readonly string[], b: readonly string[]): number {
  const at = new Map(b.map((id, i) => [id, i]));
  let score = 0;
  let pairs = 0;
  for (let i = 0; i < a.length; i += 1) {
    for (let j = i + 1; j < a.length; j += 1) {
      score += at.get(a[i]!)! < at.get(a[j]!)! ? 1 : -1;
      pairs += 1;
    }
  }
  return pairs === 0 ? 1 : score / pairs;
}

/** Share of items whose key set differs between any two runs. `runs[r][i]` is run r's keys for item i. */
export function flipRate(runs: ReadonlyArray<ReadonlyArray<readonly string[]>>): number {
  const items = runs[0]?.length ?? 0;
  let flips = 0;
  for (let i = 0; i < items; i += 1) {
    if (new Set(runs.map((run) => [...run[i]!].sort().join())).size > 1) flips += 1;
  }
  return items === 0 ? 0 : flips / items;
}
