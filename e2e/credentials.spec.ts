// W113 verify gate (e2e half): a clinician sees and corrects their OWN record.
//
// The assertions that matter are the negative ones. That the page renders your credentials is
// the easy half; that it renders nobody else's, and that the only correction available
// REDUCES what the system claims about you, is the unit.

import { expect, test } from "@playwright/test";

const ME = "manager@demo.practice.example";

test.beforeEach(async ({ page, request }) => {
  await request.post("/api/mock/console");
  await page.goto("/console");
  await page.getByLabel("Work email").fill(ME);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
});

test("signed-out access redirects to sign-in", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/console/credentials");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("an unlinked sign-in is refused rather than shown a probable match", async ({ page, request }) => {
  // Seeded WITHOUT linkEmail. Showing "this is probably you" on a page about someone's
  // qualifications is the one failure W81's lookup exists to avoid.
  await request.post("/api/mock/credentials");
  await page.goto("/console/credentials");
  await expect(page.getByTestId("credentials-unlinked")).toBeVisible();
  await expect(page.getByTestId("credentials-list")).toHaveCount(0);
  await expect(page.getByText("cred-live")).toHaveCount(0);
});

test("a clinician sees their own record, including what has lapsed", async ({ page, request }) => {
  await request.post(`/api/mock/credentials?linkEmail=${encodeURIComponent(ME)}`);
  await page.goto("/console/credentials");
  await expect(page.getByRole("heading", { name: "Your credentials" })).toBeVisible();

  const list = page.getByTestId("credentials-list");
  await expect(list).toContainText("cred-live");
  await expect(list).toContainText("cred-waiting");
  // The provenance, which is the thing a record is FOR.
  await expect(list).toContainText("Confirmed");
  await expect(list).toContainText("Waiting to be checked");
  await expect(list).toContainText("2026-01-14");
});

test("a colleague's credential never appears", async ({ page, request }) => {
  // The read is scoped by subject, not filtered afterwards. This is what that buys.
  await request.post(`/api/mock/credentials?linkEmail=${encodeURIComponent(ME)}`);
  await page.goto("/console/credentials");
  await expect(page.getByTestId("credentials-list")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("cred-colleague");
});

test("there is no way to confirm your own credential from this page", async ({ page, request }) => {
  // The safety property in one assertion: every control here reduces what the system claims.
  await request.post(`/api/mock/credentials?linkEmail=${encodeURIComponent(ME)}`);
  await page.goto("/console/credentials");
  // Scoped to the record list: the shell's sign-out and demo-navigation buttons are page
  // furniture and say nothing about credentials. What must hold is that every control that
  // acts ON A RECORD is a withdrawal.
  const controls = await page.getByTestId("credentials-list").getByRole("button").allInnerTexts();
  expect(controls.length).toBeGreaterThan(0);
  expect(controls.every((t) => t.trim() === "Withdraw")).toBe(true);
  // And nothing anywhere on the page offers the step a clinician must not take themselves.
  await expect(page.getByRole("button", { name: /confirm|verify|approve/i })).toHaveCount(0);
  await expect(page.getByTestId("credentials-note")).toContainText("cannot confirm your own");
});

test("withdrawing removes the claim and records why", async ({ page, request }) => {
  await request.post(`/api/mock/credentials?linkEmail=${encodeURIComponent(ME)}`);
  await page.goto("/console/credentials");

  const card = page.getByTestId("credential-cred-live");
  await card.getByLabel("Why are you withdrawing this?").fill("Superseded by a newer certificate");
  await card.getByRole("button", { name: "Withdraw" }).click();

  await expect(page.getByTestId("credentials-saved")).toBeVisible();
  const after = page.getByTestId("credential-cred-live");
  await expect(after).toContainText("Withdrawn");
  await expect(after).toContainText("Superseded by a newer certificate");
  // Withdrawn is terminal, so the control is gone rather than merely disabled.
  await expect(after.getByRole("button", { name: "Withdraw" })).toHaveCount(0);
});

test("the record survives the withdrawal — history is not deleted", async ({ page, request }) => {
  // Withdrawing is a claim being retracted, not a row being erased. An audit that cannot see
  // that a credential once existed is not an audit.
  await request.post(`/api/mock/credentials?linkEmail=${encodeURIComponent(ME)}`);
  await page.goto("/console/credentials");
  const card = page.getByTestId("credential-cred-live");
  await card.getByLabel("Why are you withdrawing this?").fill("No longer accurate");
  await card.getByRole("button", { name: "Withdraw" }).click();
  await expect(page.getByTestId("credentials-saved")).toBeVisible();

  const state = await (await request.get("/api/mock/credentials")).json();
  const kinds = (state.log as Array<{ kind: string; credentialId: string }>)
    .filter((e) => e.credentialId === "cred-live")
    .map((e) => e.kind);
  expect(kinds).toEqual(["submitted", "checked", "verified", "withdrawn"]);
});

test("the page makes no claim about how good anyone is", async ({ page, request }) => {
  await request.post(`/api/mock/credentials?linkEmail=${encodeURIComponent(ME)}`);
  await page.goto("/console/credentials");
  const body = (await page.locator("body").innerText()).toLowerCase();
  for (const banned of ["specialist", "expert", "best", "top-rated", "rating", "review score"]) {
    expect(body, `page copy contains "${banned}"`).not.toContain(banned);
  }
});
