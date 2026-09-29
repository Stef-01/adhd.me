import { expect } from "@playwright/test";
import { test } from "./support/test";
import { expectNoViolations } from "./support/a11y";
test("a cultural-care ask nobody listed declares offers an honest community-controlled service route", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("Aboriginal clinician who understands spiritual health and ADHD");
  await page.keyboard.press("Enter");
  await expect(page.locator(".results-empty")).toBeVisible();
  await expect(page.locator(".clinician-row")).toHaveCount(0);
  await expect(page.locator(".results-empty").getByRole("link", { name: /community-controlled/ })).toHaveAttribute("href", "https://www.naccho.org.au/location/");
  await page.getByRole("button", { name: "Clear the filters", exact: true }).click();
  await expect(page.locator(".clinician-row").first()).toBeVisible();
});
test("the care group is offered only once somebody listed declares a care need", async ({ page }) => {
  // Every filter on the profile is a declared clinician fact; nobody on the real roster has declared
  // a care need or a cultural identity yet, so the group folds away rather than narrowing to nobody.
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/profile");
  await expect(page.getByText("Care and cultural preferences", { exact: true })).toHaveCount(0);
  await expectNoViolations(page, "Care preferences");
  await page.goto("/");
  await page.getByRole("textbox").fill("help with my studies");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-row").first()).toBeVisible({ timeout: 20000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
