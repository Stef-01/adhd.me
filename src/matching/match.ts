// W214: deterministic slot assignment, built through W213's floor.
//
// The matcher itself. W213 landed the explainability floor first and made the central guarantee
// structural: a matcher receives a `MatchCandidate`, which has nowhere to put a clinical attribute,
// so "position does not depend on need" is a property of the type rather than of this file's
// current implementation. Nothing here re-checks that, because there is nothing here that could
// break it — the only way to weigh a condition would be to widen W213's interface.
//
// WHAT THIS UNIT HAD TO DECIDE, in order.
//
//   ORDER-INDEPENDENCE IS THE HARD PART, AND IT IS ABOUT TIES. A greedy pass over candidates is
//   only a function of the input SET if every comparison it makes is total. Two ties exist and
//   both are real: two candidates with the same number of feasible slots, and two slots at the
//   same instant. Each is broken on an identifier — `candidateRef`, then `slotId` — and **the
//   tie-break is arbitrary on purpose**. Any tie-break that meant something would be a judgement
//   about who deserves an appointment more, which is the one thing this matcher must not contain.
//   W189 made the same argument about directory ordering. The register in W167 carries this
//   module, and a shuffled-input test asserts the property rather than trusting the sorts.
//
//   FEASIBLE COUNTS ARE COMPUTED ONCE, AND THE REASON IS NOT THE OBVIOUS ONE. The first draft of
//   this note said recomputing them as slots fill would reintroduce order-dependence. That is
//   false, and a mutation check is what showed it: the priority sort runs to completion before
//   the first assignment, so there is nothing for a live recount to depend on, and selecting the
//   fewest-remaining each round would be deterministic too. The real reason is MEANING. W213's
//   copy tells a practice an appointment "went to somebody who had fewer options", and with a
//   static count that sentence is about the options they were OFFERED. Recomputing would silently
//   change it to options still left, which is a different claim about a different person, and the
//   copy would have to change with it. Recorded because an overstated justification is worse than
//   none: the next reader would have trusted it.
//
//   FEWEST OPTIONS FIRST, AND IT IS NOT AN OPTIMISER. Candidates who can take fewer of the offered
//   appointments go first, so a slot that only one person can use is not spent on somebody with
//   five choices. This is greedy and it is **not guaranteed to be the maximum matching** — a
//   maximum one exists, via augmenting paths, and it would sometimes offer one more appointment.
//   It is deliberately not used: the reason a person did not get a slot would become "a chain of
//   reassignments elsewhere", which cannot be rendered as one sentence a practice manager reads,
//   and an unexplainable optimum is exactly what W213's floor exists to prevent. Stated rather
//   than left for a reader to assume optimality.
//
//   TENANCY IS IN THE QUERY, NOT AFTER IT. A candidate is only ever offered slots at their own
//   practice, filtered where the slots are selected rather than checked afterwards — W123's rule,
//   and the shape whose absence produced Y4-1.
//
// NAMED AND NOT FIXED HERE, because it is not this unit's to fix. W213 flagged that
// `rankCandidates` in `src/engine/pool.ts` has ordered chronic-care patients first since W5 and
// still feeds the LIVE invitation pool, and left the decision to this unit. Reading it against
// what the product now publishes makes it sharper than a code smell: W201's ADM notice says, in
// its *never automated* list, "No ordering of patients by need or by how unwell they are" — and
// `rankCandidates` orders on `chronicCare` and then on time since last visit, whose own comment
// reads "older date = longer overdue = first". **That is a contradiction inside a published legal
// notice, not a preference**, and resolving it means either changing who gets invited or changing
// the notice. Both are the founder's. It is recorded as a latent finding (W210, `MATCH-1`) with a
// trigger that fires the day this matcher becomes the live path, and priced by W216.

import {
  type MatchCandidate,
  type MatchDecision,
  type MatchReason,
  type MatchSlot,
} from "./explain";

