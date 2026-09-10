// M4 verify gate: feedback aggregates to counts and means, the patient-facing sentence is a
// count with a floor (no share of three), and the learning loop is bounded, refuses to learn
// from too few records, and keeps the weights summing to one.

import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import { MAX_SHIFT, MIN_SAMPLES, aggregateFeedback, feedbackForGP, feltUnderstoodCopy, learnWeights, learningSamples, type LearningSample } from "./feedback";
import { PATIENT_WEIGHTS } from "./ranking";
import type { Feedback, Match, Rating } from "./types";

const record = (id: string, matchId: string, fit: Rating, from: Feedback["from"] = "patient"): Feedback => ({
  id,
  matchId,
  from,
  patientRating: from === "patient" ? { fit, communication: fit, clinicalAppropriateness: 4 } : null,
  gpRating: from === "gp" ? { clinicalAppropriateness: fit, capacityFit: 3 } : null,
  freeTextFeedback: "",
  createdAt: "2026-09-09T00:00:00.000Z",
});

const match = (id: string, gpId: string, similarity: number): Match => ({
  id,
  patientId: `p-${id}`,
  gpId,
  patientRankScore: similarity,
  gpRankScore: 0.5,
  similarity,
  position: 1,
  matchStatus: "completed",
  rationale: { headline: "", points: [], sharedConcepts: [] },
  patientBreakdown: [
    { criterion: "similarity", weight: 0.5, raw: similarity, weighted: similarity * 0.5, sentence: "" },
    { criterion: "capacity", weight: 0.15, raw: 0.5, weighted: 0.075, sentence: "" },
    { criterion: "communication", weight: 0.15, raw: 1 - similarity, weighted: (1 - similarity) * 0.15, sentence: "" },
    { criterion: "consultStyle", weight: 0.1, raw: 1, weighted: 0.1, sentence: "" },
    { criterion: "proximity", weight: 0.1, raw: 0.5, weighted: 0.05, sentence: "" },
  ],
  createdAt: "2026-09-09T00:00:00.000Z",
  decidedAt: null,
  declineReason: null,
});

describe("M4 aggregation", () => {
  it("is null with nothing to count", () => expect(aggregateFeedback([])).toBeNull());

  it("counts both sides and computes the shares from the right side", () => {
    const agg = aggregateFeedback([record("f1", "m1", 5), record("f2", "m2", 2), record("f3", "m3", 4), record("g1", "m1", 5, "gp"), record("g2", "m2", 2, "gp")])!;
    expect(agg.count).toBe(5);
    expect(agg.patientCount).toBe(3);
    expect(agg.gpCount).toBe(2);
    expect(agg.feltUnderstoodShare).toBeCloseTo(2 / 3, 3);
    expect(agg.gpAppropriateShare).toBe(0.5);
    expect(agg.communicationMean).toBeCloseTo(11 / 3, 3);
  });

  it("selects a GP's records through the matches, never by GP id on the record", () => {
    const matches = [match("m1", "gp-a", 0.5), match("m2", "gp-b", 0.5)];
    const records = [record("f1", "m1", 5), record("f2", "m2", 1)];
    expect(feedbackForGP("gp-a", matches, records).map((r) => r.id)).toEqual(["f1"]);
  });
});

describe("M4 the one sentence a patient may read", () => {
  it("says nothing below five patient records", () => {
    expect(feltUnderstoodCopy(aggregateFeedback([record("f1", "m1", 5), record("f2", "m2", 5), record("f3", "m3", 5), record("f4", "m4", 5)]))).toBeNull();
  });

  it("is a count, not a score, and passes the landing linter", () => {
    const copy = feltUnderstoodCopy(aggregateFeedback(Array.from({ length: 7 }, (_, i) => record(`f${i}`, `m${i}`, i < 5 ? 5 : 2))))!;
    expect(copy).toBe("Of 7 people matched here who told us how it went, 5 said they felt understood.");
    expect(lintLandingCopy(copy)).toEqual([]);
  });
});

describe("M4 the learning loop", () => {
  const sample = (similarity: number, fit: Rating): LearningSample => ({ breakdown: match("x", "gp", similarity).patientBreakdown, fit });

  it("refuses to move the weights below the sample floor, and says so", () => {
    const learned = learnWeights(Array.from({ length: MIN_SAMPLES - 1 }, () => sample(0.9, 5)));
    expect(learned.weights).toEqual(PATIENT_WEIGHTS);
    expect(learned.note).toMatch(new RegExp(`${MIN_SAMPLES - 1} of the ${MIN_SAMPLES}`));
  });

  it("moves toward the criterion that predicted fit, bounded, and still sums to one", () => {
    // Similarity tracks fit; communication anti-tracks it (raw = 1 - similarity).
    const samples = [0.9, 0.85, 0.8, 0.75, 0.3, 0.25, 0.2, 0.15, 0.6, 0.5].map((s, i) => sample(s, (s > 0.5 ? 5 : i % 2 === 0 ? 2 : 1) as Rating));
    const learned = learnWeights(samples);
    expect(learned.learnedFrom).toBe(10);
    expect(learned.weights.similarity).toBeGreaterThan(PATIENT_WEIGHTS.similarity);
    expect(learned.weights.communication).toBeLessThan(PATIENT_WEIGHTS.communication);
    expect(Object.values(learned.weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 2);
    for (const c of Object.keys(PATIENT_WEIGHTS) as (keyof typeof PATIENT_WEIGHTS)[]) {
      const ratio = learned.weights[c] / PATIENT_WEIGHTS[c];
      expect(ratio).toBeGreaterThan(1 - MAX_SHIFT - 0.2);
      expect(ratio).toBeLessThan(1 + MAX_SHIFT + 0.2);
    }
    expect(learned.evidence.similarity).toBeGreaterThan(0);
  });

  it("leaves a criterion alone when its raw never varies", () => {
    const learned = learnWeights(Array.from({ length: 12 }, (_, i) => sample(0.5, ((i % 5) + 1) as Rating)));
    expect(learned.evidence.consultStyle).toBe(0);
  });

  it("joins matches to patient-side records, dropping GP-side and orphaned ones", () => {
    const samples = learningSamples([match("m1", "gp", 0.4)], [record("f1", "m1", 4), record("g1", "m1", 5, "gp"), record("f2", "missing", 3)]);
    expect(samples.length).toBe(1);
    expect(samples[0]!.fit).toBe(4);
  });
});
