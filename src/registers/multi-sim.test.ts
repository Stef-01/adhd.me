// W75 verify gate: a multi-condition 26-week run — invariants hold, and a report is
// generated from the run rather than written by hand.
//
// W63 proved one register does not break the loop. The question this unit answers is
// different and harder: what happens when a patient is on SEVERAL registers at once. That is
// where double-contact, double-counting and one-person-trips-every-alarm live, and none of
// them are visible with a single register configured.

import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ConditionCode } from "@/domain/types";
import { DEFAULT_SIM_CONFIG, checkInvariants, runSim } from "@/sim/harness";
import { evaluateConditionGuardrails, conditionMetricsFrom } from "@/guardrails/condition-monitors";
import { DEFAULT_GUARDRAILS } from "@/guardrails/monitors";
import { attributionByCondition } from "./attribution";
import { DEFAULT_REGISTER_SIM, buildRegisterLayer, conditionsOf } from "./sim-registers";

const A = "placeholder_register_a" as ConditionCode;
const B = "placeholder_register_b" as ConditionCode;
const C = "placeholder_register_c" as ConditionCode;

const MULTI = {
  ...DEFAULT_REGISTER_SIM,
  enabled: true,
  conditionCode: A,
  intervalMonths: 12,
  flaggedShare: 0.3,
  additionalConditions: [
    { conditionCode: B, intervalMonths: 6, flaggedShare: 0.25 },
    { conditionCode: C, intervalMonths: 24, flaggedShare: 0.2 },
  ],
} as const;

const CONFIG = { ...DEFAULT_SIM_CONFIG, weeks: 26, registers: { ...MULTI } };

