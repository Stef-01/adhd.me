// AR9: the mutation probe for the accent-discipline sweep (docs/AESTHETIC-REVIEW-PLAN.md Phase 2,
// "a check that cannot fail is not a check").
//
// The sweep in `e2e/accent-discipline.spec.ts` has been green since O176. That fact, on its own,
// is worth nothing: a sweep whose selector stopped matching, whose colour tolerance drifted, or
// whose cap comparison was written the wrong way round would be green too, and would stay green
// through exactly the regression it exists to catch. This spec breaks the rule on purpose and
// requires the detector to notice.
//
// IT DRIVES THE REAL DETECTOR. `accentSites` and `overCapFinding` are imported from
// `e2e/support/accent-load.ts` — the same two functions, in the same order, that the sweep itself
// now calls. If the sweep's measurement is broken, these tests fail; a probe written against its
// own copy of the canvas walk would have passed happily beside a dead sweep.
//
// THE EXPECTED COUNTS ARE DERIVED FROM THE PAGE, NOT TRANSCRIBED. How many accent meanings the
// probed route already paints is measured at run time and the injection sized against it — inject
// `cap - baseline` and the route must stay green; inject one more and it must go red. Writing "3"
// here would be AR7's fault in a new place: a number correct on the day it was typed and silently
// wrong the first time somebody accents something on that route.

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { PUBLIC_ROUTES } from "../site-routes";
import {
  ACCENT_RULE_ID,
  MEANINGS_CAP,
  accentSites,
  injectAccentMeanings,
  meaningsOf,
  overCapFinding,
} from "./accent-load";
import { probeVerdict } from "./probe";

/**
 * TWO ROUTES, EACH CHOSEN FOR WHAT IT CAN PROVE, AND BOTH FOUND AT RUN TIME.
 *
 * The first draft of this probe used `PUBLIC_ROUTES[0]` for everything. It passed, and it was
 * weaker than it looked: `/` paints NO accent at all (7 of the 15 public surfaces do not), so the
 * detector's colour matching was exercised only against the probe's own injected elements. A
 * detector that had stopped recognising the product's real accent — the token renamed, the
 * tolerance drifted, `color-mix` resolving differently — would have sailed through it. A probe that
 * can only see its own paint is measuring itself.
 *
 * So the RED case runs on the first route that already paints accent, and the injected meaning
 * stacks on top of real ones; the AT-CAP case runs on a route that paints none, because proving the
 * comparison is `>` and not `>=` needs room below the cap to fill. Neither path is written down:
 * `richestReachable` walks the derived list until it finds one, so demoting an accent on
 * `/clinicians` moves the probe to the next painting route instead of quietly making it vacuous.
 */
/* O220: WAS `PUBLIC_ROUTES[0]!` — a blind index that happened to have room for as long as the
 * landing painted nothing near the accent. The header comment above already states the real
 * requirement ("the AT-CAP case runs on a route that paints none, because proving the comparison
 * is `>` and not `>=` needs room below the cap to fill"), and `richestReachable` already walks
 * for the red case's requirement — the green case just never got the same treatment, so O219
 * legitimately filling `/` to the cap broke the instrument rather than the product. The walk
 * below is the green case's `richestReachable`: the first route with room to fill. */
async function bareReachable(page: Page): Promise<{ route: string; baseline: string[] }> {
  return firstRouteWhere(
    page,
    (baseline) => baseline.length < MEANINGS_CAP,
    "every public route is at the accent cap — no room anywhere to prove the boundary, which is a product finding, not a probe configuration",
  );
}

/** Measures a route as the sweep would: fresh load, fonts settled, real detector. */
async function meaningsOnFreshLoad(page: Page, route: string): Promise<string[]> {
  await page.goto(route, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return meaningsOf(await accentSites(page));
}

/** O222: ONE walker for both cases — the red case wants the first route that paints at all, the
 * green case the first with room below the cap. They were the same loop with different
 * predicates, and two copies is how a change to how a route is measured lands in one. */
async function firstRouteWhere(
  page: Page,
  holds: (baseline: string[]) => boolean,
  exhausted: string,
): Promise<{ route: string; baseline: string[] }> {
  for (const route of PUBLIC_ROUTES) {
    const baseline = await meaningsOnFreshLoad(page, route);
    if (holds(baseline)) return { route, baseline };
  }
  throw new Error(exhausted);
}

/** The first public route that paints the accent at all, with what it paints. */
async function firstPaintingRoute(page: Page): Promise<{ route: string; baseline: string[] }> {
  return firstRouteWhere(
    page,
    (baseline) => baseline.length > 0,
    "no public surface paints the accent at all — the sweep this probe exists to test is measuring nothing, " +
      "which is a finding about the site or the detector, not a reason to probe a blank page",
  );
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
});

