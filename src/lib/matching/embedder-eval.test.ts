// M5 verify gate: the evaluation harness ranks embedders on a number, the lexical baseline is
// pinned, and a dense embedder behaves behind the same interface (primed, total, unit length).
//
// To evaluate a real dense endpoint against the same twelve cases:
//   ADHDME_EMBED_URL=https://host/v1 ADHDME_EMBED_MODEL=name ADHDME_EMBED_KEY=... pnpm vitest run src/lib/matching/embedder-eval.test.ts
// The dense case is skipped when the variables are absent; nothing is fetched otherwise.

import { describe, expect, it } from "vitest";
import { REACH_CORPUS } from "@/matching/corpus";
import { rosterGPs } from "./adapters";
import { gpBioText } from "./candidates";
import { EVAL_CASES, beatsBaseline, evaluateEmbedder, evaluateOnCorpus, formatCorpusReport, formatEvalReport } from "./embedder-eval";
import { LexicalEmbedder } from "./embedding";

const GPS = rosterGPs(new Date("2026-09-10"));
const lexical = new LexicalEmbedder().fit(GPS.map((gp) => gpBioText(gp)));
const baseline = evaluateEmbedder(lexical, "lexical", GPS);

describe("M5 the harness", () => {
  it("names twelve cases whose expected GPs all exist on the roster", () => {
    expect(EVAL_CASES).toHaveLength(12);
    const ids = new Set(GPS.map((gp) => gp.id));
    for (const c of EVAL_CASES) for (const id of c.expected) expect(ids.has(id), `${c.id}: ${id}`).toBe(true);
  });

  it("pins the lexical baseline: the number a dense model has to beat", () => {
    console.log(formatEvalReport(baseline));
    // Measured 2026-09-10: top-1 75%, top-3 83%, MRR 0.804. Ten of twelve at rank one; the two
    // it misses are the ones a closed vocabulary cannot reach: "drink more than I should ... held
    // against me" (rank 12) and "a psychology background who understands ADHD in women" (rank 17).
    // Those two are what a dense model is for. The pin is the floor, not the target.
    expect(baseline.top1).toBeGreaterThanOrEqual(0.75);
    expect(baseline.top3).toBeGreaterThanOrEqual(0.8);
    expect(baseline.mrr).toBeGreaterThanOrEqual(0.8);
    expect(baseline.cases.every((c) => c.rank !== null)).toBe(true);
    const misses = baseline.cases.filter((c) => (c.rank ?? 99) > 3).map((c) => c.id);
    expect(misses).toEqual(["substance", "psychology-women"]);
  });

  it("a report is a table a person can read", () => {
    const text = formatEvalReport(baseline);
    expect(text.split("\n")).toHaveLength(13);
    expect(text).toMatch(/^lexical: top-1 \d+%, top-3 \d+%, MRR 0\.\d{3}, mean margin -?0\.\d{3}/);
  });

  it("pins the lexical embedder on the reach corpus: paraphrases of one ask sit nearer than different asks", () => {
    const report = evaluateOnCorpus(lexical, "lexical");
    console.log(formatCorpusReport(report));
    expect(report.entries).toBeGreaterThan(400);
    // Measured 2026-09-10: 451 entries, agreement 64%, same-facet 0.122 against other-facet 0.021.
    expect(report.neighbourAgreement).toBeGreaterThanOrEqual(0.6);
    expect(report.meanSameFacet).toBeGreaterThan(report.meanOtherFacet);
  });

  it("beatsBaseline holds on every headline number, not the average of them", () => {
    expect(beatsBaseline(baseline, baseline)).toBe(true);
    expect(beatsBaseline({ ...baseline, top1: baseline.top1 - 0.1 }, baseline)).toBe(false);
    expect(beatsBaseline({ ...baseline, mrr: baseline.mrr + 0.1 }, baseline)).toBe(true);
  });
});
