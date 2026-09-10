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
import { DenseEmbedder, denseEndpointFromEnv } from "./dense-embedder";
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

describe("M5 the dense embedder", () => {
  // A fake endpoint: a three-dimensional "model" whose vector is the counts of three cue words,
  // so the test can predict every number without a network.
  const fakeFetch = async (_url: string, init: { body: string }) => {
    const { input } = JSON.parse(init.body) as { input: string[] };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: input.map((text, index) => ({
          index,
          embedding: ["autism", "child", "titration"].map((cue) => (text.toLowerCase().match(new RegExp(cue, "g")) ?? []).length * 2),
        })),
      }),
    };
  };

  it("is off without the three variables, and reads them when set", () => {
    expect(denseEndpointFromEnv({})).toBeNull();
    expect(denseEndpointFromEnv({ ADHDME_EMBED_URL: "https://h/v1", ADHDME_EMBED_MODEL: "m" })).toEqual({ url: "https://h/v1", model: "m", key: null });
    expect(denseEndpointFromEnv({ ADHDME_EMBED_URL: "https://h/v1", ADHDME_EMBED_MODEL: "m", ADHDME_EMBED_KEY: "k" })?.key).toBe("k");
  });

  it("primes in batches, returns unit vectors, and counts a miss instead of throwing", async () => {
    const calls: string[][] = [];
    const dense = new DenseEmbedder({ url: "https://h/v1/", model: "m", key: "k" }, async (url, init) => {
      expect(url).toBe("https://h/v1/embeddings");
      expect(init.headers.authorization).toBe("Bearer k");
      calls.push((JSON.parse(init.body) as { input: string[] }).input);
      return fakeFetch(url, init);
    }, 2);
    await dense.prime(["autism and autism", "a child", "titration", "titration"]);
    expect(calls.map((c) => c.length)).toEqual([2, 1]);
    expect(dense.primed).toBe(3);
    expect(dense.dim).toBe(3);
    expect(dense.embed("autism and autism")).toEqual([1, 0, 0]);
    expect(dense.embed("  autism   and autism ")).toEqual([1, 0, 0]);
    expect(dense.misses).toBe(0);
    expect(dense.embed("never primed")).toEqual([0, 0, 0]);
    expect(dense.misses).toBe(1);
    expect(dense.concepts("adult ADHD assessment and titration").length).toBeGreaterThan(0);
  });

  it("runs through the same harness as the lexical embedder once primed", async () => {
    const dense = new DenseEmbedder({ url: "https://h/v1", model: "m", key: null }, fakeFetch);
    await dense.prime([...GPS.map((gp) => gpBioText(gp)), ...EVAL_CASES.map((c) => c.narrative)]);
    const report = evaluateEmbedder(dense, "fake-dense", GPS);
    expect(dense.misses).toBe(0);
    expect(report.cases).toHaveLength(12);
    // Three cue words cannot beat a 259-dimension lexical space; the harness says so.
    expect(beatsBaseline(report, baseline)).toBe(false);
  });

  const endpoint = denseEndpointFromEnv();
  it.skipIf(!endpoint)("a configured dense endpoint is reported against the baseline", async () => {
    const dense = new DenseEmbedder(endpoint!);
    await dense.prime([...GPS.map((gp) => gpBioText(gp)), ...EVAL_CASES.map((c) => c.narrative)]);
    const report = evaluateEmbedder(dense, `dense:${endpoint!.model}`, GPS);
    console.log(formatEvalReport(report));
    await dense.prime(REACH_CORPUS.map((e) => e.text));
    console.log(formatCorpusReport(evaluateOnCorpus(dense, `dense:${endpoint!.model}`)));
    console.log(beatsBaseline(report, baseline) ? "beats the lexical baseline" : "does not beat the lexical baseline");
    expect(dense.misses).toBe(0);
  });
});
