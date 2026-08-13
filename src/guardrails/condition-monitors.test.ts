// W70 verify gate: thresholds trigger per condition — including when the practice-wide
// monitors are clear, which is the failure this unit exists to catch.

import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import {
  MIN_INVITATIONS_FOR_ALERT,
  type ConditionGuardrailMetrics,
  conditionMetricsFrom,
  evaluateConditionGuardrails,
} from "./condition-monitors";
import { DEFAULT_GUARDRAILS, evaluateGuardrails, metricsFromSim } from "./monitors";

function metrics(over: Partial<ConditionGuardrailMetrics> = {}): ConditionGuardrailMetrics {
  return {
    conditionCode: "cond_a",
    invitationsSent: 200,
    optedOut: 0,
    generatedAttended: 100,
    generatedDna: 0,
    openComplaints: 0,
    ...over,
  };
}

describe("W70 per-condition thresholds", () => {
  it("fires for the breaching register and not the healthy one", () => {
    const report = evaluateConditionGuardrails(
      [
        metrics({ conditionCode: "cond_bad", optedOut: 10 }), // 5% — over the 2% threshold
        metrics({ conditionCode: "cond_ok", optedOut: 1 }), // 0.5% — clear
      ],
      DEFAULT_GUARDRAILS,
    );

    expect(report.criticalConditions).toEqual(["cond_bad"]);
    expect(report.byCondition.find((c) => c.conditionCode === "cond_ok")!.alerts).toEqual([]);
  });

  it("catches a bad register the practice-wide monitor cannot see", () => {
    // The register is a tenth of the volume and opts out at 10×, yet the aggregate is
    // under threshold — the whole reason this unit exists.
    const bad = metrics({ conditionCode: "cond_bad", invitationsSent: 100, optedOut: 8 }); // 8%
    const rest = metrics({ conditionCode: "cond_ok", invitationsSent: 900, optedOut: 2 });

    const practiceWide = evaluateGuardrails(
      {
        invitationsSent: bad.invitationsSent + rest.invitationsSent,
        optedOut: bad.optedOut + rest.optedOut,
        generatedAttended: 0,
        generatedDna: 0,
        openComplaints: 0,
      },
      DEFAULT_GUARDRAILS,
    );
    expect(practiceWide).toEqual([]); // 1.0% overall — clear

    const report = evaluateConditionGuardrails([bad, rest], DEFAULT_GUARDRAILS);
    expect(report.anyCritical).toBe(true);
    expect(report.criticalConditions).toEqual(["cond_bad"]);
  });

  it("uses W16's thresholds rather than a second set", () => {
    // Same metrics through both paths must produce the same alert text and severity.
    const m = metrics({ optedOut: 10 });
    const direct = evaluateGuardrails(m, DEFAULT_GUARDRAILS);
    const perCondition = evaluateConditionGuardrails([m], DEFAULT_GUARDRAILS).byCondition[0]!.alerts;

    expect(perCondition).toEqual(direct);
  });

  it("reports the worst register first", () => {
    const report = evaluateConditionGuardrails(
      [
        metrics({ conditionCode: "cond_clear" }),
        metrics({ conditionCode: "cond_critical", optedOut: 10 }),
        metrics({ conditionCode: "cond_warning", optedOut: 4 }), // 2%·0.8 band
      ],
      DEFAULT_GUARDRAILS,
    );

    expect(report.byCondition.map((c) => c.conditionCode)).toEqual([
      "cond_critical",
      "cond_warning",
      "cond_clear",
    ]);
  });
});

describe("W70 small registers", () => {
  it("does not raise a rate alarm on too few invitations", () => {
    // 1 opt-out from 4 invitations is 25% and means nothing.
    const report = evaluateConditionGuardrails(
      [metrics({ invitationsSent: 4, optedOut: 1, generatedAttended: 0 })],
      DEFAULT_GUARDRAILS,
    );

    expect(report.byCondition[0]!.insufficientData).toBe(true);
    expect(report.byCondition[0]!.alerts).toEqual([]);
    expect(report.anyCritical).toBe(false);
  });

  it("still reports a complaint on a small register — a complaint is an event, not a rate", () => {
    const report = evaluateConditionGuardrails(
      [metrics({ invitationsSent: 3, openComplaints: 1 })],
      DEFAULT_GUARDRAILS,
    );

    expect(report.byCondition[0]!.insufficientData).toBe(true);
    expect(report.byCondition[0]!.alerts.map((a) => a.monitor)).toEqual(["complaints"]);
    expect(report.anyCritical).toBe(true);
  });

  it("the minimum is a stated option, not a hidden constant", () => {
    const thin = [metrics({ invitationsSent: 10, optedOut: 2 })];
    expect(evaluateConditionGuardrails(thin, DEFAULT_GUARDRAILS).byCondition[0]!.insufficientData).toBe(true);
    expect(
      evaluateConditionGuardrails(thin, DEFAULT_GUARDRAILS, { minInvitations: 5 }).byCondition[0]!
        .insufficientData,
    ).toBe(false);
    expect(MIN_INVITATIONS_FOR_ALERT).toBeGreaterThan(10);
  });
});

