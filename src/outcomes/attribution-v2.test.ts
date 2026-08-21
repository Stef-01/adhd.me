// W219 verify gate: "cohort-level only; per-patient effect estimates are refused BY ABSENCE — no
// function exists, asserted on the module namespace."
//
// Both halves are absences, and the module's central claim is one too: the response graph holds
// ONE ARM. That is not a statement about this file's arithmetic, it is a statement about what the
// sim can produce, so it is proved over a real run rather than asserted in a comment — if a
// holdout patient ever reached an intervention, everything here would still pass while the thing
// the module exists to prevent had already happened.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { ATTRIBUTION_VERSION, type AttributionResult } from "@/engine/attribution";
import { MIN_ARM_PATIENTS } from "@/registers/attribution";
import { counterfactual } from "./counterfactual";
import {
  buildResponseGraph,
  eventsFromSim,
  interventionsFromSim,
  type ResponseGraph,
} from "./response-graph";
import * as mod from "./attribution-v2";
import {
  ALL_KIND_CLAIM_REFUSALS,
  ATTRIBUTION_V2_VERSION,
  KIND_CLAIM_WITHHELD_COPY,
  RESPONSE_RATE_CAVEAT,
  SHIPPED_KIND_ATTRIBUTIONS,
  attributeByKind,
  kindWithheldCopy,
  responseRates,
} from "./attribution-v2";

const SOURCE = readFileSync(path.join(process.cwd(), "src/outcomes/attribution-v2.ts"), "utf8");

const PERIOD = { fromIso: "2026-08-08", toIso: "2026-09-19" };
const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });

const graph = (): ResponseGraph => {
  const result = buildResponseGraph(interventionsFromSim(sim), eventsFromSim(sim), PERIOD);
  if (!result.ok) throw new Error(`graph refused: ${result.errors.join(", ")}`);
  return result.graph;
};

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

/** Both arms comfortably above W72's floor. */
const HEALTHY = counterfactual(arms(400, 80, 100, 10));
/** No comparison group at all — W215's original refusal. */
const NO_HOLDOUT = counterfactual(arms(400, 80, 0, 0));

/**
 * A graph with every kind gone — the shape W218's disclosure produces when the floor withholds
 * them all. W220 hit this in the console and this module threw on a non-null assertion; the
 * fixture exists so the refusal has a producer here rather than only downstream.
 */
const noKinds = (base: ResponseGraph): ResponseGraph => ({ ...base, edges: [], unanswered: [] });

/** A second observed kind, which the sim never produces and which the refusal turns on. */
const twoKinds = (base: ResponseGraph): ResponseGraph => ({
  ...base,
  edges: [
    ...base.edges,
    {
      ...base.edges[0]!,
      from: "reminder_offered",
      to: "appointment_booked",
      count: 4,
      basis: { ...base.edges[0]!.basis, recordedFacts: 10 },
    },
  ],
});

describe("W219 the response graph holds one arm, which is why it cannot attribute", () => {
  it("has a holdout arm in the sim that reaches no intervention at all", () => {
    // The load-bearing fact. If a holdout patient could be invited, the graph would contain a
    // comparator and this module's whole design would be unnecessary — so it is measured over a
    // real run rather than trusted from the harness's own invariant list.
    const holdoutIds = new Set(sim.patients.filter((p) => p.holdout).map((p) => p.id));
    expect(holdoutIds.size, "no holdout arm in the sim — the proof below would be vacuous").toBeGreaterThan(10);

    const invitedChains = new Set(interventionsFromSim(sim).map((i) => i.chainId));
    expect(invitedChains.size).toBeGreaterThan(100);
    const holdoutInvitations = sim.invitations.filter((i) => holdoutIds.has(i.patientId));
    expect(holdoutInvitations, "a holdout patient reached an invitation").toEqual([]);
  });

  it("counts every intervention against the invited arm and nothing against the other", () => {
    // Stated as a denominator check: every per-kind basis in the graph is bounded by the number
    // of interventions performed, and the practice has more patients than that. The gap is the
    // holdout arm, and it is nowhere in the graph.
    const rates = responseRates(graph());
    const offered = rates.map((r) => r.offered);
    for (const total of offered) {
      expect(total).toBeLessThanOrEqual(interventionsFromSim(sim).length);
    }
    expect(sim.attribution.holdoutArm.patients).toBeGreaterThan(0);
    expect(sim.attribution.holdoutArm.attended).toBeGreaterThan(0);
    // The holdout arm attended appointments that the graph knows nothing about. That is the
    // sentence the module exists to keep sayable.
  });

  it("cannot be called with a graph alone", () => {
    const withoutComparator = () =>
      // @ts-expect-error — the counterfactual is not optional; a per-kind figure without a
      // comparator is exactly the number this module refuses to compute.
      attributeByKind(graph());
    // And there is no runtime fallback under the type: it fails rather than quietly returning a
    // rates-only answer, which would be the same number with the refusal silently dropped.
    expect(withoutComparator).toThrow();
  });

  it("takes no comparator, method or estimator of its own", () => {
    // @ts-expect-error — the second comparator is declared in W215 or nowhere.
    void attributeByKind(graph(), HEALTHY, { comparator: "modelled_baseline" });
  });
});

