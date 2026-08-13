// W105 verify gate (surface half): a practice user can neither read nor export the community
// interest register. The gate itself is unit-tested in src/tenancy/staff.test.ts.

import { expect, test } from "@playwright/test";

type Page = import("@playwright/test").Page;

async function signInAsPracticeOwner(page: Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("owner@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);

  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("a signed-out visitor is sent to sign-in, and the export refuses", async ({
  page,
  request,
}) => {
  await page.goto("/console/interest");
  await expect(page).toHaveURL(/\/console\/signin$/);

  const response = await request.get("/api/interest/export");
  expect(response.status()).toBe(401);
});

test("a practice owner sees the refusal and no signup data", async ({ page }) => {
  await signInAsPracticeOwner(page);
  await page.goto("/console/interest");

  // Non-vacuous: we are on the register page, not bounced somewhere else.
  await expect(page).toHaveURL(/\/console\/interest$/);
  await expect(page.getByRole("heading", { name: "Community interest" })).toBeVisible();
  await expect(page.getByTestId("interest-refused")).toBeVisible();

  // The list is never fetched for a non-staff visitor, so nothing about it should exist in
  // the response at all — not the count, not the download, not a row.
  const body = (await page.content()).toLowerCase();
  expect(body).not.toContain("unique registrations");
  expect(body).not.toContain("/api/interest/export");
  expect(body).not.toContain("mailto:");
});

test("a practice owner cannot download the CSV", async ({ page }) => {
  await signInAsPracticeOwner(page);
  // page.request, not the standalone `request` fixture: it carries the page's session cookie,
  // so this exercises an AUTHENTICATED practice account hitting the route directly. The
  // standalone fixture would be signed out and pass on a 401, testing nothing.
  const response = await page.request.get("/api/interest/export");
  expect(response.status()).toBe(403);
  expect((await response.text()).toLowerCase()).not.toContain("@");
});

test("the console header does not offer the register to a practice account", async ({ page }) => {
  await signInAsPracticeOwner(page);
  await expect(page.getByRole("link", { name: "Interest" })).toHaveCount(0);
  // Guard against a vacuous pass: the header itself is rendered.
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});
