// O145/O148: the 44px touch floor (O14), swept mechanically instead of remembered per unit.
// taste-rule: interaction.touch-44

import { expect, test, type Page } from "@playwright/test";

// O170: the routes are derived from `app/` now, not listed here.
//
// This sweep covered all 15 public routes and 16 of the 30 console screens. The fourteen never
// measured for touch target size were the SAME twelve `contrast` was missing — both arrays were
// copied from one list on one day and neither grew afterwards, which is the whole argument O168
// made for deriving rather than extending.
//
// O148's note below still holds and is why the console half exists at all: it is where practice
// staff work, sometimes on a phone between patients.
import { CONSOLE_ROUTES, PUBLIC_ROUTES, revealCollapsedSurfaces } from "./site-routes";
import { installFakeSpeech } from "./support/fake-speech";
import { STAGES, openStage } from "./support/finder-stages";
import { floorFinding, underFloorControls } from "./support/touch-load";
import { measured } from "./support/measured";
import { derivedFloor } from "./support/floors";
import { seedFixtures } from "./support/fixtures";
import { signInAndOnboard as signInAsPracticeOwner } from "./support/session";

/**
 * AR10: the measurement itself now lives in `e2e/support/touch-load.ts`, so the mutation probe in
 * `e2e/support/touch-probe.spec.ts` drives THIS detector rather than a copy of it. What stays here
 * is the sweep's own job: navigation, revealing collapsed surfaces, waiting out font metrics
 * (O146: /about's "Final-year MD candidate" link flapped 265x44 without it), and the route loops.
 * The exclusions and the label hit-area rule — O148's and O153's lessons — moved with the
 * detector, comments and all.
 */
async function sweep(page: Page, route: string) {
  await page.goto(route, { waitUntil: "networkidle" });
  await revealCollapsedSurfaces(page);
  await page.evaluate(() => document.fonts.ready);
  return underFloorControls(page);
}

