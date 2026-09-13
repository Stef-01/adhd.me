// The Learn page's two panes: tabs switch them, the pane is remembered, a module returns to its own side.
import { expect } from "@playwright/test";
import { test } from "./support/test";

test("games and modules are two panes, remembered, and a game returns to Games", async ({ page }) => {
  await page.goto("/approach");
  await expect(page.getByTestId("learn-tab-games")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("learn-play")).toBeVisible();
  await expect(page.getByTestId("learn-games").locator(".learn-card")).toHaveCount(8);
  // The games are the glass scope; the modules are not.
  await expect(page.locator("[data-liquid] [data-testid='learn-games']")).toHaveCount(1);
  await page.getByTestId("learn-show-all").click();
  await expect(page.getByTestId("learn-games").locator(".learn-card")).toHaveCount(20);
  await page.getByTestId("learn-tab-modules").click();
  await expect(page.getByTestId("learn-tab-modules")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("learn-reads").locator(".learn-card")).toHaveCount(7);
  await expect(page.locator("[data-liquid]")).toHaveCount(0);
  await expect(page.locator("summary", { hasText: "Two-minute tools" })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("learn-tab-modules")).toHaveAttribute("aria-selected", "true");
  await page.goto("/approach?module=starting");
  // The run opens on its title card, or on the how-to-play card on a first visit; either is the game.
  await expect(page.locator(".play-run .play-title")).toBeVisible();
  await page.goto("/approach");
  await expect(page.getByTestId("learn-tab-games")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#learn-pane-panel")).toHaveAttribute("aria-labelledby", "learn-tab-games");
});


test("learning cards stay separated at phone, tablet and desktop widths", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/approach?pane=games");
    await expect(page.getByTestId("learn-games")).toBeVisible();
    for (const pane of ["games", "modules", "games"] as const) {
      await page.getByTestId(`learn-tab-${pane}`).click();
      const stack = page.getByTestId(pane === "games" ? "learn-games" : "learn-reads");
      if (pane === "modules") await page.getByText("Understand ADHD", { exact: true }).click();
      await expect(stack).toBeVisible();
      const violations = await stack.evaluate(el => {
        const cards = [...el.querySelectorAll(".learn-card")];
        const failures: string[] = [];
        for (const [index, card] of cards.entries()) {
          const text = card.querySelector(".learn-card-text")!.getBoundingClientRect();
          const art = card.querySelector(".learn-card-art")!.getBoundingClientRect();
          if (text.right > art.left + 1) failures.push(`card ${index}: text overlaps artwork`);
          const box = card.getBoundingClientRect();
          for (const other of cards.slice(index + 1)) {
            const b = other.getBoundingClientRect();
            if (box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top) failures.push(`card ${index}: overlaps another card`);
          }
        }
        return failures;
      });
      expect(violations, `${width}px ${pane}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px overflow`).toBe(true);
    }
  }
});