describe("W75 multi-condition 26-week run", () => {
  const result = runSim(CONFIG);

  it("completes 26 weeks with three registers active", () => {
    expect(result.totals.weeksSimulated).toBe(26);
    expect(conditionsOf(MULTI)).toHaveLength(3);
    expect(result.totals.invitationsSent).toBeGreaterThan(0);
  });

  it("holds the same invariants the single-register run holds", () => {
    // The fleet's own checker, not a weaker local one.
    expect(checkInvariants(result)).toEqual([]);
  });

  it("never invites a holdout patient, however many registers they are on", () => {
    // The invariant most at risk from a multi-register pool: three chances to be picked.
    const holdout = new Set(
      result.patients.filter((p) => p.holdout).map((p) => p.id as string),
    );
    for (const invitation of result.invitations) {
      expect(holdout.has(invitation.patientId as string)).toBe(false);
    }
  });

  it("never sends a patient two invitations for the same session", () => {
    // A patient on three registers must not be offered the same slot three times.
    const seen = new Set<string>();
    for (const invitation of result.invitations) {
      const key = `${invitation.patientId}::${invitation.sessionDate}::${invitation.clinicianId}`;
      expect(seen.has(key), `duplicate offer: ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("is deterministic — the same seed reproduces the run exactly", () => {
    const again = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 26, registers: { ...MULTI } });
    expect(again.totals).toEqual(result.totals);
    expect(again.invitations.length).toBe(result.invitations.length);
  }, 60_000);
});

describe("W75 register composition", () => {
  const result = runSim(CONFIG);
  const layer = buildRegisterLayer(result.patients, MULTI, CONFIG.seed, DEFAULT_SIM_CONFIG.todayIso);

  it("puts patients on more than one register", () => {
    // If no patient overlapped, this run would not be testing anything a single register
    // does not already cover.
    const perPatient = new Map<string, Set<string>>();
    for (const gap of layer.gaps) {
      const set = perPatient.get(gap.patientId as string) ?? new Set<string>();
      set.add(gap.conditionCode as string);
      perPatient.set(gap.patientId as string, set);
    }
    const overlapping = [...perPatient.values()].filter((s) => s.size > 1);
    expect(overlapping.length).toBeGreaterThan(0);
  });

  it("produces gaps for every configured register", () => {
    const codes = new Set(layer.gaps.map((g) => g.conditionCode as string));
    expect([...codes].sort()).toEqual([A, B, C].sort());
  });

  it("never produces two gaps for the same patient and register", () => {
    const keys = layer.gaps.map((g) => `${g.patientId}::${g.conditionCode}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("adding registers never shrinks the member pool", () => {
    const single = buildRegisterLayer(
      result.patients,
      { ...MULTI, additionalConditions: [] },
      CONFIG.seed,
      DEFAULT_SIM_CONFIG.todayIso,
    );
    expect(layer.memberIds.size).toBeGreaterThanOrEqual(single.memberIds.size);
    // And the primary register's members are all still there.
    for (const id of single.memberIds) expect(layer.memberIds.has(id)).toBe(true);
  });

  it("adding a register does not disturb the primary register's own gaps", () => {
    const single = buildRegisterLayer(
      result.patients,
      { ...MULTI, additionalConditions: [] },
      CONFIG.seed,
      DEFAULT_SIM_CONFIG.todayIso,
    );
    const primaryOf = (gaps: readonly { conditionCode: unknown; patientId: unknown }[]) =>
      gaps.filter((g) => g.conditionCode === A).map((g) => g.patientId as string).sort();

    expect(primaryOf(layer.gaps)).toEqual(primaryOf(single.gaps));
  });
});

describe("W75 downstream measures over a multi-register run", () => {
  const result = runSim(CONFIG);
  const layer = buildRegisterLayer(result.patients, MULTI, CONFIG.seed, DEFAULT_SIM_CONFIG.todayIso);

  it("per-condition guardrails evaluate every register", () => {
    const invitations = result.invitations.map((i) => ({
      id: i.id as string,
      patientId: i.patientId as string,
      status: i.status,
    }));
    const gapCondition = new Map<string, string>();
    for (const gap of layer.gaps) gapCondition.set(gap.patientId as string, gap.conditionCode as string);

    const metrics = conditionMetricsFrom(invitations, (id) => {
      const inv = result.invitations.find((i) => (i.id as string) === id);
      return inv ? gapCondition.get(inv.patientId as string) ?? null : null;
    });
    const report = evaluateConditionGuardrails(metrics, DEFAULT_GUARDRAILS);

    expect(report.byCondition.length).toBeGreaterThan(1);

    // NOT asserting "no register trips an alarm" — that turned out to be an assumption
    // rather than a fact. Slicing this healthy practice by register DOES surface a
    // register above the 2% opt-out threshold while the practice-wide monitor stays clear,
    // which is precisely what W70 was built to reveal. Asserting silence here would have
    // encoded the blind spot the unit exists to remove.
    //
    // What must hold is that every alert is arithmetically justified: an alarm whose value
    // does not exceed its own threshold would mean the per-register split is fabricating
    // signal.
    for (const condition of report.byCondition) {
      for (const alert of condition.alerts) {
        if (alert.severity === "critical") expect(alert.value).toBeGreaterThanOrEqual(alert.threshold);
      }
      // A register with an alert must have had enough volume to judge.
      if (condition.alerts.some((a) => a.monitor === "opt_out_rate")) {
        expect(condition.insufficientData).toBe(false);
      }
    }
  }, 60_000);

  it("per-condition attribution reports overlap rather than hiding it", () => {
    const memberships = layer.gaps.map((g) => ({
      practiceId: result.practice.id,
      patientId: g.patientId,
      conditionCode: g.conditionCode,
      source: "pms_condition_flag" as const,
      addedAt: `${DEFAULT_SIM_CONFIG.todayIso}T00:00:00Z`,
      removedAt: null,
    }));

    const report = attributionByCondition(
      result.practice,
      result.patients,
      result.appointments,
      memberships,
      { fromIso: DEFAULT_SIM_CONFIG.todayIso, toIso: "2027-12-31" },
    );

    expect(report.conditions.length).toBeGreaterThan(1);
    // The property that only exists with several registers: some patients are in more than
    // one cohort, so the rows must not be summed.
    expect(report.overlapCount).toBeGreaterThan(0);
  }, 60_000);
});

describe("W75 report", () => {
  it("generates a report from the run", () => {
    const result = runSim(CONFIG);
    const layer = buildRegisterLayer(result.patients, MULTI, CONFIG.seed, DEFAULT_SIM_CONFIG.todayIso);
    const violations = checkInvariants(result);

    const gapsPerCondition = conditionsOf(MULTI).map((spec) => ({
      code: spec.conditionCode as string,
      months: spec.intervalMonths,
      share: spec.flaggedShare,
      gaps: layer.gaps.filter((g) => g.conditionCode === spec.conditionCode).length,
    }));

    const perPatient = new Map<string, number>();
    for (const gap of layer.gaps) {
      perPatient.set(gap.patientId as string, (perPatient.get(gap.patientId as string) ?? 0) + 1);
    }
    const onSeveral = [...perPatient.values()].filter((n) => n > 1).length;

    const report = [
      `# Multi-condition register simulation — ${CONFIG.weeks} weeks (synthetic)`,
      ``,
      `Three registers active at once on seed ${CONFIG.seed}. W63 showed one register does not`,
      `break the loop; this run exists to exercise what only appears with several — patients on`,
      `more than one register, and the double-contact and double-counting that invites.`,
      ``,
      `| Register | Cadence | Flagged share | Open gaps at start |`,
      `|---|---|---|---|`,
      ...gapsPerCondition.map((g) => `| ${g.code} | ${g.months} months | ${(g.share * 100).toFixed(0)}% | ${g.gaps} |`),
      ``,
      `Register members: ${layer.memberIds.size.toLocaleString("en-AU")}, of whom ` +
        `${onSeveral.toLocaleString("en-AU")} are on more than one register. Their appointments ` +
        `count toward every register they are on, which is why cohort figures are never summed ` +
        `to a practice total.`,
      ``,
      `Invitations sent: ${result.totals.invitationsSent.toLocaleString("en-AU")}.`,
      `Opt-outs: ${result.totals.optedOut}. Generated bookings attended: ${result.totals.attendedGenerated}.`,
      ``,
      violations.length === 0
        ? `Invariants: held — checked with the same checkInvariants() the fleet run uses, ` +
          `not asserted in prose.`
        : `Invariants: VIOLATED — ${violations.join("; ")}`,
      ``,
      `Synthetic data only. The register fixtures carry placeholder cadences, not clinical ` +
        `guidance; real intervals arrive with W56 behind the G5 ruling.`,
      ``,
    ].join("\n");

    const dir = path.resolve(__dirname, "../../reports");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "registers-w75.md"), report);

    // The report must not be able to claim invariants held without them holding.
    expect(violations).toEqual([]);
    expect(report).toContain("Invariants: held");
    expect(report).toContain("are on more than one register");
    expect(onSeveral).toBeGreaterThan(0);
  }, 60_000);
});
