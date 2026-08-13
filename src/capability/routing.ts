// W84: in-panel routing — the right GP for this condition, INSIDE the practice.
//
// "In-panel" is the whole constraint. This never sends anyone outside their practice; it
// answers "of the clinicians here, who should this offer name?" Routing across practices is
// a different product with a different regulatory posture (G6), and nothing here reaches it.
//
// The default is that NOBODY IS ROUTED. A patient's usual GP is the answer unless the
// practice has explicitly asked otherwise for this register, because continuity is the thing
// the product is measured on (W24) and quietly redirecting patients away from their own
// doctor to a marginally better-matched colleague would trade the measured good for an
// unmeasured one. So `routeFor` returns the usual GP untouched unless routing is enabled AND
// a candidate clears W82's floor AND the usual GP does not already clear it.
//
// That last condition matters more than it looks: if the usual GP clears the floor, there is
// no case for moving the patient at all, however much better someone else's numbers are.
// Routing exists to cover gaps, not to optimise.
//
// Every decision carries its reason. W86 renders them; this module refuses to make a choice
// it cannot explain.

import type { ClinicianId, ConditionCode, PracticeId } from "@/domain/types";
import {
  type Candidate,
  type CompetenceFloor,
  type RankedCandidate,
  clearsFloor,
  eligibleForRouting,
  rankByCapability,
} from "./threshold";

export interface RoutingConfig {
  /** Off by default: continuity wins unless the practice opts in, per register. */
  enabledConditions: readonly ConditionCode[];
  floor: CompetenceFloor;
}

export const ROUTING_OFF: RoutingConfig = {
  enabledConditions: [],
  floor: { minAttendedVisits: 0, requireVerifiedCredential: false },
};

export type RoutingReason =
  | "routing_disabled_for_condition"
  | "usual_gp_clears_floor"
  | "no_candidate_clears_floor"
  | "no_usual_gp_recorded"
  | "routed_to_better_match";

export interface RoutingDecision {
  practiceId: PracticeId;
  conditionCode: ConditionCode;
  /** Who the offer should name. Null only when there is nobody at all to name. */
  clinicianId: ClinicianId | null;
  usualClinicianId: ClinicianId | null;
  /** True only when the answer differs from the usual GP. */
  routed: boolean;
  reason: RoutingReason;
  /** The ranked field the decision was made from, so it can be explained and audited. */
  considered: RankedCandidate[];
}

export interface RouteInput {
  practiceId: PracticeId;
  conditionCode: ConditionCode;
  usualClinicianId: ClinicianId | null;
  /**
   * Candidates for this practice. Records naming another practice are ignored rather than
   * trusted (W91) — the caller no longer has to be right about scope for the result to be.
   */
  candidates: readonly Candidate[];
  config: RoutingConfig;
  onIso: string;
}

export function routeFor(input: RouteInput): RoutingDecision {
  // W91: scope the capability records to THIS practice. "In-panel" is the unit's whole
  // claim, and it was previously trusted rather than enforced.
  const ranked = rankByCapability(
    input.candidates,
    input.config.floor,
    input.onIso,
    input.practiceId,
  );
  const base = {
    practiceId: input.practiceId,
    conditionCode: input.conditionCode,
    usualClinicianId: input.usualClinicianId,
    considered: ranked,
  };

  if (!input.config.enabledConditions.includes(input.conditionCode)) {
    // The practice has not opted in for this register. Continuity, untouched.
    return {
      ...base,
      clinicianId: input.usualClinicianId,
      routed: false,
      reason: "routing_disabled_for_condition",
    };
  }

  if (input.usualClinicianId !== null) {
    const usual = input.candidates.find((c) => c.clinicianId === input.usualClinicianId);
    if (usual && clearsFloor(usual, input.config.floor, input.onIso, input.practiceId).clears) {
      // Routing covers gaps; it does not optimise. If the patient's own GP clears the
      // floor there is no case for moving them, however good someone else's numbers are.
      return {
        ...base,
        clinicianId: input.usualClinicianId,
        routed: false,
        reason: "usual_gp_clears_floor",
      };
    }
  }

  const eligible = eligibleForRouting(ranked).filter(
    (c) => c.clinicianId !== input.usualClinicianId,
  );
  if (eligible.length === 0) {
    // Nobody qualifies. Fall back to the usual GP rather than naming someone who does not
    // clear the floor — a worse match than the status quo is not an improvement.
    return {
      ...base,
      clinicianId: input.usualClinicianId,
      routed: false,
      reason:
        input.usualClinicianId === null ? "no_usual_gp_recorded" : "no_candidate_clears_floor",
    };
  }

  return {
    ...base,
    clinicianId: eligible[0]!.clinicianId,
    routed: true,
    reason: "routed_to_better_match",
  };
}

export const ROUTING_REASON_COPY: Record<RoutingReason, string> = {
  routing_disabled_for_condition:
    "Kept with their usual GP — this practice has not turned on routing for this register.",
  usual_gp_clears_floor:
    "Kept with their usual GP, who meets this practice's threshold for this register.",
  no_candidate_clears_floor:
    "Kept with their usual GP — no other clinician here meets the threshold for this register.",
  no_usual_gp_recorded:
    "No usual GP is recorded for this patient and no clinician here meets the threshold.",
  routed_to_better_match:
    "Offered with a different GP here, because the patient's usual GP does not meet this practice's threshold for this register.",
};

/** Share of decisions that moved a patient away from their usual GP. */
export function routedShare(decisions: readonly RoutingDecision[]): number {
  if (decisions.length === 0) return 0;
  return decisions.filter((d) => d.routed).length / decisions.length;
}
