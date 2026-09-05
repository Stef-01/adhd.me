// W14 verify gate: the incrementality dashboard renders from sim data — north-star
// tiles, the two-arm weekly chart with its hover layer, and the table view.

import { expect, test } from "@playwright/test";
import { MANAGER_EMAIL, signInAndOnboard } from "./support/session";

test.beforeEach(async ({ page, request }) => {
  await request.post("/api/mock/console");
  await signInAndOnboard(page, MANAGER_EMAIL);
});

test("dashboard renders the north star and both arms from sim data", async ({ page }) => {
  await page.getByRole("link", { name: "Incrementality dashboard" }).click();
  await expect(page).toHaveURL(/\/console\/dashboard$/, { timeout: 30_000 });

  // The dashboard's first render builds the full default sim (W14 cached accessor) — measured at
  // ~4.9s cold — and since U3 gave /console a streaming `loading.tsx`, that wait no longer sits on
  // the navigation: the URL lands instantly on the "Loading…" shell and the sim's seconds arrive
  // HERE, on the first tile. The 30s allowance therefore belongs to the content, not the URL.
  // (This spec was red on main for exactly that reason: the allowance was on the wrong wait.)
  const northStar = page.getByText("Incremental attended / 1,000").locator("..");
  await expect(northStar).toBeVisible({ timeout: 30_000 });
  await expect(northStar.locator("div").nth(1)).toHaveText(/^-?\d+\.\d$/);

  // The naive count is present but labelled as contrast only.
  await expect(page.getByText(/vs naive generated count \d+ \(contrast only\)/)).toBeVisible();

  // Chart: both series drawn, legend present.
  await expect(page.locator('path[data-series="invite"]')).toBeVisible();
  await expect(page.locator('path[data-series="holdout"]')).toBeVisible();
  const legend = page.locator("figure");
  await expect(legend.getByText("Invite arm")).toBeVisible();
  await expect(legend.getByText("Holdout arm")).toBeVisible();

  // Hover layer: moving over the plot raises the tooltip with both arms and the delta.
  await page.locator("svg[role=img]").hover({ position: { x: 360, y: 150 } });
  const tooltip = page.getByTestId("chart-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText(/Week \d+/);
  await expect(tooltip).toContainText("Invite");
  await expect(tooltip).toContainText("Holdout");
  await expect(tooltip).toContainText("Δ");

  // Table view: one row per simulated week.
  await expect(page.locator("tbody tr")).toHaveCount(26);

  // Guard still holds on the dashboard route.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/console\/signin$/);
  await page.goto("/console/dashboard");
  await expect(page).toHaveURL(/\/console\/signin$/);
});
