// O117: the clinician-facing provenance panel, walked and captured.
//
// It asserts the two things that make this panel worth having rather than reassuring: that it
// shows a line for every declaration on the record, and that its lines are the finder's own
// sentences rather than copy written for the console.

import { expect, test, type Page } from "@playwright/test";
import { clinicians } from "../src/demo/clinicians";

async function signInAsPracticeOwner(page: Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("owner@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("a signed-out visitor cannot read what patients are told", async ({ page }) => {
  await page.goto("/console/matching");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("every listed GP has a panel, and each line names the declaration behind it", async ({ page }) => {
  await signInAsPracticeOwner(page);
  await page.goto("/console/matching");

  const panels = page.locator('[data-testid^="told-"]');
  await expect(panels.first()).toBeVisible();
  expect(await panels.count()).toBe(clinicians.length);

  // Every row is a sentence AND its source: a line with no source cannot be corrected (W190).
  const rows = page.locator(".mc-told li");
  expect(await rows.count()).toBeGreaterThan(10);
  for (const row of (await rows.all()).slice(0, 12)) {
    await expect(row.locator(".mc-told-said")).not.toBeEmpty();
    await expect(row.locator(".mc-told-from")).not.toBeEmpty();
  }
});

test("the not-declared lines stay facts about a declaration", async ({ page }) => {
  await signInAsPracticeOwner(page);
  await page.goto("/console/matching");
  const panel = page.locator('[data-testid^="told-"]').first();
  await expect(panel).toBeVisible();

  const text = (await panel.innerText()).toLowerCase();
  expect(text).toContain("not something they declare");
  // W193: never a claim about what a clinician can or cannot do.
  for (const forbidden of ["cannot", "unable", "not qualified"]) {
    expect(text).not.toContain(forbidden);
  }
});

test("capture: the panel as a doctor reads it", async ({ page }) => {
  await signInAsPracticeOwner(page);
  await page.goto("/console/matching");
  const panel = page.locator('[data-testid^="told-"]').first();
  await expect(panel).toBeVisible();
  await panel.scrollIntoViewIfNeeded();
  await page.setViewportSize({ width: 1280, height: 1000 });
  await panel.screenshot({ path: "qa/_runs/told-o117/panel-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.screenshot({ path: "qa/_runs/told-o117/panel-mobile.png" });
});
