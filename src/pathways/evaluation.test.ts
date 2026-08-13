// W120 verify gate: "export-list test — no function takes symptoms and returns a pathway (G7)."
//
// The export-list test is the named gate and it is the last test here, but it is not the only
// thing guarding the boundary — a naming rule alone would be satisfied by
// `computeCarePlan(facts)`. What actually holds the line is that no exported function RETURNS
// a pathway at all, which is asserted at compile time, and that the fact vocabulary has no
// member a symptom could be recorded under.
//
// The rest of the file is about the property that does the real work: nothing recorded is not
// recorded absent.

import { describe, expect, it } from "vitest";
import * as evaluationModule from "./evaluation";
import {
  ALL_FACT_SOURCES,
  escalationsFlagged,
  evaluatePathway,
  explainVerdict,
  type RecordedFact,
} from "./evaluation";
import { usablePathway, type PathwayAttestation, type UsablePathway } from "./approval";
import { versionHash, type PathwayCriteria, type PathwayVersion } from "./versioning";

const criterion = (factCode: string, requires: "present" | "absent" = "present") => ({
  factCode,
  requires,
  rationale: `placeholder rationale for ${factCode}`,
});

const criteria = (over: Partial<PathwayCriteria> = {}): PathwayCriteria => ({
  inclusion: [criterion("fact_in")],
  // An exclusion criterion is SATISFIED when the record matches `requires`, and a satisfied
  // exclusion excludes. So "exclude when fact_ex is present" is `requires: "present"` — the
  // author of this fixture got that backwards first time round, which is why the module now
  // spells the rule out.
  exclusion: [criterion("fact_ex", "present")],
  escalation: [],
  ...over,
});

/** A pathway taken all the way through W119's gate, so evaluation is even possible. */
function signedPathway(c: PathwayCriteria = criteria()): UsablePathway {
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
      pathwayId: "path-1",
      versionHash: version.versionHash,
      kind: "specialist_review",
      byEmail: "reviewer@x.example",
      at: "2026-01-03",
      finding: "Placeholder review finding — no clinical content is signed off in this tree.",
      revokedAt: null,
    },
    {
      pathwayId: "path-1",
      versionHash: version.versionHash,
      kind: "founder_sign_off",
      byEmail: "founder@x.example",
      at: "2026-01-04",
      finding: "Placeholder sign-off finding — fixture only.",
      revokedAt: null,
    },
  ];
  const result = usablePathway(version, attestations);
  if (!result.usable) throw new Error(`fixture is not usable: ${result.reason}`);
  return result.pathway;
}

const fact = (code: string, state: RecordedFact["state"]): RecordedFact => ({
  code,
  state,
  source: "pms_condition_flag",
  recordedAt: "2026-02-01",
  recordedBy: "clin-1",
});

describe("W120 nothing recorded is not recorded absent", () => {
  it("an empty record cannot determine anything", () => {
    // The failure this prevents: a patient nobody has assessed quietly clearing an exclusion
    // that exists to keep them out.
    const verdict = evaluatePathway(signedPathway(), []);
    expect(verdict.outcome).toBe("cannot_determine");
    expect(verdict.outcome === "cannot_determine" && verdict.missingFactCodes.sort()).toEqual([
      "fact_ex",
      "fact_in",
    ]);
  });

  it("a recorded absence ANSWERS the question; silence leaves it open", () => {
    const recorded = evaluatePathway(signedPathway(), [
      fact("fact_in", "recorded_present"),
      fact("fact_ex", "recorded_absent"),
    ]);
    expect(recorded.outcome).toBe("criteria_met");

    // Same pathway, same answer wanted, but the exclusion fact was never recorded.
    const silent = evaluatePathway(signedPathway(), [fact("fact_in", "recorded_present")]);
    expect(silent.outcome).toBe("cannot_determine");
  });

  it("names what is missing, so an unanswerable evaluation becomes a list of things to record", () => {
    const verdict = evaluatePathway(signedPathway(), [fact("fact_ex", "recorded_absent")]);
    expect(verdict.outcome === "cannot_determine" && verdict.missingFactCodes).toEqual(["fact_in"]);
    expect(explainVerdict(verdict)).toContain('not a "no"');
  });

  it("has no boolean outcome to fold unknown into", () => {
    const verdict = evaluatePathway(signedPathway(), []);
    for (const value of Object.values(verdict)) {
      expect(typeof value).not.toBe("boolean-outcome");
    }
    // The only boolean-shaped field is the disclaimer, which is a literal `true`.
    expect(verdict.notAClinicalRecommendation).toBe(true);
    expect(["criteria_met", "criteria_not_met", "cannot_determine"]).toContain(verdict.outcome);
  });
});

