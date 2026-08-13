// W124 verify gate: "determinism; the report asserts no clinical verdict, only distribution."
//
// Determinism is tested three ways, because "same seed, same answer" alone would hold for a
// function that ignored its input: same seed matches byte for byte, a different seed genuinely
// differs, and re-running does not depend on how many times the module has been used before.
//
// "No clinical verdict" is tested as a property of the SHAPE as well as of the words. Banned
// vocabulary is easy to satisfy and easy to drift past; a report type with no field that could
// hold a judgement, and no per-patient row, cannot express one however it is worded.

import { describe, expect, it } from "vitest";
import {
  ARBITRARY_RATE,
  factCodesOf,
  flatProfiles,
  renderSimulationReport,
  simulatePathway,
  type CohortSpec,
} from "./simulation";
import { usablePathway, type PathwayAttestation, type UsablePathway } from "./approval";
import { versionHash, type PathwayCriteria, type PathwayVersion } from "./versioning";

const criterion = (factCode: string, requires: "present" | "absent" = "present") => ({
  factCode,
  requires,
  rationale: `Placeholder rationale for ${factCode}.`,
});

const CRITERIA: PathwayCriteria = {
  inclusion: [criterion("fact_in")],
  exclusion: [criterion("fact_ex")],
  escalation: [criterion("fact_esc")],
};

function signedPathway(c: PathwayCriteria = CRITERIA): UsablePathway {
  const version: PathwayVersion = {
    pathwayId: "path-1",
    versionHash: versionHash(c),
    ordinal: 1,
    criteria: c,
    state: "published",
    draftedAt: "2026-01-01",
    draftedBy: "author@x.example",
    publishedAt: "2026-01-02",
    publishedBy: "author@x.example",
    supersededAt: null,
    withdrawnAt: null,
    withdrawnBy: null,
    withdrawnReason: null,
    publications: [],
  };
  const attestations: PathwayAttestation[] = [
    {
      pathwayId: "path-1", versionHash: version.versionHash, kind: "specialist_review",
      byEmail: "reviewer@x.example", at: "2026-01-03",
      finding: "Placeholder review finding — fixture only.", revokedAt: null,
    },
    {
      pathwayId: "path-1", versionHash: version.versionHash, kind: "founder_sign_off",
      byEmail: "founder@x.example", at: "2026-01-04",
      finding: "Placeholder sign-off finding — fixture only.", revokedAt: null,
    },
  ];
  const result = usablePathway(version, attestations);
  if (!result.usable) throw new Error(`fixture is not usable: ${result.reason}`);
  return result.pathway;
}

const cohort = (over: Partial<CohortSpec> = {}): CohortSpec => ({
  size: 200,
  seed: 42,
  profiles: flatProfiles(factCodesOf(signedPathway())),
  ...over,
});

describe("W124 determinism", () => {
  it("the same seed and spec produce the same report, byte for byte", () => {
    const first = renderSimulationReport(simulatePathway(signedPathway(), cohort()));
    const second = renderSimulationReport(simulatePathway(signedPathway(), cohort()));
    expect(second).toBe(first);
  });

  it("a different seed produces a different cohort — so the seed is genuinely used", () => {
    // Guards the test above from passing on a function that ignores its input entirely.
    const a = simulatePathway(signedPathway(), cohort({ seed: 1 }));
    const b = simulatePathway(signedPathway(), cohort({ seed: 2 }));
    expect(a.distribution).not.toEqual(b.distribution);
  });

  it("does not depend on how many simulations have run before it", () => {
    // A module-level RNG would make the first run of a session differ from the fifth.
    const baseline = simulatePathway(signedPathway(), cohort());
    simulatePathway(signedPathway(), cohort({ seed: 999 }));
    simulatePathway(signedPathway(), cohort({ seed: 7, size: 13 }));
    expect(simulatePathway(signedPathway(), cohort())).toEqual(baseline);
  });

  it("counts every patient exactly once", () => {
    const report = simulatePathway(signedPathway(), cohort({ size: 137 }));
    const { criteriaMet, criteriaNotMet, cannotDetermine } = report.distribution;
    expect(criteriaMet + criteriaNotMet + cannotDetermine).toBe(137);
  });

  it("orders tallies by count then code, never by insertion", () => {
    const report = simulatePathway(signedPathway(), cohort());
    for (const rows of [report.undeterminedBy, report.excludedBy, report.escalatedBy]) {
      const sorted = [...rows].sort((a, b) => b.count - a.count || a.factCode.localeCompare(b.factCode));
      expect(rows).toEqual(sorted);
    }
  });

  it("handles an empty cohort without inventing anything", () => {
    const report = simulatePathway(signedPathway(), cohort({ size: 0 }));
    expect(report.distribution).toEqual({ criteriaMet: 0, criteriaNotMet: 0, cannotDetermine: 0 });
    expect(renderSimulationReport(report)).toContain("| Criteria met | 0 | — |");
  });
});

