// W220 verify gate (e2e half): the response console renders the disclosed graph, states what it
// does not say, and keeps the caveat at the table. The unit half is src/console/responses.test.ts
// and the axe scan is in a11y.spec.ts, which now includes this route.
//
// Two things are asserted here that a unit test cannot reach. First, the page RENDERS what the
// view model carries — a field held correctly and dropped in JSX is the whole failure mode of a
// separated view. Second, the caveat's POSITION: W219 attached it to the value so a surface could
// not print a rate without it, and a footnote satisfies the type while losing the point, so the
// DOM order is checked rather than the presence.

import { expect, test } from "@playwright/test";
import { MANAGER_EMAIL, signInAndOnboard } from "./support/session";

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("signed-out access redirects to sign-in", async ({ page }) => {
  await page.goto("/console/responses");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("renders the rates, and the caveat sits above them rather than under", async ({ page }) => {
  await signInAndOnboard(page, MANAGER_EMAIL);
  await page.goto("/console/responses");

  const table = page.getByTestId("responses-rates");
  await expect(table).toBeVisible();
  // Non-vacuity: a table with no rows would satisfy every assertion below.
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByTestId("rate-invitation_offered")).toBeVisible();

  const caveat = page.getByTestId("responses-caveat");
  await expect(caveat).toContainText("do not say what would have happened without the message");

  // Position, not presence. Node.DOCUMENT_POSITION_FOLLOWING === 4: the table follows the caveat.
  const order = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="responses-caveat"]');
    const t = document.querySelector('[data-testid="responses-rates"]');
    return c && t ? c.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING : 0;
  });
  expect(order, "the caveat is not above the rates it qualifies").toBe(4);
});

test("says what it does not say, and never as a zero", async ({ page }) => {
  await signInAndOnboard(page, MANAGER_EMAIL);
  await page.goto("/console/responses");

  // The sim performs one kind of intervention, so the per-kind split is either carried whole or
  // withheld with a reason. Either way the page must not print a bare number as the effect.
  const body = await page.locator("main").innerText();
  expect(body).not.toMatch(/\bno effect\b|\bproved\b|\bproven\b/i);

  // W212's distinction, rendered: the three kinds the period never performed are their own
  // section with their own sentence, never rows of zero in the rate table.
  const unobserved = page.getByTestId("responses-unobserved");
  await expect(unobserved).toBeVisible();
  await expect(unobserved).toContainText("This is not a rate of zero");
  await expect(page.getByTestId("responses-rates")).not.toContainText("referral_sent");
});

test("states the disclosure position whether or not anything was withheld", async ({ page }) => {
  await signInAndOnboard(page, MANAGER_EMAIL);
  await page.goto("/console/responses");

  // W218's rule: the statement is present even when nothing was withheld, because a reader who
  // sees it only sometimes learns to read its presence as a warning.
  await expect(page.getByTestId("responses-disclosure")).toContainText(/disclosure floor/i);
});

test("labels the data as the simulation rather than letting a reader assume otherwise", async ({
  page,
}) => {
  await signInAndOnboard(page, MANAGER_EMAIL);
  await page.goto("/console/responses");
  await expect(page.getByTestId("responses-population")).toContainText(
    "No message has been sent to a patient",
  );
});
