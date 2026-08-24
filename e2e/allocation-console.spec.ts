// W236 (O133): the allocator's first surface, and the two facts it must say on itself.

import { expect, test, type Page } from "@playwright/test";
import { signInAndOnboard as signInAsPracticeOwner } from "./support/session";

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("a signed-out visitor cannot read an allocation", async ({ page }) => {
  await page.goto("/console/allocation");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("the breakdown renders every criterion with the module's own sentence (O133)", async ({ page }) => {
  await signInAsPracticeOwner(page);
  await page.goto("/console/allocation");

  const rows = page.locator(".mc-table tbody tr");
  await expect(rows.first()).toBeVisible();
  // Five criteria per scored prescriber, each carrying its W213 sentence.
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(5);
  for (let i = 0; i < count; i++) {
    // The "Why" cell is the module's sentence — a row without one would be a number with no
    // account of itself, which is the thing this whole module refuses to produce.
    await expect(rows.nth(i).locator("td").last()).not.toBeEmpty();
  }
});

/**
 * The two facts the page must say on ITSELF rather than rely on the reader knowing.
 *
 * Both sides are invented, and the timing preference is stated rather than inferred. A console
 * that displayed an assignment without saying either would be showing the product doing
 * something it has decided not to do.
 */
test("the page says both sides are invented, and that urgency is stated not inferred (O133)", async ({ page }) => {
  await signInAsPracticeOwner(page);
  await page.goto("/console/allocation");

  const lead = await page.locator(".mc-lead").innerText();
  expect(lead).toContain("synthetic");
  expect(lead).toContain("does not assign");

  const body = await page.locator("main").innerText();
  expect(body).toContain("never read out of their words");
});

test("the derived vocabulary is shown, not asserted (O132's wiring, visible)", async ({ page }) => {
  await signInAsPracticeOwner(page);
  await page.goto("/console/allocation");

  const asked = page.locator(".mc-asked li");
  await expect(asked.first()).toBeVisible();
  expect(await asked.count()).toBeGreaterThan(0);
  // Each derived facet names the words that reached it, exactly as the finder shows a patient.
  await expect(asked.first()).toContainText("reached by");
});

test("every excluded prescriber carries a reason — a refusal is never silent", async ({ page }) => {
  await signInAsPracticeOwner(page);
  await page.goto("/console/allocation");

  const excluded = page.locator("section[aria-labelledby='excluded-h'] li");
  const n = await excluded.count();
  for (let i = 0; i < n; i++) {
    await expect(excluded.nth(i).locator(".mc-told-from")).not.toBeEmpty();
  }

  // The unit's capture, taken here because the console's session cannot be established outside
  // this harness — which also means the capture can never drift from a passing run.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: "qa/_runs/allocation-o133/breakdown.png", fullPage: true });
});
