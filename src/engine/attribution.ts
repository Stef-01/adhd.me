// W9: attribution v1 — incremental attended appointments, invite arm vs holdout arm.
// The product's honesty layer: Meherr claims only the difference between what the
// invite arm attended and what the holdout arm attended organically. Definitions are
// written law in docs/ATTRIBUTION.md (v1) — code and doc change together.

import type { Appointment, Patient, Practice } from "@/domain/types";

export const ATTRIBUTION_VERSION = "v1";

export interface MeasurementWindow {
  fromIso: string; // inclusive ISO date
  toIso: string; // inclusive ISO date
}

export interface ArmCount {
  /** Panel size of the arm (intention-to-treat: opt-outs and non-responders stay in). */
  patients: number;
  /** Attended appointments by the arm's patients inside the window — organic AND generated. */
  attended: number;
  /** Rate normalised for comparability across arm sizes. 0 when the arm is empty. */
  attendedPer1000: number;
}

export interface AttributionResult {
  version: typeof ATTRIBUTION_VERSION;
  window: MeasurementWindow;
  inviteArm: ArmCount;
  holdoutArm: ArmCount;
  /** invite rate − holdout rate; null when there is no holdout arm to compare against. */
  incrementalPer1000: number | null;
  /** Incremental rate scaled to the invite arm — the headline estimate. Null without a holdout. */
  incrementalAttended: number | null;
  /**
   * Attended appointments booked via a Meherr invitation, counted naively. Reported ONLY
   * as a contrast figure: it ignores displacement (patients who would have booked anyway),
   * so it must never be presented as impact. See docs/ATTRIBUTION.md §Never counts.
   */
  naiveGeneratedAttended: number;
}

function inWindow(appointment: Appointment, window: MeasurementWindow): boolean {
  const date = appointment.startsAt.slice(0, 10);
  return date >= window.fromIso && date <= window.toIso;
}

/**
 * Count attribution v1 for one practice over a window. Pure and total: every attended
 * appointment inside the window lands in exactly one arm (its patient's stored arm) or
 * is discarded because the patient is outside the panel.
 */
export function countAttribution(
  practice: Practice,
  patients: Patient[],
  appointments: Appointment[],
  window: MeasurementWindow,
): AttributionResult {
  const armOf = new Map<string, "holdout" | "invite">();
  let invitePatients = 0;
  let holdoutPatients = 0;
  for (const p of patients) {
    if (p.practiceId !== practice.id) continue;
    armOf.set(p.id, p.holdout ? "holdout" : "invite");
    if (p.holdout) holdoutPatients++;
    else invitePatients++;
  }

  let inviteAttended = 0;
  let holdoutAttended = 0;
  let naiveGeneratedAttended = 0;
  for (const a of appointments) {
    if (a.practiceId !== practice.id || a.status !== "attended" || a.patientId === null) continue;
    if (!inWindow(a, window)) continue;
    const arm = armOf.get(a.patientId);
    if (arm === undefined) continue; // outside the panel — never counts
    if (arm === "holdout") holdoutAttended++;
    else {
      inviteAttended++;
      if (a.generatedByInvitation) naiveGeneratedAttended++;
    }
  }

  const per1000 = (attended: number, size: number) => (size === 0 ? 0 : (attended / size) * 1000);
  const inviteArm: ArmCount = {
    patients: invitePatients,
    attended: inviteAttended,
    attendedPer1000: per1000(inviteAttended, invitePatients),
  };
  const holdoutArm: ArmCount = {
    patients: holdoutPatients,
    attended: holdoutAttended,
    attendedPer1000: per1000(holdoutAttended, holdoutPatients),
  };

  // No holdout arm → no counterfactual → no incrementality claim, ever.
  const incrementalPer1000 =
    holdoutPatients === 0 ? null : inviteArm.attendedPer1000 - holdoutArm.attendedPer1000;
  const incrementalAttended =
    incrementalPer1000 === null ? null : (incrementalPer1000 * invitePatients) / 1000;

  return {
    version: ATTRIBUTION_VERSION,
    window,
    inviteArm,
    holdoutArm,
    incrementalPer1000,
    incrementalAttended,
    naiveGeneratedAttended,
  };
}
