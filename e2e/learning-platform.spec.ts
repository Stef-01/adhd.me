import { expect, test } from "@playwright/test";

test("a reading step stays readable on mobile and resumes without marking completion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/approach");
  await page.getByTestId("learn-tab-modules").click();
  await page.getByRole("button", { name: /Everyday strategies/ }).click();
  await expect(page.locator(".learn-lesson.is-current")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Sections" })).not.toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const heading = await page.locator(".learn-lesson.is-current h2").first().innerText();
  const metrics = await page.locator(".learn-lesson.is-current").evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.width + 1);
  expect(metrics.width).toBeGreaterThan(300);
  await page.reload();
  await expect(page.locator(".learn-lesson.is-current h2").first()).toHaveText(heading);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("adhdme.learn.v1") ?? '{"done":[]}').done)).not.toContain("everyday");
  await page.getByRole("button", { name: "All modules" }).click();
  await expect(page.getByRole("button", { name: /Continue Everyday strategies/ })).toBeVisible();
  await page.getByRole("button", { name: /Continue Everyday strategies/ }).click();
  await expect(page.locator(".learn-lesson.is-current h2").first()).toHaveText(heading);
  await page.getByRole("button", { name: "All modules" }).click();
  await page.locator(".learn-stack").getByRole("button", { name: /Everyday strategies/ }).click();
  await expect(page.locator(".learn-lesson.is-current h2").first()).toHaveText("Put memory outside your head.");
});

test("the module URL supports browser Back and invalid IDs recover to the library", async ({ page }) => {
  await page.goto("/approach");
  await page.getByTestId("learn-tab-modules").click();
  await page.getByRole("button", { name: /Everyday strategies/ }).click();
  await expect(page).toHaveURL(/module=everyday/);
  await page.goBack();
  await expect(page.locator(".learning-feature")).toBeVisible();
  await page.goto("/approach?module=missing");
  await expect(page.locator(".learning-feature")).toBeVisible();
});

test("the desktop Learn tab returns to the library and step navigation focuses new content", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/approach?module=everyday");
  await expect(page.locator(".learn-lesson.is-current h2").first()).toBeFocused();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".learn-lesson.is-current h2").first()).toBeFocused();
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Learn", exact: true }).click();
  await expect(page).toHaveURL(/\/approach$/);
  await expect(page.locator(".learning-feature")).toBeVisible();
});

test("learning remains usable when browser storage is denied", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage denied"); } }));
  await page.goto("/approach?module=cost");
  await expect(page.locator(".learn-lesson.is-current")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  // §14: the completion card is the read's last idea and one button, no "MODULE FINISHED" label above it.
  await expect(page.locator(".learning-completion").getByRole("button", { name: "Read again" })).toBeVisible();
  await expect(page.locator(".learning-overline")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Time, money, distance/ })).toContainText("Done");
});

test("examples respond to keyboard selection without storing the response", async ({ page }) => {
  await page.goto("/approach?module=everyday");
  const choice = page.getByRole("button", { name: /Some company/ });
  await choice.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".learning-example-response")).toContainText("body doubling");
  expect(await page.evaluate(() => localStorage.getItem("adhdme.learn.cursor.v1"))).not.toContain("company");
});

test("desktop header is in the page flow and first-visit consent clears mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const bar = page.getByRole("navigation", { name: "Sections" });
  expect(await bar.evaluate(el => getComputedStyle(el).position)).toBe("static");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.removeItem("adhdme-privacy-ack"));
  await page.reload();
  const consent = page.getByRole("region", { name: "Privacy" });
  await expect(consent).toBeVisible();
  await expect.poll(async () => {
    const nav = await bar.boundingBox();
    const notice = await consent.boundingBox();
    return nav!.y + nav!.height - notice!.y;
  }).toBeLessThanOrEqual(1);
});
