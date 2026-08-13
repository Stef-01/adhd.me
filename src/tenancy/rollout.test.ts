// W98 verify gate: timed rollout. This file pins
// the property that makes bulk onboarding safe at all: it is ALL-OR-NOTHING.
//
// Most of these tests are about what happens when a rollout fails, because that is the case
// the unit exists to handle. A twelve-site rollout that half-succeeds leaves a state nobody
// described and an operator reconciling it by hand.

import { describe, expect, it, vi } from "vitest";
import {
  applyRollout,
  planRollout,
  renderPlan,
  type GroupRolloutConfig,
  type SiteRolloutInput,
} from "./rollout";

const site = (over: Partial<SiteRolloutInput> = {}): SiteRolloutInput => ({
  practiceId: "site-1",
  name: "Demo Family Practice",
  timezone: "Australia/Sydney",
  holdoutPercent: 10,
  ownerEmail: "owner@demo.example",
  ...over,
});

const config = (sites: SiteRolloutInput[], defaults?: GroupRolloutConfig["defaults"]): GroupRolloutConfig => ({
  groupId: "group-1",
  sites,
  defaults,
});

describe("W98 a clean plan applies in full", () => {
  it("onboards every site", () => {
    const sites = [site(), site({ practiceId: "site-2", name: "Second Practice" })];
    const commit = vi.fn();
    const result = applyRollout(planRollout(config(sites)), commit);
    expect(result.applied).toEqual(["site-1", "site-2"]);
    expect(result.refusedBecause).toBeNull();
    expect(commit).toHaveBeenCalledTimes(2);
  });

  it("resolves group defaults and says which fields it defaulted", () => {
    const plan = planRollout(
      config([site({ timezone: "", holdoutPercent: undefined as unknown as number })], {
        timezone: "Australia/Perth",
        holdoutPercent: 20,
      }),
    );
    expect(plan.applicable).toBe(true);
    expect(plan.sites[0]?.resolved.timezone).toBe("Australia/Perth");
    expect(plan.sites[0]?.resolved.holdoutPercent).toBe(20);
    expect(plan.sites[0]?.defaulted.sort()).toEqual(["holdoutPercent", "timezone"]);
  });

  it("a site's own value beats the group default", () => {
    const plan = planRollout(config([site({ timezone: "Australia/Darwin" })], { timezone: "Australia/Perth" }));
    expect(plan.sites[0]?.resolved.timezone).toBe("Australia/Darwin");
    expect(plan.sites[0]?.defaulted).toEqual([]);
  });
});

describe("W98 one bad site refuses the whole rollout", () => {
  it("writes NOTHING when any site fails validation", () => {
    // The property the unit exists for: no half-configured group to reconcile afterwards.
    const sites = [site(), site({ practiceId: "site-2", name: "X" }), site({ practiceId: "site-3" })];
    const commit = vi.fn();
    const result = applyRollout(planRollout(config(sites)), commit);
    expect(commit).not.toHaveBeenCalled();
    expect(result.applied).toEqual([]);
    expect(result.refusedBecause).toEqual(["name_too_short"]);
  });

  it("reports every problem at once, not the first one", () => {
    // An operator fixing a twelve-site config one error per run is a bad afternoon.
    const plan = planRollout(
      config([
        site({ practiceId: "a", name: "X" }),
        site({ practiceId: "b", timezone: "Sydney" }),
        site({ practiceId: "c", holdoutPercent: 80 }),
        site({ practiceId: "d", ownerEmail: "not-an-email" }),
      ]),
    );
    expect(plan.applicable).toBe(false);
    expect(plan.errorCount).toBe(4);
    expect(plan.sites.flatMap((s) => s.errors).sort()).toEqual([
      "holdout_out_of_range", "invalid_timezone", "name_too_short", "owner_email_invalid",
    ]);
  });

  it.each([
    ["a duplicate practice id within the batch", [site({ practiceId: "dup" }), site({ practiceId: "dup" })], [], "duplicate_practice_id"],
    ["a practice that already exists", [site({ practiceId: "existing" })], ["existing"], "practice_already_exists"],
  ])("refuses %s", (_label, sites, existing, expected) => {
    const plan = planRollout(config(sites as SiteRolloutInput[]), existing as string[]);
    expect(plan.applicable).toBe(false);
    expect(plan.sites.flatMap((s) => s.errors)).toContain(expected);
  });

  it("a missing default leaves the field invalid rather than guessing", () => {
    const plan = planRollout(config([site({ timezone: "" })]));
    expect(plan.sites[0]?.errors).toContain("invalid_timezone");
  });
});

