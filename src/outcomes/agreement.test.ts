// W172 verify gate: "the sample is seeded and reproducible so it cannot be chosen to flatter, and
// disagreement renders with equal prominence to agreement."
//
// The first clause needs care, because seeded and reproducible does NOT by itself mean unchooseable
// — a free seed can be tried a hundred times and the flattering one kept. So the tests assert the
// stronger property the module actually implements: the seed is derived from inputs the report
// states, and there is no way to supply one.

import { describe, expect, it } from "vitest";
import * as agreement from "./agreement";
import {
  AGREEMENT_ANSWER_COPY,
  DISAGREEMENT_BASES,
  buildAgreementReport,
  renderAgreementReport,
  sampleForReview,
  type ReviewedCase,
  type SamplePeriod,
} from "./agreement";

const PERIOD: SamplePeriod = { fromIso: "2026-01-01", toIso: "2026-03-31" };
const POPULATION = Array.from({ length: 40 }, (_, i) => `case-${String(i + 1).padStart(2, "0")}`);

const reviewed = (over: Partial<ReviewedCase> & { caseId: string }): ReviewedCase => ({
  pathwayId: "path-1",
  versionHash: "hash-abcdefghijkl",
  verdict: "criteria_met",
  answer: "agreed",
  basis: null,
  note: null,
  reviewedBy: "reviewer@x.example",
  reviewedAt: "2026-04-01",
  ...over,
});

describe("W172 the sample cannot be chosen to flatter", () => {
  it("is reproducible: the same population and period draw the same cases", () => {
    const a = sampleForReview(POPULATION, PERIOD, 10);
    const b = sampleForReview(POPULATION, PERIOD, 10);
    expect(b.caseIds).toEqual(a.caseIds);
    expect(b.seed).toBe(a.seed);
  });

  it("does not depend on the order the population arrived in", () => {
    // A store query's row order is not a choice anybody made, and letting it move the sample
    // would be the order-dependence class this tree keeps finding — here with a motive attached.
    const shuffled = [...POPULATION].reverse();
    expect(sampleForReview(shuffled, PERIOD, 10).caseIds).toEqual(
      sampleForReview(POPULATION, PERIOD, 10).caseIds,
    );
  });

  it("EXPOSES NO SEED PARAMETER — the property seeding alone would not give", () => {
    // The attack reproducibility does not stop: try a hundred seeds, keep the flattering one.
    // A third argument that is a number must be the SIZE, not a seed, so the signature is pinned.
    // @ts-expect-error — there is no fourth argument to smuggle a seed through.
    void (() => sampleForReview(POPULATION, PERIOD, 10, 12345));
    for (const name of Object.keys(agreement)) {
      expect(name, `"${name}" reads as a way to choose the draw`).not.toMatch(
        /withSeed|setSeed|reseed|chooseSample|pickSample/i,
      );
    }
  });

  it("changes the seed when the period changes, and says so in the report", () => {
    // Re-rolling is possible — it is always possible — but it cannot be done invisibly.
    const other = sampleForReview(POPULATION, { fromIso: "2026-01-02", toIso: "2026-03-31" }, 10);
    const base = sampleForReview(POPULATION, PERIOD, 10);
    expect(other.seed).not.toBe(base.seed);
    expect(renderAgreementReport(buildAgreementReport(base, []))).toContain(`seed ${base.seed}`);
  });

  it("changes the fingerprint when the eligible population changes", () => {
    const narrowed = sampleForReview(POPULATION.slice(0, 30), PERIOD, 10);
    const base = sampleForReview(POPULATION, PERIOD, 10);
    expect(narrowed.populationFingerprint).not.toBe(base.populationFingerprint);
    expect(renderAgreementReport(buildAgreementReport(base, []))).toContain(
      base.populationFingerprint,
    );
  });

  it("draws without replacement, and reviews a small population in full", () => {
    const sample = sampleForReview(POPULATION, PERIOD, 10);
    expect(new Set(sample.caseIds).size).toBe(10);
    const tiny = sampleForReview(["case-a", "case-b"], PERIOD, 10);
    expect(tiny.caseIds).toEqual(["case-a", "case-b"]);
  });
});

