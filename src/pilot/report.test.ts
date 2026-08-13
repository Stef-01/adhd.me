import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import {
  buildPilotReport,
  renderPilotReportMarkdown,
  syntheticOutcomeRecords,
} from "./report";

describe("W35 pilot instrumentation", () => {
  const sim = runSim(DEFAULT_SIM_CONFIG);
  const records = syntheticOutcomeRecords(sim, 7);
  const report = buildPilotReport(sim, records);

  it("generates the full pilot report from sim", () => {
    expect(report.weeksSimulated).toBe(sim.totals.weeksSimulated);
    expect(report.invitationsSent).toBe(sim.totals.invitationsSent);
    expect(report.booked).toBeLessThanOrEqual(report.invitationsSent);
    expect(report.conversionRate).toBeGreaterThan(0);
    expect(report.conversionRate).toBeLessThanOrEqual(1);
  });

  it("carries the north star straight from attribution (never recomputed)", () => {
    expect(report.northStarIncrementalPer1000).toBe(sim.attribution.incrementalPer1000);
    expect(report.incrementalAttended).toBe(sim.attribution.incrementalAttended);
    expect(report.naiveGeneratedAttended).toBe(sim.attribution.naiveGeneratedAttended);
  });

  it("wires guardrails and usefulness", () => {
    expect(Array.isArray(report.guardrailAlerts)).toBe(true);
    expect(report.usefulness.audited).toBe(records.length);
    const byCategorySum = Object.values(report.usefulness.byCategory).reduce((a, b) => a + b, 0);
    expect(byCategorySum).toBe(records.length);
    expect(report.clinicianJudgedReasonableRate).toBeGreaterThan(0.7);
    expect(report.clinicianJudgedReasonableRate).toBeLessThanOrEqual(1);
  });

  it("estimates incremental revenue only when a holdout comparison exists", () => {
    if (report.incrementalAttended === null) {
      expect(report.estimatedIncrementalRevenue).toBeNull();
    } else {
      expect(report.estimatedIncrementalRevenue).toBeGreaterThan(0);
    }
  });

  it("synthetic outcome records are deterministic and cover attended generated visits", () => {
    const again = syntheticOutcomeRecords(sim, 7);
    expect(again).toEqual(records);
    const attendedGenerated = sim.appointments.filter(
      (a) => a.generatedByInvitation && a.status === "attended",
    ).length;
    expect(records).toHaveLength(attendedGenerated);
  });

  it("renders every §Pilot section in markdown", () => {
    const md = renderPilotReportMarkdown(report);
    for (const section of ["North star", "Funnel", "Guardrails", "Usefulness audit", "Economics"]) {
      expect(md).toContain(section);
    }
  });
});
