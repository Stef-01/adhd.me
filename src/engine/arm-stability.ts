// W175: a patient's arm must survive a vertical version change.
//
// The holdout arm is the measurement backbone. Incrementality (W9) is the difference between two
// groups, and the difference means nothing if the membership of either group moves during the
// period being measured. A patient who was in the control arm in March and the invited arm in
// April has been counted in both, and no amount of downstream arithmetic recovers from it.
//
// Q13 introduced the thing that could move them. A vertical (W157) bundles pathways, registers
// and material; W160 binds a practice to a version of one and migrates it to a later version.
// That migration is exactly the shape of change that quietly re-randomises a cohort.
//
// THE GOOD NEWS, AND WHY THIS UNIT IS MOSTLY ASSERTIONS: it cannot happen today, by construction.
// `assignmentUnit` hashes `practiceId:patientId` and nothing else, so no vertical, version or
// binding is an input to the draw. A version change cannot move an arm because the version is not
// part of what decides the arm.
//
// A property that holds by construction is worth exactly as much as the construction is stable,
// so this module exists to make the construction hard to change by accident:
//
//   THE ASSIGNMENT KEY IS PINNED AGAINST ITS OWN SOURCE. `arm-stability.test.ts` reads
//   `holdout.ts` and fails if it mentions a vertical, a version or a binding. The change this
//   guards against is not malice, it is a REASONABLE-SOUNDING IDEA: "different verticals should
//   get independent arms, so salt the hash with the vertical id". That one line silently
//   re-randomises every patient at every practice on every version change, and nothing else in
//   the tree would notice — the arms would still be balanced, still deterministic, still
//   auditable, and completely different from last month's.
//
//   AND THE INVARIANT IS CALLABLE. `assertArmsUnchanged` is a fail-closed guard a migration path
//   can hold, naming the patients whose arm moved rather than reporting that something did. It
//   throws rather than returning a list, for W6's reason: a finding nobody reads is not a gate.
//
// ONE PROPERTY THIS DOES NOT CLAIM. A patient who falls out of a vertical's scope keeps their
// arm, because the arm is a property of the patient and the practice, not of the vertical. That
// is deliberate and it is the measurement-safe direction: dropping people from the control arm
// exactly where the intervention changed is how a control group stops being one.

import type { Patient } from "@/domain/types";

export interface ArmMove {
  patientId: string;
  from: "holdout" | "invite";
  to: "holdout" | "invite";
}

const armOf = (patient: Patient): "holdout" | "invite" => (patient.holdout ? "holdout" : "invite");

/**
 * Patients whose arm differs between two snapshots of a panel.
 *
 * Matched by patient id rather than by position, because a migration may reorder the panel and a
 * positional comparison would report every patient as moved — or worse, miss a real move that
 * happened to be offset by another.
 *
 * A patient present in only one snapshot is NOT a move: arriving and leaving are different events
 * from switching arms, and reporting them here would bury the one this guard is about.
 */
export function armDrift(before: readonly Patient[], after: readonly Patient[]): ArmMove[] {
  const beforeById = new Map(before.map((p) => [p.id as string, p]));
  const moves: ArmMove[] = [];
  for (const patient of after) {
    const was = beforeById.get(patient.id as string);
    if (!was) continue;
    if (was.holdout !== patient.holdout) {
      moves.push({ patientId: patient.id as string, from: armOf(was), to: armOf(patient) });
    }
  }
  // Sorted, so two runs over the same drift report it identically regardless of panel order.
  return moves.sort((a, b) => a.patientId.localeCompare(b.patientId));
}

export class ArmDriftError extends Error {
  constructor(
    readonly context: string,
    readonly moves: readonly ArmMove[],
  ) {
    super(
      `${context}: ${moves.length} patient(s) changed arm — ` +
        moves.map((m) => `${m.patientId} ${m.from}→${m.to}`).join(", ") +
        ". The holdout arm is the measurement backbone; a patient counted in both arms cannot be " +
        "recovered by any downstream arithmetic.",
    );
    this.name = "ArmDriftError";
  }
}

/**
 * Fail-closed guard for a migration path.
 *
 * Throws rather than returning findings — W6's posture. A migration that moved somebody between
 * arms should not complete and leave a warning behind it.
 */
export function assertArmsUnchanged(
  before: readonly Patient[],
  after: readonly Patient[],
  context: string,
): void {
  const moves = armDrift(before, after);
  if (moves.length > 0) throw new ArmDriftError(context, moves);
}