describe("W219 cohort-level only, refused per patient by absence", () => {
  it("exports no function whose name suggests a per-patient answer", () => {
    const exported = Object.keys(mod).filter((k) => typeof (mod as Record<string, unknown>)[k] === "function");
    expect(exported.sort()).toEqual(["attributeByKind", "kindWithheldCopy", "responseRates"]);
  });

  it("takes no patient in any exported signature, so there is no per-patient answer to give", () => {
    // Checked on the SIGNATURES rather than the names, W215's technique: `estimateFor(patient)`
    // passes a name check and would be the whole failure.
    const seen: string[] = [];
    for (const match of SOURCE.matchAll(/^export function (\w+)\s*\(([^)]*)\)/gms)) {
      seen.push(match[1]!);
      const params = match[2]!.replace(/\s+/g, " ");
      expect(params, `${match[1]} takes a patient`).not.toMatch(
        /\bpatient\b|\bpatientId\b|Patient\[\]|readonly Patient/i,
      );
    }
    // Non-vacuity: the regex must have found the functions it claims to have checked.
    expect(seen.sort()).toEqual(["attributeByKind", "kindWithheldCopy", "responseRates"]);
  });

  it("imports nothing that could reach a patient record", () => {
    const imports = [...SOURCE.matchAll(/from "([^"]+)"/g)].map((m) => m[1]!).sort();
    expect(imports).toEqual([
      "./counterfactual",
      "./response",
      "./response-graph",
      "@/reporting/model",
    ].sort());
  });

  it("ships nothing", () => {
    expect(SHIPPED_KIND_ATTRIBUTIONS).toEqual([]);
  });
});

describe("W219 the claim is carried, never apportioned", () => {
  it("gives the whole figure to the only kind performed, unchanged", () => {
    const result = attributeByKind(graph(), HEALTHY);
    expect(result.claimed, kindWithheldCopy(result) ?? "").toBe(true);
    if (!result.claimed) return;
    expect(result.version).toBe(ATTRIBUTION_V2_VERSION);
    expect(result.perKind).toHaveLength(1);
    expect(result.perKind[0]!.kind).toBe("invitation_offered");
    // W215's number, to the digit. A figure that is nearly right is how a model gets in.
    expect(HEALTHY.claimed).toBe(true);
    if (!HEALTHY.claimed) return;
    expect(result.perKind[0]!.incrementalAttended).toBe(HEALTHY.figure.difference);
    expect(result.perKind[0]!.counterfactualBasis).toEqual(HEALTHY.figure.basis);
  });

  it("refuses to split one comparison group between two kinds of message", () => {
    const result = attributeByKind(twoKinds(graph()), HEALTHY);
    expect(result.claimed).toBe(false);
    if (result.claimed) return;
    expect(result.withheld).toEqual(["kinds_share_one_comparator"]);
    expect(result.rates.map((r) => r.kind).sort()).toEqual(["invitation_offered", "reminder_offered"]);
  });

  it("refuses when the disclosure floor has left no kind to attribute a figure to", () => {
    // A claimable practice-wide figure with nowhere to put it. Found by W220 rather than here:
    // every fixture in this file had a kind in it, so `rates[0]!` was never empty and the
    // assertion that hid the bug never fired.
    const result = attributeByKind(noKinds(graph()), HEALTHY);
    expect(result.claimed).toBe(false);
    if (result.claimed) return;
    expect(result.withheld).toEqual(["no_kind_to_attribute"]);
    expect(result.rates).toEqual([]);
  });

  it("carries W215's own reasons rather than summarising them away", () => {
    const result = attributeByKind(graph(), NO_HOLDOUT);
    expect(result.claimed).toBe(false);
    if (result.claimed) return;
    expect(result.withheld).toEqual(["counterfactual_withheld"]);
    expect(result.counterfactualWithheld).toEqual(["no_holdout_arm"]);
  });

  it("states both reasons when both apply — half a refusal reads as the whole one", () => {
    const result = attributeByKind(twoKinds(graph()), NO_HOLDOUT);
    expect(result.claimed).toBe(false);
    if (result.claimed) return;
    expect(result.withheld).toEqual(["counterfactual_withheld", "kinds_share_one_comparator"]);
    expect(result.counterfactualWithheld).toEqual(["no_holdout_arm"]);
  });

  it("moves with W72's floor rather than a second floor of its own", () => {
    // The floor lives in W215, which imports W72's constant. Asserted by behaviour at the
    // boundary, so this file cannot drift from either.
    const atFloor = counterfactual(arms(MIN_ARM_PATIENTS, 5, MIN_ARM_PATIENTS, 2));
    const justBelow = counterfactual(arms(MIN_ARM_PATIENTS, 5, MIN_ARM_PATIENTS - 1, 2));
    expect(attributeByKind(graph(), atFloor).claimed).toBe(true);
    expect(attributeByKind(graph(), justBelow).claimed).toBe(false);
  });

  it("declares every refusal it can produce, both directions", () => {
    const produced = new Set<string>();
    for (const c of [HEALTHY, NO_HOLDOUT]) {
      for (const g of [graph(), twoKinds(graph()), noKinds(graph())]) {
        const r = attributeByKind(g, c);
        if (!r.claimed) for (const reason of r.withheld) produced.add(reason);
      }
    }
    expect([...produced].sort()).toEqual([...ALL_KIND_CLAIM_REFUSALS].sort());
    expect(Object.keys(KIND_CLAIM_WITHHELD_COPY).sort()).toEqual([...ALL_KIND_CLAIM_REFUSALS].sort());
  });
});

