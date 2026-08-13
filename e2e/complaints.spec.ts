// W43 verify gate: complaint/opt-out workflow e2e — intake with opt-out, the
// practice notification banner, triage → resolve, and the opt-out's effect on
// the patient's outstanding booking link.

import { expect, test } from "@playwright/test";

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

test("intake with opt-out → banner → triage → resolve → banner clears", async ({ page, request }) => {
  const seeded = (await (await request.get("/api/mock/state")).json()) as MockState;
  const pat1Token = seeded.invitations[0]!.token; // inv-a belongs to pat-1

  // Intake, with the complainant asking for no further contact.
  await page.getByRole("link", { name: "Complaints" }).click();
  await page.getByLabel("What happened").fill("Caller upset about receiving an availability message");
  await page.getByLabel("Patient identifier (if known)").fill("pat-1");
  await page.getByText("They want no further contact").click();
  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByText("Complaint recorded.", { exact: false })).toBeVisible();
  await expect(page.getByTestId("open-count")).toHaveText("1 open");
  await expect(page.getByText("opt-out applied")).toBeVisible();

  // The opt-out is already terminal: outstanding offer closed, booking link dead.
  const state = (await (await request.get("/api/mock/state")).json()) as MockState;
  expect(state.invitations.find((i) => i.id === "inv-a")?.status).toBe("opted_out");
  await page.goto(`/book/${pat1Token}`);
  await expect(page.getByRole("heading", { name: "You've opted out" })).toBeVisible();

  // Practice notification: the console home banners the open complaint.
  await page.goto("/console");
  const banner = page.getByTestId("complaint-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("1 open complaint");

  // Triage to serious, then resolve with words.
  await banner.click();
  const item = page.getByTestId("complaint-cmp-1");
  await item.locator('select[name="severity"]').selectOption("serious");
  await item.getByRole("button", { name: "Triage" }).click();
  await expect(page.getByText("triaged: Serious")).toBeVisible();
  const reopened = page.getByTestId("complaint-cmp-1");
  await reopened.locator('input[name="resolution"]').fill("Apologised; confirmed no further messages");
  await reopened.getByRole("button", { name: "Resolve" }).click();
  await expect(page.getByTestId("open-count")).toHaveText("0 open");
  await expect(page.getByText("Apologised; confirmed no further messages", { exact: false })).toBeVisible();

  // Banner is gone once nothing is open.
  await page.goto("/console");
  await expect(page.getByTestId("complaint-banner")).toHaveCount(0);
});

test("resolving without triage is refused", async ({ page }) => {
  await page.goto("/console/complaints");
  await page.getByLabel("What happened").fill("General unhappiness about a message");
  await page.getByRole("button", { name: "Record" }).click();
  const item = page.getByTestId("complaint-cmp-1");
  await item.locator('input[name="resolution"]').fill("All sorted out now");
  await item.getByRole("button", { name: "Resolve" }).click();
  await expect(page.getByText("Triage first", { exact: false })).toBeVisible();
  await expect(page.getByTestId("open-count")).toHaveText("1 open");
});

test("signed-out access to complaints redirects to sign-in", async ({ page }) => {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/console\/signin$/);
  await page.goto("/console/complaints");
  await expect(page).toHaveURL(/\/console\/signin$/);
});
