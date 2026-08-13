// W170: what "this went somewhere" means, as a chain of recorded facts.
//
// Q14 is about auditing outcomes, and the first thing to get right is what an outcome IS. The
// tempting definition — "the chain reached its last stage" — makes a failure statistic out of a
// records gap. A referral with no completion event might have completed with nobody writing it
// down; a booked appointment with no attendance flag might have been attended. Counting those as
// "did not go anywhere" measures a practice's record-keeping and reports it as their care.
//
// So this module inherits W120's rule wholesale, because it is the same rule:
//
//   NOTHING RECORDED IS NOT RECORDED-DID-NOT-HAPPEN. A verdict has three values, never a
//   boolean. `reached` and `stopped` are both POSITIVE statements resting on an event somebody
//   wrote down. `not_recorded` is the honest third answer, and it is not a rounding error to be
//   folded into the bad one — on a young rail it will be most of the population.
//
// Three further decisions, each of which exists to stop a specific misreading.
//
//   EVERY VERDICT CITES ITS EVIDENCE. An `Outcome` carries the events it rests on, so a reader
//   can check it rather than believe it. A verdict that cannot name an event is `not_recorded` by
//   construction: there is no path through this module that returns `reached` with an empty
//   citation, which is why the citation is a field rather than a debugging aid.
//
//   THIS IS NOT A QUALITY MEASURE, AND THE SEPARATION IS STRUCTURAL. "The chain reached a
//   completion event" and "the care was useful" are different claims, and W15 already owns the
//   second one — a clinician's own judgement, recorded by them. Nothing here reads a narrative,
//   scores anything, or returns an assessment. A dashboard that blurred the two would present
//   records completeness as clinical quality, which is the most flattering possible error and the
//   hardest to notice.
//
//   THE CHAIN IS DECLARED, NOT HARDCODED. Booking (W10) and referrals (W93) already own their
//   state machines and this module does not re-implement either. It takes a `ChainDefinition` —
//   ordered stages, and for each the event kinds that evidence reaching it — so "what counts as
//   getting somewhere" is data a reviewer can read in one place.
//
// Order-independence is by construction rather than by tie-break: the verdict is the FURTHEST
// stage any recorded event evidences, which is a property of the set and cannot depend on the
// sequence the events arrive in. Two events at the same instant are not a tie here because
// nothing is being sorted (W167's register, W168's finding).

/** One recorded event. Deliberately thin: a kind, a time, and what it concerns. */
export interface RecordedEvent {
  chainId: string;
  kind: string;
  at: string;
}

/**
 * A stage of a chain, and what evidences arriving at it.
 *
 * `stopKinds` are events that say the chain ENDED here without going further — a cancellation, a
 * decline, an opt-out. They are positive statements too: "somebody recorded that this stopped" is
 * a fact, and it is a different fact from "nothing further was recorded".
 */
export interface ChainStage {
  stage: string;
  reachedBy: readonly string[];
  stoppedBy?: readonly string[];
}

export interface ChainDefinition {
  /** What this chain is, for the report that renders it. */
  name: string;
  /** In order. The last stage is what "went somewhere" means for this chain. */
  stages: readonly ChainStage[];
}

export type OutcomeVerdict =
  /** A recorded event evidences arrival at the final stage. */
  | "reached"
  /** A recorded event says it stopped before the end. A statement, not an absence. */
  | "stopped"
  /** Nothing recorded says either way. NOT a failure — see the module note. */
  | "not_recorded";

export interface Outcome {
  chainId: string;
  verdict: OutcomeVerdict;
  /** The furthest stage evidenced, or null when nothing evidences any stage. */
  furthestStage: string | null;
  /** The events this verdict rests on. Empty only when the verdict is `not_recorded`. */
  evidence: RecordedEvent[];
  /**
   * For a verdict short of `reached`: the event kinds that would settle it.
   *
   * W120's move — an unanswerable evaluation becomes a list of things to go and record, rather
   * than a number somebody has to interpret.
   */
  wouldSettleIt: string[];
}

/**
 * The outcome of one chain.
 *
 * Takes the events for a single chain and the definition of what its stages are. Never infers:
 * an event kind the definition does not mention contributes nothing, rather than being guessed at.
 */