describe("W70 metric attribution", () => {
  it("attributes invitations to the register that triggered them", () => {
    const invitations = [
      { id: "i1", patientId: "p1", status: "sent" },
      { id: "i2", patientId: "p2", status: "opted_out" },
      { id: "i3", patientId: "p3", status: "sent" },
    ];
    const result = conditionMetricsFrom(invitations, (id) => (id === "i3" ? "cond_b" : "cond_a"));

    const a = result.find((m) => m.conditionCode === "cond_a")!;
    expect(a.invitationsSent).toBe(2);
    expect(a.optedOut).toBe(1);
    expect(result.find((m) => m.conditionCode === "cond_b")!.invitationsSent).toBe(1);
  });

  it("does not attribute ordinary availability sends to any register", () => {
    // Counting unrelated volume against a register would dilute its rate and hide it.
    const result = conditionMetricsFrom(
      [{ id: "i1", patientId: "p1", status: "sent" }, { id: "i2", patientId: "p2", status: "sent" }],
      (id) => (id === "i1" ? "cond_a" : null),
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.invitationsSent).toBe(1);
  });

  it("keeps a register visible when it has complaints but no sends", () => {
    const result = conditionMetricsFrom([], () => null, { cond_paused: 2 });
    expect(result.map((m) => m.conditionCode)).toEqual(["cond_paused"]);
    expect(result[0]!.openComplaints).toBe(2);
  });

  it("does not count a queued invitation as sent", () => {
    const result = conditionMetricsFrom([{ id: "i1", patientId: "p1", status: "queued" }], () => "cond_a");
    expect(result[0]!.invitationsSent).toBe(0);
  });
});

describe("W70 in the simulation", () => {
  // The sim's register layer currently carries ONE register (W63), so this asserts the
  // per-condition path over real run data end to end; the multi-register run arrives with
  // W75 and needs no change here, because the monitors are already keyed by condition.
  const result = runSim(DEFAULT_SIM_CONFIG);

  it("attributes a real run's invitations to a register and evaluates it", () => {
    const code = "placeholder_register_a";
    const invitations = result.invitations.map((i) => ({ id: i.id, patientId: i.patientId, status: i.status }));
    expect(invitations.length).toBeGreaterThan(0);

    const perCondition = conditionMetricsFrom(invitations, () => code);
    const report = evaluateConditionGuardrails(perCondition, DEFAULT_GUARDRAILS);

    expect(report.byCondition).toHaveLength(1);
    expect(report.byCondition[0]!.conditionCode).toBe(code);
    // The healthy reference practice must not trip a register alarm either.
    expect(report.anyCritical).toBe(false);
    // Attribution from invitation status UNDERCOUNTS opt-outs, and that is a real property
    // rather than a bug: a patient who sends STOP after their invitations have already
    // booked or expired leaves no invitation in the opted_out state, so there is nothing to
    // attribute to a register. The per-register total must therefore never EXCEED the
    // practice-wide one (which would mean double-counting a STOP across registers), and the
    // shortfall is the unattributable remainder. Practice-wide W16 remains the authority on
    // the total; these figures answer "which register" and cannot replace it.
    const practiceWideOptOuts = metricsFromSim(result, []).optedOut;
    expect(perCondition[0]!.optedOut).toBeLessThanOrEqual(practiceWideOptOuts);
    expect(perCondition[0]!.optedOut).toBeGreaterThan(0);
  });

  it("trips per condition when that register's opt-outs breach the threshold", () => {
    const invitations = result.invitations.map((i) => ({ id: i.id, patientId: i.patientId, status: i.status }));
    // Force a breach on one register only, leaving the rest of the run untouched.
    const half = Math.floor(invitations.length / 2);
    const seeded = invitations.map((inv, i) =>
      i < half ? { ...inv, status: "opted_out" } : inv,
    );

    const report = evaluateConditionGuardrails(
      conditionMetricsFrom(seeded, (id) =>
        Number(id.replace(/\D/g, "")) % 2 === 0 ? "cond_seeded" : "cond_clean",
      ),
      DEFAULT_GUARDRAILS,
    );

    expect(report.anyCritical).toBe(true);
    expect(report.criticalConditions.length).toBeGreaterThan(0);
  }, 30_000);
});

describe("W78 tenancy", () => {
  it("ignores another practice's invitations when a practice is named", () => {
    const invitations = [
      { id: "i1", practiceId: "prac-a", patientId: "shared", status: "opted_out" },
      { id: "i2", practiceId: "prac-b", patientId: "shared", status: "opted_out" },
    ];
    const scoped = conditionMetricsFrom(invitations, () => "cond_a", {}, "prac-a");

    expect(scoped[0]!.invitationsSent).toBe(1);
    expect(scoped[0]!.optedOut).toBe(1);
  });

  it("counts everything when no practice is named (single-tenant data)", () => {
    const invitations = [
      { id: "i1", practiceId: "prac-a", patientId: "p1", status: "sent" },
      { id: "i2", practiceId: "prac-b", patientId: "p2", status: "sent" },
    ];
    expect(conditionMetricsFrom(invitations, () => "cond_a")[0]!.invitationsSent).toBe(2);
  });
});
