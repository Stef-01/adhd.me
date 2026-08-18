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

  test("screenshots for the design record", async ({ page }) => {
    await page.goto("/clinicians/join");
    await page.waitForTimeout(400);
    await page.screenshot({ path: "qa/join-o24/join-hero-desktop.png", fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "qa/join-o24/join-hero-mobile.png", fullPage: false });
  });
});