describe("W172 a disagreement is not an error", () => {
  it("has no basis meaning the clinician or the reviewer got it wrong", () => {
    // Treating the pathway as ground truth inverts the product: the specialist is the clinical
    // authority and the pathway is a written summary of criteria.
    for (const basis of DISAGREEMENT_BASES) {
      expect(basis).not.toMatch(/wrong|error|incorrect|failure|mistake|deviation|violation/i);
    }
  });

  it("names four different findings with four different fixes", () => {
    expect([...DISAGREEMENT_BASES].sort()).toEqual([
      "criteria_too_broad",
      "criteria_too_narrow",
      "judgement_not_encodable",
      "record_incomplete",
    ]);
  });

  it("says in words that a disagreement is a finding about the pathway", () => {
    expect(AGREEMENT_ANSWER_COPY.disagreed).toContain("not a mistake by the clinician");
    expect(AGREEMENT_ANSWER_COPY.disagreed).toContain("finding about the written criteria");
  });
});

describe("W172 disagreement renders with equal prominence", () => {
  const sample = sampleForReview(POPULATION, PERIOD, 4);
  const [first, second, third, fourth] = sample.caseIds;
  const CASES = [
    reviewed({ caseId: first!, answer: "agreed" }),
    reviewed({ caseId: second!, answer: "agreed" }),
    reviewed({
      caseId: third!,
      answer: "disagreed",
      basis: "criteria_too_narrow",
      note: "Placeholder reviewer note — fixture only.",
    }),
    reviewed({ caseId: fourth!, answer: "not_reviewed", reviewedBy: null, reviewedAt: null }),
  ];
  const report = buildAgreementReport(sample, CASES);

  it("puts the disagreements FIRST, because ordering is the prominence", () => {
    // A report that led with an agreement rate and listed disagreements underneath would be
    // technically complete and read as reassurance.
    const rendered = renderAgreementReport(report);
    expect(rendered.indexOf("would have concluded otherwise")).toBeLessThan(
      rendered.indexOf("reviewer concurred"),
    );
  });

  it("gives a disagreement at least as much detail as an agreement", () => {
    const rendered = renderAgreementReport(report);
    expect(rendered).toContain("Placeholder reviewer note — fixture only.");
    expect(rendered).toContain("exclude cases the reviewer would have included");
    // Both sections carry the same per-case fields.
    expect(rendered).toContain(`**${third}**`);
    expect(rendered).toContain(`**${first}**`);
  });

  it("shows the reviewer's own words rather than summarising them", () => {
    for (const name of Object.keys(agreement)) {
      expect(name, `"${name}" reads as summarising a reviewer`).not.toMatch(/summaris|summariz|paraphras/i);
    }
  });

  it("reports counts alongside the rate rather than only a percentage", () => {
    expect(report.counts).toEqual({ agreed: 2, disagreed: 1, notReviewed: 1, noRecord: 0, total: 4 });
    const rendered = renderAgreementReport(report);
    expect(rendered).toContain("concluded otherwise (1)");
    expect(rendered).toContain("concurred (2)");
  });

  it("never truncates the disagreements", () => {
    const many = sampleForReview(POPULATION, PERIOD, 20);
    const all = many.caseIds.map((id) =>
      reviewed({ caseId: id, answer: "disagreed", basis: "criteria_too_broad" }),
    );
    const rendered = renderAgreementReport(buildAgreementReport(many, all));
    for (const id of many.caseIds) expect(rendered).toContain(`**${id}**`);
  });
});

