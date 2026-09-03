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

/**
 * THE ONE TIMING HARNESS, SHARED BY THE LINEARITY CHECK AND ITS NON-VACUITY PROBE.
 *
 * 2026-09-03: the probe below started reporting 2.15× for a workload that is 4× by construction,
 * and only ever inside the full suite — run alone the same code measures 4.48×. The bound was not
 * wrong and the probe was not wrong; the INSTRUMENT was too small to read. The old harness timed a
 * fixed 40 repeats at each size, so the n=50 sample was 40 × 50² = 100k inner steps — about **31µs**
 * of wall clock. Vitest runs files in parallel workers, and 31µs is shorter than a scheduler
 * quantum, so under suite load every one of the five samples caught some other worker's
 * interruption. That inflates the SMALL sample far more than the large one (the n=200 sample is 16×
 * longer, so the same fixed hiccup is 16× less of it), and an inflated `per50` compresses the
 * ratio downwards — straight through the 2.5 line. Best-of-N cannot rescue a sample that is shorter
 * than the noise it is trying to reject.
 *
 * So the repeat count is no longer fixed: each timed sample processes the same number of ITEMS at
 * every size (`itemsPerSample / n` repeats), which does two things at once. Both sizes now do
 * comparable work, so they sit in the same JIT tier and the same timer regime instead of being
 * compared across two different ones; and the smallest sample is milliseconds rather than
 * microseconds, so a stray context switch is a rounding error rather than the measurement.
 *
 * What this does NOT change is the line at 2.5 or the two populations it was chosen between. Under
 * this harness the real rollout measures 0.86–0.98× per site at 200 vs 50 and the quadratic probe
 * measures 4.46–4.94× — the same separation the comments below already describe, now read with an
 * instrument that can see it.
 */
const TIMING_SAMPLES = 5;
/** Enough items that the smallest sample (the quadratic probe at n=50) is milliseconds, not µs. */
const ITEMS_PER_SAMPLE = 200_000;

/** Best-of-N wall clock per item. Fastest sample wins: an interrupted run can only be slower, so
 *  the minimum is the cost of the code rather than the cost of the box. */
