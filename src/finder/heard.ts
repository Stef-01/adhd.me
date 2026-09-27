// The finder's "What we heard" row (docs/matching/LLM-MATCHING-PLAN.md §15): what the request was
// read as asking for, as chips a person can take away and put back.

import {
  facetStrength,
  INFORMED_SEPARATION_RATIO,
  labelInSentence,
  rankingProfile,
  type Clinician,
  type MatchQuality,
} from "@/demo/clinicians";
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

/**
 * `matchQuality` for a read already in hand, so the heading claims an order only while the kept
 * facets earn one. `heard.test.ts` holds it equal to `matchQuality` on every corpus request.
 */
export function qualityOf(needs: readonly NeedSignal[], roster: readonly Clinician[]): MatchQuality {
  if (needs.length === 0) return "unmatched";
  const scores = roster.map((clinician) => rankingProfile(clinician, needs).weightedScore);
  if (scores.every((score) => score === 0)) return "unserved";
  if (new Set(scores).size === 1) return "tied";
  const facets = new Map(needs.map((need) => [facetKey(need.facet), need.facet]));
  const differing = [...facets.values()].filter((facet) => new Set(roster.map((c) => facetStrength(c, facet))).size > 1).length;
  return differing / facets.size >= INFORMED_SEPARATION_RATIO ? "informed" : "tied";
}
