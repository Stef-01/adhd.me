// M1 verify gate: the lexical embedder is a real vector space (unit length, deterministic,
// total), the concept layer is what carries meaning, and the cosine behaves as a similarity.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CONCEPTS, EMBEDDING_DIM, LexicalEmbedder, cosine, sharedConcepts } from "./embedding";

const SEED = 20260909;
const embedder = new LexicalEmbedder();

function norm(v: readonly number[]): number {
  let sum = 0;
  for (const x of v) sum += x * x;
  return Math.sqrt(sum);
}

describe("M1 the embedding is a unit vector, deterministic and total", () => {
  it("has the declared dimension and unit length for any text with content", () => {
    const v = embedder.embed("adult ADHD assessment without being rushed");
    expect(v.length).toBe(EMBEDDING_DIM);
    expect(norm(v)).toBeCloseTo(1, 6);
  });

  it("returns the zero vector for empty or stopword-only text rather than throwing", () => {
    expect(norm(embedder.embed(""))).toBe(0);
    expect(norm(embedder.embed("the and of"))).toBe(0);
  });

  it("is a function of the text: the same words give the same vector, always", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (text) => {
        expect(embedder.embed(text)).toEqual(embedder.embed(text));
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it("never throws on arbitrary input", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 400 }), (text) => {
        const v = embedder.embed(text);
        expect(v.length).toBe(EMBEDDING_DIM);
        const n = norm(v);
        expect(n === 0 || Math.abs(n - 1) < 1e-6).toBe(true);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });
});

describe("M1 the cosine is a similarity", () => {
  it("is 1 for identical text and within 0 to 1 for any pair", () => {
    const a = embedder.embed("titration reviewed on a schedule");
    expect(cosine(a, a)).toBeCloseTo(1, 6);
    fc.assert(
      fc.property(fc.string({ maxLength: 120 }), fc.string({ maxLength: 120 }), (x, y) => {
        const c = cosine(embedder.embed(x), embedder.embed(y));
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it("puts a narrative closer to the bio that talks about the same thing", () => {
    const narrative = "My son is eight and his teacher thinks he might have ADHD. We want an assessment for a child.";
    const childBio = "Sees children and adolescents for ADHD assessment, working with the school and the family.";
    const adultBio = "Adult ADHD assessment and titration, with a structured review schedule for adults.";
    const n = embedder.embed(narrative);
    expect(cosine(n, embedder.embed(childBio))).toBeGreaterThan(cosine(n, embedder.embed(adultBio)));
  });

  it("lifts similarity through the concept layer even when the surface words differ", () => {
    const narrative = "I am on Vyvanse and need someone to adjust the dose.";
    const bio = "Titration reviewed on a schedule, stimulant medication started and reviewed within weeks.";
    const unrelated = "Wheelchair accessible practice with evening appointments and parking.";
    const n = embedder.embed(narrative);
    expect(cosine(n, embedder.embed(bio))).toBeGreaterThan(cosine(n, embedder.embed(unrelated)));
    expect(sharedConcepts(embedder, narrative, bio)).toEqual(expect.arrayContaining(["titration", "stimulant-medication"]));
  });

  it("refuses a dimension mismatch loudly", () => {
    expect(() => cosine([1, 0], [1, 0, 0])).toThrow(/dimension/);
  });
});

describe("M1 the concept layer", () => {
  it("has a label and at least one cue for every concept, and no two concepts share an id", () => {
    const ids = new Set(CONCEPTS.map((c) => c.id));
    expect(ids.size).toBe(CONCEPTS.length);
    for (const concept of CONCEPTS) {
      expect(concept.label.length).toBeGreaterThan(0);
      expect(concept.cues.length).toBeGreaterThan(0);
      expect(concept.weight).toBeGreaterThan(0);
    }
  });

  it("reaches the concept from a cue, and orders by weight then id", () => {
    const found = embedder.concepts("I feel embarrassed asking and I want telehealth and an adult assessment");
    expect(found).toEqual(expect.arrayContaining(["stigma", "telehealth", "adult-assessment"]));
    expect(found[0]).toBe("adult-assessment");
  });

  it("does not reach a concept from a word that is not a cue", () => {
    expect(embedder.concepts("parking and evening appointments")).toEqual([]);
  });

  it("weighs rare stems more once fitted, without changing which concepts fire", () => {
    const fitted = new LexicalEmbedder().fit(["adult assessment adults", "adult assessment titration", "adult assessment wheelchair"]);
    expect(fitted.corpusSize).toBe(3);
    const text = "adult assessment wheelchair";
    expect(fitted.concepts(text)).toEqual(embedder.concepts(text));
    expect(fitted.embed(text)).not.toEqual(embedder.embed(text));
  });
});
