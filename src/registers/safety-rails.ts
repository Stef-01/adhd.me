// W68: clinical-safety rails.
//
// Some patients on a register should not receive an availability invitation at all — they
// should be routed to their usual GP. The classic shape is a red flag on the record: a
// marker that says "this person needs a conversation, not a booking link".
//
// Two things about this unit are deliberate and load-bearing.
//
// 1. THE RULES ARE DATA, AND THE DATA IS EMPTY. Deciding what constitutes a red flag for a
//    condition is clinical authorship, which is exactly what founder gate G5 covers — the
//    same gate W56's guideline intervals are blocked on. So this ships the MECHANISM and an
//    empty rule set, the pattern W55/W56/W60 already established. A test asserts emptiness,
//    so rules cannot arrive without the ruling. Loading real rules later is a data change.
//
// 2. EXCLUSION IS EVALUATED AHEAD OF RANKING, AND IT ROUTES RATHER THAN DROPS. A patient
//    excluded here is not silently removed from the world: `applySafetyRails` returns them
//    separately, with the flag that excluded them, so the practice sees "these four people
//    need a call" instead of those people quietly never being contacted. Silence is the
//    failure mode a safety rail is supposed to prevent, so a rail that produced it would be
//    worse than no rail.
//
// The rails are NOT symptom inference. A flag is a fact already on the patient's record
// (PMS-held or practice-set), exactly like W57's condition flags: this module reads flags,
// it never derives them, so the G7 boundary holds here the same way it holds there.

import type { ConditionCode, PatientId, PracticeId } from "@/domain/types";
import type { CareGap } from "./caregap";

/**
 * A red-flag marker on a patient's record. `flag` is an opaque code the PMS or the practice
 * sets; this module never interprets its clinical meaning, only whether it is present.
 */
export interface PatientSafetyFlag {
  practiceId: PracticeId;
  patientId: PatientId;
  flag: string;
  setAt: string;
}

/**
 * "For condition X, a patient carrying flag Y is routed to their usual GP."
 *
 * Authored as data so the rule set is reviewable as a list, and so adding one is not a code
 * change. `rationale` is required: a rail nobody can explain is a rail nobody can review.
 */
export interface SafetyRule {
  conditionCode: ConditionCode;
  flag: string;
  rationale: string;
}

/**
 * The shipped rule set. EMPTY pending the G5 ruling — a test pins this, so clinical content
 * cannot arrive by the back door. See the module note above.
 */
export const SHIPPED_SAFETY_RULES: readonly SafetyRule[] = [];

export interface RoutedPatient {
  patientId: PatientId;
  conditionCode: ConditionCode;
  flag: string;
  rationale: string;
}

export interface SafetyRailResult {
  /** Gaps that may proceed to ranking and invitation. */
  invitable: CareGap[];
  /**
   * Patients held back for a conversation with their usual GP. Surfaced, never dropped:
   * the practice must be able to see who was withheld and why.
   */
  routedToUsualGp: RoutedPatient[];
}

/**
 * Apply the rails to a gap set.
 *
 * Called BEFORE ranking (W61) and before narrowing feeds the pool, so a red-flagged patient
 * can never be ordered into a batch and then filtered out by luck of position — the
 * exclusion is a property of the set, not of where a patient happened to land in it.
 */
export function applySafetyRails(
  gaps: readonly CareGap[],
  flags: readonly PatientSafetyFlag[],
  rules: readonly SafetyRule[] = SHIPPED_SAFETY_RULES,
): SafetyRailResult {
  if (rules.length === 0) {
    // No authored rules means no rail fires. Stated explicitly rather than falling out of
    // the loop, because "the rails did nothing" must be an obvious readable state while
    // the rule set is empty, not something inferred from an empty result.
    return { invitable: [...gaps], routedToUsualGp: [] };
  }

  // Index flags per practice+patient, so one practice's flag cannot route another's patient.
  const flagsByPatient = new Map<string, Set<string>>();
  for (const f of flags) {
    const key = `${f.practiceId}::${f.patientId}`;
    const set = flagsByPatient.get(key) ?? new Set<string>();
    set.add(f.flag);
    flagsByPatient.set(key, set);
  }

  const rulesByCondition = new Map<string, SafetyRule[]>();
  for (const r of rules) {
    const list = rulesByCondition.get(r.conditionCode as string) ?? [];
    list.push(r);
    rulesByCondition.set(r.conditionCode as string, list);
  }

  const invitable: CareGap[] = [];
  const routedToUsualGp: RoutedPatient[] = [];

  for (const gap of gaps) {
    const patientFlags = flagsByPatient.get(`${gap.practiceId}::${gap.patientId}`);
    const applicable = rulesByCondition.get(gap.conditionCode as string) ?? [];
    const hit = patientFlags
      ? applicable.find((r) => patientFlags.has(r.flag))
      : undefined;
    if (hit) {
      routedToUsualGp.push({
        patientId: gap.patientId,
        conditionCode: gap.conditionCode,
        flag: hit.flag,
        rationale: hit.rationale,
      });
    } else {
      invitable.push(gap);
    }
  }

  return { invitable, routedToUsualGp };
}

/** Every rule must explain itself — enforced at load, like W56's provenance. */
export function loadSafetyRules(rows: readonly unknown[]): {
  rules: SafetyRule[];
  rejected: Array<{ index: number; reason: string }>;
} {
  const rules: SafetyRule[] = [];
  const rejected: Array<{ index: number; reason: string }> = [];
  rows.forEach((row, index) => {
    const r = row as Partial<SafetyRule>;
    if (typeof r?.conditionCode !== "string" || r.conditionCode.trim() === "") {
      rejected.push({ index, reason: "conditionCode missing" });
      return;
    }
    if (typeof r.flag !== "string" || r.flag.trim() === "") {
      rejected.push({ index, reason: "flag missing" });
      return;
    }
    if (typeof r.rationale !== "string" || r.rationale.trim().length < 10) {
      rejected.push({ index, reason: "rationale missing or too short to review" });
      return;
    }
    rules.push(r as SafetyRule);
  });
  return { rules, rejected };
}
