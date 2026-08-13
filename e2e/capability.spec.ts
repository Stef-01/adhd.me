// W83 verify gate (e2e half): the GP sees their own profile, the practice sees the panel
// view, and the panel view does not carry the raw counts. The isolation half is unit-tested
// in src/capability/store.test.ts — a second practice is not reachable from one browser
// session, so asserting it here would be theatre.

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, request }) => {
  await request.post("/api/mock/console");
  await page.goto("/console");
  await page.getByLabel("Work email").fill("manager@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
  await request.post("/api/mock/capability");
});

test("signed-out access to the capability page redirects to sign-in", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/console/capability");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("a GP sees their own profile in full, including what was derived", async ({ page }) => {
  await page.goto("/console/capability");
  await expect(page.getByRole("heading", { name: "Capability" })).toBeVisible();

  const own = page.getByTestId("own-profile");
  await expect(own).toBeVisible();
  // The derived count is visible to the person it is about — a record you cannot inspect
  // is one you cannot correct.
  await expect(page.getByTestId("own-visits")).toContainText("12");
  await expect(own).toContainText("2026-01-01");
  await expect(own).toContainText("External Body");
});

test("the panel view shows presence and freshness, never the raw counts", async ({ page }) => {
  await page.goto("/console/capability");
  const panel = page.getByTestId("panel-view");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Current");
  // The visit tally must not appear in the management view: surfacing it would turn a
  // capability graph into a productivity board.
  await expect(panel).not.toContainText("12");
  await expect(page.getByTestId("panel-note")).toContainText("Visit counts are not");
});

test("the page makes no claim about how good anyone is", async ({ page }) => {
  await page.goto("/console/capability");
  const body = (await page.locator("main").innerText()).toLowerCase();
  for (const banned of ["expert", "best", "specialist", "top ", "highly skilled", "rating"]) {
    expect(body, `capability page must not contain "${banned}"`).not.toContain(banned);
  }
  // What it does say is provenance, not praise.
  expect(body).toContain("verified");
});
