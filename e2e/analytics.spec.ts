// U13 (O229): measurement behind the agreement, proven by counting requests to the tag host.
//
// The suite runs with the placeholder measurement ID set (playwright.config.ts), so the loader
// WOULD be requested. This spec intercepts the tag host and counts: nothing before Agree, exactly
// one after, nothing new after Withdraw on /privacy — and the bar comes back, on the page where
// the agreement was taken back. Like consent.spec.ts it starts unagreed on purpose.

import { expect, test } from "@playwright/test";
import { sweepSurface, unaccepted } from "../src/compliance/public-surfaces";
import { gaDisableFlag } from "../src/privacy/measurement";

test.use({ storageState: { cookies: [], origins: [] } });

const TAG_HOST = "https://www.googletagmanager.com/**";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID!;

test("the tag is requested only after Agree, and not again after Withdraw", async ({ page }) => {
  const loads: string[] = [];
  await page.route(TAG_HOST, async (route) => {
    loads.push(route.request().url());
    await route.fulfill({ contentType: "application/javascript", body: "" });
  });

  await page.goto("/");
  const bar = page.getByRole("region", { name: "Privacy" });
  await expect(bar).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(loads, "nothing reaches the tag host before the agreement").toEqual([]);

  await bar.getByRole("button", { name: "Agree" }).click();
  await expect(bar).not.toBeVisible();
  await expect.poll(() => loads.length).toBe(1);
  expect(loads[0]).toContain(`id=${encodeURIComponent(GA_ID)}`);
  expect(await page.evaluate((flag) => (window as unknown as Record<string, unknown>)[flag], gaDisableFlag(GA_ID))).toBe(false);

  // The agreement holds across a navigation; the loader is requested once per document.
  await page.goto("/privacy");
  await expect(page.getByRole("region", { name: "Privacy" })).toHaveCount(0);
  await expect.poll(() => loads.length).toBe(2);

  // The withdraw control's own words answer to the patient-notice rules like the rest of /privacy.
  const choice = page.locator("[data-consent='agreed']");
  await expect(choice).toBeVisible();
  const findings = sweepSurface("/privacy", "patient_notice", await choice.innerText());
  expect(unaccepted(findings).map((f) => `${f.rule}: "${f.match}"`)).toEqual([]);

  await choice.getByRole("button", { name: "Withdraw agreement" }).click();
  await expect(page.getByRole("region", { name: "Privacy" })).toBeVisible();
  await expect(page.locator("[data-consent='not-agreed']")).toBeVisible();
  // gtag.js's own off switch is up, the loader element is gone, and nothing new was requested.
  expect(await page.evaluate((flag) => (window as unknown as Record<string, unknown>)[flag], gaDisableFlag(GA_ID))).toBe(true);
  await expect(page.locator("script[src*='googletagmanager']")).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  expect(loads.length).toBe(2);

  // Withdrawn means withdrawn: a reload asks again and loads nothing.
  await page.reload();
  await expect(page.getByRole("region", { name: "Privacy" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(loads.length).toBe(2);

  // And agreeing again, from the bar on the policy page, loads it once more.
  await page.getByRole("region", { name: "Privacy" }).getByRole("button", { name: "Agree" }).click();
  await expect.poll(() => loads.length).toBe(3);
  await expect(choice).toBeVisible();
});
