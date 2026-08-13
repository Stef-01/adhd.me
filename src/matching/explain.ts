// W213: the explainability floor for slot matching — built BEFORE the matcher that will need it.
//
// The order is the unit. W86 built routing explainability after routing existed, and it worked,
// but it worked because routing happened to be simple enough to explain afterwards. W214 is
// multi-constraint slot assignment, and an optimiser is exactly the thing that becomes
// unexplainable while nobody is looking: the first version explains itself, the second adds a
// tie-break, the third adds a fallback for the case the tie-break misses, and the fallback is
// where "the algorithm decided" gets shipped. So the floor lands first, and W214 has to be built
// through it.
//
// THREE THINGS THE FLOOR ENFORCES, each aimed at a specific way explanation is lost.
//
//   1. EXPLANATION IS TOTAL, NOT BEST-EFFORT. `MATCH_REASON_COPY` is a `Record` over the whole
//      union, so adding a reason without copy is a type error rather than an empty string at a
//      practice. W86's rule, restated here because a second surface would otherwise get its own
//      weaker version.
//
//   2. THERE IS NO FALLBACK BRANCH, and this file is checked for one. A `default:` case, a `??`
//      on a copy lookup, a `|| "unknown"` — each is how an unexplained decision becomes
//      renderable, and each reads in review as defensive programming. The test greps this
//      module's own source, because the rule is about what the code may CONTAIN, not about what
//      it currently returns.
//
//   3. EVERY CANDIDATE AND EVERY SLOT IS ACCOUNTED FOR, IN BOTH DIRECTIONS. A matcher that
//      silently drops a patient produces a plan that looks complete: the decisions it renders
//      are all correct, and the missing one is invisible precisely because there is nothing to
//      render. `floorVerdict` refuses such a plan rather than reporting on it. This is W102's
//      census applied to an algorithm's output instead of to a directory.
//
// AND THE THING THE FLOOR MAKES STRUCTURALLY IMPOSSIBLE. W214's gate says a patient's position
// must never depend on a clinical attribute, "asserted structurally rather than by inspection".
// Inspection is what fails: `rankCandidates` in `src/engine/pool.ts` has sorted chronic-care
// patients first since W5, and it is a reasonable-looking line of code that nobody has read as a
// clinical ordering. So a matcher here does not receive a `Patient`. It receives a
// `MatchCandidate`, which has nowhere to put `chronicCare` or `activeRecall`, and the only way
// to obtain one is `candidateFrom` — a deliberately lossy projection. Two patients differing
// only in a clinical marker project to the same candidate, which a test asserts by value.
//
// NAMED, NOT FIXED HERE: `rankCandidates` still orders by `chronicCare` and still feeds the live
// invitation pool. This unit does not touch it — changing the ordering that selects who is
// invited is W214's unit and its own decision — but the collision is recorded rather than left
// for W214 to rediscover. W145's rule: the thing you cannot yet fix is stated, not omitted.

import type { Patient } from "@/domain/types";

/**
 * Why a candidate was or was not matched to a slot.
 *
 * OPERATIONAL ONLY. Every member is a fact about capacity, configuration or contactability.
 * None is a fact about a person's health, and a test asserts the vocabulary stays that way —
 * this is the surface where a triage would first become expressible.
 */
export type MatchReason =
  /** Matched: the candidate could take this slot and it was the earliest one they could take. */
  | "earliest_slot_the_candidate_can_take"
  /** Matched: an earlier slot existed but was already assigned in this plan. */
  | "earliest_remaining_after_earlier_slots_were_assigned"
  /** Unmatched: the practice's recorded availability does not include any offered slot. */
  | "no_offered_slot_within_recorded_availability"
  /** Unmatched: every slot the candidate could take went to somebody who could take fewer. */
  | "every_slot_they_could_take_was_assigned"
  /** Unmatched: the candidate already has more outstanding offers than the practice allows. */
  | "outstanding_offers_at_the_practice_limit"
  /** Unmatched: there were fewer slots than candidates and this one was not reached. */
  | "fewer_slots_than_candidates";

/**
 * The sentence a practice reads.
 *
 * A `Record` over the union, so a new reason without copy fails to typecheck. That is the whole
 * mechanism — there is no runtime check here because there does not need to be one.
 */