export function outcomeOf(
  chainId: string,
  events: readonly RecordedEvent[],
  definition: ChainDefinition,
): Outcome {
  const mine = events.filter((event) => event.chainId === chainId);

  // The furthest stage anything evidences. A max over the set, so the answer cannot depend on
  // the order the events arrived in — there is no sort and no tie to break.
  let furthestIndex = -1;
  const reachedEvidence: RecordedEvent[] = [];
  const stopEvidence: RecordedEvent[] = [];

  for (const event of mine) {
    for (const [index, stage] of definition.stages.entries()) {
      if (stage.reachedBy.includes(event.kind)) {
        reachedEvidence.push(event);
        if (index > furthestIndex) furthestIndex = index;
      }
      if (stage.stoppedBy?.includes(event.kind)) stopEvidence.push(event);
    }
  }

  const finalIndex = definition.stages.length - 1;
  const furthestStage = furthestIndex >= 0 ? definition.stages[furthestIndex]!.stage : null;

  // W181: a chain with no stages would make `finalIndex` and `furthestIndex` both -1, and the
  // equality below would then return `reached` with an empty evidence list — a chain reported
  // as completed on the strength of nothing. The module's rule is that no path returns a
  // verdict without a citation, so a definition with no stages is refused rather than answered.
  if (definition.stages.length === 0) {
    throw new Error(
      `chain "${definition.name}" declares no stages, so no outcome can be evidenced. ` +
        "An empty definition cannot distinguish reached from not-recorded and must not answer.",
    );
  }

  // A stop is only meaningful short of the end: an event recording a cancellation AFTER the
  // chain demonstrably completed is a record to look at, not a reason to call the chain stopped.
  if (stopEvidence.length > 0 && furthestIndex < finalIndex) {
    return {
      chainId,
      verdict: "stopped",
      furthestStage,
      evidence: [...reachedEvidence, ...stopEvidence],
      wouldSettleIt: [],
    };
  }

  if (furthestIndex === finalIndex) {
    return { chainId, verdict: "reached", furthestStage, evidence: reachedEvidence, wouldSettleIt: [] };
  }

  return {
    chainId,
    verdict: "not_recorded",
    furthestStage,
    evidence: reachedEvidence,
    // What would settle it: the next stage's arrival kinds, and the ways THIS stage could be
    // recorded as stopping. Both are things somebody would have to write down.
    //
    // W181: the stop kinds come from the CURRENT stage, not the next one. `stoppedBy` is
    // matched against the stage it is declared on (see the scan above), so reading the next
    // stage's asked for a stop that stage does not own — a referral sitting at "written" was
    // told only that an appointment would settle it, never that a cancellation would, which is
    // the other half of the answer and the one that closes the chain.
    wouldSettleIt: [
      ...(definition.stages[furthestIndex + 1]?.reachedBy ?? []),
      ...(definition.stages[furthestIndex]?.stoppedBy ?? []),
    ],
  };
}

export interface OutcomeSummary {
  chainName: string;
  reached: number;
  stopped: number;
  /** Never merged into `stopped`. See the module note and the test that pins it. */
  notRecorded: number;
  total: number;
  /**
   * The sentence the summary must be read with.
   *
   * W96 learned it on a chart and W94 on barriers: a figure whose basis is invisible gets read as
   * a measurement. Here the specific misreading is expensive, so the denominator says it.
   */
  basis: string;
}

export function summarise(outcomes: readonly Outcome[], definition: ChainDefinition): OutcomeSummary {
  const count = (verdict: OutcomeVerdict) => outcomes.filter((o) => o.verdict === verdict).length;
  const notRecorded = count("not_recorded");
  return {
    chainName: definition.name,
    reached: count("reached"),
    stopped: count("stopped"),
    notRecorded,
    total: outcomes.length,
    basis:
      notRecorded > 0
        ? `${notRecorded} of ${outcomes.length} have nothing recorded either way. That is not the same as not having happened — it is what the record does not say, and it is counted separately here for that reason.`
        : `Every one of these ${outcomes.length} has something recorded either way.`,
  };
}

export const OUTCOME_VERDICT_COPY: Record<OutcomeVerdict, string> = {
  reached:
    "Something recorded says this got to the end of the chain.",
  stopped:
    "Something recorded says this stopped before the end — a cancellation, a decline or an opt-out. That is a recorded fact, not an absence.",
  not_recorded:
    "Nothing recorded says either way. This is not a failure and should not be counted as one: it means the record is silent, which is a statement about the record rather than about what happened.",
};
