// W21 verify gate (widget side): the in-app ROI calculator renders the brief
// figures and recalculates from the practice's inputs. The economic model itself
// is unit-tested in src/economics/roi.test.ts.

import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("manager@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
}

// Reset clears the W37 sign-in rate limiter too, so a long suite cannot trip it.
test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("signed-out access to the ROI calculator redirects to sign-in", async ({ page }) => {
  await page.goto("/console/roi");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("renders the brief figures and recalculates from inputs", async ({ page }) => {
  await signIn(page);

  // Brief defaults: net annual benefit $45,029, 4.8× return.
  await page.goto("/console/roi");
  await expect(page.getByTestId("roi-Net annual benefit")).toHaveText("$45,029");
  await expect(page.getByTestId("roi-Return on cost")).toHaveText("4.8×");

  // Halving GPs halves incremental revenue → lower net benefit.
  await page.goto("/console/roi?gpCount=5");
  await expect(page.getByTestId("roi-Net annual benefit")).toHaveText("$16,574");

  // A fee that dwarfs incremental revenue drives the return below 1×.
  await page.goto("/console/roi?meherrMonthlyFee=100000");
  const roi = await page.getByTestId("roi-Return on cost").textContent();
  expect(Number(roi!.replace("×", ""))).toBeLessThan(1);
});
