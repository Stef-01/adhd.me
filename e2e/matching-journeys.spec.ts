// Frictionless, measured: each journey (src/matching/journeys.ts) is one sentence and one Enter from
// the home screen to a ranked list, with nothing in between, in under a second at level 0. Which
// clinician comes first is src/matching/journeys.test.ts's claim, and that the list is the engine's
// own order is finder-flow's (AR38).

import { expect } from "@playwright/test";
import { test } from "./support/test";
import { JOURNEYS } from "../src/matching/journeys";

for (const { says } of JOURNEYS) {
  test(`"${says}": one Enter to a ranked list`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox").fill(says);
    const started = Date.now();
    await page.keyboard.press("Enter");
    await expect(page.locator(".clinician-row").first()).toBeVisible();
    expect(Date.now() - started, "Enter to the first row").toBeLessThan(1000);
    await expect(page.locator("main")).toHaveAttribute("data-stage", "results");
  });
}