export const MATCH_REASON_COPY: Record<MatchReason, string> = {
  earliest_slot_the_candidate_can_take:
    "This was the earliest offered appointment that fell inside the availability your practice has recorded for them.",
  earliest_remaining_after_earlier_slots_were_assigned:
    "An earlier appointment would also have suited them, and it went to somebody who had fewer options. This was the earliest one still free.",
  no_offered_slot_within_recorded_availability:
    "None of the offered appointments fell inside the availability your practice has recorded for them. Recording different availability would change this.",
  every_slot_they_could_take_was_assigned:
    "Every appointment they could have taken went to somebody with fewer options. Offering another appointment in the same window would change this.",
  outstanding_offers_at_the_practice_limit:
    "They already have as many outstanding offers as your practice allows at once. This is a limit your practice sets, and it can be changed in the rules.",
  fewer_slots_than_candidates:
    "There were fewer appointments than people who could take one, and this person was not reached. Nothing about them was weighed against anybody else.",
};

export const MATCHED_REASONS: readonly MatchReason[] = [
  "earliest_slot_the_candidate_can_take",
  "earliest_remaining_after_earlier_slots_were_assigned",
];

export const ALL_MATCH_REASONS = Object.keys(MATCH_REASON_COPY) as MatchReason[];

/**
 * Everything a matcher may see about a person. Deliberately NOT `Patient`.
 *
 * The absence is the point: there is no field here a clinical attribute could occupy, so
 * "position does not depend on need" is a property of the type rather than a property of the
 * current implementation. A later unit that wanted to weigh a condition would have to widen this
 * interface, which is a visible change to a declared shape — not a line added inside a sort.
 */
export interface MatchCandidate {
  candidateRef: string;
  practiceId: string;
  /** Slot ids the practice's recorded availability admits. Recorded by staff, never inferred. */
  availableSlotIds: readonly string[];
  /** How many offers this person already has open. A practice-set limit, not a judgement. */
  outstandingOffers: number;
}

/**
 * The only way to obtain a `MatchCandidate` from a patient record.
 *
 * Lossy on purpose, and the loss is the guarantee. `chronicCare`, `activeRecall`,
 * `lastAttendedAt` and `usualClinicianId` are not read: the first two are clinical markers, and
 * the second two are how a "reasonable" ordering by need gets in without looking like one —
 * "longest since last visit" is a proxy for need, and W5's ranker uses it today.
 */
export function candidateFrom(
  patient: Patient,
  availableSlotIds: readonly string[],
  outstandingOffers: number,
): MatchCandidate {
  return {
    candidateRef: patient.id,
    practiceId: patient.practiceId,
    availableSlotIds,
    outstandingOffers,
  };
}

/** One offered appointment. Thin on purpose: a matcher needs when it is, not what it is for. */
export interface MatchSlot {
  slotId: string;
  practiceId: string;
  startsAt: string;
}

export interface MatchDecision {
  candidateRef: string;
  /** Null when unmatched. A decision is rendered either way — W86's rule about kept decisions. */
  slotId: string | null;
  reason: MatchReason;
}

export interface MatchExplanation {
  candidateRef: string;
  slotId: string | null;
  matched: boolean;
  /** One sentence a practice manager can read without training. Never empty. */
  headline: string;
}

/**
 * Render one decision.
 *
 * Every branch of `MatchReason` is covered by `MATCH_REASON_COPY`, so this cannot produce an
 * unexplained match. There is no `??`, no `default:` and no fallback string — see the module
 * note, and the test that greps this file for them.
 */
export function explainMatch(decision: MatchDecision): MatchExplanation {
  return {
    candidateRef: decision.candidateRef,
    slotId: decision.slotId,
    matched: decision.slotId !== null,
    headline: MATCH_REASON_COPY[decision.reason],
  };
}

export type FloorBreach =
  /** A candidate the matcher was given produced no decision at all. */
  | "candidate_with_no_decision"
  /** A decision naming a candidate that was never offered to the matcher. */
  | "decision_for_an_unknown_candidate"
  /** Two decisions for the same candidate: one of them is unexplained by construction. */
  | "candidate_decided_twice"
  /** A decision assigning a slot that was not offered. */
  | "decision_for_an_unknown_slot"
  /** Two candidates assigned the same slot. */
  | "slot_assigned_twice"
  /** A matched decision carrying a reason that describes not matching, or the reverse. */
  | "reason_contradicts_the_assignment";

