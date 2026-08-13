// W11 verify gate: sign-in → onboarding → dashboard → rules edit, with the
// auth guard holding on every console page.

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("signed-out visitors are sent to sign-in", async ({ page }) => {
  for (const path of ["/console", "/console/onboarding", "/console/rules"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/console\/signin$/);
  }
});

test("sign-in → onboarding → dashboard → rules edit round trip", async ({ page, request }) => {
  await page.goto("/console");
  await page.getByLabel("Work email").fill("manager@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();

  // No practice yet — the console routes to onboarding.
  await expect(page).toHaveURL(/\/console\/onboarding$/);
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();

  // Dashboard shows the practice and the v1 rules.
  await expect(page.getByRole("heading", { name: "Demo Family Practice" })).toBeVisible();
  await expect(page.getByText("holdout 10%")).toBeVisible();
  await expect(page.getByText("version 1")).toBeVisible();
  await expect(page.getByText("180 days")).toBeVisible();

  // Edit rules; the change lands, versioned.
  await page.getByRole("link", { name: "Edit rules" }).click();
  await page.getByLabel("Minimum days since last visit").fill("240");
  await page.getByText("Only invite patients flagged for ongoing care").click();
  await page.getByRole("button", { name: "Save rules" }).click();
  await expect(page.getByText("version 2")).toBeVisible();
  await expect(page.getByText("240 days")).toBeVisible();
  await expect(page.getByText("Ongoing-care patients only").locator("..").getByText("Yes")).toBeVisible();

  // The change is audited with the exact field transition.
  const state = await (await request.get("/api/mock/console")).json();
  const audit = state.auditEvents.at(-1);
  expect(audit.kind).toBe("config_changed");
  expect(audit.detail).toContain("minDaysSinceLastVisit: 180 -> 240");

  // Sign out ends the session.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/console\/signin$/);
  await page.goto("/console");
  await expect(page).toHaveURL(/\/console\/signin$/);
});
