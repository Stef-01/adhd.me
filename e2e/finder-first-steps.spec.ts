// First steps for a parent (docs/matching/CHILD-FLOWS.md): a request about a child shows three steps
// above the list, and the list opens on three rows; an adult's request shows no steps.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";

async function search(page: Page, request: string) {
  await page.goto("/");
  await page.getByRole("textbox").fill(request);
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
}

test("a parent asking for an assessment sees three first steps and an assessor first", async ({ page }) => {
  await search(page, "my son needs an ADHD assessment, his teacher raised it");
  const steps = page.getByRole("region", { name: "First steps" });
  await expect(steps.getByRole("listitem")).toHaveText(["Ask school for written notes", "A GP, then a paediatrician", "Skills and medication, weighed together"]);
  await expect(page.locator(".clinician-row")).toHaveCount(3);
  await expect(page.locator(".clinician-row").first()).toContainText("Psychologist");
});

test("taking the child out of what was heard takes the steps away", async ({ page }) => {
  await search(page, "my son needs an ADHD assessment, his teacher raised it");
  await page.getByRole("button", { name: /Remove children/i }).click();
  await expect(page.getByRole("region", { name: "First steps" })).toHaveCount(0);
});

test("an adult's request shows no first steps", async ({ page }) => {
  await search(page, "an adult ADHD assessment, telehealth, not rushed");
  await expect(page.getByRole("region", { name: "First steps" })).toHaveCount(0);
  await expect(page.locator(".clinician-row")).toHaveCount(5);
});
