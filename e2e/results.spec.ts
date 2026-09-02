// W42 verify gate, executable half: the comprehension checklist as assertions.
// Each test names the question a practice manager should be able to answer, and
// asserts the on-page element that answers it. The design-QA half (layout, palette,
// accessibility review) lives in docs/DESIGN-QA.md.

import { expect, test } from "@playwright/test";
import { MANAGER_EMAIL, signInAndOnboard } from "./support/session";

test.beforeEach(async ({ page, request }) => {
  await request.post("/api/mock/console");
  await signInAndOnboard(page, MANAGER_EMAIL);
});

test("Q1: how many extra appointments did we get, and is anything wrong?", async ({ page }) => {
  await page.getByRole("link", { name: "Your results" }).click();
  await expect(page).toHaveURL(/\/console\/results$/);

  // First render builds the full sim (same cost as v1) — measured at U13 as 4.4–9.8 s on the
  // e2e runner. The 30 s used to sit on the URL check above, which held while the route streamed
  // nothing until the sim was done; since U3's `console/loading.tsx` the URL changes at once and
  // the wait belongs to the first tile, as it does in Q2–Q5.
  const tile = page.getByText("Extra appointments", { exact: true }).first().locator("..");
  await expect(tile.locator("div").nth(1)).toHaveText(/^[\d,]+$/, { timeout: 30_000 });

  // "Is anything wrong" is answerable before any number is read.
  await expect(page.getByTestId("results-status")).toContainText(/nothing needs your attention/i);
});

test("Q2: why is that smaller than the bookings ADHD.ME generated?", async ({ page }) => {
  await page.goto("/console/results");
  await expect(
    page.getByRole("heading", { name: "Why the smaller number is the real one" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("results-split-total")).toContainText(/booked from a ADHD.ME message/i);
  await expect(page.getByText(/would have happened anyway/i).first()).toBeVisible();
  // The naive figure is present as context, and explicitly not claimed.
  await expect(page.getByText(/Counting all .* would let us claim/i)).toBeVisible();
});

test("Q3: what is this worth to the practice?", async ({ page }) => {
  await page.goto("/console/results");
  const tile = page.getByText("Extra billings, estimated").locator("..");
  await expect(tile.locator("div").nth(1)).toHaveText(/^\$[\d,]+$/, { timeout: 30_000 });
  // Labelled as an estimate with its assumption stated on the tile.
  await expect(tile).toContainText(/at an assumed \$\d+ each/i);
});

test("Q4: the page speaks plain English, not measurement jargon", async ({ page }) => {
  await page.goto("/console/results");
  await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible({ timeout: 30_000 });
  const body = (await page.locator("body").innerText()).toLowerCase();
  for (const jargon of ["incrementality", "holdout", "per 1,000", "arm patients"]) {
    expect(body, `jargon leaked onto the practice-facing page: ${jargon}`).not.toContain(jargon);
  }
});

test("Q5: the chart has a legend, a caption and an accessible table equivalent", async ({ page }) => {
  await page.goto("/console/results");
  const figure = page.locator("figure");
  await expect(figure).toBeVisible({ timeout: 30_000 });
  await expect(figure.getByText("Messaged patients")).toBeVisible();
  await expect(figure.getByText("Comparison group")).toBeVisible();
  // Identity is never colour-alone: both series are also named in the table header.
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await expect(table.getByRole("columnheader", { name: /Extra appointments/ })).toBeVisible();
});

test("Q6: continuity is presented as a rule that held, not as a result", async ({ page }) => {
  await page.goto("/console/results");
  await expect(page.getByText(/confirms the rule held — it is not a result/i)).toBeVisible({
    timeout: 30_000,
  });
});

test("the v1 detailed view is still reachable and unchanged", async ({ page }) => {
  await page.goto("/console/results");
  await page
    .getByRole("link", { name: "Detailed measurement view" })
    .click({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/console\/dashboard$/, { timeout: 30_000 });
  await expect(page.getByText("Incremental attended / 1,000")).toBeVisible();
});

test("signed-out access to the results page redirects to sign-in", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/console/results");
  await expect(page).toHaveURL(/\/console\/signin$/);
});