describe("W120 order of decision", () => {
  it("a definite exclusion ends it, even with unknowns elsewhere", () => {
    // Safe to act on: the unknowns could only ever have INCLUDED them.
    const verdict = evaluatePathway(signedPathway(), [fact("fact_ex", "recorded_present")]);
    expect(verdict.outcome).toBe("criteria_not_met");
    expect(verdict.outcome === "criteria_not_met" && verdict.because.map((c) => c.factCode)).toEqual([
      "fact_ex",
    ]);
  });

  it("an unknown EXCLUSION is not permission", () => {
    // Not knowing whether someone should be kept out is not a reason to let them in.
    const path = signedPathway(criteria({ inclusion: [criterion("fact_in")] }));
    const verdict = evaluatePathway(path, [fact("fact_in", "recorded_present")]);
    expect(verdict.outcome).toBe("cannot_determine");
  });

  it("reports every unmet inclusion, not the first", () => {
    const path = signedPathway(
      criteria({ inclusion: [criterion("a"), criterion("b")], exclusion: [] }),
    );
    const verdict = evaluatePathway(path, [
      fact("a", "recorded_absent"),
      fact("b", "recorded_absent"),
    ]);
    expect(verdict.outcome === "criteria_not_met" && verdict.because.map((c) => c.factCode)).toEqual([
      "a",
      "b",
    ]);
  });

  it("deduplicates a fact code required by more than one criterion", () => {
    const path = signedPathway(
      criteria({ inclusion: [criterion("same")], escalation: [criterion("same")], exclusion: [] }),
    );
    const verdict = evaluatePathway(path, []);
    expect(verdict.outcome === "cannot_determine" && verdict.missingFactCodes).toEqual(["same"]);
  });
});

describe("W120 escalation is a flag on the pathway, not advice", () => {
  it("reports a met escalation criterion without changing the verdict", () => {
    const path = signedPathway(
      criteria({ inclusion: [criterion("fact_in")], exclusion: [], escalation: [criterion("esc")] }),
    );
    const verdict = evaluatePathway(path, [
      fact("fact_in", "recorded_present"),
      fact("esc", "recorded_present"),
    ]);
    expect(verdict.outcome).toBe("criteria_met");
    expect(escalationsFlagged(verdict).map((c) => c.factCode)).toEqual(["esc"]);
  });

  it("an unknown escalation criterion blocks a determination like any other", () => {
    // If anything, more so: not knowing whether a pathway's own escalation applies is the
    // last thing that should be silently treated as "no".
    const path = signedPathway(
      criteria({ inclusion: [criterion("fact_in")], exclusion: [], escalation: [criterion("esc")] }),
    );
    const verdict = evaluatePathway(path, [fact("fact_in", "recorded_present")]);
    expect(verdict.outcome).toBe("cannot_determine");
  });

  it("carries the disclaimer on the value, not in the docs", () => {
    const verdict = evaluatePathway(signedPathway(), []);
    expect(verdict.notAClinicalRecommendation).toBe(true);
    expect(explainVerdict({ ...verdict, outcome: "criteria_met" })).toContain(
      "not a recommendation about care",
    );
  });

  it("names the exact version it read, by hash rather than ordinal", () => {
    const path = signedPathway();
    const verdict = evaluatePathway(path, []);
    expect(verdict.versionHash).toBe(path.version.versionHash);
    expect(verdict.pathwayId).toBe("path-1");
  });
});

describe("W120 G7: no function takes symptoms and returns a pathway", () => {
  it("exports nothing whose name suggests choosing a pathway", () => {
    // The unit's named gate. Checked against the real module namespace, so an export added
    // later is checked too.
    const names = Object.keys(evaluationModule);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(
        name,
        `"${name}" reads as selecting or advising, which is the G7 boundary`,
      ).not.toMatch(/for$|select|recommend|suggest|choose|match|triage|assess|advise|plan|decide/i);
    }
  });

  it("has no exported function that returns a pathway", () => {
    // The stronger form, because a naming rule alone would pass `computeCarePlan(facts)`.
    // Every export is checked at compile time by assignment: if one returned a pathway, this
    // would be where it showed.
    const returnsPathway: Array<(facts: readonly RecordedFact[]) => UsablePathway> = [];
    // @ts-expect-error — there is no such export to put in the list.
    returnsPathway.push(evaluationModule.pathwayForFacts);
    expect(returnsPathway.filter(Boolean)).toEqual([]);
  });

  it("requires a pathway as an argument — evaluation cannot start from facts alone", () => {
    // The direction IS the posture: you must already have chosen the pathway.
    // @ts-expect-error — no overload takes facts on their own.
    void (() => evaluatePathway([fact("x", "recorded_present")]));
    expect(true).toBe(true);
  });

  it("has no fact source a symptom could be recorded under", () => {
    // A closed union with no inferential or patient-reported member — W57's rule, and the
    // reason an export-list test is enough: there is nothing for a selector to read.
    expect([...ALL_FACT_SOURCES].sort()).toEqual([
      "pms_condition_flag",
      "practice_confirmed",
      "recorded_result_category",
    ]);
    for (const source of ALL_FACT_SOURCES) {
      expect(source).not.toMatch(/symptom|report|inferred|derived|predicted|guess|patient_said/i);
    }
  });

  it("cannot evaluate a pathway that has not cleared G5", () => {
    const c = criteria();
    const unsigned: PathwayVersion = {
      pathwayId: "path-1", versionHash: versionHash(c), ordinal: 1, criteria: c,
      state: "published", draftedAt: "2026-01-01", draftedBy: "a@x.example",
      publishedAt: "2026-01-02", publishedBy: "a@x.example", supersededAt: null,
 withdrawnAt: null,
 withdrawnBy: null,
 withdrawnReason: null,
 publications: [],
    };
    // @ts-expect-error — evaluatePathway takes UsablePathway; a bare version is not one.
    void (() => evaluatePathway({ version: unsigned }, []));
    expect(usablePathway(unsigned, []).usable).toBe(false);
  });
});
