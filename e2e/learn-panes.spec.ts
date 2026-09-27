// The Learn page's two panes: tabs switch them, the pane is remembered, a module returns to its own side.
import { expect } from "@playwright/test";
import { test } from "./support/test";

test("games and modules are two panes, remembered, and a game returns to Games", async ({ page }) => {
  await page.goto("/approach");
  await expect(page.getByTestId("learn-tab-games")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("learn-play")).toBeVisible();
  // Three to try first (PLAN.md W7), and they are the glass scope; the modules are not.
  await expect(page.locator("[data-testid=learn-try][data-ready] .learn-try-tile")).toHaveCount(3);
  await expect(page.locator("[data-liquid] [data-testid='learn-try']")).toHaveCount(1);
  // "All games" sits beside "Play mix", takes the three's place below it and opens on the eight
  // lives; the button itself does not move. Groups open one at a time.
  const toggle = page.getByTestId("learn-show-all");
  const top = () => toggle.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const before = await top();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("learn-try")).toHaveCount(0);
  expect(Math.abs((await top()) - before), "opening All games moves its button").toBeLessThanOrEqual(1);
  await expect(page.locator(".learn-game-names")).toHaveCount(1);
  await expect(page.locator(".learn-game-names li")).toHaveCount(8);
  await page.getByRole("button", { name: "Understand ADHD" }).click();
  await expect(page.locator(".learn-game-names")).toHaveCount(1);
  await expect(page.locator(".learn-game-names li")).toHaveCount(6);
  await page.getByTestId("learn-show-all").click();
  await expect(page.locator("[data-testid=learn-try][data-ready] .learn-try-tile")).toHaveCount(3);
  await page.getByTestId("learn-tab-modules").click();
  await expect(page.getByTestId("learn-tab-modules")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-liquid]")).toHaveCount(0);
  // The shelves sit behind one tap (PLAN.md W8).
  await expect(page.getByTestId("learn-reads")).toHaveCount(0);
  await page.getByTestId("learn-explore").click();
  await expect(page.getByTestId("learn-reads").locator(".learn-card")).toHaveCount(7);
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
    await expect(page.getByTestId("learn-try")).toBeVisible();
    for (const pane of ["games", "modules", "games"] as const) {
      await page.getByTestId(`learn-tab-${pane}`).click();
      const stack = page.getByTestId(pane === "games" ? "learn-try" : "learn-reads");
      if (pane === "modules") {
        await page.getByTestId("learn-explore").click();
        await page.getByText("The basics", { exact: true }).click();
      }
      await expect(stack).toBeVisible();
      // The three render once the device is read; measure them, not the space held for them.
      if (pane === "games") await expect(stack).toHaveAttribute("data-ready", "true");
      const violations = await stack.evaluate(el => {
        const cards = [...el.querySelectorAll(".learn-card, .learn-try-tile")];
        const failures: string[] = [];
        for (const [index, card] of cards.entries()) {
          // A module card holds its words beside its artwork; a game tile is one row.
          const text = card.querySelector(".learn-card-text, :scope > span")!.getBoundingClientRect();
          const art = card.querySelector(".learn-card-art, :scope > svg:last-child")!.getBoundingClientRect();
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


test("the modules pane asks what a person wants help with first, and a goal shows its effect in the same glance", async ({ page }) => {
  await page.goto("/approach?pane=modules");
  const question = page.getByRole("heading", { name: "What do you want help with?" });
  await expect(question).toBeVisible();
  await expect(page.getByTestId("learn-for-you")).toHaveCount(0);
  const goals = page.getByRole("group", { name: "What do you want help with?" });
  await expect(goals.getByRole("button")).toHaveCount(7);
  await goals.getByRole("button", { name: "Sleep" }).click();
  const forYou = page.getByTestId("learn-for-you");
  await expect(forYou).toContainText("From your goals: Sleep.");
  await expect(forYou.locator(".lives-row")).not.toHaveCount(0);
  // Directly under the question: the effect of the tap is on screen with the tap.
  const [q, f] = [await question.boundingBox(), await forYou.boundingBox()];
  expect(f!.y - (q!.y + q!.height)).toBeLessThan(260);
  await page.getByRole("button", { name: "Done" }).click();
  await expect(question).toHaveCount(0);
  await page.reload();
  await expect(question).toHaveCount(0);
  await page.getByRole("button", { name: "Change goals" }).click();
  await expect(goals.getByRole("button", { name: "Sleep" })).toHaveAttribute("aria-pressed", "true");
});

test("Skip is remembered, and the way back to the question stays on the pane", async ({ page }) => {
  await page.goto("/approach?pane=modules");
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: "What do you want help with?" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("learn-explore")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What do you want help with?" })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("adhdme.lives.v1") ?? "{}").goalsSkipped)).toBe(true);
  await page.getByRole("button", { name: "Choose goals" }).click();
  await expect(page.getByRole("heading", { name: "What do you want help with?" })).toBeVisible();
});
