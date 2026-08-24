// O57 verify gate: the clinician applications register is staff-gated ABOVE the read.
//
// The staff list ships empty (a grant is a founder commit), so the GRANTED view cannot be
// walked here — its sentences are unit-pinned in src/onboarding/applications-view.test.ts
// instead. What this spec can and does prove is the half that protects real people: an
// application actually exists in the store, and neither a signed-out visitor nor a practice
// account can see one byte of it.
import { expect, test } from "@playwright/test";
import { signInAndOnboard as signInAsPracticeOwner } from "./support/session";

// O188: the join form is retired, so the row this spec guards arrives through the synthetic
// fixture instead of a walked form. The boundary under test is unchanged — an application holds
// a person's name and email, and no console account may see one byte of it.

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("a signed-out visitor is sent to sign-in", async ({ page }) => {
  await page.goto("/console/applications");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("a practice owner sees the refusal, and not one byte of a stored application", async ({ page, request }) => {
  // Non-vacuous by construction: the store genuinely holds this row while we look — the fixture
  // response says so, and the assertions below then prove none of it reaches this account.
  const seeded = await request.post("/api/mock/applications");
  expect(seeded.ok()).toBe(true);

  await signInAsPracticeOwner(page);
  await page.goto("/console/applications");

  await expect(page).toHaveURL(/\/console\/applications$/);
  await expect(page.getByRole("heading", { name: "Clinician applications" })).toBeVisible();
  await expect(page.getByTestId("applications-refused")).toBeVisible();

  // The gate sits above the read, so nothing about any application reaches the response —
  // not the applicant's details, not the count, not the mix sentence.
  const body = (await page.content()).toLowerCase();
  expect(body).not.toContain("applications fixture");
  expect(body).not.toContain("med0009990057");
  expect(body).not.toContain("applications-fixture@example.practice");
  expect(body).not.toContain("mailto:");
  expect(body).not.toContain("stated preference");
  expect(body).not.toContain("applications received");

  // The design record: what this surface ships looking like today — present, and closed.
  await page.screenshot({ path: "qa/_runs/applications-o57/refusal-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "qa/_runs/applications-o57/refusal-mobile.png", fullPage: true });
});
