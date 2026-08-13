// W86 verify gate: no unexplained routes.

import { describe, expect, it } from "vitest";
import type { ClinicianId, ConditionCode, PracticeId } from "@/domain/types";
import { ROUTING_REASON_COPY, type RoutingDecision, type RoutingReason } from "./routing";
import { applyContinuityGuard, type GuardVerdict } from "./continuity-guard";
import { explainDecision, explainPlan, renderRoutingExplanations } from "./explain";
import type { RankedCandidate } from "./threshold";

const PRACTICE = "prac-1" as PracticeId;
const CONDITION = "cond_diabetes" as ConditionCode;

const ALL_REASONS: RoutingReason[] = [
  "routing_disabled_for_condition",
  "usual_gp_clears_floor",
  "no_candidate_clears_floor",
  "no_usual_gp_recorded",
  "routed_to_better_match",
];

function ranked(id: string, clears: boolean, over: Partial<RankedCandidate> = {}): RankedCandidate {
  return {
    clinicianId: id as ClinicianId,
    clearsFloor: clears,
    failures: clears ? [] : ["insufficient_experience"],
    interestStrength: clears ? 3 : null,
    attendedVisits: clears ? 40 : 1,
    ...over,
  };
}

function decision(over: Partial<RoutingDecision> = {}): RoutingDecision {
  return {
    practiceId: PRACTICE,
    conditionCode: CONDITION,
    clinicianId: "able" as ClinicianId,
    usualClinicianId: "usual" as ClinicianId,
    routed: true,
    reason: "routed_to_better_match",
    considered: [ranked("able", true), ranked("usual", false)],
    ...over,
  };
}

describe("W86 every decision is explained", () => {
  it.each(ALL_REASONS)("renders a headline for reason %s", (reason) => {
    // Total over the union: a new reason without copy is a type error, not an empty string
    // rendered at a practice.
    const explanation = explainDecision(decision({ reason }));
    expect(explanation.headline).toBe(ROUTING_REASON_COPY[reason]);
    expect(explanation.headline.trim().length).toBeGreaterThan(30);
  });

  it("explains KEPT decisions too, not only routed ones", () => {
    // "Why was this patient not moved" is asked at least as often.
    const explanation = explainDecision(decision({ routed: false, reason: "usual_gp_clears_floor" }));
    expect(explanation.routed).toBe(false);
    expect(explanation.headline).toContain("usual GP");
  });

  it("says why each alternative was not chosen", () => {
    const explanation = explainDecision(decision());
    expect(explanation.alternatives).toHaveLength(1);
    expect(explanation.alternatives[0]).toContain("usual");
    expect(explanation.alternatives[0]).toContain("has not seen enough of this work");
  });

  it("describes a qualified alternative by threshold and preference, not by rank", () => {
    const explanation = explainDecision(
      decision({ considered: [ranked("able", true), ranked("other", true)] }),
    );
    expect(explanation.alternatives[0]).toContain("meets the threshold");
    expect(explanation.alternatives[0]).toContain("stated preference 3 of 5");
  });

  it("never explains a decision in terms of the patient's health", () => {
    for (const reason of ALL_REASONS) {
      const text = explainDecision(decision({ reason })).headline.toLowerCase();
      for (const banned of ["needs", "at risk", "diagnos", "condition is", "unwell", "severity"]) {
        expect(text, `${reason} must make no clinical claim`).not.toContain(banned);
      }
    }
  });
});

describe("W86 plans", () => {
  function verdictOf(decisions: RoutingDecision[], baseline = { appointments: 1000, withUsualGp: 950 }): GuardVerdict {
    return applyContinuityGuard(decisions, baseline);
  }

  it("no plan contains an unexplained route — the unit's gate", () => {
    const plan = explainPlan(
      verdictOf(ALL_REASONS.map((reason) => decision({ reason, routed: reason === "routed_to_better_match" }))),
    );

    expect(plan.unexplained).toBe(0);
    expect(plan.explanations).toHaveLength(ALL_REASONS.length);
    for (const e of plan.explanations) expect(e.headline.trim()).not.toBe("");
  });

  it("surfaces the guardrail when W85 held the plan back", () => {
    // A practice that turned routing on and saw nothing happen needs to know why.
    const many = Array.from({ length: 100 }, (_, i) =>
      decision({ clinicianId: `able-${i}` as ClinicianId, usualClinicianId: `usual-${i}` as ClinicianId }),
    );
    const verdict = verdictOf(many, { appointments: 100, withUsualGp: 75 });
    expect(verdict.allowed).toBe(false);

    const plan = explainPlan(verdict);
    expect(plan.routed).toBe(0);
    expect(plan.explanations.every((e) => e.heldBackBy !== null)).toBe(true);
    expect(plan.explanations[0]!.heldBackBy).toContain("usual GP");
  });

  it("carries no held-back note when the plan was allowed", () => {
    // Padded with kept decisions so the routed share stays under W85's ceiling — a
    // two-decision plan with one routed is a 50% routed share and correctly trips it.
    const kept = Array.from({ length: 30 }, (_, i) =>
      decision({ routed: false, reason: "usual_gp_clears_floor", usualClinicianId: `u-${i}` as ClinicianId }),
    );
    const plan = explainPlan(verdictOf([decision(), ...kept]));

    expect(plan.routed).toBe(1);
    expect(plan.explanations[0]!.heldBackBy).toBeNull();
  });

  it("renders practice-facing markdown with a line per decision", () => {
    const kept = Array.from({ length: 19 }, (_, i) =>
      decision({ routed: false, reason: "usual_gp_clears_floor", usualClinicianId: `u-${i}` as ClinicianId }),
    );
    const plan = explainPlan(verdictOf([decision(), ...kept]));
    const md = renderRoutingExplanations(plan);

    expect(md).toContain("1 offer(s) named a different GP; 19 stayed");
    expect(md).toContain("Not chosen —");
    expect(md.split("\n").filter((l) => l.startsWith("- **"))).toHaveLength(20);
  });

  it("says so plainly when there was nothing to decide", () => {
    expect(renderRoutingExplanations(explainPlan(verdictOf([])))).toContain("No routing decisions");
  });
});
