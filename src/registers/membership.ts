// W57: register membership engine.
//
// Membership answers one question — is this patient on the practice's register for a
// condition? — and it answers it from two sources only: a condition flag the PMS already
// holds, or an explicit practice confirmation. That is the G7/TGA boundary, and it is held
// here the way W55 held it in the schema: there is no code path that infers membership, so
// "inferred from symptoms" is not a thing this module can be asked to do. The absence is
// the feature; `RegisterMembershipSource` has no inferential member and neither does this.
//
// What that rules out, concretely: no free-text or symptom parsing, no scoring, no "looks
// like" heuristic, no derivation from age/sex/medication/visit patterns. If the PMS does not
// flag the condition and the practice has not confirmed it, the patient is not a member —
// full stop, and `explain()` will say which of the two was missing.
//
// Removal keeps history. A patient who leaves a register gets `removedAt` set rather than
// the row deleted, because "was on this register until March" is the fact an audit needs,
// and a deleted row cannot be distinguished from one that never existed.

import type {
  ConditionCode,
  Patient,
  PatientId,
  PracticeId,
  RegisterMembership,
  RegisterMembershipSource,
} from "@/domain/types";

/**
 * A condition flag as the PMS holds it. `present` is the PMS's own boolean — this module
 * never decides it, it only reads it.
 */
export interface PmsConditionFlag {
  patientId: PatientId;
  conditionCode: ConditionCode;
  present: boolean;
}

/** A practice saying "yes, this patient belongs on this register" — the second sanctioned source. */
export interface PracticeConfirmation {
  patientId: PatientId;
  conditionCode: ConditionCode;
  confirmed: boolean;
  byEmail: string;
}

export interface MembershipInputs {
  practiceId: PracticeId;
  patients: readonly Patient[];
  conditionFlags: readonly PmsConditionFlag[];
  confirmations: readonly PracticeConfirmation[];
  /** Registers the practice has switched on (W60). A register that is off has no members. */
  enabledConditions: readonly ConditionCode[];
}

/**
 * W103: the key includes the PRACTICE.
 *
 * It did not, and `RegisterMembership` carries a practiceId, so `existing` spanning two
 * practices — which is what a store query naturally returns — collided on any shared patient
 * id. The consequence was not a stale read but a WRITE: practice A's derivation, not
 * containing practice B's patient, closed B's open row with a `removedAt`, quietly removing a
 * patient from a register belonging to a practice A cannot see. Fifth instance of the class
 * W91 documented, and the first that mutates another practice's data rather than reading it.
 */
function key(practiceId: string, patientId: string, conditionCode: string): string {
  return `${practiceId}::${patientId}::${conditionCode}`;
}

/**
 * Derive the membership set. Deterministic and pure: same inputs, same rows, in a stable
 * order, so the W10 spine can replay it and two runs can be compared.
 */
export function deriveMemberships(inputs: MembershipInputs, atIso: string): RegisterMembership[] {
  const known = new Set(inputs.patients.map((p) => p.id as string));
  const enabled = new Set(inputs.enabledConditions as readonly string[]);
  const rows = new Map<string, RegisterMembership>();

  // Practice confirmation is applied second so it can add a patient the PMS has not
  // flagged. It deliberately cannot REMOVE a PMS-flagged patient: unticking a box in
  // Meherr must not silently contradict the clinical record in the PMS.
  const add = (
    patientId: PatientId,
    conditionCode: ConditionCode,
    source: RegisterMembershipSource,
  ) => {
    if (!known.has(patientId as string)) return; // never invent a patient
    if (!enabled.has(conditionCode as string)) return;
    const k = key(inputs.practiceId as string, patientId as string, conditionCode as string);
    if (rows.has(k)) return; // first source wins; pms_condition_flag is applied first
    rows.set(k, {
      practiceId: inputs.practiceId,
      patientId,
      conditionCode,
      source,
      addedAt: atIso,
      removedAt: null,
    });
  };

  for (const flag of inputs.conditionFlags) {
    if (flag.present) add(flag.patientId, flag.conditionCode, "pms_condition_flag");
  }
  for (const c of inputs.confirmations) {
    if (c.confirmed) add(c.patientId, c.conditionCode, "practice_confirmed");
  }

  return [...rows.values()].sort((a, b) =>
    key(a.practiceId as string, a.patientId as string, a.conditionCode as string).localeCompare(
      key(b.practiceId as string, b.patientId as string, b.conditionCode as string),
    ),
  );
}

