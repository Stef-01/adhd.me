// M5 verify gate: the dense embedder behind the same interface, primed, total, unit length,
// off without its variables, and run through the bench against the lexical baseline.
//
// To evaluate a real endpoint: ADHDME_EMBED_URL=https://host/v1 ADHDME_EMBED_MODEL=name ADHDME_EMBED_KEY=... pnpm vitest run src/lib/matching/dense-embedder.test.ts

import { describe, expect, it } from "vitest";
import { REACH_CORPUS } from "@/matching/corpus";
import { rosterGPs } from "./adapters";
import { gpBioText } from "./candidates";
import { DenseEmbedder, denseEndpointFromEnv } from "./dense-embedder";
import { EVAL_CASES, beatsBaseline, evaluateEmbedder, evaluateOnCorpus, formatCorpusReport, formatEvalReport } from "./embedder-eval";
import { LexicalEmbedder } from "./embedding";

const GPS = rosterGPs(new Date("2026-09-10"));
const baseline = evaluateEmbedder(new LexicalEmbedder().fit(GPS.map((gp) => gpBioText(gp))), "lexical", GPS);

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
