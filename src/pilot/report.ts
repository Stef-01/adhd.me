// W35: pilot instrumentation — one structured report wiring every venture-brief §Pilot metric
// from engines that already exist (sim harness, attribution v1, guardrail monitors, usefulness
// tally, MBS revenue estimation). Composition only: no metric is recomputed here.

import type { OutcomeRecord, VisitUsefulness } from "@/domain/types";
import type { SimResult } from "@/sim/harness";
import {
  DEFAULT_GUARDRAILS,
  evaluateGuardrails,
  metricsFromSim,
  type Complaint,
  type GuardrailAlert,
} from "@/guardrails/monitors";
import { tallyOutcomes, type UsefulnessTally } from "@/audit/usefulness";
import { DEFAULT_ASSUMPTIONS, estimateRevenuePerVisit } from "@/mbs/items";
import { mulberry32, pick } from "@/synthetic/rng";

export interface PilotReport {
  weeksSimulated: number;
  /** North star: incremental attended per 1,000 messaged-arm patients (null without holdout). */
  northStarIncrementalPer1000: number | null;
  incrementalAttended: number | null;
  naiveGeneratedAttended: number; // contrast figure only — never impact
  invitationsSent: number;
  booked: number;
  conversionRate: number; // booked / sent
  attendedGenerated: number;
  dnaGenerated: number;
  generatedDnaRate: number;
  optedOut: number;
  guardrailAlerts: GuardrailAlert[];
  usefulness: UsefulnessTally;
  clinicianJudgedReasonableRate: number | null;
  /** Estimated collected revenue for incremental attended visits (Level C blend). */
  estimatedIncrementalRevenue: number | null;
}

/**
 * Deterministic synthetic usefulness records for attended generated visits — stands in for the
 * W15 one-tap capture until a real pilot produces real records (founder gate G4). Distribution
 * is calibration, not clinical claim.
 */
export function syntheticOutcomeRecords(result: SimResult, seed: number): OutcomeRecord[] {
  const rng = mulberry32(seed);
  const attended = result.appointments.filter(
    (a) => a.generatedByInvitation && a.status === "attended",
  );
  const options: VisitUsefulness[] = [
    "medication_reviewed",
    "investigation_ordered",
    "preventive_care",
    "care_plan_updated",
    "follow_up_arranged",
    "no_action_required",
  ];
  return attended.map((a) => ({
    appointmentId: a.id,
    practiceId: a.practiceId,
    usefulness: [pick(rng, options)],
    clinicianJudgedReasonable: rng() < 0.9,
  }));
}

export function buildPilotReport(
  result: SimResult,
  outcomeRecords: OutcomeRecord[],
  complaints: Complaint[] = [],
): PilotReport {
  const { totals, attribution } = result;
  const alerts = evaluateGuardrails(metricsFromSim(result, complaints), DEFAULT_GUARDRAILS);
  const usefulness = tallyOutcomes(outcomeRecords);
  const judged = outcomeRecords.filter((r) => r.clinicianJudgedReasonable !== null);
  const reasonable = judged.filter((r) => r.clinicianJudgedReasonable === true).length;
  const revenuePerVisit = estimateRevenuePerVisit("36", DEFAULT_ASSUMPTIONS);
  return {
    weeksSimulated: totals.weeksSimulated,
    northStarIncrementalPer1000: attribution.incrementalPer1000,
    incrementalAttended: attribution.incrementalAttended,
    naiveGeneratedAttended: attribution.naiveGeneratedAttended,
    invitationsSent: totals.invitationsSent,
    booked: totals.booked,
    conversionRate: totals.invitationsSent === 0 ? 0 : totals.booked / totals.invitationsSent,
    attendedGenerated: totals.attendedGenerated,
    dnaGenerated: totals.dnaGenerated,
    generatedDnaRate:
      totals.attendedGenerated + totals.dnaGenerated === 0
        ? 0
        : totals.dnaGenerated / (totals.attendedGenerated + totals.dnaGenerated),
    optedOut: totals.optedOut,
    guardrailAlerts: alerts,
    usefulness,
    clinicianJudgedReasonableRate: judged.length === 0 ? null : reasonable / judged.length,
    estimatedIncrementalRevenue:
      attribution.incrementalAttended === null
        ? null
        : Math.round(attribution.incrementalAttended * revenuePerVisit * 100) / 100,
  };
}

export function renderPilotReportMarkdown(r: PilotReport): string {
  const lines = [
    `# Meherr pilot report (${r.weeksSimulated} weeks, synthetic)`,
    ``,
    `## North star`,
    `Incremental attended appointments per 1,000 patients in the messaged group: **${r.northStarIncrementalPer1000 ?? "n/a (no holdout)"}**`,
    `Incremental attended (scaled): ${r.incrementalAttended ?? "n/a"} · naive generated (contrast only): ${r.naiveGeneratedAttended}`,
    ``,
    `## Funnel`,
    `Invitations sent ${r.invitationsSent} → booked ${r.booked} (conversion ${(r.conversionRate * 100).toFixed(1)}%) → attended ${r.attendedGenerated} · DNA rate ${(r.generatedDnaRate * 100).toFixed(1)}%`,
    ``,
    `## Guardrails`,
    `Opt-outs: ${r.optedOut} · alerts: ${r.guardrailAlerts.length === 0 ? "none" : r.guardrailAlerts.map((a) => a.monitor).join(", ")}`,
    ``,
    `## Usefulness audit`,
    `Clinician judged reasonable: ${r.clinicianJudgedReasonableRate === null ? "n/a" : `${(r.clinicianJudgedReasonableRate * 100).toFixed(0)}%`}`,
    ``,
    `## Economics (estimation only)`,
    `Estimated incremental collected revenue: ${r.estimatedIncrementalRevenue === null ? "n/a" : `$${r.estimatedIncrementalRevenue}`}`,
  ];
  return lines.join("\n");
}
