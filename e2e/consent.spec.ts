// O16: the privacy agreement bar and its pop-out, exercised in the one place the ack is absent.
//
// Every other spec runs pre-agreed (see playwright.config.ts) so the bar cannot shadow their
// clicks. This file clears that state on purpose: it is where the bar's behaviour — appear,
// pop out, agree, stay gone — is pinned, and where its patient-facing copy is swept, since the
// rendered-copy sweep never sees a bar that the shared storage state has already dismissed.

import { expect, test } from "@playwright/test";
import { sweepSurface, unaccepted } from "../src/compliance/public-surfaces";

test.use({ storageState: { cookies: [], origins: [] } });

test("the bar appears once, pops out the policy, and agreeing ends it", async ({ page }) => {
  await page.goto("/");
  const bar = page.getByRole("region", { name: "Privacy" });
  await expect(bar).toBeVisible();

  // The bar's own words answer to the patient rules like any other rendered copy.
  const barText = await bar.innerText();
  await bar.getByRole("button", { name: "Privacy policy" }).click();
  const dialog = page.locator(".consent-dialog");
  await expect(dialog).toBeVisible();
  const dialogText = await dialog.innerText();
  const findings = sweepSurface("/", "patient", `${barText}\n${dialogText}`);
  expect(unaccepted(findings).map((f) => `${f.rule}: "${f.match}"`)).toEqual([]);

  // The pop-out names the full policy and closes without agreeing.
  await expect(dialog.getByRole("link", { name: /full privacy policy/i })).toHaveAttribute("href", "/privacy");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(bar).toBeVisible();

  // Agreeing dismisses it, and the agreement survives a reload.
  await bar.getByRole("button", { name: "Agree" }).click();
  await expect(bar).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Privacy" })).toHaveCount(0);
});

test("agreeing from inside the pop-out ends it too", async ({ page }) => {
  await page.goto("/");
  const bar = page.getByRole("region", { name: "Privacy" });
  await bar.getByRole("button", { name: "Privacy policy" }).click();
  await page.locator(".consent-dialog").getByRole("button", { name: "I agree" }).click();
  await expect(bar).not.toBeVisible();
});
