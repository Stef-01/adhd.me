// AR32: the budget comparator's laws, provable without a build in hand. The gate script feeds
// `routeWeightVerdicts` the real manifest after `pnpm build`; these fixtures prove each of the
// four verdicts fires — and does not fire — where the register's header says it does.

import { describe, expect, it } from "vitest";
import { budgetFor, HEADROOM, ROUTE_BUDGETS, routeWeightVerdicts } from "./route-weights";

describe("AR32 route weight verdicts", () => {
  it("a route within its headroom band passes silently", () => {
    // Freshly pinned (budget == budgetFor(measured)) and modest growth inside the band.
    expect(routeWeightVerdicts({ "/a": 100 }, { "/a": budgetFor(100) })).toEqual([]);
    expect(routeWeightVerdicts({ "/a": 109 }, { "/a": 110 })).toEqual([]);
  });

  it("growth past the budget is the regression this gate exists for", () => {
    const findings = routeWeightVerdicts({ "/a": 111 }, { "/a": 110 });
    expect(findings.map((f) => f.kind)).toEqual(["over-budget"]);
    expect(findings[0]!.detail).toContain("111 KB");
  });

  it("a shrink a fresh pin would beat is a stale budget — improvements must be banked", () => {
    // 80 KB would pin at 88; a 110 KB budget is 22 KB of room for the next regression to hide in.
    const findings = routeWeightVerdicts({ "/a": 80 }, { "/a": 110 });
    expect(findings.map((f) => f.kind)).toEqual(["stale-budget"]);
    // But shrinking WITHIN the band is ordinary churn, not a finding.
    expect(routeWeightVerdicts({ "/a": 100 }, { "/a": budgetFor(100) })).toEqual([]);
  });

  it("both directions of the route set: unpinned routes and vanished pins each fail", () => {
    const findings = routeWeightVerdicts({ "/new": 50 }, { "/gone": 55 });
    expect(findings.map((f) => `${f.kind} ${f.route}`)).toEqual([
      "vanished-route /gone",
      "unbudgeted-route /new",
    ]);
  });

  it("the real register is derived, not tuned: plausible page weights, headroom as documented", () => {
    expect(HEADROOM).toBe(1.1);
    const routes = Object.keys(ROUTE_BUDGETS);
    // The register is pinned from a real build; the derived list collapsing (or a hand edit
    // deleting the block) must fail here, before the gate script ever runs.
    expect(routes.length).toBeGreaterThan(40);
    expect(routes).toContain("/");
    expect(routes).toContain("/finder");
    for (const [route, kb] of Object.entries(ROUTE_BUDGETS)) {
      expect(route.startsWith("/"), route).toBe(true);
      expect(Number.isInteger(kb), route).toBe(true);
      // A page route in this app ships hundreds of KB (the shared framework chunks alone are
      // ~340 KB); a pin below 100 KB means the measurement broke, not that the site got fast.
      expect(kb, route).toBeGreaterThan(100);
      expect(kb, route).toBeLessThan(2000);
    }
  });
});
