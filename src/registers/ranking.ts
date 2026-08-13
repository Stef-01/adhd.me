// W61: gap-aware pool ranking.
//
// Ranking decides who gets contacted FIRST. Eligibility (W4, narrowed by W59) decides who
// can be contacted AT ALL. This module only ever does the former, and the signature is what
// enforces it: `rankGapAware` takes an already-eligible list and returns a permutation of it.
// It cannot add a patient, cannot remove one, and therefore cannot turn a care gap into a
// reason to contact somebody the rules exclude — the same asymmetry W59 holds for
// eligibility, held here for ordering.
//
// The ordering itself extends W5's rule rather than replacing it. W5 ranks chronic-care
// first, then longest-since-visit, then id. W61 inserts one term ahead of those: patients
// with an open care gap sort before patients without. Within each group W5's order is
// preserved exactly, so with no gaps present the output is byte-identical to W5's — the
// register is an addition, not a rewrite, and a practice with registers switched off sees
// no behaviour change at all.
//
// This is recency and membership arithmetic, not clinical triage. A gap says a calendar
// interval has elapsed (W58); it never says a patient is sicker or more urgent than another.

import type { Patient } from "@/domain/types";
import { rankCandidates } from "@/engine/pool";
import type { CareGap } from "./caregap";

/**
 * Rank eligible patients, preferring those with an open care gap, then falling back to W5's
 * ordering within each group.
 *
 * Returns a permutation of `eligible` — same members, same length, reordered. Nothing else
 * is representable from this signature.
 */
export function rankGapAware(eligible: readonly Patient[], gaps: readonly CareGap[]): Patient[] {
  const withGap = new Set(gaps.map((g) => g.patientId as string));
  // Partition first, then apply W5's ranking to each side untouched. Doing it this way
  // rather than adding a comparator term keeps W5 the single definition of the base order:
  // if W5's rule changes, this inherits the change instead of drifting from it.
  const gapped = rankCandidates(eligible.filter((p) => withGap.has(p.id as string)));
  const rest = rankCandidates(eligible.filter((p) => !withGap.has(p.id as string)));
  return [...gapped, ...rest];
}

/**
 * How many of a ranked batch have an open gap — the figure the ops view reports so a
 * practice can see what the register actually changed about a send.
 */
export function gapShareOfBatch(batch: readonly Patient[], gaps: readonly CareGap[]): number {
  if (batch.length === 0) return 0;
  const withGap = new Set(gaps.map((g) => g.patientId as string));
  return batch.filter((p) => withGap.has(p.id as string)).length / batch.length;
}
