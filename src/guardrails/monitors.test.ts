import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import {
  DEFAULT_GUARDRAILS,
  evaluateGuardrails,
  metricsFromSim,
  type Complaint,
  type GuardrailMetrics,
} from "./monitors";

const QUIET: GuardrailMetrics = {
  invitationsSent: 1000,
  optedOut: 5, // 0.5%
  generatedAttended: 190,
  generatedDna: 10, // 5%
  openComplaints: 0,
};

const complaint = (status: Complaint["status"]): Complaint => ({
  id: "c-1",
  practiceId: "prac-1",
  at: "2026-08-08T09:00:00Z",
  channel: "phone",
  summary: "Unwanted message",
  status,
});

describe("W16 guardrail monitors — unit", () => {
  it("healthy metrics raise no alerts", () => {
    expect(evaluateGuardrails(QUIET, DEFAULT_GUARDRAILS)).toEqual([]);
  });

  it("opt-out rate: warning inside the band, critical at the threshold", () => {
    const warn = evaluateGuardrails({ ...QUIET, optedOut: 17 }, DEFAULT_GUARDRAILS); // 1.7%
    expect(warn).toMatchObject([{ monitor: "opt_out_rate", severity: "warning" }]);
    const crit = evaluateGuardrails({ ...QUIET, optedOut: 20 }, DEFAULT_GUARDRAILS); // exactly 2%
    expect(crit).toMatchObject([{ monitor: "opt_out_rate", severity: "critical" }]);
  });

  it("generated-DNA rate triggers on the generated denominator only", () => {
    const crit = evaluateGuardrails(
      { ...QUIET, generatedAttended: 90, generatedDna: 10 }, // 10% of generated
      DEFAULT_GUARDRAILS,
    );
    expect(crit).toMatchObject([{ monitor: "generated_dna_rate", severity: "critical" }]);
  });

  it("any open complaint is critical at the default zero tolerance; resolved ones are not", () => {
    const open = evaluateGuardrails({ ...QUIET, openComplaints: 1 }, DEFAULT_GUARDRAILS);
    expect(open).toMatchObject([{ monitor: "complaints", severity: "critical" }]);
    expect(evaluateGuardrails({ ...QUIET, openComplaints: 0 }, DEFAULT_GUARDRAILS)).toEqual([]);
  });

  it("no denominators, no alerts — a practice that has sent nothing is not in breach", () => {
    const silent: GuardrailMetrics = {
      invitationsSent: 0,
      optedOut: 0,
      generatedAttended: 0,
      generatedDna: 0,
      openComplaints: 0,
    };
    expect(evaluateGuardrails(silent, DEFAULT_GUARDRAILS)).toEqual([]);
  });
});

describe("W16 guardrail monitors — thresholds trigger in sim", () => {
  const weeks = 8; // enough loop volume to make the rates stable, quick enough for CI

  it("the healthy default sim stays quiet", () => {
    const result = runSim({ ...DEFAULT_SIM_CONFIG, weeks });
    const alerts = evaluateGuardrails(metricsFromSim(result, []), DEFAULT_GUARDRAILS);
    expect(alerts).toEqual([]);
  });

  it("a high-opt-out world trips the opt-out monitor", () => {
    const result = runSim({ ...DEFAULT_SIM_CONFIG, weeks, optOutRate: 0.06 });
    const alerts = evaluateGuardrails(metricsFromSim(result, []), DEFAULT_GUARDRAILS);
    expect(alerts).toMatchObject([{ monitor: "opt_out_rate", severity: "critical" }]);
  });

  it("a high-DNA world trips the generated-DNA monitor", () => {
    const result = runSim({ ...DEFAULT_SIM_CONFIG, weeks, dnaRate: 0.2 });
    const alerts = evaluateGuardrails(metricsFromSim(result, []), DEFAULT_GUARDRAILS);
    expect(alerts).toMatchObject([{ monitor: "generated_dna_rate", severity: "critical" }]);
  });

  it("an open complaint on an otherwise healthy sim alerts; resolving it clears the alert", () => {
    const result = runSim({ ...DEFAULT_SIM_CONFIG, weeks });
    const open = evaluateGuardrails(metricsFromSim(result, [complaint("open")]), DEFAULT_GUARDRAILS);
    expect(open).toMatchObject([{ monitor: "complaints", severity: "critical" }]);
    const resolved = evaluateGuardrails(
      metricsFromSim(result, [complaint("resolved")]),
      DEFAULT_GUARDRAILS,
    );
    expect(resolved).toEqual([]);
  });
});