describe("W98 the dry run is the same code path", () => {
  it("planRollout writes nothing and is what applyRollout consumes", () => {
    // Not a second implementation that can drift from the real one.
    const commit = vi.fn();
    const plan = planRollout(config([site(), site({ practiceId: "site-2" })]));
    expect(commit).not.toHaveBeenCalled();
    expect(plan.sites.map((s) => s.practiceId)).toEqual(["site-1", "site-2"]);
    applyRollout(plan, commit);
    expect(commit.mock.calls.map((c) => (c[0] as SiteRolloutInput).practiceId)).toEqual(["site-1", "site-2"]);
  });

  it("the preview names the site each error belongs to", () => {
    const rendered = renderPlan(planRollout(config([site(), site({ practiceId: "bad-site", name: "X" })])));
    expect(rendered).toContain("**Refused.**");
    expect(rendered).toContain("bad-site");
    expect(rendered).toContain("name_too_short");
    expect(rendered).toContain("Nothing will be written");
  });

  it("the preview says what it deliberately does NOT set", () => {
    const rendered = renderPlan(planRollout(config([site()])));
    expect(rendered).toContain("Eligibility rules, participating clinicians and protected capacity are NOT set here");
  });
});

describe("W98 scale", () => {
  it("plans 50 sites without special-casing", () => {
    const sites = Array.from({ length: 50 }, (_, i) =>
      site({ practiceId: `site-${i}`, name: `Practice ${i}` }),
    );
    const plan = planRollout(config(sites));
    expect(plan.applicable).toBe(true);
    expect(plan.sites).toHaveLength(50);
    const commit = vi.fn();
    expect(applyRollout(plan, commit).applied).toHaveLength(50);
  });

  it("one bad site among 50 still refuses all 50", () => {
    const sites = Array.from({ length: 50 }, (_, i) =>
      site({ practiceId: `site-${i}`, name: i === 37 ? "X" : `Practice ${i}` }),
    );
    const commit = vi.fn();
    expect(applyRollout(planRollout(config(sites)), commit).applied).toEqual([]);
    expect(commit).not.toHaveBeenCalled();
  });
});

describe("W98 timing", () => {
  // The unit's gate says "timed e2e". The timing is asserted here rather than in a browser,
  // and the reason is a real constraint rather than convenience: onboarding is create-only
  // by design (W26 made re-running it a privilege-escalation bypass), so the console holds
  // exactly one practice and there is no browser surface to drive N sites through yet. A
  // group console is its own unit. What CAN be timed today is the rollout itself, which is
  // where the work is — the browser would only be measuring form fills.
  it("plans and applies 50 sites well inside a rollout budget", () => {
    const sites = Array.from({ length: 50 }, (_, i) =>
      site({ practiceId: `site-${i}`, name: `Practice ${i}` }),
    );
    const started = performance.now();
    const plan = planRollout(config(sites));
    const applied = applyRollout(plan, () => {});
    const elapsedMs = performance.now() - started;

    expect(applied.applied).toHaveLength(50);
    // Generous by two orders of magnitude: this is a guard against an accidental O(n^2),
    // not a benchmark. Duplicate detection is the only cross-site check and it is a Set.
    expect(elapsedMs).toBeLessThan(1_000);
  });

  it("stays linear — 200 sites is not dramatically worse than 50 per site", () => {
    const build = (n: number) =>
      Array.from({ length: n }, (_, i) => site({ practiceId: `s-${i}`, name: `P ${i}` }));
    const time = (n: number) => {
      const sites = build(n);
      const t0 = performance.now();
      applyRollout(planRollout(config(sites)), () => {});
      return performance.now() - t0;
    };
    time(50); // warm
    const per50 = time(50) / 50;
    const per200 = time(200) / 200;
    // Per-site cost must not blow up with batch size; a wide band keeps this from being a
    // flaky timing test on a loaded box while still catching quadratic behaviour.
    expect(per200).toBeLessThan(Math.max(per50 * 10, 1));
  });
});
