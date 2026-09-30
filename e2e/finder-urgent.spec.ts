// A typed search whose words say someone may be in danger leads with urgent help, as a spoken one does.

import { expect } from "@playwright/test";
import { test } from "./support/test";

test("a parent who types that their child wants to die sees urgent help before the list", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("my daughter says she wants to die, she is 14");
  await page.keyboard.press("Enter");
  const alert = page.locator(".finder-urgent");
  await expect(alert).toContainText("000");
  await expect(alert.getByRole("link", { name: "Urgent help" })).toHaveAttribute("href", "/urgent");
});

test("an ordinary search shows no urgent line", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("my son is hurting at school, his teacher thinks ADHD");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".finder-urgent")).toHaveCount(0);
});
