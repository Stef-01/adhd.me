// W215 verify gate: "the holdout arm is the only comparator; no model-based counterfactual
// exists as a function; the figure refuses over a cohort below W72's floors."
//
// All three are absences, and absences need a different kind of test from behaviours. The
// comparator is checked as a union's membership; the model is checked on the namespace AND on
// every exported signature, because a modelling function can be named innocently; the floor is
// checked at the boundary from both sides, because a floor tested only from far below passes
// with an off-by-one that only ever fires on real data.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as counterfactualModule from "./counterfactual";
import {
  ALL_COMPARATORS,
  COUNTERFACTUAL_WITHHELD_COPY,
  counterfactual,
  withheldCopy,
} from "./counterfactual";
import { MIN_ARM_PATIENTS } from "@/registers/attribution";
import { ATTRIBUTION_VERSION, type AttributionResult } from "@/engine/attribution";

const SOURCE = readFileSync(path.join(process.cwd(), "src/outcomes/counterfactual.ts"), "utf8");

const arms = (
  invitedPatients: number,
  invitedAttended: number,
  holdoutPatients: number,
  holdoutAttended: number,
): AttributionResult => {
  const per1000 = (attended: number, size: number) => (size === 0 ? 0 : (attended / size) * 1000);
  return {
    version: ATTRIBUTION_VERSION,
    window: { fromIso: "2026-04-01", toIso: "2026-06-30" },
    inviteArm: {
      patients: invitedPatients,
      attended: invitedAttended,
      attendedPer1000: per1000(invitedAttended, invitedPatients),
    },
    holdoutArm: {
      patients: holdoutPatients,
      attended: holdoutAttended,
      attendedPer1000: per1000(holdoutAttended, holdoutPatients),
    },
    incrementalPer1000: null,
    incrementalAttended: null,
    naiveGeneratedAttended: 0,
  };
};

/** Both arms comfortably above the floor: 400 invited, 100 holdout, 20% vs 10% attendance. */
const HEALTHY = arms(400, 80, 100, 10);

describe("W215 the holdout arm is the only comparator", () => {
  it("declares exactly one comparator", () => {
    // A single-member union that quietly grows is the whole failure mode, so membership is
    // asserted by value rather than left to the type.
    expect(ALL_COMPARATORS).toEqual(["observed_holdout_arm"]);
  });

  it("stamps it on every figure and every refusal, so a reader never has to infer it", () => {
    const claimed = counterfactual(HEALTHY);
    const refused = counterfactual(arms(400, 80, 0, 0));
    expect(claimed.claimed && claimed.figure.basis.comparator).toBe("observed_holdout_arm");
    expect(!refused.claimed && refused.basis.comparator).toBe("observed_holdout_arm");
  });

  it("takes no strategy, method or baseline parameter", () => {
    // @ts-expect-error — the only option is how much data a claim requires, never where it comes from.
    void counterfactual(HEALTHY, { comparator: "modelled_baseline" });
    // @ts-expect-error — and no pluggable estimator either.
    void counterfactual(HEALTHY, { estimator: () => 0 });
  });

  it("applies the holdout arm's OWN observed rate, and nothing smoothed or fitted", () => {
    // The arithmetic is one measured rate times a known head count. Asserted exactly, because a
    // number that is nearly right is how a model gets in without anybody calling it one.
    const result = counterfactual(HEALTHY);
    expect(result.claimed).toBe(true);
    if (!result.claimed) return;
    // Holdout attended 10 of 100 → 100 per 1,000 → 400 invited would have attended 40.
    expect(result.figure.withoutTheIntervention).toBe(40);
    expect(result.figure.observed).toBe(80);
    expect(result.figure.difference).toBe(40);
  });

  it("reports a negative difference rather than flooring it at zero", () => {
    // If messaging did worse than doing nothing, that is the answer. A max(0, …) here would make
    // the product incapable of reporting its own harm.
    const worse = counterfactual(arms(400, 20, 100, 20));
    expect(worse.claimed).toBe(true);
    if (!worse.claimed) return;
    expect(worse.figure.difference).toBe(-60);
  });
});

