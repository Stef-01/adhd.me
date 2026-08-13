// W196: what a PHN or health system may be told.
//
// Q16 is the first time anything about a PRACTICE leaves this tree to an outside body — and the
// body it goes to also commissions services from that practice. Proposed gate G9 governs whether
// any of it is disclosed at all; this module is the shape it would take, built behind the gate the
// way W183's profile model was built behind G6.
//
// Three refusals, and the third is the one this unit exists for.
//
// EVERY FIGURE NAMES THE RECORDED FACTS IT COUNTS, OR IT IS NOT A FIGURE. A number handed to a
// commissioner with no basis attached is read as a measurement of care. W170 established the rule
// for outcomes and it is sharper here because the reader is not the practice: `Figure` cannot be
// constructed without a `RecordedBasis`, and a basis over zero records does not produce 0 — it
// produces a refusal that says so. **Zero is the most dangerous number this module could emit**,
// because "0 referrals completed" and "we have no record of any referral completing" are the same
// digit and opposite claims, and only one of them is true of a young rail.
//
// NO FIGURE IDENTIFIES A PATIENT, and the type has nowhere to put one. Not a filter, not a
// scrub — a `Figure` is a kind, a count and a basis, and there is no field a patient id could
// occupy. W106 classifies the record; this makes the disclosure shape incapable of carrying it.
//
// AND THE AGGREGATION FLOOR IS DECLARED DATA, NOT AN ARGUMENT. This is the whole point. A floor
// passed per report is a floor somebody tunes: you compute the cell, see it is 3, and pick 3. The
// tuning need not even be dishonest — "this one is fine, it's a big practice" is how it happens —
// and it is undetectable afterwards, because the report carries the number and not the decision.
// So `figure()` TAKES NO FLOOR PARAMETER. It reads `AGGREGATION_FLOORS`, which is a register with
// a written reason per kind, fixed before anybody has seen the data. A test asserts no exported
// function accepts one.
//
// W197 applies the floors and decides what suppression looks like. This unit only declares them,
// and the split is deliberate: the number that decides whether a cohort is publishable should not
// be authored in the same place as the logic that lets it through.

/**
 * What may be reported at all. A closed list, because "what else could we send them" is a
 * question that should require editing this file.
 */
export type FigureKind =
  /** How many referrals the practice recorded as written in the period. */
  | "referrals_written"
  /** How many of those the record shows reaching a completion event. */
  | "referrals_with_recorded_completion"
  /** How many patients are on a condition register, from PMS flags the practice already holds. */
  | "register_membership"
  /** How many care gaps the engine detected against a signed-off interval. */
  | "care_gaps_detected";

export const ALL_FIGURE_KINDS: readonly FigureKind[] = [
  "care_gaps_detected",
  "referrals_written",
  "referrals_with_recorded_completion",
  "register_membership",
];

/**
 * Where a figure came from.
 *
 * `recordedFacts` is the number of records the figure was computed over — not the figure itself.
 * The two differ, and the difference is what a reader needs: "4, computed over 12 recorded
 * referrals" is a fact, "4" is an impression.
 */
export interface RecordedBasis {
  /** The rail it was counted from, as the tree spells it. */
  source: string;
  /** How many records the count ranged over. Zero means there was nothing to count. */
  recordedFacts: number;
  /** The period the records cover. A count with no period is not checkable. */
  fromIso: string;
  toIso: string;
}

export interface Figure {
  kind: FigureKind;
  value: number;
  basis: RecordedBasis;
  /** The floor this kind is subject to, copied from the register so the report carries it. */
  floor: number;
}

export type FigureRefusal =
  /** The basis ranged over no records. A zero here would be read as a fact about care. */
  | "nothing_recorded"
  /** A figure cannot exceed the records it was computed from. */
  | "value_exceeds_basis"
  /** No period, or a period that runs backwards. */
  | "period_missing_or_unreadable"
  /** The basis does not name where it came from. */
  | "source_missing"
  /** The value is not a whole number at or above zero. NaN and negatives both land here. */
  | "value_not_a_count";

export type FigureResult =
  | { ok: true; figure: Figure }
  | { ok: false; errors: FigureRefusal[] };

/**
 * The smallest cohort each kind may describe, with the reason.
 *
 * Declared here, once, before any report exists. The floors differ by kind because the
 * re-identification risk does: a count of register membership describes people with a named
 * condition, which is the most re-identifying thing this product could disclose about a small
 * practice, while a count of referrals written describes an administrative act.
 *
 * These are the loop's proposal, not a ruling. G9 is unratified and the founder sets the numbers;
 * what this unit fixes is that they are SET somewhere a reviewer can read them, rather than
 * arriving as an argument at the call site.
 */
