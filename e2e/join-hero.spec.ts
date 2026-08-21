// O24: the patient-mix hero on the GP join page — behaviour pinned, pixels captured.
import { expect, test } from "@playwright/test";

test.describe("the join page opens with the mix, not the form", () => {
  test("the sentence, the illustration and the honesty line are all above the form", async ({ page }) => {
    await page.goto("/clinicians/join");
    const hero = page.getByLabel("Set the patient mix you want");
    await expect(hero).toBeVisible();
    // 30% is the default, and the arithmetic is a tenth of it.
    await expect(hero.getByText("30%")).toBeVisible();
    await expect(hero.getByText(/about\s+3 matched patients a day/i)).toBeVisible();
    // The dream is sold with its feet on the ground, in the same breath.
    await expect(hero.getByText(/An illustration, not a booking forecast/i)).toBeVisible();
    // And the sentence resolves into the application below, on the same page.
    await hero.getByRole("link", { name: "Set my mix" }).click();
    await expect(page.locator("#join-form")).toBeInViewport();
  });

  test("stepping the percent restates the day figure", async ({ page }) => {
    await page.goto("/clinicians/join");
    const hero = page.getByLabel("Set the patient mix you want");
    // The visual steppers are decorative to assistive tech; the accessible control is the
    // slider, so this drives the page the way a screen-reader user would.
    await page.getByLabel(/Percentage of your patients/i).fill("50");
    await expect(hero.getByText(/about\s+5 matched patients a day/i)).toBeVisible();
    await page.getByLabel(/Percentage of your patients/i).fill("10");
    await expect(hero.getByText(/about\s+1 matched patient a day/i)).toBeVisible();
  });

  test("the mix set above reaches the application below (O26)", async ({ page }) => {
    await page.goto("/clinicians/join");
    // Untouched, the form carries no mix at all: the hero's 30% is an opening position, not a
    // statement, and submitting it would manufacture a preference the GP never expressed.
    await expect(page.getByTestId("mix-echo")).toHaveCount(0);
    // The GP sets 50% through the accessible control…
    await page.getByLabel(/Percentage of your patients/i).fill("50");
    // …and the form now restates it and will submit it with the application.
    const echo = page.getByTestId("mix-echo");
    await expect(echo).toBeVisible();
    await expect(echo).toContainText("50%");
    await expect(echo.locator('input[name="desiredMixPercent"]')).toHaveValue("50");
    // Said as a preference with its feet on the ground, like the hero's own honesty line.
    await expect(echo).toContainText(/not a booking promise/i);
  });

  test("screenshots for the design record", async ({ page }) => {
    await page.goto("/clinicians/join");
    await page.waitForTimeout(400);
    await page.screenshot({ path: "qa/_runs/join-o24/join-hero-desktop.png", fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "qa/_runs/join-o24/join-hero-mobile.png", fullPage: false });
  });
});
