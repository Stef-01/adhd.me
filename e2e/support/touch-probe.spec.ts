// AR10: the mutation probe for the touch-floor sweep (docs/AESTHETIC-REVIEW-PLAN.md Phase 2,
// "a check that cannot fail is not a check").
//
// The sweep in `e2e/touch-floor.spec.ts` has been green since O148 cleared the last offender.
// That fact, on its own, is worth nothing: a selector that stopped matching controls, a hit-area
// rule that started reading the wrong box, or a floor comparison written the wrong way round
// would all be green too. This spec puts a control under the floor on a real page and requires
// the detector to notice.
//
// IT DRIVES THE REAL DETECTOR. `underFloorControls` and `floorFinding` come from
// `e2e/support/touch-load.ts` — the same functions, in the same order, that the sweep now calls.
// A probe against a copy of the walk would pass happily beside a dead sweep (AR9's argument,
// second application).

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { PUBLIC_ROUTES, revealCollapsedSurfaces } from "../site-routes";
import { probeVerdict } from "./probe";
import {
  TOUCH_FLOOR_PX,
  TOUCH_RULE_ID,
  floorFinding,
  injectControls,
  underFloorControls,
} from "./touch-load";

/**
 * Any public route serves here — unlike AR9's accent, every public surface has real controls, and
 * the fires-when-clean half of the verdict (the route must be green before the probe touches it)
 * is guaranteed by the sweep itself being green. Taken from the derived list by position so a
 * renamed route moves the probe instead of breaking it.
 */
const PROBED_ROUTE = PUBLIC_ROUTES[0]!;

async function openProbedRoute(page: Page): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PROBED_ROUTE, { waitUntil: "networkidle" });
  await revealCollapsedSurfaces(page);
  await page.evaluate(() => document.fonts.ready);
}

test("the touch sweep goes red when a control sits under the floor, naming the route and the rule id", async ({
  page,
}) => {
  await openProbedRoute(page);

  const clean = await underFloorControls(page);
  // THE DETECTOR MUST BE MEASURING SOMETHING REAL BEFORE THE MUTATION MEANS ANYTHING. A page
  // reporting zero controls would let the injection "work" against a detector that sees nothing
  // but its own probe — AR9's first draft, refused here from the start.
  expect(clean.seen, `${PROBED_ROUTE} reports no controls at all — the detector is blind`).toBeGreaterThan(0);
  const cleanFinding = floorFinding(PROBED_ROUTE, clean.out);

  const injected = await injectControls(page, 1, { width: 30, height: 30 });
  const mutated = await underFloorControls(page);
  const probedFinding = floorFinding(PROBED_ROUTE, mutated.out);

  // The finding must be ABOUT the probe's own control, not merely a bigger count.
  expect(
    mutated.out.filter((entry) => entry.includes(injected[0]!)),
    "the detector did not report the probe's own 30x30 control",
  ).toHaveLength(1);
  // And the population must have grown by exactly the injected control: a detector that lost a
  // real control while gaining the probe would pass the line above and still be broken.
  expect(mutated.seen).toBe(clean.seen + 1);

  const verdict = probeVerdict(TOUCH_RULE_ID, PROBED_ROUTE, probedFinding, cleanFinding);
  expect(
    verdict.kind,
    verdict.kind === "discriminates" ? "" : (verdict as { reason: string }).reason,
  ).toBe("discriminates");
  expect(probedFinding).toContain(PROBED_ROUTE);
  expect(probedFinding).toContain(TOUCH_RULE_ID);
});

test("the floor's boundary is live: exactly 44 passes, one pixel under fails, and the label rule holds", async ({
  page,
}) => {
  await openProbedRoute(page);
  const clean = await underFloorControls(page);
  expect(floorFinding(PROBED_ROUTE, clean.out)).toBeNull();

  // AT the floor: green. A detector that flagged any injected control regardless of size would
  // have passed the red test above while the floor's value did no work (AR9's at-cap argument).
  await injectControls(page, 1, { width: TOUCH_FLOOR_PX, height: TOUCH_FLOOR_PX });
  const atFloor = await underFloorControls(page);
  expect(
    floorFinding(PROBED_ROUTE, atFloor.out),
    `a ${TOUCH_FLOOR_PX}x${TOUCH_FLOOR_PX} control was reported — the floor is off by one`,
  ).toBeNull();

  // One pixel under, on ONE axis only: red. The rule is width AND height each meet the floor.
  await injectControls(page, 1, { width: TOUCH_FLOOR_PX, height: TOUCH_FLOOR_PX - 1 });
  const oneUnder = await underFloorControls(page);
  expect(floorFinding(PROBED_ROUTE, oneUnder.out)).toContain(TOUCH_RULE_ID);
  expect(oneUnder.out.join("\n")).toContain(`${TOUCH_FLOOR_PX}x${TOUCH_FLOOR_PX - 1}`);
});

test("the hit-area rule survives the probe: a small input inside a big label stays green", async ({
  page,
}) => {
  await openProbedRoute(page);
  // An 18px checkbox wrapped in a 44px label is compliant — the label IS the hit area, and
  // measuring the glyph instead reported 70 findings where there were 61 (the detector's own
  // header). A probe suite that only ever proves "small thing fails" would reward a regression
  // to glyph-measuring, because that regression makes the red tests redder. This is the
  // fires-for-the-wrong-reason guard.
  await page.evaluate((floor) => {
    const label = document.createElement("label");
    label.style.cssText = `display:block;width:${floor}px;height:${floor}px;`;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("aria-label", "ar10-touch-probe-labelled");
    input.style.cssText = "width:18px;height:18px;";
    label.appendChild(input);
    document.body.appendChild(label);
  }, TOUCH_FLOOR_PX);
  const measured = await underFloorControls(page);
  expect(
    measured.out.filter((entry) => entry.includes("ar10-touch-probe-labelled")),
    "the 18px input inside a 44px label was flagged — the detector is measuring the glyph, not the hit area",
  ).toEqual([]);
});
