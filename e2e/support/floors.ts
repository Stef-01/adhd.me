// AR7: e2e/support/floors.ts — the population floor for a sweep, recomputed every run from the
// route list it just walked (docs/AESTHETIC-REVIEW-PLAN.md AR7: "floors are derived, never
// transcribed").
//
// O170 set `touch-floor`'s console population floor to 120 for a 16-route sweep, then O171 found
// the same fault a row later in `semantics`: the sweep grew (16 routes -> 30, or 27 -> 45) and the
// floor stayed where it was written, so it kept passing on a run that had drifted far past the
// population it was meant to guard. Both rows fixed it by hand — measuring the new population and
// writing a new number beside it (W48's rule) — which is correct for that one day and guarantees
// the exact same conversation the next time a route is added or removed. AR6 already refused to
// fold this into `measured()`, on the grounds that doing so would reproduce the staleness it exists
// to fix; this is that refused piece, built on its own.
//
// `derivedFloor` does not discover a good number by itself — `minPerRoute` is still a constant a
// person chooses, the same way O170 chose 120. What changes is WHAT it is a constant OF: a
// per-route rate instead of a run's total, so the floor moves with the route list instead of
// needing a human to notice it fell behind. A per-route rate is also the one number O170/O171's own
// findings show is stable across a sweep growing or shrinking — the population per route was never
// the thing that drifted; the route count was.

export class NonVacuousFloorError extends Error {
  constructor(reason: string) {
    super(`derivedFloor refused to compute a floor: ${reason}`);
    this.name = "NonVacuousFloorError";
  }
}

/**
 * The minimum acceptable population for a sweep over `routeCount` routes, at `minPerRoute` each —
 * `Math.floor(routeCount * minPerRoute)`.
 *
 * Throws rather than returning a floor of zero (or a fraction of one) when either input has
 * collapsed: a route list that discovered zero routes is exactly the kind of silent failure this
 * lane's `measured()` refuses at the population end, and a floor computation that quietly agreed
 * "any population is fine" would undo that refusal one call away.
 */
export function derivedFloor(routeCount: number, minPerRoute: number): number {
  if (!Number.isFinite(routeCount) || routeCount <= 0) {
    throw new NonVacuousFloorError(`routeCount must be a positive finite number, got ${routeCount}`);
  }
  if (!Number.isFinite(minPerRoute) || minPerRoute <= 0) {
    throw new NonVacuousFloorError(`minPerRoute must be a positive finite number, got ${minPerRoute}`);
  }
  return Math.floor(routeCount * minPerRoute);
}
