// W85: the continuity guardrail — routing may not degrade continuity below a practice floor.
//
// W84 will only move a patient whose usual GP is below the competence floor, which sounds
// self-limiting. It is not, in aggregate: a practice with one under-experienced GP and a
// register that most of their panel is on can quietly have a large share of that GP's
// patients redirected, and the continuity index the product is measured on (W24) falls
// without anyone deciding it should.
//
// So routing carries a second, practice-set limit that is checked on the AGGREGATE rather
// than per decision. The two questions are different and both are asked here:
//
//   1. Would routing push the panel's usual-GP share below the practice's floor?
//   2. Would it move more of the panel than the practice agreed to, even if the share
//      happens to stay above the floor?
//
// When the guardrail trips, the response is to STOP ROUTING and keep continuity, not to
// route a smaller arbitrary subset. Choosing which patients to redirect by "whoever came
// first until the budget ran out" would make the outcome depend on iteration order, which is
// not a decision anyone could defend to a practice.

import type { ConditionCode } from "@/domain/types";
import { type RoutingDecision, routedShare } from "./routing";

export interface ContinuityGuardConfig {
  /**
   * The practice's floor for the usual-GP share of attended visits, 0..1. Routing must not
   * take the projected share below this.
   */
  minUsualGpShare: number;
  /** Ceiling on the share of decisions routing may move, 0..1. */
  maxRoutedShare: number;
}

export const DEFAULT_CONTINUITY_GUARD: ContinuityGuardConfig = {
  minUsualGpShare: 0.7,
  maxRoutedShare: 0.15,
};

export type GuardBreach = "would_breach_share_floor" | "would_exceed_routed_ceiling";

export interface GuardVerdict {
  /** True when the routing plan may proceed as decided. */
  allowed: boolean;
  breaches: GuardBreach[];
  /** Usual-GP share before routing, from the W24 report. */
  baselineShare: number;
  /** Projected share if every routed decision were acted on. */
  projectedShare: number;
  routedShare: number;
  /** Decisions to act on: the plan, or continuity-preserving fallbacks if it tripped. */
  decisions: RoutingDecision[];
}

/**
 * Project the usual-GP share if this routing plan were acted on.
 *
 * Each routed decision converts one would-be usual-GP visit into a non-usual-GP one, so the
 * projection is exact arithmetic on the W24 denominator rather than an estimate — a routed
 * patient does not stop attending, they attend with someone else.
 */
export function projectUsualGpShare(
  baseline: { appointments: number; withUsualGp: number },
  decisions: readonly RoutingDecision[],
): number {
  if (baseline.appointments === 0) return 1;
  const moved = decisions.filter((d) => d.routed && d.usualClinicianId !== null).length;
  const withUsual = Math.max(0, baseline.withUsualGp - moved);
  return withUsual / baseline.appointments;
}

/**
 * Check a routing plan against the practice's continuity limits.
 *
 * On a breach every routed decision is rewritten to keep the patient with their usual GP,
 * with the reason preserved so the practice can see what routing WOULD have done and why it
 * was held back. Stopping wholesale rather than trimming is deliberate: a partial plan chosen
 * by iteration order is not defensible to a practice.
 */
export function applyContinuityGuard(
  decisions: readonly RoutingDecision[],
  baseline: { appointments: number; withUsualGp: number },
  config: ContinuityGuardConfig = DEFAULT_CONTINUITY_GUARD,
): GuardVerdict {
  const baselineShare = baseline.appointments === 0 ? 1 : baseline.withUsualGp / baseline.appointments;
  const projectedShare = projectUsualGpShare(baseline, decisions);
  const routed = routedShare(decisions);

  const breaches: GuardBreach[] = [];
  if (projectedShare < config.minUsualGpShare) breaches.push("would_breach_share_floor");
  if (routed > config.maxRoutedShare) breaches.push("would_exceed_routed_ceiling");

  if (breaches.length === 0) {
    return {
      allowed: true,
      breaches,
      baselineShare,
      projectedShare,
      routedShare: routed,
      decisions: [...decisions],
    };
  }

  const held = decisions.map((d) =>
    d.routed
      ? { ...d, clinicianId: d.usualClinicianId, routed: false, reason: d.reason }
      : d,
  );

  return {
    allowed: false,
    breaches,
    baselineShare,
    // Nothing moves, so the share is unchanged from baseline.
    projectedShare: baselineShare,
    routedShare: 0,
    decisions: held,
  };
}

export const GUARD_BREACH_COPY: Record<GuardBreach, string> = {
  would_breach_share_floor:
    "Routing was held back: acting on it would take the share of visits with a patient's usual GP below this practice's floor.",
  would_exceed_routed_ceiling:
    "Routing was held back: it would move more of the panel away from their usual GP than this practice allows.",
};

export type { ConditionCode };
