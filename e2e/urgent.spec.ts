// Urgent help, held to what a person who cannot speak needs from it: a text line and a text route
// to 000 on the page, rows a shaking thumb can hit, and nothing that scrolls sideways on a small phone.

import { expect } from "@playwright/test";
import { test } from "./support/test";

test("Urgent help offers a way in without speaking", async ({ page }) => {
  await page.goto("/urgent");
  await expect(page.locator('a.urgent-call[href="sms:0477131114"]')).toContainText("0477 13 11 14");
  await expect(page.locator('a.urgent-call[href="sms:0423677767"]')).toContainText("Start with 000");
  const chats = page.locator('a.urgent-call[data-method="chat"]');
  expect(await chats.count()).toBeGreaterThanOrEqual(2);
  for (const chat of await chats.all()) {
    await expect(chat).toHaveAttribute("href", /^https:\/\//);
    await expect(chat).toHaveAttribute("rel", /noopener/);
  }
});

for (const width of [320, 390]) {
  test(`every Urgent help row is a whole-row target and nothing scrolls sideways at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/urgent");
    const rows = page.locator("a.urgent-call");
    expect(await rows.count()).toBe(8);
    for (const row of await rows.all()) {
      const box = await row.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
