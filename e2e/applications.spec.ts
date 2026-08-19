// O57 verify gate: the clinician applications register is staff-gated ABOVE the read.
//
// The staff list ships empty (a grant is a founder commit), so the GRANTED view cannot be
// walked here — its sentences are unit-pinned in src/onboarding/applications-view.test.ts
// instead. What this spec can and does prove is the half that protects real people: an
// application actually exists in the store, and neither a signed-out visitor nor a practice
// account can see one byte of it.
import { expect, test } from "@playwright/test";

type Page = import("@playwright/test").Page;

/** A synthetic application, submitted through the real join form, mix deliberately set. */
async function submitApplication(page: Page) {
  await page.goto("/clinicians/join");
  // Setting the hero's control is what makes the mix ride the application (O26).
  await page.getByLabel(/Percentage of your patients/i).fill("40");
  await page.locator('input[name="fullName"]').fill("Dr Applications Spec");
  await page.locator('input[name="ahpraRegistrationNumber"]').fill("MED0009990057");
  await page.locator('input[name="email"]').fill("applications-spec@example.practice");
  await page.locator('input[name="practiceName"]').fill("Spec Family Practice");
  await page.locator('input[name="practiceSuburb"]').fill("Beecroft");
  await page.locator('input[name="manner"][value="unhurried"]').check();
  await page.locator('input[name="consent"]').check();
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByText(/A person reads every application|already have an application/)).toBeVisible();
}

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

test("a signed-out visitor is sent to sign-in", async ({ page }) => {
  await page.goto("/console/applications");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("a practice owner sees the refusal, and not one byte of a stored application", async ({ page }) => {
  // Non-vacuous by construction: the store genuinely holds this row while we look.
  await submitApplication(page);

  await signInAsPracticeOwner(page);
  await page.goto("/console/applications");

  await expect(page).toHaveURL(/\/console\/applications$/);
  await expect(page.getByRole("heading", { name: "Clinician applications" })).toBeVisible();
  await expect(page.getByTestId("applications-refused")).toBeVisible();

  // The gate sits above the read, so nothing about any application reaches the response —
  // not the applicant's details, not the count, not the mix sentence.
  const body = (await page.content()).toLowerCase();
  expect(body).not.toContain("applications spec");
  expect(body).not.toContain("med0009990057");
  expect(body).not.toContain("applications-spec@example.practice");
  expect(body).not.toContain("mailto:");
  expect(body).not.toContain("stated preference");
  expect(body).not.toContain("applications received");

  // The design record: what this surface ships looking like today — present, and closed.
  await page.screenshot({ path: "qa/applications-o57/refusal-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "qa/applications-o57/refusal-mobile.png", fullPage: true });
});
