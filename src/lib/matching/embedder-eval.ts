// The embedder bench (Phase M5): any `Embedder` is measured on the finder's reach corpus, so a
// dense model is compared with the lexical one on a number rather than on a feeling. The lexical
// figures are pinned in `embedder-eval.test.ts`; a replacement has to beat them before it replaces
// anything. (The twelve written narratives this bench once carried ranked the example GPs, who are
// gone; three real GPs are too few to rank.)

import { REACH_CORPUS, type CorpusEntry } from "@/matching/corpus";
import { cosine, type Embedder } from "./embedding";

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

// The reach corpus (`src/matching/corpus.ts`): five hundred first-person requests with the facets
// each one reaches. No labels of mine here; the question is whether an embedder puts two
// paraphrases of the same ask nearer each other than two asks about different things. Nearest-
// neighbour facet agreement is the headline; the two mean cosines say how far apart the space
// holds same-facet and other-facet pairs.

export interface CorpusReport {
  embedder: string;
  entries: number;
  /** Share of entries whose nearest neighbour shares a reached facet with them. */
  neighbourAgreement: number;
  meanSameFacet: number;
  meanOtherFacet: number;
}

export function evaluateOnCorpus(embedder: Embedder, name: string, corpus: readonly CorpusEntry[] = REACH_CORPUS): CorpusReport {
  const labelled = corpus.filter((e) => (e.reaches?.length ?? 0) > 0);
  const vectors = labelled.map((e) => embedder.embed(e.text));
  const facets = labelled.map((e) => new Set(e.reaches));
  let agree = 0;
  let same = 0;
  let sameN = 0;
  let other = 0;
  let otherN = 0;
  for (let i = 0; i < labelled.length; i += 1) {
    let bestJ = -1;
    let best = -Infinity;
    for (let j = 0; j < labelled.length; j += 1) {
      if (i === j) continue;
      const c = cosine(vectors[i]!, vectors[j]!);
      const shared = [...facets[i]!].some((f) => facets[j]!.has(f));
      if (shared) {
        same += c;
        sameN += 1;
      } else {
        other += c;
        otherN += 1;
      }
      if (c > best) {
        best = c;
        bestJ = j;
      }
    }
    if (bestJ >= 0 && [...facets[i]!].some((f) => facets[bestJ]!.has(f))) agree += 1;
  }
  const n = labelled.length || 1;
  return {
    embedder: name,
    entries: labelled.length,
    neighbourAgreement: round(agree / n),
    meanSameFacet: round(same / (sameN || 1)),
    meanOtherFacet: round(other / (otherN || 1)),
  };
}

export function formatCorpusReport(r: CorpusReport): string {
  return `${r.embedder} on the reach corpus (${r.entries}): nearest-neighbour agreement ${pct(r.neighbourAgreement)}, same-facet cosine ${r.meanSameFacet.toFixed(3)}, other-facet cosine ${r.meanOtherFacet.toFixed(3)}`;
}