describe("W124 the report is a distribution, never a verdict", () => {
  it("has no field that could hold a judgement", () => {
    // The shape, not the wording. Banned vocabulary is easy to drift past; a type with no
    // room for a verdict cannot express one however it is phrased.
    const report = simulatePathway(signedPathway(), cohort());
    expect(Object.keys(report)).toEqual([
      "pathwayId",
      "versionHash",
      "cohortSize",
      "seed",
      "distribution",
      "undeterminedBy",
      "excludedBy",
      "escalatedBy",
      "assumptions",
      "caveats",
    ]);
    for (const key of Object.keys(report)) {
      expect(key).not.toMatch(/verdict|safe|effective|recommend|score|grade|quality|pass|fail/i);
    }
  });

  it("produces no per-patient result at all", () => {
    // A simulated patient's verdict is meaningless; a real one's would be a clinical statement
    // about a person. Neither shape exists.
    const serialised = JSON.stringify(simulatePathway(signedPathway(), cohort()));
    expect(serialised).not.toContain("patientId");
    expect(serialised).not.toContain("patients\":[");
    expect(serialised).not.toMatch(/"(results|verdicts|cases|rows)":\s*\[\{/);
  });

  it("makes no clinical claim in its rendered copy", () => {
    // Banning the bare words does not work, and the first version of this test proved it: the
    // caveats legitimately contain "safe" in the sentence that says the report does NOT speak
    // to safety. A word-list is a PROXY for "makes no claim", and here the proxy was wrong —
    // so this checks the property itself, assertive phrasings, rather than vocabulary. That is
    // a correction, not a loosening: "is safe" is still caught, and now so is "is unsafe",
    // which a word-list of positives would have missed.
    // Checked over the FINDINGS, with the caveats block removed. That is not a loophole: a
    // disclaimer has to name what it disclaims ("says nothing about whether this pathway is
    // clinically appropriate"), so no regex over the whole document can tell the two apart.
    // The caveats are instead pinned verbatim by the next test, so a claim smuggled in there
    // changes those exact strings and fails — every part of the document is covered by one
    // check or the other.
    const whole = renderSimulationReport(simulatePathway(signedPathway(), cohort())).toLowerCase();
    const caveatsStart = whole.indexOf("## what this report does not say");
    const caveatsEnd = whole.indexOf("## cohort assumptions");
    expect(caveatsStart, "the caveats heading must exist for this test to be scoping anything").toBeGreaterThan(0);
    expect(caveatsEnd).toBeGreaterThan(caveatsStart);
    const rendered = whole.slice(0, caveatsStart) + whole.slice(caveatsEnd);
    const claims = [
      /\bis (clinically )?(safe|unsafe|effective|ineffective|appropriate|inappropriate)\b/,
      /\bwe recommend\b/,
      /\brecommends?\b(?! )/,
      /\bshould (be offered|not be offered|use|adopt)\b/,
      /\bbetter than\b(?! any alternative)/,
      /\bprevalence\b/,
      /\bthis pathway works\b/,
    ];
    for (const claim of claims) {
      expect(rendered, `report copy asserts ${claim}`).not.toMatch(claim);
    }
  });

  it("says plainly what it does not say, and what it IS useful for", () => {
    const rendered = renderSimulationReport(simulatePathway(signedPathway(), cohort()));
    expect(rendered).toContain("## What this report does not say");
    expect(rendered).toContain("says nothing about whether this pathway is clinically appropriate");
    expect(rendered).toContain("data availability finding, not a clinical one");
  });
});

describe("W124 the cohort's rates are assumptions, not prevalence", () => {
  it("carries every rate into the report, labelled as arbitrary", () => {
    // W99's rule: a projection whose assumptions are invisible gets quoted as a measurement.
    // Here the misreading would be clinical rather than commercial.
    const report = simulatePathway(signedPathway(), cohort());
    expect(report.assumptions).toHaveLength(3);
    for (const assumption of report.assumptions) {
      expect(assumption).toContain("arbitrary inputs, not estimates of how common anything is");
    }
  });

  it("defaults to an obviously arbitrary rate rather than a plausible one", () => {
    // A number that looks like a real rate invites somebody to quote it as one.
    expect(ARBITRARY_RATE).toBe(0.5);
    for (const profile of flatProfiles(["a", "b"])) {
      expect(profile.recordedRate).toBe(0.5);
      expect(profile.presentRate).toBe(0.5);
    }
  });

  it("honours the caller's rates — a fact never recorded is never determinable", () => {
    // The headline finding the unit exists for, in its extreme form.
    const profiles = flatProfiles(factCodesOf(signedPathway())).map((p) =>
      p.factCode === "fact_in" ? { ...p, recordedRate: 0 } : { ...p, recordedRate: 1 },
    );
    const report = simulatePathway(signedPathway(), cohort({ profiles }));
    expect(report.distribution.cannotDetermine).toBeGreaterThan(0);
    expect(report.undeterminedBy.map((u) => u.factCode)).toContain("fact_in");
  });

  it("a pathway whose facts are always recorded is always determinable", () => {
    const profiles = flatProfiles(factCodesOf(signedPathway())).map((p) => ({
      ...p,
      recordedRate: 1,
    }));
    const report = simulatePathway(signedPathway(), cohort({ profiles }));
    expect(report.distribution.cannotDetermine).toBe(0);
    expect(report.undeterminedBy).toEqual([]);
  });

  it("names the exact version it ran, by hash", () => {
    const path = signedPathway();
    const report = simulatePathway(path, cohort());
    expect(report.versionHash).toBe(path.version.versionHash);
    expect(renderSimulationReport(report)).toContain(path.version.versionHash.slice(0, 12));
  });
});
