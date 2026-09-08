import { expect, test } from "@playwright/test";

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`direct page arrivals hydrate and stay interactive with motion ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));

    await page.goto("/approach/meditate");
    await page.getByRole("button", { name: "Start my moment" }).click();
    await expect(page.getByRole("heading", { name: "Nothing else to do." })).toBeFocused();
    await expect(page.locator(".page-arrival")).toHaveCSS("transform", "none");
    await expect(page.locator(".page-arrival")).toHaveCSS("opacity", "1");

    await page.goto("/approach?module=everyday");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "Build a first step" })).toBeVisible();
    await expect(page.locator(".learn-lesson:visible")).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}
