// What builds the map, and how to change the first answers (docs/design/ux-evaluation-2026-09/PLAN.md
// W4): said before the chart, behind a labelled control, and answering again never loses the old
// answers part way.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LIVED_RECORD } from "../scripts/text-budget-lib.mjs";

const MODEL_KEY = "adhdme.model.v1";
const model = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), MODEL_KEY);

async function seed(page: Page, record: unknown): Promise<void> {
  await page.goto("/my-adhd");
  await page.evaluate(([k, rec]) => localStorage.setItem(k!, rec!), [MODEL_KEY, JSON.stringify(record)]);
  await page.reload();
}

test("before the chart, the start card says what the questions are for", async ({ page }) => {
  await page.goto("/my-adhd");
  await page.evaluate((k) => localStorage.removeItem(k), MODEL_KEY);
  await page.reload();
  await expect(page.getByText("Ten quick questions start this map.")).toBeVisible();
  // What fills it sits in the same card, so it is read before the chart, not after it.
  const fills = page.locator(".map-lead").getByRole("button", { name: "How it fills in" });
  await expect(fills).toBeVisible();
  const before = await fills.evaluate((el) => !!(el.compareDocumentPosition(document.querySelector(".map-radar")!) & Node.DOCUMENT_POSITION_FOLLOWING));
  expect(before, "the control precedes the chart").toBe(true);
});

test("how it fills in opens from a labelled control, and names what never counts", async ({ page }) => {
  await seed(page, LIVED_RECORD);
  const control = page.getByRole("button", { name: "How it fills in" });
  expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await control.click();
  const sheet = page.getByRole("dialog", { name: "How it fills in." });
  await expect(sheet.locator(".map-fills-list li")).toHaveCount(4);
  await expect(sheet).toContainText("Scores never change your map.");
  await expect(sheet.getByRole("link", { name: "Answer again" })).toHaveAttribute("href", "/start?again=1");
  expect(await sheet.innerText()).not.toMatch(/\d/);
});

test("an axis says where it came from, in words", async ({ page }) => {
  await seed(page, LIVED_RECORD);
  await page.locator(".map-axis").first().click();
  await expect(page.locator(".map-sheet-from")).toHaveText(/^From your first answers/);
  // Something on this axis was tried, so the history is one link away.
  await expect(page.getByRole("dialog").getByRole("link", { name: "What you tried" })).toHaveAttribute("href", "/my-adhd/history");
});

test("answering again keeps the old answers until the last question, then keeps day one", async ({ page }) => {
  await seed(page, LIVED_RECORD);
  await expect.poll(async () => ((await model(page)).snapshots ?? []).length).toBeGreaterThan(0);
  const before = await model(page);

  // Leave part way: the map still reads the answers it had.
  await page.goto("/start?again=1");
  await expect(page.locator(".onboarding-progress")).toBeVisible();
  await page.locator(".onboarding-options button").first().click();
  await page.goto("/my-adhd");
  const partWay = await model(page);
  expect(partWay.onboarding).toEqual(before.onboarding);
  expect(partWay.onboardingDraft).toBeTruthy();

  // Go through to the end: the new set replaces the old, and day one is untouched.
  await page.goto("/start?again=1");
  for (let q = 0; q < 10; q++) {
    // The steps crossfade: wait for this question's own step before reading its button.
    await expect(page.locator(".onboarding-progress li.is-done")).toHaveCount(q);
    const next = page.locator(".onboarding-controls .learn-primary");
    if (await next.isDisabled()) await page.locator(".onboarding-options button").first().click();
    await next.click();
  }
  await expect(page.getByRole("button", { name: "Answer again" })).toBeVisible();
  const after = await model(page);
  expect(after.onboardingDraft).toBeUndefined();
  expect(after.onboarding.completedAt).not.toBe(before.onboarding.completedAt);
  expect(after.snapshots[0]).toEqual(before.snapshots[0]);
});
