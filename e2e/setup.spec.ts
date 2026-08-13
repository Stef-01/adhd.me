// W41 verify gate: a TIMED end-to-end run of the self-serve onboarding wizard.
//
// On "under 30 minutes": an automated run finishes in seconds, so a wall-clock
// assertion alone would be theatre. What actually decides whether a practice can
// self-serve in one sitting is structural, so this spec asserts the structure —
// a bounded number of steps, every one completable from inputs the practice
// already has, no step waiting on Meherr or a credential — and keeps a
// generous wall-clock ceiling as the regression guard against a step that starts
// blocking (a slow sim build behind a page, say).

import { expect, test } from "@playwright/test";

/** Wall-clock ceiling for the whole wizard. Generous: it guards against blocking, not slowness. */
const CEILING_MS = 120_000;
/** A practice manager should not face more steps than this in one sitting. */
const MAX_STEPS = 5;

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Must not match /console/signin itself, which also contains "/console".
  await page.waitForURL(/\/console(\/onboarding)?$/);
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("a practice completes self-serve setup in one timed sitting", async ({ page, request }) => {
  const started = Date.now();
  let steps = 0;

  await signIn(page, "owner@demo.practice.example");

  // Step 1 — practice details.
  await page.goto("/console/setup/practice");
  await expect(page.getByRole("heading", { name: "Set up your practice" })).toBeVisible();
  await expect(page.getByText("Step 1 of 5")).toBeVisible();
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL(/\/console\/setup\/clinicians$/);
  steps++;

  // Step 2 — clinician roster.
  await expect(page.getByText("Step 2 of 5")).toBeVisible();
  await page.getByLabel("Clinician 1").fill("Dr Amara Lee");
  await page.getByLabel("Clinician 2").fill("Dr Sam Okafor");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL(/\/console\/setup\/sessions$/);
  steps++;

  // Step 3 — session config.
  await expect(page.getByText("Step 3 of 5")).toBeVisible();
  await page.getByLabel("Protected capacity (%)").fill("20");
  await page.getByLabel("Offer slots from (hour)").fill("9");
  await page.getByLabel("Offer slots until (hour)").fill("17");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL(/\/console\/setup\/rules$/);
  steps++;

  // Step 4 — eligibility rules.
  await expect(page.getByText("Step 4 of 5")).toBeVisible();
  await page.getByLabel("Minimum days since last visit").fill("240");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL(/\/console\/setup\/review$/);
  steps++;

  // Step 5 — review and finish.
  await expect(page.getByText("Step 5 of 5")).toBeVisible();
  await expect(page.getByText("Demo Family Practice")).toBeVisible();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await page.waitForURL(/\/console$/);
  steps++;

  // The practice is genuinely configured, not just walked through.
  const state = await (await request.get("/api/mock/console")).json();
  expect(state.practices[0].setupCompletedAt).not.toBeNull();
  expect(state.practices[0].clinicians).toHaveLength(2);
  expect(state.practices[0].sessionConfig.protectedCapacityFraction).toBeCloseTo(0.2, 6);
  expect(state.practices[0].sessionConfig.schedulingWindow).toEqual({ startHour: 9, endHour: 17 });
  expect(state.practices[0].rulesConfig.minDaysSinceLastVisit).toBe(240);

  expect(steps).toBeLessThanOrEqual(MAX_STEPS);
  expect(Date.now() - started).toBeLessThan(CEILING_MS);
});

test("the wizard refuses to finish while a prerequisite is unmet", async ({ page, request }) => {
  await signIn(page, "owner@demo.practice.example");
  await page.goto("/console/setup/practice");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL(/\/console\/setup\/clinicians$/);

  // Skip the roster entirely and try to finish.
  await page.goto("/console/setup/review");
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page.getByTestId("setup-error")).toContainText(/at least one clinician/i);

  const state = await (await request.get("/api/mock/console")).json();
  expect(state.practices[0].setupCompletedAt).toBeNull();
});

test("invalid session settings are refused with the reason shown", async ({ page }) => {
  await signIn(page, "owner@demo.practice.example");
  await page.goto("/console/setup/practice");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL(/\/console\/setup\/clinicians$/);
  await page.getByLabel("Clinician 1").fill("Dr Amara Lee");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL(/\/console\/setup\/sessions$/);

  // An inverted window must not be accepted.
  await page.getByLabel("Offer slots from (hour)").fill("17");
  await page.getByLabel("Offer slots until (hour)").fill("9");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByTestId("setup-error")).toContainText(/end after it starts/i);
});

test("signed-out access to the wizard redirects to sign-in", async ({ page }) => {
  await page.goto("/console/setup/practice");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("a crafted error link cannot render attacker-supplied text in the console", async ({ page }) => {
  await signIn(page, "owner@demo.practice.example");
  const injected = "Your account is suspended, call 1800-000-000";
  await page.goto(`/console/setup/practice?error=${encodeURIComponent(injected)}`);
  // The page maps error KEYS to its own copy — an unknown key falls back.
  await expect(page.getByTestId("setup-error")).toBeVisible();
  await expect(page.getByTestId("setup-error")).not.toContainText("1800-000-000");
});
