// W173 verify gate (e2e half): the outcome dashboard states its own denominator and ranks no
// clinician. The unit half is src/outcomes/dashboard.test.ts; the axe scan is in a11y.spec.ts.

import { expect, test, type Page } from "@playwright/test";

async function signInAsMember(page: Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("manager@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("signed-out access redirects to sign-in", async ({ page }) => {
  await page.goto("/console/outcomes");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("the zero state says the rail is empty, not that every outcome is unknown", async ({
  page,
  request,
}) => {
  await signInAsMember(page);
  await request.post("/api/mock/referrals?empty=1");
  await page.goto("/console/outcomes");

  const empty = page.getByTestId("outcomes-empty");
  await expect(empty).toBeVisible();
  // The distinction the whole page rests on: no population is not an unknown population.
  await expect(empty).toContainText("not the same as your practice having written no referrals");
  await expect(page.getByTestId("outcome-buckets")).toHaveCount(0);
});

test("counts the rail, states both denominators, and lists what would settle it", async ({
  page,
  request,
}) => {
  await signInAsMember(page);
  await request.post("/api/mock/referrals?cancelled=1");
  await page.goto("/console/outcomes");

  // The seeded rail carries one of each verdict, so no bucket is asserted vacuously:
  // ref-sent-back written→appointment→completion, ref-sent-cancelled written then cancelled,
  // ref-sent-open written and nothing since. (ref-received has an acceptance act but no chain
  // event, so it is not on this rail at all — which is what the population caveat is about.)
  await expect(page.getByTestId("outcome-row")).toHaveCount(3);
  await expect(page.getByTestId("bucket-reached")).toContainText("1");
  await expect(page.getByTestId("bucket-stopped")).toContainText("1");
  await expect(page.getByTestId("bucket-not_recorded")).toContainText("1");

  // Denominator one: how much of the population is unknown (W170's `basis`).
  await expect(page.getByTestId("outcome-basis")).toContainText("1 of 3");
  await expect(page.getByTestId("outcome-basis")).toContainText("not the same as not having happened");

  // Denominator two: what the population IS. Without it, "3 referrals" reads as "we wrote 3".
  await expect(page.getByTestId("outcome-population")).toContainText(
    "not counted as an unknown outcome",
  );

  // The unsettled pile rendered as record-keeping somebody could do.
  const asks = page.getByTestId("settlement-ask");
  await expect(asks).not.toHaveCount(0);
  await expect(page.getByTestId("settlement-asks")).toContainText("an appointment recorded");
});

test("the unknown bucket is not styled as a failure", async ({ page, request }) => {
  await signInAsMember(page);
  await request.post("/api/mock/referrals?cancelled=1");
  await page.goto("/console/outcomes");

  // Same classes on all three, so the model's refusal cannot be undone in CSS. Compared rather
  // than pattern-matched against a colour list: a new warning class would slip past a denylist.
  const classes = await page
    .getByTestId(/^bucket-/)
    .evaluateAll((nodes) => nodes.map((n) => n.className));
  expect(classes).toHaveLength(3);
  expect(new Set(classes).size).toBe(1);
});

test("ranks no clinician and shows no single success figure", async ({ page, request }) => {
  await signInAsMember(page);
  await request.post("/api/mock/referrals?cancelled=1");
  await page.goto("/console/outcomes");

  // W83's floor. The seeded rail's events are attributed to clin-demo and clin-other in the
  // store; neither may surface here at all.
  const full = (await page.locator("body").innerText()).toLowerCase();
  expect(full).not.toContain("clin-demo");
  expect(full).not.toContain("clin-other");
  // No rate, percentage or score anywhere — W170's rule, carried onto the surface.
  expect(full).not.toMatch(/\d\s*%/);
  for (const banned of ["success rate", "completion rate", "score"]) {
    expect(full, `the dashboard shows a single figure: "${banned}"`).not.toContain(banned);
  }

  // The ranking-vocabulary scan runs over the page MINUS its caveats section, because the
  // caveats are where the page says it will not break outcomes down BY CLINICIAN — and a scan
  // that cannot tell a refusal from the thing refused fails on the sentence doing the refusing.
  // (W95 hit exactly this: an e2e banned "priority" on a page whose copy said "carries no
  // priority".) Word boundaries, so "stopped" is not read as "top".
  const caveats = (await page.getByTestId("outcomes-caveats").innerText()).toLowerCase();
  expect(full).toContain(caveats);
  const reported = full.replace(caveats, "");
  for (const banned of [/\b(by|per) clinician\b/, /\btop\b/, /\bbest\b/, /\bworst\b/, /\bleague\b/, /\branked?\b/]) {
    expect(reported, `the dashboard ranks: ${banned}`).not.toMatch(banned);
  }
  // Non-vacuous: the subtraction removed the caveats and nothing else.
  expect(reported.length).toBeGreaterThan(200);
  expect(caveats).toMatch(/\bby clinician\b/);

  // Non-vacuous: the page really did render, so the absences above mean something.
  await expect(page.getByRole("heading", { name: "Outcomes" })).toBeVisible();
  await expect(page.getByTestId("no-clinician-breakdown")).toContainText(
    "not going to be one",
  );
});

test("one practice's rail is not visible from another", async ({ page, request }) => {
  await signInAsMember(page);
  await request.post("/api/mock/referrals");
  await page.goto("/console/outcomes");
  // ref-elsewhere belongs to a third practice and is seeded precisely so it can be looked for.
  await expect(page.locator("body")).not.toContainText("ref-elsewhere");
});
