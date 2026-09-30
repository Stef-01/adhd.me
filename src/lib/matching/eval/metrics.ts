// The numbers the reader is graded by: recall and precision against the corpus pins, per tag and in
// total, and an order's NDCG@3, hit@1 and MRR.

import type { CorpusEntry } from "@/matching/corpus";

export type Tally = { asked: number; heard: number; aspired: number; aspiredHeard: number; extracted: number; right: number };

/**
 * Recall is heard of `reaches`; aspires is heard of `aspires`. Precision counts a read key right when
 * it is in either, so it is a lower bound: `never` lists some wrong keys, not all. Never is the share
 * of never-pinned entries that read one; correct is the share read with no fault at all.
 */
export type ReaderScore = { recall: number | null; aspires: number | null; precision: number | null; never: number | null; correct: number | null; perFacet: Map<string, Tally> };

const rate = (part: number, whole: number) => (whole === 0 ? null : part / whole);
/** Language keys are not scored: the corpus cannot pin them. */
const notLanguage = (key: string) => !key.startsWith("language:");

/**
 * What one reading got wrong among the keys `keep` scores: gold keys missed, `never` keys read, keys
 * read where nothing was asked (stray), and keys read beside the gold that no pin speaks to (extra:
 * wrong, or a pin the corpus lacks; precision counts them, a person judges them).
 */
export function faults(entry: CorpusEntry, keys: readonly string[], keep: (key: string) => boolean = notLanguage): { missed: string[]; broke: string[]; stray: string[]; extra: string[] } {
  const got = new Set(keys.filter(keep));
  const gold = [...(entry.reaches ?? []), ...(entry.aspires ?? [])].filter(keep);
  const never = new Set(entry.never ?? []);
  const beside = [...got].filter((key) => !gold.includes(key) && !never.has(key));
  return { missed: gold.filter((key) => !got.has(key)), broke: (entry.never ?? []).filter((key) => keep(key) && got.has(key)), stray: gold.length ? [] : beside, extra: gold.length ? beside : [] };
}

export function scoreReader(entries: readonly CorpusEntry[], read: (text: string) => readonly string[], keep: (key: string) => boolean = notLanguage): ReaderScore {
  const perFacet = new Map<string, Tally>();
  const total: Tally = { asked: 0, heard: 0, aspired: 0, aspiredHeard: 0, extracted: 0, right: 0 };
  const count = (facets: readonly string[], field: keyof Tally) => {
    for (const facet of facets) {
      const row = perFacet.get(facet) ?? { asked: 0, heard: 0, aspired: 0, aspiredHeard: 0, extracted: 0, right: 0 };
      row[field] += 1;
      total[field] += 1;
      perFacet.set(facet, row);
    }
  };
  let [pinned, broken, correct] = [0, 0, 0];
  for (const entry of entries) {
    const reaches = (entry.reaches ?? []).filter(keep);
    const aspires = (entry.aspires ?? []).filter(keep);
    const extracted = [...new Set(read(entry.text).filter(keep))];
    const gold = [...reaches, ...aspires];
    count(reaches, "asked");
    count(reaches.filter((f) => extracted.includes(f)), "heard");
    count(aspires, "aspired");
    count(aspires.filter((f) => extracted.includes(f)), "aspiredHeard");
    count(extracted, "extracted");
    count(extracted.filter((f) => gold.includes(f)), "right");
    const wrong = faults(entry, extracted, keep);
    if (entry.never?.some(keep)) pinned += 1;
    if (wrong.broke.length) broken += 1;
    if (!wrong.missed.length && !wrong.broke.length && !wrong.stray.length) correct += 1;
  }
  return {
    recall: rate(total.heard, total.asked),
    aspires: rate(total.aspiredHeard, total.aspired),
    precision: rate(total.right, total.extracted),
    never: rate(broken, pinned),
    correct: rate(correct, entries.length),
    perFacet,
  };
}

/** Null when no id has any gain: there is no order to get right. */
export function ndcgAt(k: number, order: readonly string[], gain: ReadonlyMap<string, number>): number | null {
  const dcg = (gains: readonly number[]) => gains.slice(0, k).reduce((sum, g, i) => sum + g / Math.log2(i + 2), 0);
  const ideal = dcg([...gain.values()].sort((a, b) => b - a));
  return ideal === 0 ? null : dcg(order.map((id) => gain.get(id) ?? 0)) / ideal;
}

/** Reciprocal rank of the first id with the top gain; hit@1 is this being 1. */
export function reciprocalRank(order: readonly string[], gain: ReadonlyMap<string, number>): number {
  const best = Math.max(0, ...gain.values());
  const at = order.findIndex((id) => best > 0 && gain.get(id) === best);
  return at < 0 ? 0 : 1 / (at + 1);
}