export interface MatchConfig {
  /** How many offers a practice lets one person hold at once. A practice setting, not a judgement. */
  outstandingOfferLimit: number;
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = { outstandingOfferLimit: 2 };

/** The slots a candidate could actually take, at their own practice, in a fixed order. */
function feasibleSlots(candidate: MatchCandidate, slots: readonly MatchSlot[]): MatchSlot[] {
  const admitted = new Set(candidate.availableSlotIds);
  return slots
    .filter((slot) => slot.practiceId === candidate.practiceId && admitted.has(slot.slotId))
    .sort((a, b) => (a.startsAt === b.startsAt ? a.slotId.localeCompare(b.slotId) : a.startsAt.localeCompare(b.startsAt)));
}

/**
 * Assign offered appointments to candidates.
 *
 * Returns exactly one decision per candidate, matched or not, each carrying a reason from W213's
 * closed vocabulary — so the result can be handed straight to `explainPlan`, which refuses a plan
 * that leaves anybody out.
 */
export function matchSlots(
  candidates: readonly MatchCandidate[],
  slots: readonly MatchSlot[],
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
): MatchDecision[] {
  const decisions = new Map<string, MatchDecision>();
  const taken = new Set<string>();

  // Computed once, over the full offered set, before anything is assigned. See the module note:
  // recomputing these as slots fill is how input order creeps back in behind total-looking sorts.
  const feasible = new Map<string, MatchSlot[]>();
  const eligible: MatchCandidate[] = [];

  for (const candidate of candidates) {
    if (candidate.outstandingOffers >= config.outstandingOfferLimit) {
      decisions.set(candidate.candidateRef, {
        candidateRef: candidate.candidateRef,
        slotId: null,
        reason: "outstanding_offers_at_the_practice_limit",
      });
      continue;
    }
    const options = feasibleSlots(candidate, slots);
    if (options.length === 0) {
      decisions.set(candidate.candidateRef, {
        candidateRef: candidate.candidateRef,
        slotId: null,
        reason: "no_offered_slot_within_recorded_availability",
      });
      continue;
    }
    feasible.set(candidate.candidateRef, options);
    eligible.push(candidate);
  }

  // Fewest options first; ties broken on the identifier, which is arbitrary and says so.
  const order = [...eligible].sort((a, b) => {
    const optionsA = feasible.get(a.candidateRef)!.length;
    const optionsB = feasible.get(b.candidateRef)!.length;
    return optionsA === optionsB
      ? a.candidateRef.localeCompare(b.candidateRef)
      : optionsA - optionsB;
  });

  const slotsAtPractice = (practiceId: string) => slots.filter((s) => s.practiceId === practiceId);

  for (const candidate of order) {
    const options = feasible.get(candidate.candidateRef)!;
    const free = options.filter((slot) => !taken.has(slot.slotId));
    const first = free[0];

    if (!first) {
      // Two different facts, and the copy for each says something different to a practice.
      const anySlotLeft = slotsAtPractice(candidate.practiceId).some((s) => !taken.has(s.slotId));
      decisions.set(candidate.candidateRef, {
        candidateRef: candidate.candidateRef,
        slotId: null,
        reason: anySlotLeft ? "every_slot_they_could_take_was_assigned" : "fewer_slots_than_candidates",
      });
      continue;
    }

    taken.add(first.slotId);
    const wasTheirEarliest = options[0]!.slotId === first.slotId;
    decisions.set(candidate.candidateRef, {
      candidateRef: candidate.candidateRef,
      slotId: first.slotId,
      reason: wasTheirEarliest
        ? "earliest_slot_the_candidate_can_take"
        : "earliest_remaining_after_earlier_slots_were_assigned",
    });
  }

  // Emitted in candidate-ref order, so the returned array is a value rather than a rendering of
  // the order the greedy happened to run in. The assignment itself is already order-independent;
  // this makes the SHAPE of the result order-independent too, which is what a golden compares.
  return [...decisions.values()].sort((a, b) => a.candidateRef.localeCompare(b.candidateRef));
}

/** Reasons this matcher can actually produce, declared so the test can check it both ways. */
export const REASONS_THIS_MATCHER_PRODUCES: readonly MatchReason[] = [
  "earliest_remaining_after_earlier_slots_were_assigned",
  "earliest_slot_the_candidate_can_take",
  "every_slot_they_could_take_was_assigned",
  "fewer_slots_than_candidates",
  "no_offered_slot_within_recorded_availability",
  "outstanding_offers_at_the_practice_limit",
];
