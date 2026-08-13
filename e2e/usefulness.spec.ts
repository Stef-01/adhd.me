// W15 verify gate: the one-tap usefulness audit — capture, persistence, the
// "worthwhile needs an action" rule, and the auth guard on the page.

import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("gp@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  // Land on a signed-in page (no practice yet → onboarding). Must not match the
  // sign-in URL itself, which also contains "/console".
  await page.waitForURL(/\/console(\/onboarding)?$/);
}

/** W51: recording an outcome takes the record_usefulness grant, so the auditing
 *  clinician has to be a member of a practice — a session alone is not enough. */
async function signInAsMember(page: import("@playwright/test").Page) {
  await signIn(page);
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/usefulness");
  // Also clears the W37 sign-in rate limiter (see the mock console route).
  await request.post("/api/mock/console");
});

test("signed-out access to the audit page redirects to sign-in", async ({ page }) => {
  await page.goto("/console/usefulness");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("captures a usefulness audit and persists it", async ({ page, request }) => {
  await signInAsMember(page);
  await page.goto("/console/usefulness");

  const before = await (await request.get("/api/mock/usefulness")).json();
  expect(before.pending).toHaveLength(3);

  // Audit the first pending visit: tap two actions, keep "worthwhile", save.
  const firstCard = page.locator("form").filter({ has: page.getByRole("button", { name: "Save" }) }).first();
  await firstCard.getByText("Medication reviewed").click();
  await firstCard.getByText("Preventive care").click();
  await firstCard.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText(/Saved\./)).toBeVisible();
  await expect(page.getByText("Audited so far:")).toBeVisible();

  const after = await (await request.get("/api/mock/usefulness")).json();
  expect(after.pending).toHaveLength(2);
  expect(after.outcomes).toHaveLength(1);
  expect(after.outcomes[0].usefulness.sort()).toEqual(["medication_reviewed", "preventive_care"]);
  expect(after.outcomes[0].clinicianJudgedReasonable).toBe(true);
  expect(after.tally.audited).toBe(1);
  expect(after.tally.reasonablePct).toBe(100);
});

test("marking a visit worthwhile with no action is refused", async ({ page, request }) => {
  await signInAsMember(page);
  await page.goto("/console/usefulness");

  // Submit with "worthwhile" checked (the default) but no action tapped.
  const firstCard = page.locator("form").filter({ has: page.getByRole("button", { name: "Save" }) }).first();
  await firstCard.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText(/record at least one thing that happened/)).toBeVisible();
  const after = await (await request.get("/api/mock/usefulness")).json();
  expect(after.outcomes).toHaveLength(0);
});

test("a signed-in non-member cannot record an outcome (W51)", async ({ page, request }) => {
  // The clinician onboards the practice; a different signed-in email is not a member.
  //
  // W166 changed HOW this refusal reads, not whether it holds. Before, there was one practice
  // and a stranger landed on its page and was told their role could not record outcomes. Now a
  // stranger belongs to NO practice, so there is no practice whose page could refuse them — they
  // are sent to onboarding instead. That is a more accurate answer to what is actually wrong,
  // and the invariant the test exists for is unchanged: no outcome is recorded.
  await signInAsMember(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/console\/signin$/);
  await page.getByLabel("Work email").fill("stranger@elsewhere.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);

  // W209 CHANGED WHAT THE STRANGER SEES, and the old comment here recorded the defect as though
  // it were a design: "the PAGE still renders — it shows the synthetic audit queue, which belongs
  // to no practice". It belonged to no practice because the store stamped an id no console mints,
  // and the page read the whole store to show anything at all. Now the queue belongs to a
  // practice and the page asks which one, so a stranger never reaches a form.
  await page.goto("/console/usefulness");
  await expect(page).toHaveURL(/\/console\/onboarding$/);
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);

  // The invariant this test exists for, checked at the store rather than on screen.
  const after = await (await request.get("/api/mock/usefulness")).json();
  expect(after.outcomes).toHaveLength(0);
});

test("W209: a second practice's audit queue is empty, not the first practice's", async ({ page, request }) => {
  // The defect this unit closed, on screen. Before, whichever practice signed in saw every
  // attended appointment in the store and could record an outcome against any of them — a WRITE
  // across a tenancy boundary, and one the console authorized against its own practice first.
  await signInAsMember(page);
  await page.goto("/console/usefulness");
  await expect(page.getByText("Patient 4821")).toBeVisible();

  // Re-key the seeded queue onto a practice this session is not a member of.
  await request.post("/api/mock/usefulness?practice=prac-99");
  await page.reload();

  await expect(page.getByText("No visits waiting for audit.")).toBeVisible();
  await expect(page.getByText("Patient 4821")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
});
