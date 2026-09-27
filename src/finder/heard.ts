// The finder's "What we heard" row (docs/matching/LLM-MATCHING-PLAN.md §15): what the request was
// read as asking for, as chips a person can take away and put back.

import { labelInSentence } from "@/demo/clinicians";
import { facetKey, shortLabel, type NeedSignal } from "@/matching/needs";

export type HeardChip = {
  /** The facet key the chip stands for. */
  key: string;
  /** What the chip shows: the facet's short label. */
  label: string;
  /** The same words inside a sentence ("telehealth", "ADHD assessment"), for the chip's name. */
  spoken: string;
};

/** The order `rankClinicians` consults a read in: language and access first, then care, then manner. */
const TIER: Readonly<Record<NeedSignal["facet"]["kind"], number>> = { language: 0, preference: 0, care: 1, manner: 2 };

/** The strongest `max` facets of a read, one chip each, in the ranker's own order. */
export function heardChips(needs: readonly NeedSignal[], max: number): HeardChip[] {
  const strongest = new Map<string, NeedSignal>();
  for (const need of needs) {
    const key = facetKey(need.facet);
    const held = strongest.get(key);
    if (!held || need.weight > held.weight) strongest.set(key, need);
  }
  return [...strongest.entries()]
    .sort(([, a], [, b]) => TIER[a.facet.kind] - TIER[b.facet.kind] || b.weight - a.weight)
    .slice(0, max)
    .map(([key, need]) => {
      const label = shortLabel(need);
      return { key, label, spoken: labelInSentence({ ...need, label }) };
    });
}
