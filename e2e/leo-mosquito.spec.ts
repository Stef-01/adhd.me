import { test, expect } from "./support/test";

test("Leo's swarm clears in the Chaos Run and keeps navigation visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("adhdme.lives.tutored", "1"));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 844 }); await page.goto("/lives/play?seed=leo-qa-2");

    await expect(page.locator(".lives-scene")).toHaveAttribute("data-game", "leo_mosquito");
    await expect(page.locator(".lives-run")).toHaveAttribute("data-phase", "active");
    for (let i = 0; i < 20 && !(await page.locator(".lives-result").count()); i++) await page.locator(".leo-fly:enabled").first().click();
    await expect(page.locator(".lives-result")).toContainText("Quiet at last.");
    await expect(page.getByRole("link", { name: "Leave the run" })).toBeInViewport();
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.locator(".lives-scene")).not.toHaveAttribute("data-game", "leo_mosquito");
  }
});
