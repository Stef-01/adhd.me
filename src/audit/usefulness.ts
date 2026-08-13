// W15: usefulness-audit capture — the GP's one-tap record of what a generated
// visit actually achieved (venture brief §Phase 1: the usefulness audit is how we
// prove the extra appointments were worth attending, not just attended). Pure
// validation + tallying here; storage in ./store, form in app/console/usefulness.

import type { AppointmentId, OutcomeRecord, PracticeId, VisitUsefulness } from "@/domain/types";

/** The audit's fixed option set, in display order, with GP-facing labels. */
export const USEFULNESS_OPTIONS: ReadonlyArray<{ value: VisitUsefulness; label: string }> = [
  { value: "medication_reviewed", label: "Medication reviewed" },
  { value: "investigation_ordered", label: "Investigation ordered" },
  { value: "preventive_care", label: "Preventive care" },
  { value: "care_plan_updated", label: "Care plan updated" },
  { value: "referral_made", label: "Referral made" },
  { value: "follow_up_arranged", label: "Follow-up arranged" },
  { value: "no_action_required", label: "No action needed" },
  { value: "unnecessary", label: "Visit was unnecessary" },
];

const VALID_VALUES = new Set<VisitUsefulness>(USEFULNESS_OPTIONS.map((o) => o.value));

export interface UsefulnessSubmission {
  appointmentId: string;
  usefulness: string[];
  clinicianJudgedReasonable: boolean;
}

export type ValidationError =
  | "unknown_option"
  | "unnecessary_conflict"
  | "reasonable_requires_action";

/**
 * Validate a raw submission against the audit's rules. Returns the normalised
 * OutcomeRecord, or the first rule it breaks:
 *  - every option must be a known category;
 *  - "unnecessary" can't be combined with a positive action (contradiction);
 *  - a visit judged reasonable must record at least one thing that happened.
 * An empty selection is allowed only when the visit is judged NOT reasonable
 * (the GP is recording "nothing useful happened").
 */
export function validateSubmission(
  submission: UsefulnessSubmission,
  practiceId: PracticeId,
): { ok: true; record: OutcomeRecord } | { ok: false; error: ValidationError } {
  const usefulness = submission.usefulness as VisitUsefulness[];
  for (const value of usefulness) {
    if (!VALID_VALUES.has(value)) return { ok: false, error: "unknown_option" };
  }
  const unique = [...new Set(usefulness)];
  const hasPositiveAction = unique.some((v) => v !== "no_action_required" && v !== "unnecessary");

  if (unique.includes("unnecessary") && hasPositiveAction) {
    return { ok: false, error: "unnecessary_conflict" };
  }
  if (submission.clinicianJudgedReasonable && !hasPositiveAction) {
    return { ok: false, error: "reasonable_requires_action" };
  }

  return {
    ok: true,
    record: {
      appointmentId: submission.appointmentId as AppointmentId,
      practiceId,
      usefulness: unique,
      clinicianJudgedReasonable: submission.clinicianJudgedReasonable,
    },
  };
}

export interface UsefulnessTally {
  audited: number;
  reasonable: number;
  reasonablePct: number;
  unnecessary: number;
  byCategory: Record<VisitUsefulness, number>;
}

/** Aggregate recorded outcomes for the dashboard/guardrail layers. */
export function tallyOutcomes(records: OutcomeRecord[]): UsefulnessTally {
  const byCategory = Object.fromEntries(
    USEFULNESS_OPTIONS.map((o) => [o.value, 0]),
  ) as Record<VisitUsefulness, number>;
  let reasonable = 0;
  let unnecessary = 0;
  for (const record of records) {
    if (record.clinicianJudgedReasonable) reasonable++;
    for (const value of record.usefulness) {
      byCategory[value]++;
      if (value === "unnecessary") unnecessary++;
    }
  }
  const audited = records.length;
  return {
    audited,
    reasonable,
    reasonablePct: audited === 0 ? 0 : Math.round((reasonable / audited) * 100),
    unnecessary,
    byCategory,
  };
}
