// The walkthrough (2026-09-10): the explanations live behind one switch. A fresh device is
// offered it once; the settings sheet holds the switch after that; the Learn page's two panes
// and the match intake explain themselves only while it is on.

import { expect, test } from "@playwright/test";

const OFFERED = { v: 1, on: false, offered: true };

test.use({ storageState: { cookies: [], origins: [] } });

test("a fresh device is offered the walkthrough once, and Show me around turns it on", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("adhdme-privacy-ack", "1"));
  await page.goto("/approach");
  const offer = page.getByTestId("walkthrough-offer");
  await expect(offer).toBeVisible();
  await expect(page.locator(".explain")).toHaveCount(0);
  await offer.getByRole("button", { name: "Show me around" }).click();
  await expect(offer).toHaveCount(0);
  await expect(page.locator(".explain").first()).toBeVisible();
  await expect(page.locator(".explain").first()).toContainText(/Games are other people/);
  await page.reload();
  await expect(page.getByTestId("walkthrough-offer")).toHaveCount(0);
  await expect(page.locator(".explain").first()).toBeVisible();
});

test("I'm fine dismisses the offer for good and leaves the screens plain", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("adhdme-privacy-ack", "1"));
  await page.goto("/match");
  await page.getByTestId("walkthrough-offer").getByRole("button", { name: /fine/ }).click();
  await expect(page.locator(".explain")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("walkthrough-offer")).toHaveCount(0);
  await expect(page.locator(".explain")).toHaveCount(0);
});

test("the settings sheet holds the switch, and every Explain on the page follows it", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("adhdme-privacy-ack", "1");
    localStorage.setItem("adhdme.walkthrough.v1", JSON.stringify({ v: 1, on: false, offered: true }));
  });
  await page.goto("/match");
  await expect(page.locator(".explain")).toHaveCount(0);
  await page.getByRole("button", { name: "Settings" }).click();
  const sw = page.getByTestId("walkthrough-switch");
  await expect(sw).toHaveAttribute("aria-pressed", "false");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator(".explain").first()).toBeVisible();
  expect(await page.locator(".explain").count()).toBeGreaterThanOrEqual(2);
});

test("the Learn page's two panes: tabs switch them, the pane is remembered, and a module returns to its own side", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("adhdme-privacy-ack", "1");
    localStorage.setItem("adhdme.walkthrough.v1", JSON.stringify({ v: 1, on: false, offered: true }));
  });
  await page.goto("/approach");
  await expect(page.getByTestId("learn-tab-games")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("learn-play")).toBeVisible();
  await expect(page.getByTestId("learn-games").locator(".learn-card")).toHaveCount(20);
  await page.getByTestId("learn-tab-modules").click();
  await expect(page.getByTestId("learn-tab-modules")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("learn-reads").locator(".learn-card")).toHaveCount(7);
  await expect(page.getByRole("heading", { name: "Two-minute tools" })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("learn-tab-modules")).toHaveAttribute("aria-selected", "true");
  // A game opened by URL lands back on Games when it closes.
  await page.goto("/approach?module=starting");
  await expect(page.locator(".play-title")).toContainText("The blank page");
  await page.goto("/approach");
  await expect(page.getByTestId("learn-tab-games")).toHaveAttribute("aria-selected", "true");
  // Only one pane is in the document at a time, and the panel names its tab.
  await expect(page.locator("#learn-pane-panel")).toHaveAttribute("aria-labelledby", "learn-tab-games");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
});