export const MATCH_FLOOR_BREACH_COPY: Record<FloorBreach, string> = {
  candidate_with_no_decision:
    "The plan says nothing about somebody it was given. A missing decision is invisible on screen, because there is nothing to render.",
  decision_for_an_unknown_candidate:
    "The plan decides about somebody it was not given. Whatever that decision rests on, it is not this input.",
  candidate_decided_twice:
    "The plan decides twice about the same person. Whichever is rendered, the other is a decision nobody sees.",
  decision_for_an_unknown_slot:
    "The plan assigns an appointment that was not offered.",
  slot_assigned_twice:
    "The plan assigns one appointment to two people.",
  reason_contradicts_the_assignment:
    "The reason given describes the opposite of what was decided, so the explanation on screen would not be the explanation of this decision.",
};

export interface FloorVerdict {
  /** Empty when the plan is totally explained. Refusal is the point — see `explainPlan`. */
  breaches: { breach: FloorBreach; subject: string }[];
}

/**
 * Does this plan explain everything it was given?
 *
 * Checked in BOTH directions, because each catches a different failure. Candidates without
 * decisions are a matcher that dropped somebody; decisions without candidates are a matcher
 * deciding about an input it did not get. W102, W106 and W209 all found real defects only
 * because their registries ran both ways.
 */
export function floorVerdict(
  candidates: readonly MatchCandidate[],
  slots: readonly MatchSlot[],
  decisions: readonly MatchDecision[],
): FloorVerdict {
  const breaches: { breach: FloorBreach; subject: string }[] = [];
  const candidateRefs = new Set(candidates.map((c) => c.candidateRef));
  const slotIds = new Set(slots.map((s) => s.slotId));
  const decided = new Map<string, number>();
  const assigned = new Map<string, number>();

  for (const decision of decisions) {
    decided.set(decision.candidateRef, (decided.get(decision.candidateRef) ?? 0) + 1);
    if (!candidateRefs.has(decision.candidateRef)) {
      breaches.push({ breach: "decision_for_an_unknown_candidate", subject: decision.candidateRef });
    }
    if (decision.slotId !== null) {
      assigned.set(decision.slotId, (assigned.get(decision.slotId) ?? 0) + 1);
      if (!slotIds.has(decision.slotId)) {
        breaches.push({ breach: "decision_for_an_unknown_slot", subject: decision.slotId });
      }
    }
    const saysMatched = MATCHED_REASONS.includes(decision.reason);
    if (saysMatched !== (decision.slotId !== null)) {
      breaches.push({ breach: "reason_contradicts_the_assignment", subject: decision.candidateRef });
    }
  }

  for (const candidate of candidates) {
    if (!decided.has(candidate.candidateRef)) {
      breaches.push({ breach: "candidate_with_no_decision", subject: candidate.candidateRef });
    }
  }
  for (const [ref, count] of decided) {
    if (count > 1) breaches.push({ breach: "candidate_decided_twice", subject: ref });
  }
  for (const [slotId, count] of assigned) {
    if (count > 1) breaches.push({ breach: "slot_assigned_twice", subject: slotId });
  }

  // Sorted, so the verdict is a property of the plan rather than of the order the breaches were
  // discovered in — W167's rule, applied to a diagnostic rather than to a result.
  breaches.sort((a, b) => a.breach.localeCompare(b.breach) || a.subject.localeCompare(b.subject));
  return { breaches };
}

export class UnexplainedPlanError extends Error {}

/**
 * Explain a whole plan, or refuse it.
 *
 * THROWS rather than returning a partial rendering, because a partial rendering is precisely the
 * failure this unit exists to prevent: the decisions present would all render correctly, and the
 * dropped candidate would be invisible. W196 takes the same posture on a figure it cannot
 * evidence — refusing is louder than a caveat nobody reads.
 */
export function explainPlan(
  candidates: readonly MatchCandidate[],
  slots: readonly MatchSlot[],
  decisions: readonly MatchDecision[],
): MatchExplanation[] {
  const verdict = floorVerdict(candidates, slots, decisions);
  if (verdict.breaches.length > 0) {
    throw new UnexplainedPlanError(
      `this plan does not explain everything it was given: ${verdict.breaches
        .map((b) => `${b.breach} (${b.subject})`)
        .join("; ")}`,
    );
  }
  return decisions.map(explainMatch);
}