export const AGGREGATION_FLOORS: Readonly<Record<FigureKind, { floor: number; why: string }>> = {
  care_gaps_detected: {
    floor: 5,
    why: "A care gap is a condition plus an overdue interval, so a small cell names people with a condition. Same exposure as register membership, and the same floor.",
  },
  referrals_written: {
    floor: 5,
    why: "An administrative act rather than a clinical fact, but a count of 1 or 2 in a small practice is still traceable to individuals by anyone who knows the practice.",
  },
  referrals_with_recorded_completion: {
    floor: 5,
    why: "Same population as referrals written, and reported beside it — a floor that differed between the two would let the pair be differenced to recover a suppressed cell.",
  },
  register_membership: {
    floor: 5,
    why: "The most re-identifying figure here: it names how many people at a named practice have a named condition. If any floor is later raised, this is the one.",
  },
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Build a figure, or refuse it with every reason.
 *
 * NOTE WHAT IS ABSENT FROM THE SIGNATURE: there is no floor parameter, and no options object that
 * could grow one. The floor comes from the register. A caller cannot pass a different one, so
 * there is no call site at which a floor could be chosen after seeing the data.
 */
export function figure(kind: FigureKind, value: number, basis: RecordedBasis): FigureResult {
  const errors: FigureRefusal[] = [];

  if (basis.source.trim() === "") errors.push("source_missing");
  if (!ISO_DATE.test(basis.fromIso) || !ISO_DATE.test(basis.toIso) || basis.fromIso > basis.toIso) {
    errors.push("period_missing_or_unreadable");
  }
  // W205: a value must be a count before any of the arithmetic below means anything. NaN is the
  // dangerous one and it is dangerous silently — every comparison against NaN is false, so
  // `value > basis` did not catch it and W197's `value < floor` did not either. A NaN figure was
  // constructed and PUBLISHED past the floor. Negative counts are refused in the same check
  // because a count below zero is not a small cell, it is a broken caller.
  if (!Number.isInteger(value) || value < 0) errors.push("value_not_a_count");

  // Zero records is a refusal rather than a zero figure. See the module note: the two readings of
  // "0" are opposite claims and only the wrong one is flattering.
  if (basis.recordedFacts <= 0) errors.push("nothing_recorded");
  else if (value > basis.recordedFacts) errors.push("value_exceeds_basis");

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, figure: { kind, value, basis, floor: AGGREGATION_FLOORS[kind].floor } };
}

/**
 * Figures this model refuses to have a kind for, with the reason each is refused.
 *
 * Data rather than a comment, so the test reads the same list a human does and a future unit must
 * delete a stated refusal rather than quietly widen the enum.
 */
export const REFUSED_FIGURES: Readonly<Record<string, string>> = {
  per_clinician_anything:
    "W83 refused ranking clinicians internally and W184 refused comparative claims in public copy. A figure broken down by clinician, sent to the body that commissions the practice, is both of those at once and with consequences attached.",
  completion_rate:
    "A rate divides recorded completions by referrals written and silently treats every unrecorded outcome as a failure. W170 refused it inside the product; sending it to a commissioner would be the same error with money on it.",
  patient_demographics:
    "Age, sex and postcode bands are the classic re-identification vector in small-area health reporting, and none of them is needed to say how a practice's recall work is going.",
  named_conditions_below_floor:
    "The floors exist for this. A condition count is the most re-identifying figure the model has, and naming the condition is what makes a suppressed cell worth reconstructing.",
  comparison_with_other_practices:
    "Nothing here compares practices. A commissioner may hold several reports; this product will not do the ranking for them, which is W83's floor applied one level up.",
};

export const FIGURE_REFUSAL_COPY: Record<FigureRefusal, string> = {
  value_not_a_count:
    "A figure has to be a whole number of things that were counted. Anything else — a fraction, a negative, or an arithmetic result that came out as NaN — is a broken calculation rather than a small answer, and publishing it would put a number in front of a reader that no record supports.",
  nothing_recorded:
    "Nothing was recorded in this period, so there is no figure. This is not zero: zero would say the thing did not happen, and what is true is that the record does not show it happening.",
  value_exceeds_basis:
    "The figure is larger than the number of records it was computed from, which means one of the two is wrong.",
  period_missing_or_unreadable: "A figure with no readable period cannot be checked against anything.",
  source_missing: "The figure does not say which rail it was counted from, so nobody can go and look.",
};

/**
 * PROPOSED GATE G9 — nothing is disclosed.
 *
 * Empty, and pinned empty by its own test, the same posture as W183's profiles under G6 and the
 * pathway registries under G5. The model can exist before the ruling; the disclosure cannot.
 */
export const SHIPPED_DISCLOSURES: readonly Figure[] = [];
