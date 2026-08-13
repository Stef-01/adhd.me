// W86: routing explainability — every decision renders its reason to the practice.
//
// The gate is "no unexplained routes", and the failure it guards against is specific: a
// practice manager sees that Mrs Nguyen was offered an appointment with a GP who is not her
// usual one, asks why, and the answer is "the algorithm decided". That answer ends a pilot.
//
// Two design choices carry the weight:
//
//   * EXPLANATION IS TOTAL, NOT BEST-EFFORT. `explainDecision` accepts every RoutingReason
//     the union defines, so adding a reason without copy fails to typecheck rather than
//     rendering an empty string at a practice. There is no fallback branch, because a
//     fallback is how "unexplained" gets shipped.
//   * KEPT DECISIONS ARE EXPLAINED TOO. "Why was this patient NOT moved" is a question
//     practices ask at least as often, and W85 can hold a whole plan back — a practice that
//     turned routing on and saw nothing happen needs to know why. So every decision renders,
//     not only the routed ones.
//
// The copy states what was decided and on what basis. It never says anything about the
// patient's health, because a routing reason is about clinician capability and practice
// configuration — nothing in it is a clinical claim.

import {
  ROUTING_REASON_COPY,
  type RoutingDecision,
  type RoutingReason,
} from "./routing";
import { FLOOR_FAILURE_COPY, type RankedCandidate } from "./threshold";
import { GUARD_BREACH_COPY, type GuardBreach, type GuardVerdict } from "./continuity-guard";

export interface DecisionExplanation {
  clinicianId: string | null;
  usualClinicianId: string | null;
  routed: boolean;
  /** One sentence a practice manager can read without training. */
  headline: string;
  /**
   * Why the alternatives were not chosen. Empty only when there were no other candidates —
   * never empty merely because the code had nothing to say.
   */
  alternatives: string[];
  /** Set when W85 held this decision back despite W84 choosing to route. */
  heldBackBy: string | null;
}

function describeCandidate(candidate: RankedCandidate): string {
  if (candidate.clearsFloor) {
    const interest =
      candidate.interestStrength === null
        ? "has not stated a preference for this work"
        : `stated preference ${candidate.interestStrength} of 5`;
    return `${candidate.clinicianId}: meets the threshold (${candidate.attendedVisits} attended), ${interest}`;
  }
  const reasons = candidate.failures.map((f) => FLOOR_FAILURE_COPY[f]).join("; ");
  return `${candidate.clinicianId}: ${reasons}`;
}

/**
 * Render one decision. Every branch of RoutingReason is covered by ROUTING_REASON_COPY, so
 * this cannot produce an unexplained route — a new reason without copy is a type error.
 */
export function explainDecision(
  decision: RoutingDecision,
  heldBackBy: readonly GuardBreach[] = [],
): DecisionExplanation {
  const reason: RoutingReason = decision.reason;

  return {
    clinicianId: decision.clinicianId,
    usualClinicianId: decision.usualClinicianId,
    routed: decision.routed,
    headline: ROUTING_REASON_COPY[reason],
    alternatives: decision.considered
      .filter((c) => c.clinicianId !== decision.clinicianId)
      .map(describeCandidate),
    heldBackBy: heldBackBy.length === 0 ? null : heldBackBy.map((b) => GUARD_BREACH_COPY[b]).join(" "),
  };
}

export interface ExplainedPlan {
  explanations: DecisionExplanation[];
  /** Decisions with no headline. Must always be zero — the unit's gate. */
  unexplained: number;
  routed: number;
  kept: number;
}

/** Explain a whole plan, including anything W85 held back. */
export function explainPlan(verdict: GuardVerdict): ExplainedPlan {
  const explanations = verdict.decisions.map((d) =>
    explainDecision(d, verdict.allowed ? [] : verdict.breaches),
  );

  return {
    explanations,
    unexplained: explanations.filter((e) => e.headline.trim() === "").length,
    routed: explanations.filter((e) => e.routed).length,
    kept: explanations.filter((e) => !e.routed).length,
  };
}

/** Practice-facing markdown for the console and the weekly report. */
export function renderRoutingExplanations(plan: ExplainedPlan): string {
  if (plan.explanations.length === 0) {
    return "No routing decisions were made this period.";
  }

  const lines = [
    `${plan.routed} offer(s) named a different GP; ${plan.kept} stayed with the patient's usual GP.`,
    "",
  ];

  for (const e of plan.explanations) {
    lines.push(`- **${e.clinicianId ?? "no clinician available"}** — ${e.headline}`);
    if (e.heldBackBy) lines.push(`  - ${e.heldBackBy}`);
    for (const alternative of e.alternatives) lines.push(`  - Not chosen — ${alternative}`);
  }

  return lines.join("\n");
}
