// W85 verify gate: sim comparison — routing must not degrade the W24 continuity index
// below the practice's floor.

import { describe, expect, it } from "vitest";
import type { ClinicianId, ConditionCode, PracticeId } from "@/domain/types";
import { DEFAULT_CONTINUITY_CONFIG, continuityReport } from "@/engine/continuity";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import type { RoutingDecision } from "./routing";
import {
  DEFAULT_CONTINUITY_GUARD,
  GUARD_BREACH_COPY,
  applyContinuityGuard,
  projectUsualGpShare,
} from "./continuity-guard";

const PRACTICE = "prac-1" as PracticeId;
const CONDITION = "cond_diabetes" as ConditionCode;

function decision(routed: boolean, i: number): RoutingDecision {
  return {
    practiceId: PRACTICE,
    conditionCode: CONDITION,
    clinicianId: (routed ? `other-${i}` : `usual-${i}`) as ClinicianId,
    usualClinicianId: `usual-${i}` as ClinicianId,
    routed,
    reason: routed ? "routed_to_better_match" : "usual_gp_clears_floor",
    considered: [],
  };
}

function plan(routedCount: number, total: number): RoutingDecision[] {
  return Array.from({ length: total }, (_, i) => decision(i < routedCount, i));
}

describe("W85 projection arithmetic", () => {
  it("each routed patient converts one usual-GP visit into a non-usual one", () => {
    // Exact, not estimated: a routed patient does not stop attending, they attend with
    // someone else, so the denominator is unchanged.
    expect(projectUsualGpShare({ appointments: 100, withUsualGp: 80 }, plan(10, 50))).toBeCloseTo(0.7);
  });

  it("never projects below zero", () => {
    expect(projectUsualGpShare({ appointments: 10, withUsualGp: 2 }, plan(50, 50))).toBe(0);
  });

  it("treats an empty panel as fully continuous rather than dividing by zero", () => {
    expect(projectUsualGpShare({ appointments: 0, withUsualGp: 0 }, plan(5, 5))).toBe(1);
  });

  it("ignores routed decisions for patients with no usual GP", () => {
    // Nothing was moved away from, so nothing is lost.
    const noUsual: RoutingDecision[] = [{ ...decision(true, 0), usualClinicianId: null }];
    expect(projectUsualGpShare({ appointments: 100, withUsualGp: 80 }, noUsual)).toBeCloseTo(0.8);
  });
});

describe("W85 the guardrail", () => {
  it("allows a plan that keeps the share above the floor", () => {
    const verdict = applyContinuityGuard(plan(5, 100), { appointments: 1000, withUsualGp: 900 }, DEFAULT_CONTINUITY_GUARD);

    expect(verdict.allowed).toBe(true);
    expect(verdict.breaches).toEqual([]);
    expect(verdict.decisions.filter((d) => d.routed)).toHaveLength(5);
  });

  it("holds routing back when the projected share would fall below the floor", () => {
    const verdict = applyContinuityGuard(
      plan(50, 100),
      { appointments: 100, withUsualGp: 75 },
      { minUsualGpShare: 0.7, maxRoutedShare: 1 },
    );

    expect(verdict.allowed).toBe(false);
    expect(verdict.breaches).toContain("would_breach_share_floor");
  });

  it("holds routing back when it would move more of the panel than allowed", () => {
    // Even when the share would technically stay above the floor: the two limits ask
    // different questions and both must pass.
    const verdict = applyContinuityGuard(
      plan(40, 100),
      { appointments: 10_000, withUsualGp: 9_900 },
      { minUsualGpShare: 0.5, maxRoutedShare: 0.15 },
    );

    expect(verdict.allowed).toBe(false);
    expect(verdict.breaches).toEqual(["would_exceed_routed_ceiling"]);
  });

  it("stops routing wholesale rather than trimming to fit", () => {
    // A partial plan chosen by iteration order is not defensible to a practice.
    const verdict = applyContinuityGuard(
      plan(50, 100),
      { appointments: 100, withUsualGp: 75 },
      DEFAULT_CONTINUITY_GUARD,
    );

    expect(verdict.decisions.every((d) => !d.routed)).toBe(true);
    expect(verdict.routedShare).toBe(0);
    expect(verdict.projectedShare).toBe(verdict.baselineShare);
  });

  it("preserves each decision's reason when holding it back", () => {
    // The practice must be able to see what routing WOULD have done and why it was held.
    const verdict = applyContinuityGuard(plan(50, 100), { appointments: 100, withUsualGp: 75 });
    const wouldHaveRouted = verdict.decisions.filter((d) => d.reason === "routed_to_better_match");

    expect(wouldHaveRouted.length).toBe(50);
    for (const d of wouldHaveRouted) {
      expect(d.routed).toBe(false);
      expect(d.clinicianId).toBe(d.usualClinicianId);
    }
  });

  it("explains every breach in practice-facing words", () => {
    for (const copy of Object.values(GUARD_BREACH_COPY)) {
      expect(copy.length).toBeGreaterThan(40);
      expect(copy.toLowerCase()).toContain("usual gp");
    }
  });
});

describe("W85 sim comparison", () => {
  // The guardrail is only meaningful against a real continuity baseline, so this takes one
  // from an actual run rather than a hand-made number.
  const result = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 26 });
  const report = continuityReport(
    result.practice.id,
    result.patients,
    result.appointments,
    DEFAULT_CONTINUITY_CONFIG,
  );

  it("the run has a measurable continuity baseline to protect", () => {
    expect(report.overall.appointments).toBeGreaterThan(0);
    expect(report.overall.share).not.toBeNull();
  }, 60_000);

  it("a modest routing plan leaves the simulated practice above its floor", () => {
    const total = Math.max(20, Math.floor(report.overall.appointments / 50));
    const verdict = applyContinuityGuard(
      plan(Math.floor(total * 0.1), total),
      { appointments: report.overall.appointments, withUsualGp: report.overall.withUsualGp },
      DEFAULT_CONTINUITY_GUARD,
    );

    expect(verdict.allowed).toBe(true);
    expect(verdict.projectedShare).toBeGreaterThanOrEqual(DEFAULT_CONTINUITY_GUARD.minUsualGpShare);
  }, 60_000);

  it("an aggressive plan is refused against the same real baseline", () => {
    // The failure this unit exists to prevent: W84 only moves below-floor patients, but in
    // aggregate that can still redirect a large share of a panel.
    const aggressive = plan(report.overall.appointments, report.overall.appointments);
    const verdict = applyContinuityGuard(
      aggressive,
      { appointments: report.overall.appointments, withUsualGp: report.overall.withUsualGp },
      DEFAULT_CONTINUITY_GUARD,
    );

    expect(verdict.allowed).toBe(false);
    expect(verdict.breaches).toContain("would_breach_share_floor");
    // And continuity is preserved exactly, not merely reduced.
    expect(verdict.projectedShare).toBe(verdict.baselineShare);
  }, 60_000);
});
