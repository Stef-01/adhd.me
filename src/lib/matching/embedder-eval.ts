// The embedder evaluation harness (Phase M5). Twelve labelled narratives, each with the roster
// GPs whose declared bio should rank first for it. Any `Embedder` runs through the same twelve,
// so a dense model is compared with the lexical one on a number rather than on a feeling:
// top-1, top-3, mean reciprocal rank, and the mean margin between the best right answer and the
// best wrong one. The lexical baseline is pinned in `embedder-eval.test.ts`; a replacement has
// to beat it there before it replaces anything.
//
// The narratives are written, not collected: nobody's words are in this file.

import { REACH_CORPUS, type CorpusEntry } from "@/matching/corpus";
import { rosterGPs } from "./adapters";
import { embeddingFor } from "./candidates";
import { cosine, type Embedder } from "./embedding";
import type { GP } from "./types";

export interface EvalCase {
  id: string;
  narrative: string;
  /** GP ids whose bio answers the narrative; any of them at rank one counts. */
  expected: readonly string[];
}

export interface CaseResult {
  id: string;
  /** 1-based rank of the first expected GP, or null when none is in the list. */
  rank: number | null;
  top: string;
  /** cosine(best expected) minus cosine(best not expected); positive means the right one leads. */
  margin: number;
}

export interface EvalReport {
  embedder: string;
  cases: CaseResult[];
  top1: number;
  top3: number;
  mrr: number;
  meanMargin: number;
}

export const EVAL_CASES: readonly EvalCase[] = [
  { id: "autism-together", narrative: "I am autistic and I think I also have ADHD. I would rather not go straight to medication.", expected: ["example-priya-nair", "example-felix-braun"] },
  { id: "child", narrative: "My nine year old's school keeps saying she cannot sit still. I want a proper assessment for a child.", expected: ["example-annika-larsen", "example-mei-chao", "example-amara-obi"] },
  { id: "shared-care", narrative: "My psychiatrist has a plan and I need a GP to hold the shared care and the scripts.", expected: ["example-daniel-okafor", "example-gurpreet-singh", "example-isla-mcgregor", "example-ewan-blake"] },
  { id: "anxiety-tangle", narrative: "I cannot tell whether it is anxiety or ADHD. They feed each other.", expected: ["example-hana-yoshida", "example-minh-tran", "example-leila-haddad", "example-sana-qureshi"] },
  { id: "low-mood", narrative: "Low mood for years, and now wondering if ADHD is underneath it.", expected: ["example-tomas-rivera", "example-rohan-pillai", "example-ash-coleman", "example-amara-obi"] },
  { id: "trauma-pace", narrative: "I need someone who will not rush me. I have a trauma history and get overwhelmed.", expected: ["example-sarah-whitfield", "example-chloe-bennett"] },
  { id: "rejection", narrative: "My emotions flip fast and rejection floors me. I want help with regulating that.", expected: ["example-jordan-reyes", "example-sarah-whitfield", "example-leila-haddad", "example-ash-coleman", "example-chloe-bennett"] },
  { id: "substance", narrative: "I drink more than I should and I am worried that will be held against me when I ask about ADHD.", expected: ["example-owen-hartley", "example-rohan-pillai", "example-ewan-blake"] },
  { id: "titration", narrative: "Already diagnosed, moved cities, and I need a GP to keep reviewing my stimulant dose on a schedule.", expected: ["anubhav-saxena", "example-mei-chao", "example-owen-hartley", "example-gurpreet-singh", "example-minh-tran", "example-sana-qureshi"] },
  { id: "telehealth-first", narrative: "I live rurally and need telehealth from the very first appointment, taken at an unhurried pace.", expected: ["example-chloe-bennett"] },
  { id: "psychology-women", narrative: "I would like a GP with a psychology background who understands ADHD in women.", expected: ["anusha-saxena"] },
  { id: "bipolar-complex", narrative: "I have bipolar and my psychiatrist thinks ADHD too. It is complex and I need it held together.", expected: ["example-isla-mcgregor", "example-daniel-okafor", "example-felix-braun"] },
];

export function evaluateEmbedder(
  embedder: Embedder,
  name: string,
  gps: readonly GP[] = rosterGPs(new Date("2026-09-10")),
  cases: readonly EvalCase[] = EVAL_CASES,
): EvalReport {
  const bios = gps.map((gp) => ({ id: gp.id, vector: embeddingFor(embedder, gp) }));
  const results: CaseResult[] = cases.map((c) => {
    const narrative = embedder.embed(c.narrative);
    const scored = bios
      .map((b) => ({ id: b.id, score: cosine(narrative, b.vector) }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const index = scored.findIndex((s) => c.expected.includes(s.id));
    const bestRight = index >= 0 ? scored[index]!.score : 0;
    const bestWrong = scored.find((s) => !c.expected.includes(s.id))?.score ?? 0;
    return { id: c.id, rank: index >= 0 ? index + 1 : null, top: scored[0]?.id ?? "", margin: round(bestRight - bestWrong) };
  });
  const n = results.length || 1;
  return {
    embedder: name,
    cases: results,
    top1: round(results.filter((r) => r.rank === 1).length / n),
    top3: round(results.filter((r) => r.rank !== null && r.rank <= 3).length / n),
    mrr: round(results.reduce((sum, r) => sum + (r.rank ? 1 / r.rank : 0), 0) / n),
    meanMargin: round(results.reduce((sum, r) => sum + r.margin, 0) / n),
  };
}

export function formatEvalReport(report: EvalReport): string {
  const lines = [
    `${report.embedder}: top-1 ${pct(report.top1)}, top-3 ${pct(report.top3)}, MRR ${report.mrr.toFixed(3)}, mean margin ${report.meanMargin.toFixed(3)}`,
    ...report.cases.map((c) => `  ${c.id.padEnd(18)} rank ${String(c.rank ?? "-").padStart(2)}  margin ${c.margin >= 0 ? "+" : ""}${c.margin.toFixed(3)}  top ${c.top}`),
  ];
  return lines.join("\n");
}

/** Positive when the candidate is at least as good as the baseline on every headline number. */
export function beatsBaseline(candidate: EvalReport, baseline: EvalReport): boolean {
  return candidate.top1 >= baseline.top1 && candidate.top3 >= baseline.top3 && candidate.mrr >= baseline.mrr;
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

// The second bench: the finder's reach corpus (`src/matching/corpus.ts`), five hundred first-
// person requests with the facets each one reaches. No labels of mine here; the question is
// whether an embedder puts two paraphrases of the same ask nearer each other than two asks about
// different things. Nearest-neighbour facet agreement is the headline; the two mean cosines say
// how far apart the space holds same-facet and other-facet pairs.

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
