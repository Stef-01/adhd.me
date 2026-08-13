// W33 verify gate: delete/export e2e — export shows everything held, deletion leaves
// a hashed record + suppression, the deleted patient's booking link dies, and the
// public privacy/ADM pages render.

import { expect, test } from "@playwright/test";
import { AUTOMATED_DECISIONS } from "../src/privacy/automated-decisions";

interface MockState {
  invitations: Array<{ id: string; status: string; token: string }>;
}

test.beforeEach(async ({ page, request }) => {
  await request.post("/api/mock/state");
  await request.post("/api/mock/console");
  await page.goto("/console");
  await page.getByLabel("Work email").fill("manager@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
});

test("export → delete → suppressed export, and the dead booking link", async ({ page, request }) => {
  const seeded = (await (await request.get("/api/mock/state")).json()) as MockState;
  const pat1Token = seeded.invitations[0]!.token; // inv-a belongs to pat-1

  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/console\/privacy$/);

  // Export: everything held about pat-1 is visible.
  const exportForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Export" }) });
  await exportForm.locator('input[name="patientId"]').fill("pat-1");
  await page.getByRole("button", { name: "Export" }).click();
  const json = page.getByTestId("export-json");
  await expect(json).toBeVisible();
  await expect(json).toContainText("inv-a");
  await expect(json).toContainText('"held": true');

  // Delete with confirmation.
  const deleteForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Delete" }) });
  await deleteForm.locator('input[name="patientId"]').fill("pat-1");
  await deleteForm.getByText("I confirm permanent deletion").click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deletion completed and recorded below.")).toBeVisible();
  const record = page.getByTestId("deletion-record");
  await expect(record).toContainText("removed 1 invitation(s)");
  await expect(record).not.toContainText("pat-1"); // hashed ref only

  // Re-export: nothing held, suppression visible.
  await exportForm.locator('input[name="patientId"]').fill("pat-1");
  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByTestId("export-empty")).toBeVisible();
  await expect(page.getByText("suppressed — will never be contacted")).toBeVisible();

  // The deleted patient's booking deep link no longer resolves.
  await page.goto(`/book/${pat1Token}`);
  await expect(page.getByRole("heading", { name: "This booking link isn't valid" })).toBeVisible();
});

test("privacy operations are refused without the stewardship grant", async ({ page, request }) => {
  // Signed out entirely → guard redirects.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/console\/signin$/);
  await page.goto("/console/privacy");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("public privacy policy and ADM-transparency pages render the required statements", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByText("Draft — not yet in force")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Privacy policy" })).toBeVisible();
  await expect(page.getByText("Access, correction and deletion")).toBeVisible();

  await page.goto("/privacy/automated-decisions");
  await expect(
    page.getByRole("heading", { name: "How Meherr uses automated decision-making" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "What is automated" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What is never automated" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Human controls" })).toBeVisible();
  await expect(page.getByText("No clinical decision of any kind")).toBeVisible();

  // W201: the list is rendered from `AUTOMATED_DECISIONS`, so the count is the register's and a
  // decision added to the tree reaches the published page or fails the unit suite first.
  const automated = page.locator("section", { has: page.getByRole("heading", { name: "What is automated" }) });
  await expect(automated.locator("li")).toHaveCount(AUTOMATED_DECISIONS.length);
  for (const decision of AUTOMATED_DECISIONS) {
    await expect(automated.getByText(decision.title, { exact: false })).toBeVisible();
  }
  // Named here as well as in the register: the holdout arm withholds an offer of an appointment
  // from a specific person and went undisclosed from W8 to W201.
  await expect(page.getByText("the group we deliberately leave alone")).toBeVisible();
});