function perItem(n: number, run: (n: number) => void): number {
  const repeats = Math.max(1, Math.round(ITEMS_PER_SAMPLE / n));
  let best = Infinity;
  for (let sample = 0; sample < TIMING_SAMPLES; sample += 1) {
    const started = performance.now();
    for (let repeat = 0; repeat < repeats; repeat += 1) run(n);
    best = Math.min(best, performance.now() - started);
  }
  return best / (repeats * n);
}

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
    // A guard against an accidental O(n^2), not a benchmark. Duplicate detection is the only
    // cross-site check and it is a Set.
    //
    // O195 CORRECTED THE HEADROOM CLAIM RATHER THAN THE BOUND. This said "generous by two orders
    // of magnitude"; measured, the 50-site rollout costs **0.06ms** against a 1000ms bound, which
    // is four orders, not two. The bound stays — an absolute ceiling this slack cannot flake, and
    // the sibling test below is where linearity is actually asserted — but the comment now says
    // what the number is, because a stated margin that is wrong by 100× is how somebody later
    // concludes this test guards something it does not.
    expect(elapsedMs).toBeLessThan(1_000);
  });

  it("stays linear — 200 sites is not dramatically worse than 50 per site", () => {
    // O195 REWROTE THIS BECAUSE IT COULD NOT FAIL, WHICH IS WORSE THAN FAILING AT RANDOM.
    //
    // It used to assert `per200 < Math.max(per50 * 10, 1)`. Measured: `per50` is 0.0008ms, so
    // `per50 * 10` is 0.008ms and the `Math.max(…, 1)` FLOOR dominated the bound by 125×. The
    // assertion was effectively `0.0009 < 1`. A genuinely quadratic implementation would cost about
    // 0.0032ms per site at 200 — still 312× under the bound — so this read as a linearity guard and
    // passed on quadratic, cubic, and anything short of a millisecond per site.
    //
    // The floor was there for a real reason: at 0.0008ms per site the ratio of two wall-clock
    // numbers is noise, and a bare ratio would flake. That is the SAME defect O194 found in
    // `src/verticals/scaling.test.ts`, and the two tests answered it in opposite directions —
    // O194's widened threshold left a coin toss, this one's floor left a hole. Neither is fixed by
    // choosing a different number; both are fixed by measuring properly.
    //
    // So the instrument changes, and the floor goes: enough work per sample that the small case
    // clears the noise floor honestly, and best-of-N, because an interrupted run can only ever be
    // slower and the fastest sample is the cost of the code rather than the cost of the box. The
    // harness itself is `perItem` above — see its header for why the repeat count is derived from
    // the size rather than fixed.
    //
    // The rosters are built ONCE, outside the timer: allocating 200 objects is not the cost this
    // test is about, and paying it per repeat would make the large size look worse than it is.
    const rosters = new Map(
      [50, 200].map((n) => [n, Array.from({ length: n }, (_, i) => site({ practiceId: `s-${i}`, name: `P ${i}` }))]),
    );
    const rollout = (n: number) => {
      applyRollout(planRollout(config(rosters.get(n)!)), () => {});
    };
    perItem(50, rollout); // warm
    const per50 = perItem(50, rollout);
    const per200 = perItem(200, rollout);
    // A real bound now, with no floor to hide behind, AND CHOSEN FROM TWO MEASURED POPULATIONS
    // rather than picked. Across isolated and full-suite-loaded runs the real rollout measures
    // 0.86–0.98× per site at 200 vs 50 (sub-1: the larger batch amortises setup), and the quadratic
    // probe below measures 4.46–4.94×. 2.5 sits between them with margin on both sides — 2.5× above
    // the linear maximum and 1.8× below the quadratic minimum.
    //
    // The first draft of this used 4×, and it was wrong for a reason worth keeping: per-item cost
    // of a quadratic grows LINEARLY, so 200-vs-50 is 4× in theory, and a bound of 4 sat 8% under
    // the thing it was supposed to catch. A threshold that close to the failure population is a
    // coin toss wearing a number, which is precisely the defect this unit came from.
    expect(
      per200 / per50,
      `200 sites cost ${(per200 / per50).toFixed(2)}× per site what 50 did (per50=${per50.toFixed(5)}ms per200=${per200.toFixed(5)}ms)`,
    ).toBeLessThan(2.5);
  });

  it("the linearity check can still tell linear from quadratic, on the same harness", () => {
    // NON-VACUITY, AND THIS UNIT EXISTS BECAUSE ITS ABSENCE HID A HOLE FOR AS LONG AS THE TEST HAS
    // EXISTED. The bound above is only worth its comment if something can cross it, so a
    // deliberately quadratic workload is timed through the identical harness at the identical
    // sizes and must land past the same 2.5× line the real rollout clears (measured 4.46–4.94×).
    // "Identical" is now literal: both tests call the same `perItem` above, so a change to how the
    // linearity check measures cannot silently stop applying to the probe that keeps it honest.
    let sink = 0;
    const quadratic = (n: number) => {
      for (let a = 0; a < n; a += 1) for (let b = 0; b < n; b += 1) sink += (a ^ b) & 1;
    };
    perItem(50, quadratic); // warm
    const per50 = perItem(50, quadratic);
    const per200 = perItem(200, quadratic);
    expect(sink).toBeGreaterThan(0); // the work is observed, so nothing above is dead-code-eliminated
    expect(
      per200 / per50,
      `a genuinely quadratic workload measured ${(per200 / per50).toFixed(2)}× per item — if this is under 2.5 the linearity check above has stopped discriminating`,
    ).toBeGreaterThan(2.5);
  });
});