/**
 * Reconcile a fresh derivation against what was already stored: new rows are added, rows
 * whose basis has gone are closed with `removedAt`, and rows that persist keep their
 * ORIGINAL addedAt — "on the register since March" must not reset every ingest.
 */
export function reconcileMemberships(
  existing: readonly RegisterMembership[],
  derived: readonly RegisterMembership[],
  atIso: string,
  practiceId: PracticeId,
): RegisterMembership[] {
  // W103: the practice is an EXPLICIT parameter, not read off `derived[0]` the way W71 reads
  // it off the gaps. Deriving it would fail in exactly the dangerous case: `derived` is empty
  // precisely when this function's job is to CLOSE rows, so an inferred scope would be
  // unknown at the only moment it matters.
  const mine = (m: RegisterMembership) => m.practiceId === practiceId;

  const derivedByKey = new Map(
    derived
      .filter(mine)
      .map((m) => [key(m.practiceId as string, m.patientId as string, m.conditionCode as string), m]),
  );
  // Rows belonging to other practices are passed through UNCHANGED rather than dropped.
  // Dropping would be the W91 "a foreign record is absent" posture applied where it does real
  // damage: the natural call is `store = reconcile(store, ...)`, so "absent" would mean
  // deleted. Not this call's business is not the same as not there.
  const out: RegisterMembership[] = existing.filter((m) => !mine(m));
  const carried = new Set<string>();

  // Two passes. The first decides, per key, whether an OPEN row already exists — because a
  // patient who has closed and rejoined more than once has several closed rows, and reopening
  // once per closed row is how you end up with N live memberships for one patient. (That is
  // not hypothetical: a close/rejoin/close/rejoin cycle produced two open rows.)
  const hasOpen = new Set(
    existing
      .filter((r) => mine(r) && r.removedAt === null)
      .map((r) => key(r.practiceId as string, r.patientId as string, r.conditionCode as string)),
  );

  for (const row of existing.filter(mine)) {
    const k = key(row.practiceId as string, row.patientId as string, row.conditionCode as string);
    const stillDerived = derivedByKey.get(k);
    if (stillDerived && row.removedAt === null) {
      carried.add(k);
      out.push(row); // unchanged, original addedAt preserved
    } else if (row.removedAt === null) {
      out.push({ ...row, removedAt: atIso }); // basis gone — close, never delete
    } else {
      out.push(row); // already closed history, left alone
    }
  }

  // Reopen at most ONE row per key, and only when nothing is already open for it.
  for (const [k, row] of derivedByKey) {
    if (carried.has(k) || !hasOpen.has(k)) continue;
    out.push({ ...row, addedAt: atIso });
    carried.add(k);
  }

  for (const [k, row] of derivedByKey) if (!carried.has(k)) out.push(row);
  return out;
}

/** Members currently on a register — the count W60's console carries and W58 reads. */
export function currentMembers(
  memberships: readonly RegisterMembership[],
  practiceId: PracticeId,
  conditionCode: ConditionCode,
): RegisterMembership[] {
  // W103: scoped rather than trusted. The signature previously offered no way to scope at
  // all, so it could not be called correctly — a footgun waiting for its first caller.
  return memberships.filter(
    (m) => m.practiceId === practiceId && m.conditionCode === conditionCode && m.removedAt === null,
  );
}

export type MembershipReason =
  | "pms_condition_flag"
  | "practice_confirmed"
  | "no_condition_flag_and_no_confirmation"
  | "register_not_enabled"
  | "unknown_patient";

/**
 * Why this patient is or is not a member. Every register decision is explainable from the
 * record that caused it — a practice asking "why is she on this list?" gets the source,
 * and one asking "why isn't he?" gets the missing input rather than a shrug.
 */
export function explain(
  inputs: MembershipInputs,
  patientId: PatientId,
  conditionCode: ConditionCode,
): MembershipReason {
  if (!inputs.patients.some((p) => p.id === patientId)) return "unknown_patient";
  if (!(inputs.enabledConditions as readonly string[]).includes(conditionCode as string)) {
    return "register_not_enabled";
  }
  if (
    inputs.conditionFlags.some(
      (f) => f.patientId === patientId && f.conditionCode === conditionCode && f.present,
    )
  ) {
    return "pms_condition_flag";
  }
  if (
    inputs.confirmations.some(
      (c) => c.patientId === patientId && c.conditionCode === conditionCode && c.confirmed,
    )
  ) {
    return "practice_confirmed";
  }
  return "no_condition_flag_and_no_confirmation";
}