describe("W215 no model-based counterfactual exists", () => {
  it("exports nothing that names or implies a model", () => {
    for (const name of Object.keys(counterfactualModule)) {
      expect(name, `"${name}" reads as a modelled counterfactual`).not.toMatch(
        /predict|propensity|syntheticControl|regress|fit|forecast|uplift|simulateBaseline|expected/i,
      );
    }
  });

  it("takes no patient in any exported signature, so there is no per-patient answer to give", () => {
    // Checked on the SIGNATURES rather than on the names: `estimateFor(patient)` would pass a
    // name check. "Would this person have come anyway" is unanswerable and is the input to a
    // triage, which is why the refusal is structural.
    for (const match of SOURCE.matchAll(/^export function (\w+)\s*\(([^)]*)\)/gms)) {
      const params = match[2]!.replace(/\s+/g, " ");
      expect(params, `${match[1]} takes a patient`).not.toMatch(
        /\bpatient\b|\bpatientId\b|Patient\[\]|readonly Patient/i,
      );
    }
  });

  it("imports nothing from a modelling or ranking module", () => {
    const imports = [...SOURCE.matchAll(/from "([^"]+)"/g)].map((m) => m[1]!);
    expect(imports.sort()).toEqual(["@/engine/attribution", "@/registers/attribution"]);
  });
});

describe("W215 the floor is W72's, and it is applied to the practice-wide figure", () => {
  it("uses W72's constant rather than a second floor of its own", () => {
    // Two floors drift, and the drift is invisible because nobody opens both files at once.
    // Asserted by behaviour: the boundary moves with W72's constant, whatever it is set to.
    const atFloor = counterfactual(arms(MIN_ARM_PATIENTS, 5, MIN_ARM_PATIENTS, 2));
    const justBelow = counterfactual(arms(MIN_ARM_PATIENTS, 5, MIN_ARM_PATIENTS - 1, 2));
    expect(atFloor.claimed).toBe(true);
    expect(justBelow.claimed).toBe(false);
    expect(!justBelow.claimed && justBelow.basis.floor).toBe(MIN_ARM_PATIENTS);
  });

  it("refuses a holdout arm below the floor, which the practice-wide figure never did", () => {
    // THE GAP THIS UNIT FOUND. W72 floored register cohorts two years ago;
    // `countAttribution` withholds only when the holdout arm is EMPTY, so three holdout
    // patients produced a north-star number on the console dashboard.
    const thin = counterfactual(arms(400, 80, 3, 0));
    expect(thin.claimed).toBe(false);
    expect(!thin.claimed && thin.withheld).toEqual(["holdout_arm_below_floor"]);
  });

  it("refuses a thin invited arm too, which is the same error scaled the other way", () => {
    const thin = counterfactual(arms(4, 3, 100, 10));
    expect(thin.claimed).toBe(false);
    expect(!thin.claimed && thin.withheld).toEqual(["invited_arm_below_floor"]);
  });

  it("gives every reason rather than the first, when more than one holds", () => {
    // A caller rendering one of three reasons is rendering a third of the refusal.
    const nothing = counterfactual(arms(2, 1, 0, 0));
    expect(!nothing.claimed && nothing.withheld).toEqual([
      "no_holdout_arm",
      "invited_arm_below_floor",
    ]);
  });

  it("reports the raw counts even when the claim is withheld — W72's shape exactly", () => {
    // Withheld is not missing. The counts are what was recorded and stay visible; what is
    // withheld is the extrapolation on top of them.
    const thin = counterfactual(arms(400, 80, 3, 1));
    expect(thin.claimed).toBe(false);
    if (thin.claimed) return;
    expect(thin.basis.invitedAttended).toBe(80);
    expect(thin.basis.holdoutAttended).toBe(1);
    expect(thin.basis.holdoutArmPatients).toBe(3);
  });

  it("says in words why the claim is withheld, and never as a zero", () => {
    // The dashboard rendered `(incrementalAttended ?? 0).toFixed(0)` — a confident `0` for a
    // practice that simply had no comparison group. A withheld figure is not a zero.
    const copy = withheldCopy(counterfactual(arms(400, 80, 0, 0)));
    expect(copy).toBeTruthy();
    expect(copy!).toContain("no comparison group");
    expect(withheldCopy(counterfactual(HEALTHY))).toBeNull();
    for (const reason of Object.keys(COUNTERFACTUAL_WITHHELD_COPY) as (keyof typeof COUNTERFACTUAL_WITHHELD_COPY)[]) {
      expect(COUNTERFACTUAL_WITHHELD_COPY[reason].length, reason).toBeGreaterThan(80);
      expect(COUNTERFACTUAL_WITHHELD_COPY[reason], reason).not.toMatch(/\b0\b|zero/);
    }
  });

  it("honours an explicit floor, because a real pilot sets it from its own numbers", () => {
    const strict = counterfactual(HEALTHY, { minArmPatients: 500 });
    expect(strict.claimed).toBe(false);
    expect(!strict.claimed && strict.withheld.sort()).toEqual([
      "holdout_arm_below_floor",
      "invited_arm_below_floor",
    ]);
  });
});
