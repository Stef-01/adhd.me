// W70: condition-aware guardrails — per-register opt-out and complaint monitors.
//
// W16 watches the practice as a whole, and that is exactly how a bad register hides. A
// register covering a tenth of the panel can be generating unwelcome messages at five times
// the practice-wide rate and still sit under a 2% practice threshold, because the other nine
// tenths dilute it. By the time the aggregate moves, everyone on that register has already
// been messaged.
//
// So the thresholds are evaluated per register as well as overall. Two design choices:
//
//   * The THRESHOLD LOGIC IS NOT REIMPLEMENTED. Each register's metrics go through W16's
//     `evaluateGuardrails`, so warning bands, severities and wording stay identical and a
//     change to the practice-wide rule automatically applies per register. This module only
//     splits the metrics and labels the results.
//   * A SMALL REGISTER DOES NOT GET A LOUD ALARM. One opt-out from four invitations is 25%,
//     which would scream past any threshold while meaning nothing. Below a stated minimum of
//     invitations a register reports `insufficient_data` instead of an alert — the same
//     posture W64 and W72 take when a cohort is too thin to carry a claim.
//
// Nothing here reads a patient's condition into a message. W66 settled that condition context
// never reaches patient-facing copy; this is an internal safety signal about which register
// triggered a send, which is a different thing.

import {
  evaluateGuardrails,
  type GuardrailAlert,
  type GuardrailConfig,
  type GuardrailMetrics,
} from "./monitors";

/** Invitations a register must have sent before its rates are treated as signal. */
export const MIN_INVITATIONS_FOR_ALERT = 25;

export interface ConditionGuardrailMetrics extends GuardrailMetrics {
  conditionCode: string;
}

export interface ConditionGuardrailResult {
  conditionCode: string;
  alerts: GuardrailAlert[];
  /** True when the register has not sent enough invitations to judge. */
  insufficientData: boolean;
  invitationsSent: number;
}

export interface ConditionGuardrailOptions {
  minInvitations?: number;
}

export interface ConditionGuardrailReport {
  /** Per-register results, worst first so a reader meets the problem before the noise. */
  byCondition: ConditionGuardrailResult[];
  /** Registers currently breaching a threshold at critical severity. */
  criticalConditions: string[];
  /**
   * True when at least one register is critical. The practice-wide monitors can be clear
   * while this is true — that is the entire point of the unit.
   */
  anyCritical: boolean;
}

const SEVERITY_RANK = { critical: 2, warning: 1 } as const;

function worstSeverity(alerts: readonly GuardrailAlert[]): number {
  return alerts.reduce((worst, a) => Math.max(worst, SEVERITY_RANK[a.severity]), 0);
}

export function evaluateConditionGuardrails(
  metrics: readonly ConditionGuardrailMetrics[],
  config: GuardrailConfig,
  options: ConditionGuardrailOptions = {},
): ConditionGuardrailReport {
  const minInvitations = options.minInvitations ?? MIN_INVITATIONS_FOR_ALERT;

  const byCondition: ConditionGuardrailResult[] = metrics.map((m) => {
    const insufficientData = m.invitationsSent < minInvitations;
    return {
      conditionCode: m.conditionCode,
      // Suppress rate alerts on a register too small to judge, but never suppress a
      // complaint: a complaint is an event, not a rate, and one is always worth hearing.
      alerts: insufficientData
        ? evaluateGuardrails({ ...m, invitationsSent: 0, generatedAttended: 0, generatedDna: 0 }, config)
        : evaluateGuardrails(m, config),
      insufficientData,
      invitationsSent: m.invitationsSent,
    };
  });

  byCondition.sort((a, b) => {
    const bySeverity = worstSeverity(b.alerts) - worstSeverity(a.alerts);
    if (bySeverity !== 0) return bySeverity;
    return a.conditionCode.localeCompare(b.conditionCode);
  });

  const criticalConditions = byCondition
    .filter((c) => c.alerts.some((a) => a.severity === "critical"))
    .map((c) => c.conditionCode);

  return { byCondition, criticalConditions, anyCritical: criticalConditions.length > 0 };
}

/**
 * Split a run's invitations into per-register metrics.
 *
 * `registerOf` maps an invitation to the register that triggered it; invitations with no
 * register (ordinary availability sends) are not attributed to one, because counting them
 * against a register would let unrelated volume mask that register's rate.
 */
export function conditionMetricsFrom(
  invitations: readonly {
    id: string;
    practiceId?: string;
    patientId: string;
    status: string;
    generatedDna?: boolean;
    attended?: boolean;
  }[],
  registerOf: (invitationId: string) => string | null,
  openComplaintsByCondition: Readonly<Record<string, number>> = {},
  /**
   * Required to scope, mirroring closuresFromAppointments. Omit only for single-tenant
   * data. W65 found the unscoped form of this bug twice and W78 found a third, so the
   * filter is offered here before a fleet-wide caller exists rather than after.
   */
  practiceId?: string,
): ConditionGuardrailMetrics[] {
  const byCondition = new Map<string, ConditionGuardrailMetrics>();
  // Opt-outs are counted as DISTINCT PATIENTS, not invitations. A STOP closes every
  // outstanding invitation that patient holds (W6 handleStop), so counting statuses would
  // charge one person's decision to every register they happen to be on — inflating each
  // register's rate and letting a single STOP trip several alarms at once. This also keeps
  // the numerator identical in kind to W16's practice-wide one, which is what makes the
  // per-register rate comparable to the same threshold.
  const optedOutPatients = new Map<string, Set<string>>();

  const bucket = (code: string): ConditionGuardrailMetrics => {
    const existing = byCondition.get(code);
    if (existing) return existing;
    const created: ConditionGuardrailMetrics = {
      conditionCode: code,
      invitationsSent: 0,
      optedOut: 0,
      generatedAttended: 0,
      generatedDna: 0,
      openComplaints: openComplaintsByCondition[code] ?? 0,
    };
    byCondition.set(code, created);
    return created;
  };

  for (const invitation of invitations) {
    if (
      practiceId !== undefined &&
      invitation.practiceId !== undefined &&
      invitation.practiceId !== practiceId
    ) {
      continue;
    }
    const code = registerOf(invitation.id);
    if (code === null) continue;
    const m = bucket(code);
    if (invitation.status !== "queued") m.invitationsSent += 1;
    if (invitation.status === "opted_out") {
      const seen = optedOutPatients.get(code) ?? new Set<string>();
      seen.add(invitation.patientId);
      optedOutPatients.set(code, seen);
    }
    if (invitation.attended === true) m.generatedAttended += 1;
    if (invitation.generatedDna === true) m.generatedDna += 1;
  }

  for (const [code, patients] of optedOutPatients) bucket(code).optedOut = patients.size;

  // A register with complaints but no invitations still has to appear, or a complaint
  // about a register we have stopped sending on would vanish from the report.
  for (const code of Object.keys(openComplaintsByCondition)) bucket(code);

  return [...byCondition.values()];
}
