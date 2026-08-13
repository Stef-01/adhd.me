// W95 verify gate (e2e half): the outreach console shows the message that would go out, and
// it is an ordinary availability invitation. The linter half is src/referrals/outreach.test.ts.
//
// The assertion that matters is the copy scan: what a browser renders is the last place the
// referral could leak into patient-facing text, and it is the only place a reviewer will
// actually look.

import { expect, test } from "@playwright/test";

type Page = import("@playwright/test").Page;

async function signInAndOnboard(page: Page) {
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

/** Guard against a vacuous pass: every assertion below must run on the real page. */
async function gotoOutreach(page: Page) {
  await page.goto("/console/outreach");
  await expect(page).toHaveURL(/\/console\/outreach$/);
  await expect(page.getByRole("heading", { name: "Outreach", level: 1 })).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("signed-out access to the outreach console redirects to sign-in", async ({ page }) => {
  await page.goto("/console/outreach");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("the console is reachable from the console home", async ({ page }) => {
  await signInAndOnboard(page);
  await page.getByRole("link", { name: "Outreach" }).click();
  await expect(page).toHaveURL(/\/console\/outreach$/);
});

test("the message shown is a plain availability invitation", async ({ page }) => {
  await signInAndOnboard(page);
  await gotoOutreach(page);

  const text = page.getByTestId("nudge-text");
  await expect(text).toBeVisible();

  const message = ((await text.textContent()) ?? "").trim();
  // Structural requirements W6 lints for: who is writing, a way out, a way to book.
  expect(message).toContain("Demo Family Practice");
  expect(message).toContain("appointments available");
  expect(message).toMatch(/reply STOP/i);
  expect(message).toMatch(/https:\/\//);

  // And nothing about why this patient is on the list.
  for (const banned of ["referral", "referred", "specialist", "appointment you", "did not"]) {
    expect(message.toLowerCase(), `the message must not say "${banned}"`).not.toContain(banned);
  }
});

test("both lists render, and every withheld row carries a reason", async ({ page }) => {
  await signInAndOnboard(page);
  await gotoOutreach(page);

  // Non-vacuous: the fixture must actually produce sends and refusals, or the copy scans
  // below are scanning an empty page.
  const sends = await page.getByTestId("send-row").count();
  expect(sends).toBeGreaterThan(0);
  await expect(page.getByTestId("send-count")).toHaveText(String(sends));

  const withheldRows = page.getByTestId("withheld-row");
  const reasons = await withheldRows.count();
  expect(reasons).toBeGreaterThan(1);

  for (let i = 0; i < reasons; i += 1) {
    // A reason with no explanation is a dead end for whoever has to act on it.
    expect(((await withheldRows.nth(i).textContent()) ?? "").trim().length).toBeGreaterThan(40);
  }
});

test("an appointment with nothing back is sent to the service, not the patient", async ({
  page,
}) => {
  await signInAndOnboard(page);
  await gotoOutreach(page);

  const row = page.getByTestId("withheld-row").filter({ hasText: "service side gap" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("chasing with the service, not with the patient");
});

test("the page makes no clinical claim and blames no patient", async ({ page }) => {
  await signInAndOnboard(page);
  await gotoOutreach(page);

  const body = ((await page.textContent("body")) ?? "").toLowerCase();
  // Sanity-check the scan is looking at the right page, so it cannot pass on a redirect.
  expect(body).toContain("would not be invited");

  for (const banned of [
    "did not attend",
    "failed to",
    "non-compliant",
    "at risk",
    "needs to be seen",
    "most urgent",
    "highest priority",
    "priority order",
    "in order of",
    "ranked",
    "overdue",
  ]) {
    expect(body, `the outreach console must not say "${banned}"`).not.toContain(banned);
  }

  // The naming-vs-ranking line: recipients are named because sending needs a recipient, and
  // the page says outright that the order means nothing.
  expect(body).toContain("carries no priority");
});
