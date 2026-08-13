// W87 verify gate: routed vs unrouted over 26 weeks — invariants hold, report generated.
//
// The comparison is the point. A routing engine that improves nothing is not worth the
// continuity risk, and one that improves matching while quietly moving half a panel is worse
// than nothing. Both arms come from the SAME seeded run, so every difference is the routing
// layer rather than a different random world — the method W63 established.

import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ClinicianId, ConditionCode, PatientId, PracticeId } from "@/domain/types";
import { DEFAULT_CONTINUITY_CONFIG, continuityReport } from "@/engine/continuity";
import { DEFAULT_SIM_CONFIG, checkInvariants, runSim } from "@/sim/harness";
import { DEFAULT_CONTINUITY_GUARD, applyContinuityGuard } from "./continuity-guard";
import { explainPlan } from "./explain";
import { ROUTING_OFF, type RoutingConfig, type RoutingDecision, routeFor, routedShare } from "./routing";
import type { Candidate, CompetenceFloor } from "./threshold";

const CONDITION = "cond_diabetes" as ConditionCode;

const result = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 26 });
const practiceId = result.practice.id as PracticeId;

/**
 * The floor is derived from this run's own distribution rather than hard-coded.
 *
 * A hard-coded 25 put every clinician above the line, so nothing routed and the two arms
 * were identical — a "routed vs unrouted" comparison that compares nothing. Using the
 * median attended count guarantees the roster actually splits, so both arms are exercised
 * and the report says something. The floor is a practice setting in production; here it is
 * chosen to make the comparison meaningful, which is stated in the report.
 */