describe("W219 the counts are reported whether or not the claim is", () => {
  it("reports every kind's rates even when the claim is withheld", () => {
    const result = attributeByKind(graph(), NO_HOLDOUT);
    expect(result.claimed).toBe(false);
    expect(result.rates.length).toBeGreaterThan(0);
    for (const rate of result.rates) {
      expect(rate.offered).toBeGreaterThan(0);
      expect(rate.basis.recordedFacts).toBe(rate.offered);
      expect(rate.basis.fromIso).toBe(PERIOD.fromIso);
    }
  });

  it("never counts one intervention twice in the numerator", () => {
    // An intervention can be answered more than once, so a numerator summed from edge counts can
    // exceed the number of people. `answeredAtLeastOnce` is derived from the unanswered node
    // instead — asserted against a graph whose edges deliberately over-sum.
    const base = graph();
    const doubled: ResponseGraph = {
      ...base,
      edges: [
        ...base.edges,
        { ...base.edges[0]!, to: "invitation_expired", count: base.edges[0]!.basis.recordedFacts },
      ],
    };
    const linkTotal = Object.values(responseRates(doubled)[0]!.linksByResponseKind).reduce(
      (a, b) => a + b,
      0,
    );
    const rate = responseRates(doubled)[0]!;
    expect(linkTotal, "the fixture does not over-sum, so the check is vacuous").toBeGreaterThan(rate.offered);
    expect(rate.answeredAtLeastOnce).toBeLessThanOrEqual(rate.offered);
    expect(rate.answeredAtLeastOnce).toBe(rate.offered - rate.unanswered);
    expect(rate.answeredPer1000).toBeLessThanOrEqual(1000);
  });

  it("attaches the caveat to the value, not to the surface", () => {
    // A rate rendered without this sentence is a within-arm number read as an effect, and a
    // surface that has to remember to print it will one day not.
    for (const rate of responseRates(graph())) {
      expect(rate.caveat).toBe(RESPONSE_RATE_CAVEAT);
    }
    expect(RESPONSE_RATE_CAVEAT).toMatch(/do not say what would have happened without/);
  });

  it("says why a split is withheld, in a sentence that cannot read as a zero", () => {
    const copy = kindWithheldCopy(attributeByKind(twoKinds(graph()), HEALTHY));
    expect(copy).toBe(KIND_CLAIM_WITHHELD_COPY.kinds_share_one_comparator);
    expect(copy).not.toMatch(/\b0\b|\bzero\b|\bno effect\b/i);
    expect(kindWithheldCopy(attributeByKind(graph(), HEALTHY))).toBeNull();
  });
});
