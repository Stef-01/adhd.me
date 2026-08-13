// W22 verify gate: the demo runs clean end-to-end — launch, console, dashboard,
// patient booking with offer expiry, ops — following docs/DEMO.md's script.

import { expect, test } from "@playwright/test";

test("the scripted demo walkthrough runs clean end-to-end", async ({ page, context }) => {
  // 1. Launch: seeds every store and signs the presenter in. (Label reads "Reset"
  // when an earlier spec left a practice in the shared store — same idempotent action.)
  await page.goto("/demo");
  await page.getByRole("button", { name: /Launch demo|Reset demo to the start/ }).click();
  await expect(page).toHaveURL(/\/console$/);
  await expect(page.getByRole("heading", { name: "Demo Family Practice" })).toBeVisible();
  await expect(page.getByText("holdout 20%")).toBeVisible();

  // 3. Incrementality dashboard renders the sim numbers.
  await page.getByRole("link", { name: "Incrementality dashboard" }).click();
  await expect(page.locator('path[data-series="invite"]')).toBeVisible();
  await expect(page.locator('path[data-series="holdout"]')).toBeVisible();

  // 4. Patient moment: the demo page lists live booking links.
  await page.goto("/demo");
  await expect(page.getByRole("button", { name: "Reset demo to the start" })).toBeVisible();
  const patientTab = await context.newPage();
  const bookVia = async (testId: string) => {
    const href = await page.getByTestId(testId).getAttribute("href");
    await patientTab.goto(href!);
    await patientTab.getByRole("button", { name: "Confirm booking" }).click();
    await expect(
      patientTab.getByRole("heading", { name: "Your appointment is booked" }),
    ).toBeVisible();
  };
  await bookVia("booking-link-1");

  // 5. Offer expiry: two slots, so booking the second fills the session and the
  // third offer closes. The presenter page shows the statuses flip live.
  await page.reload();
  await bookVia("booking-link-2");
  await page.reload();
  await expect(page.getByText("Patient 1 · Booked")).toBeVisible();
  await expect(page.getByText("Patient 2 · Booked")).toBeVisible();
  await expect(page.getByText("Patient 3 · Expired (session filled)")).toBeVisible();
  await expect(page.getByTestId("booking-link-3")).toHaveCount(0);

  // 7. Admin ops shows the queue after the bookings.
  await page.goto("/console/ops");
  await expect(page.getByRole("heading", { name: "Admin ops" })).toBeVisible();

  // Reset returns the world to the start of the script.
  await page.goto("/demo");
  await page.getByRole("button", { name: "Reset demo to the start" }).click();
  await expect(page).toHaveURL(/\/console$/);
  await page.goto("/demo");
  await expect(page.getByTestId("booking-link-1")).toBeVisible();
  await expect(page.getByText("Patient 1 · Sent — link live")).toBeVisible();
});
