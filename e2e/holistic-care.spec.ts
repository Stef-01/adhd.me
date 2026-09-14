import { expect } from "@playwright/test";
import { test } from "./support/test";
import { expectNoViolations } from "./support/a11y";
for (const width of [390, 1440]) {
  test(`cultural care and Country remain declared and examples non-bookable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.getByRole("textbox").fill("I want an Aboriginal clinician who understands spiritual health and ADHD");
    await page.keyboard.press("Enter");
    await expect(page.locator(".clinician-row").first()).toBeVisible();
    for (const row of await page.locator(".clinician-row").all()) {
      await expect(row).toContainText("Aboriginal clinician");
      await expect(row).toContainText("Demonstration Country (fictional)");
      await expect(row).toContainText("Example");
    }
    await page.locator(".clinician-row").first().click();
    await expect(page.locator(".profile-cultural-identity")).toContainText("Country / Nation:");
    await page.getByText("Care they offer", { exact: true }).click();
    await expect(page.locator(".profile-care-declaration")).toContainText("Spiritual wellbeing");
    await expect(page.locator(".profile-care-declaration")).toContainText("not bookable");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 390) await expectNoViolations(page, "Cultural care profile");
  });
}
test("real-only cultural-care search offers an honest community-controlled service route", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator(".finder-demo-toggle input").uncheck();
  await page.keyboard.press("Escape");
  await page.getByRole("textbox").fill("Aboriginal clinician who understands spiritual health and ADHD");
  await page.keyboard.press("Enter");
  await expect(page.locator(".results-empty")).toBeVisible();
  await expect(page.locator(".clinician-row")).toHaveCount(0);
  await expect(page.locator(".results-empty").getByRole("link", { name: /community-controlled/ })).toHaveAttribute("href", "https://www.naccho.org.au/location/");
  await page.getByRole("button", { name: "Clear the filters", exact: true }).click();
  await expect(page.locator(".clinician-row").first()).toBeVisible();
});
test("saved university accommodations narrow OTs and EPs independently", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/profile");
  await page.getByText("Care and cultural preferences", { exact: true }).click();
  await page.getByLabel("Support alongside ADHD").selectOption("university-adjustments");
  await expect(page.getByRole("button", { name: "Remove University accommodations" })).toBeVisible();
  await page.reload();
  await page.getByText("Care and cultural preferences", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove University accommodations" })).toBeVisible();
  await expectNoViolations(page, "Care preferences");
  await page.goto("/");
  await page.getByRole("textbox").fill("help with my studies");
  await page.keyboard.press("Enter");
  const selector = page.getByLabel("Provider type");
  await selector.selectOption("occupational-therapist");
  await expect(page.locator(".clinician-row").first()).toContainText("Occupational therapist");
  await selector.selectOption("exercise-physiologist");
  await expect(page.locator(".clinician-row").first()).toContainText("Exercise physiologist");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