describe("W172 an unreviewed case is not an agreement", () => {
  it("counts not_reviewed separately and says why", () => {
    // W170's rule, carried over: folding the unreviewed into the agreed would make an audit that
    // has not happened look like one that went well.
    const sample = sampleForReview(POPULATION, PERIOD, 3);
    const cases = sample.caseIds.map((id) =>
      reviewed({ caseId: id, answer: "not_reviewed", reviewedBy: null, reviewedAt: null }),
    );
    const report = buildAgreementReport(sample, cases);
    expect(report.counts).toEqual({ agreed: 0, disagreed: 0, notReviewed: 3, noRecord: 0, total: 3 });
    expect(report.basis).toContain("not an agreement");
    expect(AGREEMENT_ANSWER_COPY.not_reviewed).toContain("not agreement");
  });

  it("says plainly when everything sampled has been reviewed", () => {
    const sample = sampleForReview(POPULATION, PERIOD, 2);
    const cases = sample.caseIds.map((id) => reviewed({ caseId: id }));
    expect(buildAgreementReport(sample, cases).basis).toContain("have been reviewed");
  });

  it("counts only cases that are in the sample", () => {
    // A case reviewed outside the draw does not join the numbers — that would be the
    // cherry-picking the sampling exists to prevent, arriving by the back door.
    const sample = sampleForReview(POPULATION, PERIOD, 2);
    const report = buildAgreementReport(sample, [
      ...sample.caseIds.map((id) => reviewed({ caseId: id })),
      reviewed({ caseId: "case-not-drawn", answer: "agreed" }),
    ]);
    expect(report.counts.total).toBe(2);
  });
});

describe("W181 a sampled case with no record is counted, not dropped", () => {
  const sample = {
    period: { fromIso: "2026-03-01", toIso: "2026-03-31" },
    caseIds: ["c-1", "c-2", "c-3", "c-4", "c-5"],
    populationSize: 40,
    populationFingerprint: "fp-1",
    seed: 1234,
  };

  it("keeps the denominator at the SAMPLE size, not the number of records filed", () => {
    // The defect: sampled ids with no matching record were filtered away, so `total` became
    // "cases someone happened to file". A sample of five with one review reported on one.
    const report = buildAgreementReport(sample, []);
    expect(report.counts.total).toBe(5);
    expect(report.counts.noRecord).toBe(5);
  });

  it("never claims a sample was fully reviewed when nothing was", () => {
    // The rendered contradiction this produced: "Sampled 5 of 40" above "All 0 sampled case(s)
    // have been reviewed" — the reassuring sentence computed over exactly the cases that could
    // not contradict it.
    const report = buildAgreementReport(sample, []);
    expect(report.basis).not.toContain("All 0");
    expect(report.basis).toContain("no review recorded");
    expect(renderAgreementReport(report)).not.toMatch(/All \d+ sampled case\(s\) have been reviewed/);
  });

  it("separates never-opened from opened-and-unanswerable, which ask different people", () => {
    // Both are absences and both must be visible, but one needs a reviewer assigned and the
    // other is a finding about the case. One word for both sends the reader after the wrong one.
    const opened = {
      caseId: "c-1",
      pathwayId: "path-1",
      versionHash: "hash-abcdefghijkl",
      verdict: "eligible",
      answer: "not_reviewed" as const,
      basis: null,
      note: null,
      reviewedBy: "reviewer@example.test",
      reviewedAt: "2026-03-10",
    };
    const report = buildAgreementReport(sample, [opened]);
    expect(report.counts.notReviewed).toBe(1);
    expect(report.counts.noRecord).toBe(4);
    expect(report.counts.total).toBe(5);
    expect(report.basis).toContain("no review recorded");
    expect(report.basis).toContain("could not be answered");
  });

  it("still says all reviewed when every sampled case really has an answer", () => {
    const cases = sample.caseIds.map((caseId) => ({
      caseId,
      pathwayId: "path-1",
      versionHash: "hash-abcdefghijkl",
      verdict: "eligible",
      answer: "agreed" as const,
      basis: null,
      note: null,
      reviewedBy: "reviewer@example.test",
      reviewedAt: "2026-03-10",
    }));
    const report = buildAgreementReport(sample, cases);
    expect(report.counts).toEqual({ agreed: 5, disagreed: 0, notReviewed: 0, noRecord: 0, total: 5 });
    expect(report.basis).toBe("All 5 sampled case(s) have been reviewed.");
  });
});