test("the accent sweep goes red when the rule is broken, and names the route and the rule id", async ({
  page,
}) => {
  const { route, baseline } = await firstPaintingRoute(page);

  // The route was chosen BECAUSE it paints accent, so this is a property of the choice, not a
  // hope. It is asserted anyway: it is the whole reason this test is not run on a blank page.
  expect(baseline.length, `${route} was chosen as the first accent-painting route`).toBeGreaterThan(0);
  expect(
    baseline.length,
    `${route} is already over the cap before the probe touched it — the sweep should be red on its own, and a probe cannot add information to a route that is already failing`,
  ).toBeLessThanOrEqual(MEANINGS_CAP);

  const cleanFinding = overCapFinding(route, baseline);

  // One more meaning than the cap permits, counted from what the route already paints.
  const injected = await injectAccentMeanings(page, MEANINGS_CAP - baseline.length + 1);
  const mutated = meaningsOf(await accentSites(page));
  const probedFinding = overCapFinding(route, mutated);

  // THE DETECTOR MUST HAVE SEEN THE INJECTED ELEMENTS THEMSELVES, not merely counted more things.
  // Without this, an injection that painted nothing visible and a detector that had started
  // double-counting some unrelated element would produce the same "it went red" result.
  for (const label of injected) {
    expect(mutated, `the detector did not see the probe's own element .${label}`).toContain(label);
  }

  // AND IT MUST STILL SEE THE REAL ONES. This is the half the first draft of this probe could not
  // check: the finding has to be the product's accent PLUS the probe's, not the probe's alone.
  for (const real of baseline) {
    expect(mutated, `the detector lost the route's own accent site ${real} once the probe ran`).toContain(real);
  }

  const verdict = probeVerdict(ACCENT_RULE_ID, route, probedFinding, cleanFinding);
  expect(
    verdict.kind,
    verdict.kind === "discriminates" ? "" : (verdict as { reason: string }).reason,
  ).toBe("discriminates");

  expect(probedFinding).toContain(route);
  expect(probedFinding).toContain(ACCENT_RULE_ID);
  expect(mutated.length).toBe(baseline.length + injected.length);
});

test("a route stays green with the probe off, and green at exactly the cap", async ({ page }) => {
  const { route: BARE_ROUTE, baseline } = await bareReachable(page);
  expect(overCapFinding(BARE_ROUTE, baseline)).toBeNull();

  // THE BOUNDARY IS LIVE, NOT JUST "ANY CHANGE FAILS". Filling the route up TO the cap must stay
  // green — otherwise the red test above would pass under a detector that reported a finding for
  // any injected element at all, and the cap's actual value would be doing no work.
  //
  // Run on a route that paints nothing precisely so there is room to fill: on an at-cap route this
  // would inject zero elements and assert the baseline back to itself, which proves nothing.
  const room = MEANINGS_CAP - baseline.length;
  expect(room, `${BARE_ROUTE} has no room below the cap, so this test cannot exercise the boundary`).toBeGreaterThan(0);

  const injected = await injectAccentMeanings(page, room);
  const atCap = meaningsOf(await accentSites(page));
  expect(injected.length).toBe(room);
  expect(atCap.length).toBe(MEANINGS_CAP);
  expect(
    overCapFinding(BARE_ROUTE, atCap),
    `${BARE_ROUTE} reported a finding at exactly ${MEANINGS_CAP} meanings — the cap is off by one`,
  ).toBeNull();

  // One more, on the same page, must flip it. Same route, same load: the only thing that changed
  // is crossing the cap.
  await injectAccentMeanings(page, 1);
  const overCap = meaningsOf(await accentSites(page));
  expect(overCap.length).toBe(MEANINGS_CAP + 1);
  expect(overCapFinding(BARE_ROUTE, overCap)).toContain(ACCENT_RULE_ID);
});
