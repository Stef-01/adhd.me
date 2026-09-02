// AR32: per-route shipped-JS budgets — performance floors that mean something.
//
// WHAT IS MEASURED, EXACTLY. After `next build`, `.next/app-build-manifest.json` lists every app
// route with the chunk files it ships; the weight of a route is the sum of the sizes of its
// unique `.js` files, in KB (bytes/1024, rounded up per route total). That is what a first,
// uncached visit actually downloads and parses to hydrate the page — CSS and fonts are real
// costs too, but JS is the one that grows silently with every import and the one this register
// exists to catch. `scripts/perf-gate.mts` does the reading; this module owns every decision, so
// the decisions are unit-tested without a build in hand.
//
// THE BUDGET IS DERIVED, NOT TUNED. Each pin below is `ceil(measured × 1.10)` from the build
// that earned it — what the route actually shipped on the day, plus 10% headroom so ordinary
// churn (a hash, a small copy change, a dependency patch) does not cry wolf. Nobody chose an
// absolute number, which is the row's own requirement: an absolute nobody tuned is either
// impossible to meet or vacuously generous, and both teach people to delete the check.
//
// FOUR VERDICTS, BOTH DIRECTIONS — the census shape (W102/W167) applied to kilobytes:
//   over-budget      — the route grew past its headroom. The regression this gate exists for.
//   stale-budget     — the route shrank so far that a fresh pin would be TIGHTER than the
//                      current one. An improvement nobody banked is headroom for the next
//                      regression to hide in, so the budget must ratchet down in the commit
//                      that earned the improvement (`pnpm generate:route-budgets`).
//   unbudgeted-route — a page route the build ships that no pin governs. New pages opt in by
//                      existing, never by being remembered.
//   vanished-route   — a pin naming a route the build no longer ships. A stale pin reads as
//                      coverage while governing nothing.
//
// Re-derive with `pnpm generate:route-budgets` — the diff of this file is then the reviewable
// record of exactly which routes moved and by how much.

export const HEADROOM = 1.1;

/** The budget a fresh pin would assign a route measured at `measuredKb`. */
export function budgetFor(measuredKb: number): number {
  return Math.ceil(measuredKb * HEADROOM);
}

export interface RouteWeightFinding {
  route: string;
  kind: "over-budget" | "stale-budget" | "unbudgeted-route" | "vanished-route";
  detail: string;
}

/**
 * Every verdict for a measured build against the pinned budgets. Pure — the gate script feeds it
 * the manifest measurement, the tests feed it fixtures.
 */
export function routeWeightVerdicts(
  measuredKb: Readonly<Record<string, number>>,
  budgets: Readonly<Record<string, number>> = ROUTE_BUDGETS,
): RouteWeightFinding[] {
  const findings: RouteWeightFinding[] = [];
  for (const [route, kb] of Object.entries(measuredKb)) {
    const budget = budgets[route];
    if (budget === undefined) {
      findings.push({
        route,
        kind: "unbudgeted-route",
        detail: `ships ${kb} KB with no budget — pin it (pnpm generate:route-budgets) so the next growth is measured against today`,
      });
      continue;
    }
    if (kb > budget) {
      findings.push({
        route,
        kind: "over-budget",
        detail: `ships ${kb} KB, budget ${budget} KB — shrink the route, or re-pin deliberately if the growth is the unit's point`,
      });
    } else if (budgetFor(kb) < budget) {
      findings.push({
        route,
        kind: "stale-budget",
        detail: `ships ${kb} KB under a ${budget} KB budget — bank the improvement (pnpm generate:route-budgets) before it becomes room to regress into`,
      });
    }
  }
  for (const route of Object.keys(budgets)) {
    if (!(route in measuredKb)) {
      findings.push({
        route,
        kind: "vanished-route",
        detail: "budget names a route the build no longer ships — delete the pin rather than leaving it",
      });
    }
  }
  return findings.sort((a, b) => a.route.localeCompare(b.route));
}

/**
 * KB ceilings per page route, derived from the build named below. Regenerate, never hand-edit:
 * `pnpm generate:route-budgets` rewrites everything between the GENERATED markers.
 */
// BEGIN GENERATED BUDGETS
// Derived 2026-09-02 from .next/app-build-manifest.json: ceil(measured KB × HEADROOM) per route.
export const ROUTE_BUDGETS: Readonly<Record<string, number>> = {
  "/": 558, // measured 507 KB
  "/_not-found": 378, // measured 343 KB
  "/about": 543, // measured 493 KB
  "/api/mock/fault/[kind]": 378, // measured 343 KB
  "/approach": 548, // measured 498 KB
  "/book/[token]": 378, // measured 343 KB
  "/clinicians": 414, // measured 376 KB
  "/clinicians/join": 387, // measured 351 KB
  "/console": 401, // measured 364 KB
  "/console/allocation": 401, // measured 364 KB
  "/console/applications": 401, // measured 364 KB
  "/console/capability": 401, // measured 364 KB
  "/console/capacity": 401, // measured 364 KB
  "/console/case-mix": 401, // measured 364 KB
  "/console/complaints": 401, // measured 364 KB
  "/console/credentials": 401, // measured 364 KB
  "/console/dashboard": 406, // measured 369 KB
  "/console/education": 401, // measured 364 KB
  "/console/interest": 401, // measured 364 KB
  "/console/interop": 401, // measured 364 KB
  "/console/interview": 663, // measured 602 KB
  "/console/matching": 509, // measured 462 KB
  "/console/onboarding": 401, // measured 364 KB
  "/console/ops": 401, // measured 364 KB
  "/console/outcomes": 401, // measured 364 KB
  "/console/outreach": 401, // measured 364 KB
  "/console/pathways": 401, // measured 364 KB
  "/console/privacy": 401, // measured 364 KB
  "/console/referrals": 401, // measured 364 KB
  "/console/registers": 401, // measured 364 KB
  "/console/reporting": 401, // measured 364 KB
  "/console/responses": 401, // measured 364 KB
  "/console/results": 406, // measured 369 KB
  "/console/roi": 401, // measured 364 KB
  "/console/rules": 401, // measured 364 KB
  "/console/setup/[step]": 401, // measured 364 KB
  "/console/signin": 401, // measured 364 KB
  "/console/usefulness": 401, // measured 364 KB
  "/console/verticals": 401, // measured 364 KB
  "/demo": 395, // measured 359 KB
  "/examples": 387, // measured 351 KB
  "/faq": 387, // measured 351 KB
  "/finder": 756, // measured 687 KB
  "/practices": 387, // measured 351 KB
  "/privacy": 389, // measured 353 KB
  "/privacy/automated-decisions": 387, // measured 351 KB
  "/privacy/counsel-review": 387, // measured 351 KB
  "/terms": 387, // measured 351 KB
  "/thanks": 387, // measured 351 KB
};
// END GENERATED BUDGETS
