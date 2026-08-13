// W196 verify gate: every figure traces to a recorded fact; no figure identifies a patient;
// aggregation floors are declared as data, not chosen per report.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as mod from "./model";
import {
  AGGREGATION_FLOORS,
  ALL_FIGURE_KINDS,
  FIGURE_REFUSAL_COPY,
  type FigureKind,
  REFUSED_FIGURES,
  SHIPPED_DISCLOSURES,
  type RecordedBasis,
  figure,
} from "./model";

const basis = (over: Partial<RecordedBasis> = {}): RecordedBasis => ({
  source: "src/referrals/store.ts",
  recordedFacts: 40,
  fromIso: "2026-04-01",
  toIso: "2026-06-30",
  ...over,
});

describe("W196 every figure traces to a recorded fact", () => {
  it("carries the basis it was counted over, not just the number", () => {
    const result = figure("referrals_written", 12, basis());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.figure.basis.recordedFacts).toBe(40);
    expect(result.figure.basis.source).toBe("src/referrals/store.ts");
    expect(result.figure.basis.fromIso).toBe("2026-04-01");
  });

  it("refuses a figure over no records rather than reporting zero", () => {
    // The most dangerous number this module could emit. "0 referrals completed" and "we have no
    // record of any referral completing" are the same digit and opposite claims, and only one is
    // true of a young rail.
    const result = figure("referrals_with_recorded_completion", 0, basis({ recordedFacts: 0 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("nothing_recorded");
    expect(FIGURE_REFUSAL_COPY.nothing_recorded).toContain("This is not zero");
  });

  it("refuses a figure larger than the records it was computed from", () => {
    const result = figure("referrals_written", 41, basis({ recordedFacts: 40 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("value_exceeds_basis");
  });

  it("refuses a basis with no source or no readable period", () => {
    const result = figure("register_membership", 9, basis({ source: " ", fromIso: "2026-07-01", toIso: "2026-04-01" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.sort()).toEqual(["period_missing_or_unreadable", "source_missing"]);
  });

  it("returns every problem rather than the first", () => {
    const result = figure("care_gaps_detected", 3, basis({ source: "", recordedFacts: 0, toIso: "nope" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(2);
  });

  it("explains every refusal it can give", () => {
    for (const reason of Object.keys(FIGURE_REFUSAL_COPY)) {
      expect(FIGURE_REFUSAL_COPY[reason as keyof typeof FIGURE_REFUSAL_COPY].length).toBeGreaterThan(40);
    }
  });
});

describe("W196 no figure identifies a patient", () => {
  it("has nowhere to put one", () => {
    // Not a filter and not a scrub: a Figure is a kind, a count and a basis. Asserted on the real
    // value's keys, so a field added to the type fails here.
    const result = figure("register_membership", 22, basis());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.figure).sort()).toEqual(["basis", "floor", "kind", "value"]);
    expect(Object.keys(result.figure.basis).sort()).toEqual([
      "fromIso",
      "recordedFacts",
      "source",
      "toIso",
    ]);
  });

  it("names no patient anywhere in the module", () => {
    // Structural. The word appears only in refusals explaining what is not reported, so any
    // occurrence outside REFUSED_FIGURES' text would be a field or an argument.
    const source = readFileSync(path.join(__dirname, "model.ts"), "utf8");
    expect(source).not.toMatch(/patientId|PatientId/);
    expect(JSON.stringify(figure("register_membership", 22, basis()))).not.toMatch(/patient/i);
  });

  it("refuses the figures that would re-identify, each with a reason", () => {
    for (const [kind, why] of Object.entries(REFUSED_FIGURES)) {
      expect(why.length, `${kind} is refused without a reason`).toBeGreaterThan(80);
      expect(ALL_FIGURE_KINDS as string[], `${kind} is both offered and refused`).not.toContain(kind);
    }
    expect(Object.keys(REFUSED_FIGURES)).toContain("per_clinician_anything");
    expect(Object.keys(REFUSED_FIGURES)).toContain("completion_rate");
    expect(Object.keys(REFUSED_FIGURES)).toContain("patient_demographics");
  });

  it("offers no rate, score or per-clinician kind", () => {
    for (const kind of ALL_FIGURE_KINDS) {
      expect(kind, `${kind} is a derived figure rather than a count`).not.toMatch(
        /rate|percent|score|ratio|per_clinician|average/i,
      );
    }
  });
});

describe("W196 the aggregation floor is declared data, not an argument", () => {
  it("declares a floor for every kind, both directions", () => {
    expect(Object.keys(AGGREGATION_FLOORS).sort()).toEqual([...ALL_FIGURE_KINDS].sort());
    for (const kind of ALL_FIGURE_KINDS) {
      const declared = AGGREGATION_FLOORS[kind];
      expect(declared.floor, `${kind} has no meaningful floor`).toBeGreaterThan(1);
      expect(declared.why.length, `${kind}'s floor has no reason`).toBeGreaterThan(80);
    }
  });

  it("takes no floor argument, so none can be chosen after seeing the data", () => {
    // The unit's point. A floor passed per report is a floor somebody tunes — compute the cell,
    // see it is 3, pick 3 — and the tuning is undetectable afterwards because the report carries
    // the number rather than the decision. `figure` has arity 3 and none of them is a threshold.
    expect(figure.length).toBe(3);
    const source = readFileSync(path.join(__dirname, "model.ts"), "utf8");
    expect(source).not.toMatch(/function figure\([^)]*floor/);
    expect(source).not.toMatch(/floor\??\s*:\s*number\s*[,)]/);
  });

  it("stamps the declared floor onto the figure, so the report carries it", () => {
    for (const kind of ALL_FIGURE_KINDS) {
      const result = figure(kind, 7, basis());
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.figure.floor).toBe(AGGREGATION_FLOORS[kind].floor);
    }
  });

  it("gives the paired referral figures the same floor, so they cannot be differenced", () => {
    // Two counts over the same population, reported together. A lower floor on one would let a
    // reader subtract and recover the cell the other floor was protecting.
    expect(AGGREGATION_FLOORS.referrals_written.floor).toBe(
      AGGREGATION_FLOORS.referrals_with_recorded_completion.floor,
    );
    expect(AGGREGATION_FLOORS.referrals_with_recorded_completion.why).toMatch(/differenced/);
  });

  it("declares but does not apply — suppression is W197's unit", () => {
    // The split is deliberate: the number that decides whether a cohort is publishable should not
    // be authored in the same place as the logic that lets it through. A figure below its floor is
    // still BUILT here, carrying the floor, for W197 to act on.
    const small = figure("register_membership", 2, basis({ recordedFacts: 30 }));
    expect(small.ok).toBe(true);
    if (!small.ok) return;
    expect(small.figure.value).toBeLessThan(small.figure.floor);
    for (const name of Object.keys(mod)) {
      expect(name, `${name} looks like suppression, which is W197`).not.toMatch(/suppress|redact|mask/i);
    }
  });
});

describe("W196 nothing is disclosed while G9 is unratified", () => {
  it("ships an empty disclosure set, pinned", () => {
    // Same posture as W183's profiles under G6 and the pathway registries under G5: the model can
    // exist before the ruling, the disclosure cannot.
    expect(SHIPPED_DISCLOSURES).toEqual([]);
  });

  it("says the floors are a proposal rather than a ruling", () => {
    const source = readFileSync(path.join(__dirname, "model.ts"), "utf8");
    expect(source).toMatch(/proposal, not a ruling/);
    expect(source).toMatch(/G9 is unratified/);
  });
});
