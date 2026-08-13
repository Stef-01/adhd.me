// W16: guardrail monitors — the tripwires that protect patients and the practice's
// reputation: opt-out rate, complaints, and DNA on generated bookings. Monitors are pure
// functions over observed metrics so the sim (W12) can prove the thresholds actually fire;
// the admin console (W19) and weekly report (W20) surface the same alerts later.

import type { SimResult } from "@/sim/harness";

export interface Complaint {
  id: string;
  practiceId: string;
  at: string; // ISO datetime
  channel: "phone" | "email" | "front_desk" | "sms_reply";
  summary: string;
  status: "open" | "resolved";
}

export interface GuardrailConfig {
  /** Opt-outs as % of invitations sent — brief posture: anything near 2% is a stop signal. */
  maxOptOutRatePct: number;
  /** DNA as % of generated bookings — generated visits must not DNA worse than organic. */
  maxGeneratedDnaRatePct: number;
  /** Open complaints tolerated before alerting (0 = any complaint alerts). */
  maxOpenComplaints: number;
  /** Fraction of a threshold at which a warning fires ahead of critical. */
  warningBand: number;
}

export const DEFAULT_GUARDRAILS: GuardrailConfig = {
  maxOptOutRatePct: 2,
  maxGeneratedDnaRatePct: 10,
  maxOpenComplaints: 0,
  warningBand: 0.8,
};

export interface GuardrailMetrics {
  invitationsSent: number;
  optedOut: number;
  generatedAttended: number;
  generatedDna: number;
  openComplaints: number;
}

export type MonitorName = "opt_out_rate" | "generated_dna_rate" | "complaints";

export interface GuardrailAlert {
  monitor: MonitorName;
  severity: "warning" | "critical";
  value: number;
  threshold: number;
  message: string;
}

function rateAlert(
  monitor: MonitorName,
  numerator: number,
  denominator: number,
  thresholdPct: number,
  warningBand: number,
  label: string,
): GuardrailAlert | null {
  if (denominator === 0) return null; // nothing sent/booked — nothing to monitor yet
  const pct = (numerator / denominator) * 100;
  if (pct >= thresholdPct) {
    return {
      monitor,
      severity: "critical",
      value: pct,
      threshold: thresholdPct,
      message: `${label} at ${pct.toFixed(1)}% — threshold ${thresholdPct}% breached; pause and review`,
    };
  }
  if (pct >= thresholdPct * warningBand) {
    return {
      monitor,
      severity: "warning",
      value: pct,
      threshold: thresholdPct,
      message: `${label} at ${pct.toFixed(1)}% — approaching the ${thresholdPct}% threshold`,
    };
  }
  return null;
}

export function evaluateGuardrails(
  metrics: GuardrailMetrics,
  config: GuardrailConfig,
): GuardrailAlert[] {
  const alerts: GuardrailAlert[] = [];
  const optOut = rateAlert(
    "opt_out_rate",
    metrics.optedOut,
    metrics.invitationsSent,
    config.maxOptOutRatePct,
    config.warningBand,
    "Opt-out rate",
  );
  if (optOut) alerts.push(optOut);
  const dna = rateAlert(
    "generated_dna_rate",
    metrics.generatedDna,
    metrics.generatedAttended + metrics.generatedDna,
    config.maxGeneratedDnaRatePct,
    config.warningBand,
    "DNA rate on generated bookings",
  );
  if (dna) alerts.push(dna);
  if (metrics.openComplaints > config.maxOpenComplaints) {
    alerts.push({
      monitor: "complaints",
      severity: "critical",
      value: metrics.openComplaints,
      threshold: config.maxOpenComplaints,
      message: `${metrics.openComplaints} open complaint(s) — every complaint is reviewed before sending continues`,
    });
  }
  return alerts;
}

/** Guardrail metrics straight from a sim run plus the complaint log. */
export function metricsFromSim(result: SimResult, complaints: Complaint[]): GuardrailMetrics {
  return {
    invitationsSent: result.totals.invitationsSent,
    optedOut: result.totals.optedOut,
    generatedAttended: result.totals.attendedGenerated,
    generatedDna: result.totals.dnaGenerated,
    openComplaints: complaints.filter((c) => c.status === "open").length,
  };
}