test.describe("O14's 44px touch floor", () => {
  test("no control on a public route is under the floor", async ({ page }) => {
    // O170: predicted before it was hit, not diagnosed after. O169 found `contrast` sitting under
    // Playwright's 30s default, survivable only because its route list was short. This spec had
    // the same shape and the same short list.
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const offenders: string[] = [];
    let population = 0;
    for (const route of PUBLIC_ROUTES) {
      const { out, seen } = await sweep(page, route);
      population += seen;
      // AR10: the per-route verdict names the route AND the rule id, which the old per-offender
      // prefix did not — a reader had to find this spec to learn which register rule had broken.
      const finding = floorFinding(route, out);
      if (finding) offenders.push(finding);
    }
    // O159: /demo again, POPULATED. Its "Open booking link" anchors render only once invitations
    // exist, so the pass above measures an empty page and says nothing about them — they were
    // 115x40 and went unnoticed until another spec seeded state in the same batch (O152).
    await page.goto("/demo");
    await page.getByRole("button", { name: /Launch demo|Reset demo to the start/ }).click();
    await page.waitForURL(/\/console$/);
    const populated = await sweep(page, "/demo");
    population += populated.seen;
    const demoFinding = floorFinding("/demo (populated)", populated.out);
    if (demoFinding) offenders.push(demoFinding);

    // Non-vacuity: a selector that stopped matching would report a perfectly clean sweep.
    // O174: the public list was already complete at 15 routes. The figure is stated as a RANGE
    // because it is not run-order independent — 160 with this spec alone, 163 inside the full
    // suite, since `/demo` is swept populated and what earlier specs seeded moves the count. Pinning
    // the standalone number would have been a figure that goes stale on a full run, which is the
    // exact staleness O170 found in the console floor and O174 found again one row later.
    // AR6: `measured()` is the shared non-vacuity harness — the console.log was this exact line,
    // hand-written once per sweep.
    measured("touch-floor.public", population);
    // AR7: derived from the route list instead of transcribed. The sweep visits every public route
    // plus one extra populated pass over /demo (above), so the basis is PUBLIC_ROUTES.length + 1.
    // O188 RE-DERIVED THE RATE DOWNWARD, AND THE FLOOR FIRING IS WHY IT COULD BE DONE HONESTLY:
    // retiring the join form removed ~40 controls from the public population (163 -> 123 measured),
    // and this floor — built by AR7 precisely so a collapse cannot pass silently — went red on the
    // first full run rather than letting the shrink slide. That is the machinery's first fire in
    // anger, and in the direction nobody had tested (population loss, not route growth). 7/route
    // stays below the new observed rate (~123 over 16 sweeps, ~7.7/route) with the same margin
    // discipline as before; a further collapse still falls under it.
    expect(population, "the public sweep collapsed").toBeGreaterThan(derivedFloor(PUBLIC_ROUTES.length + 1, 7));
    expect(offenders, `controls under the 44px floor:\n${offenders.join("\n")}`).toEqual([]);
  });

  test("no control in the console is under the floor", async ({ page, request }) => {
    test.setTimeout(300_000);
    // O159: SEED EVERY FIXTURE, and that is the whole point of these lines.
    //
    // The sweep measures whichever state it happens to find, not the set of controls the product
    // can render. Run with only the console fixture, `/console/referrals` shows no decline form and
    // `/demo` shows no booking links — so the sweep reported a clean pass while three controls sat
    // under the floor, and it took another spec seeding data in the same batch to expose them
    // (O152). A gate whose population depends on run order is a gate that gives false assurance.
    //
    // O174: AND THE ORDER BENEATH THAT COMMENT REINTRODUCED THE FAULT THE COMMENT DESCRIBES.
    // `console` led the list and `POST /api/mock/console` RESETS the console store, so the three
    // fixtures that read `practices[0]` — credentials, capability, education — threw and returned
    // 500. Nothing checked the status, so they silently did not seed and this sweep measured their
    // unlinked refusal pages: `/console/credentials` rendered 3 controls where 11 exist.
    // `preferences` was a fourth no-op for a different reason — that route has no POST handler at
    // all and answered 405 to every run of this list.
    //
    // Three changes, and the third is the one that makes the other two stay true:
    //   * `console` is posted FIRST and the practice created straight after, so the resetting
    //     fixture still runs (it seeds the demo memberships and clinicians the console pages read)
    //     but nothing afterwards reads an emptied store. Dropping it instead cost six controls —
    //     measured, not assumed;
    //   * credentials and education carry `linkEmail`, without which they render the refusal even
    //     when they seed — a11y already did this and this spec did not;
    //   * every response is ASSERTED ok, so a fixture that stops seeding fails the test instead of
    //     quietly shrinking what the sweep covers.
    //
    // AR8: the eleven-fixture list and the post/check/collect loop are now `seedFixtures` (one
    // place both are written); it throws naming every fixture that failed to seed instead of this
    // spec asserting an empty `failed` array by hand.
    await page.setViewportSize({ width: 390, height: 844 });
    // The resetting fixture, then the practice, then everything that depends on the practice.
    await request.post("/api/mock/console");
    await signInAsPracticeOwner(page);
    await seedFixtures(request);
    const offenders: string[] = [];
    let population = 0;
    for (const route of CONSOLE_ROUTES) {
      const { out, seen } = await sweep(page, route);
      population += seen;
      // AR10: the per-route verdict names the route AND the rule id, which the old per-offender
      // prefix did not — a reader had to find this spec to learn which register rule had broken.
      const finding = floorFinding(route, out);
      if (finding) offenders.push(finding);
    }
    // O170: the floor was 120, set when this sweep visited 16 console routes. It now visits 28 and
    // the observed population is 207 across 30 routes, so 120 would no longer notice it collapsing to
    // roughly the list it replaced. Measured first, then stated beside the ceiling — W48's rule.
    //
    // O174 RE-MEASURED IT RATHER THAN INHERITING IT, which is the same discipline one row later:
    // fixing the fixture seeding moved this from 196 to 207, because eleven controls on
    // `/console/credentials` had never been in the population at all. A figure written beside a
    // floor is a claim about a run, and it goes stale the moment the run changes.
    // AR6: same replacement as the public sweep above.
    measured("touch-floor.console", population);
    // AR7: derived from CONSOLE_ROUTES.length instead of the transcribed 170 that O170 set for a
    // 16-route sweep and that had already gone stale twice by the time AR6 measured 207 over 30
    // routes. 5/route stays below that observed rate (~6.9/route).
    expect(
      population,
      "the console sweep collapsed — a clean pass here would mean nothing",
    ).toBeGreaterThan(derivedFloor(CONSOLE_ROUTES.length, 5));
    expect(offenders, `controls under the 44px floor:\n${offenders.join("\n")}`).toEqual([]);
  });

  test("no control on any finder stage is under the floor", async ({ page }) => {
    // U9: the public sweep reaches `/finder` by URL and so measures the welcome screen only. The
    // other seven stages — the microphone toggle and its language controls, the rows, the compare
    // control inside its disclosure, the booking screen — exist only after a person acts, and
    // are reached here the way the person reaches them (`e2e/support/finder-stages.ts`), on the
    // 390px phone the finder is built for.
    test.setTimeout(180_000);
    await installFakeSpeech(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const offenders: string[] = [];
    let population = 0;
    for (const stage of STAGES) {
      await openStage(page, stage);
      await revealCollapsedSurfaces(page);
      await page.evaluate(() => document.fonts.ready);
      const { out, seen } = await underFloorControls(page);
      population += seen;
      const finding = floorFinding(`/ (${stage})`, out);
      if (finding) offenders.push(finding);
    }
    measured("touch-floor.finder", population);
    // Derived from STAGES.length; 3/stage stays below the observed rate (the results screen
    // alone carries a row per match).
    expect(population, "the finder sweep collapsed").toBeGreaterThan(derivedFloor(STAGES.length, 3));
    expect(offenders, `controls under the 44px floor:\n${offenders.join("\n")}`).toEqual([]);
  });
});