function medianAttendedPerClinician(): number {
  const counts = new Map<string, number>();
  for (const a of result.appointments) {
    if (a.status !== "attended") continue;
    counts.set(a.clinicianId as string, (counts.get(a.clinicianId as string) ?? 0) + 1);
  }
  const sorted = [...counts.values()].sort((x, y) => x - y);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

const FLOOR: CompetenceFloor = {
  minAttendedVisits: medianAttendedPerClinician(),
  requireVerifiedCredential: false,
};
const ROUTING_ON: RoutingConfig = { enabledConditions: [CONDITION], floor: FLOOR };

/**
 * Derive each clinician's experience from the run itself rather than inventing numbers, so
 * the floor is applied to the same distribution the practice actually has.
 */
function candidatesFrom(): Map<string, Candidate> {
  const attended = new Map<string, number>();
  for (const a of result.appointments) {
    if (a.status !== "attended") continue;
    attended.set(a.clinicianId as string, (attended.get(a.clinicianId as string) ?? 0) + 1);
  }

  // SimResult carries no roster, so the clinicians are the distinct ids the run scheduled.
  const clinicianIds = [...new Set(result.appointments.map((a) => a.clinicianId as string))].sort();

  const candidates = new Map<string, Candidate>();
  for (const id of clinicianIds) {
    const visits = attended.get(id) ?? 0;
    candidates.set(id, {
      clinicianId: id as ClinicianId,
      experience: {
        practiceId,
        clinicianId: id as ClinicianId,
        conditionCode: CONDITION,
        attendedVisits: visits,
        windowFrom: DEFAULT_SIM_CONFIG.todayIso,
        windowTo: "2027-02-01",
        source: "derived_case_mix",
        computedAt: "2027-02-01T00:00:00Z",
      },
      competence: null,
      interest: null,
    });
  }
  return candidates;
}

/** One routing decision per patient who has a usual GP. */
function decide(config: RoutingConfig): RoutingDecision[] {
  const candidates = [...candidatesFrom().values()];
  return result.patients
    .filter((p) => p.usualClinicianId !== null)
    .map((p) =>
      routeFor({
        practiceId,
        conditionCode: CONDITION,
        usualClinicianId: p.usualClinicianId as ClinicianId,
        candidates,
        config,
        onIso: DEFAULT_SIM_CONFIG.todayIso,
      }),
    );
}

const baselineReport = continuityReport(
  result.practice.id,
  result.patients,
  result.appointments,
  DEFAULT_CONTINUITY_CONFIG,
);
const baseline = {
  appointments: baselineReport.overall.appointments,
  withUsualGp: baselineReport.overall.withUsualGp,
};

describe("W87 routed vs unrouted", () => {
  it("the run itself holds its invariants", () => {
    expect(checkInvariants(result)).toEqual([]);
  }, 60_000);

  it("routing off moves nobody", () => {
    const off = decide(ROUTING_OFF);
    expect(off.length).toBeGreaterThan(0);
    expect(routedShare(off)).toBe(0);
    for (const d of off) expect(d.clinicianId).toBe(d.usualClinicianId);
  }, 60_000);

  it("the floor actually splits the roster, so the comparison is not vacuous", () => {
    // A hard-coded floor put everyone above the line and the two arms were identical.
    const visits = [...candidatesFrom().values()].map((c) => c.experience!.attendedVisits);
    const below = visits.filter((v) => v < FLOOR.minAttendedVisits).length;

    expect(below).toBeGreaterThan(0);
    expect(below).toBeLessThan(visits.length);
  }, 60_000);

  it("routing on moves only patients whose usual GP is below the floor", () => {
    const on = decide(ROUTING_ON);
    const candidates = candidatesFrom();

    for (const d of on.filter((x) => x.routed)) {
      const usual = candidates.get(d.usualClinicianId as string)!;
      expect(usual.experience!.attendedVisits).toBeLessThan(FLOOR.minAttendedVisits);
    }
  }, 60_000);

  it("every decision in both arms is explainable", () => {
    for (const config of [ROUTING_OFF, ROUTING_ON]) {
      const plan = explainPlan(applyContinuityGuard(decide(config), baseline, DEFAULT_CONTINUITY_GUARD));
      expect(plan.unexplained).toBe(0);
    }
  }, 60_000);

  it("the continuity guardrail is what decides whether the plan ships", () => {
    // Not asserting a direction: whether this synthetic practice's plan clears the ceiling
    // is a property of its clinician distribution, not something to hard-code. What must
    // hold is that the guard's verdict and the resulting plan agree.
    const verdict = applyContinuityGuard(decide(ROUTING_ON), baseline, DEFAULT_CONTINUITY_GUARD);

    if (verdict.allowed) {
      expect(verdict.projectedShare).toBeGreaterThanOrEqual(DEFAULT_CONTINUITY_GUARD.minUsualGpShare);
      expect(verdict.routedShare).toBeLessThanOrEqual(DEFAULT_CONTINUITY_GUARD.maxRoutedShare);
    } else {
      expect(verdict.decisions.every((d) => !d.routed)).toBe(true);
      expect(verdict.projectedShare).toBe(verdict.baselineShare);
    }
  }, 60_000);

  it("is deterministic — the same run decides identically", () => {
    expect(routedShare(decide(ROUTING_ON))).toBe(routedShare(decide(ROUTING_ON)));
  }, 60_000);
});

describe("W87 report", () => {
  it("generates a comparison report from the run", () => {
    const off = decide(ROUTING_OFF);
    const onVerdict = applyContinuityGuard(decide(ROUTING_ON), baseline, DEFAULT_CONTINUITY_GUARD);
    const plan = explainPlan(onVerdict);
    const violations = checkInvariants(result);
    const belowFloor = [...candidatesFrom().values()].filter(
      (c) => (c.experience?.attendedVisits ?? 0) < FLOOR.minAttendedVisits,
    ).length;

    const report = [
      `# Routing simulation — ${DEFAULT_SIM_CONFIG.weeks} weeks, routing off vs on (synthetic)`,
      ``,
      `Both arms are the SAME seeded run (${DEFAULT_SIM_CONFIG.seed}), so every difference below `+
        `is the routing layer and not a different random world.`,
      ``,
      `Floor for this comparison: ${FLOOR.minAttendedVisits} attended visits (this run's median ` +
        `per clinician), no credential required. ${belowFloor} of ${candidatesFrom().size} clinicians ` +
        `sit below it. The floor is derived from the run rather than hard-coded, because a floor ` +
        `everyone clears makes the two arms identical and the comparison meaningless.`,
      ``,
      `| Measure | Routing off | Routing on |`,
      `|---|---|---|`,
      `| Decisions | ${off.length} | ${onVerdict.decisions.length} |`,
      `| Patients moved from their usual GP | 0 | ${plan.routed} |`,
      `| Share moved | 0.0% | ${(onVerdict.routedShare * 100).toFixed(1)}% |`,
      `| Usual-GP share of visits | ${(onVerdict.baselineShare * 100).toFixed(1)}% | ${(onVerdict.projectedShare * 100).toFixed(1)}% |`,
      ``,
      onVerdict.allowed
        ? `The continuity guardrail allowed this plan: the projected usual-GP share stays at or ` +
          `above the practice floor of ${(DEFAULT_CONTINUITY_GUARD.minUsualGpShare * 100).toFixed(0)}% ` +
          `and the moved share stays under the ${(DEFAULT_CONTINUITY_GUARD.maxRoutedShare * 100).toFixed(0)}% ceiling.`
        : `The continuity guardrail HELD THIS PLAN BACK — ${onVerdict.breaches.join(", ")}. Nothing ` +
          `moved, and continuity is unchanged. This is the guardrail working, not a failure.`,
      ``,
      `Unexplained decisions: ${plan.unexplained}. Every decision, routed or kept, renders a reason (W86).`,
      ``,
      violations.length === 0
        ? `Invariants: held — checked with the same checkInvariants() the fleet run uses.`
        : `Invariants: VIOLATED — ${violations.join("; ")}`,
      ``,
      `Synthetic data only. Experience is derived from this run's attended visits; no clinical ` +
        `content is involved in the floor, which counts visits and nothing else.`,
      ``,
    ].join("\n");

    const dir = path.resolve(__dirname, "../../reports");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "routing-w87.md"), report);

    expect(violations).toEqual([]);
    expect(plan.unexplained).toBe(0);
    expect(report).toContain("Invariants: held");
    expect(report).toContain("Unexplained decisions: 0");
    // The comparison must actually compare something.
    expect(belowFloor).toBeGreaterThan(0);
  }, 90_000);
});
