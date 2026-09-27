// The map then and now (docs/design/ux-evaluation-2026-09/PLAN.md W3): the dashed shape is named,
// can be day one or a month ago, and never says a number about the person.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LIVED_RECORD, compareRecord } from "../scripts/text-budget-lib.mjs";

const MODEL_KEY = "adhdme.model.v1";

async function seed(page: Page, record: unknown): Promise<void> {
  await page.goto("/my-adhd");
  await page.evaluate(([k, rec]) => localStorage.setItem(k!, rec!), [MODEL_KEY, JSON.stringify(record)]);
  await page.reload();
}

const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}").snapshots ?? [], MODEL_KEY);

test("day one and a month ago are both offered, the month first, and switching redraws the outline", async ({ page }) => {
  await seed(page, compareRecord());
  const pill = page.getByRole("radiogroup", { name: "Compare with" });
  await expect(pill).toBeVisible();
  const [dayOne, month] = [pill.getByRole("radio").first(), pill.getByRole("radio").last()];
  await expect(dayOne).toHaveText("Day one");
  await expect(month).toHaveAttribute("aria-checked", "true");
  await expect(month).toHaveText(/^[A-Z][a-z]+$/);
  const before = await page.locator(".map-then").getAttribute("points");
  await dayOne.click();
  await expect(dayOne).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => page.locator(".map-then").getAttribute("points")).not.toBe(before);
  const shown = (await page.locator("main").innerText()).replace(/ADHD\.ME|ADHD\s*me/gi, "");
  expect(shown, "then and now in words, never a number").not.toMatch(/\d/);
  for (const radio of await pill.getByRole("radio").all()) expect((await radio.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test("a record from before snapshots gets day one from its first answers, and names it", async ({ page }) => {
  await seed(page, LIVED_RECORD);
  await expect.poll(async () => (await stored(page)).length).toBeGreaterThan(0);
  const snaps = await stored(page);
  expect(snaps[0].approx).toBe(true);
  // The runs finished since the first answers moved the map, so day one differs from now.
  await expect(page.locator(".map-then-pill")).toContainText("Day one");
  await expect(page.locator(".map-then")).toHaveCount(1);
});

test("a map that has not changed since day one shows no outline and no pill", async ({ page }) => {
  const firstAnswers = { ...LIVED_RECORD, completed: [], experiments: [], answers: {}, insights: {}, carePlan: undefined };
  await seed(page, firstAnswers);
  await expect.poll(async () => (await stored(page)).length).toBe(1);
  await page.reload();
  await expect(page.locator(".map-then-pill")).toHaveCount(0);
  await expect(page.locator(".map-then")).toHaveCount(0);
  expect(await stored(page)).toHaveLength(1);
});
