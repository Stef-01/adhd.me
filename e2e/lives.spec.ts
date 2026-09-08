// ADHD Lives (PRD v2): the Chaos Run in a browser under reduced motion, where there is no clock
// and every beat ends on a button. A whole run is played through to Run over, taking the losing
// path wherever one is a button, and AGAIN starts another.

import { expect, test, type Page } from "@playwright/test";

const MAX_GAMES = 40;

/** Play the current game by whatever its engine offers, choosing to lose where a losing button exists. */
async function playGame(page: Page) {
  const frame = page.locator(".lives-game");
  await frame.getByRole("button", { name: "Go" }).click();
  const engine = await frame.getAttribute("data-engine");
  const stage = frame.locator(".lives-stage");
  switch (engine) {
    case "target_swat": {
      const targets = stage.locator(".lives-thing.is-target");
      const n = await targets.count();
      for (let i = 0; i < n; i++) await stage.locator(".lives-thing.is-target").first().click();
      break;
    }
    case "semantic_filter": await stage.locator(".lives-chip").first().click(); if (await frame.locator(".lives-result").count() === 0) await stage.locator(".lives-chip:not([aria-pressed='true'])").first().click(); break;
    case "trace_path": await stage.getByRole("button", { name: "Walk the path" }).click(); break;
    case "inhibition": await stage.locator(".lives-tempt").click(); break;
    case "object_search": await stage.locator(".lives-thing").first().click(); break;
    case "goal_protection": await stage.locator(".lives-keep").click(); break;
    case "hold_release": await stage.getByRole("button", { name: /Let go at/ }).click(); break;
    case "rapid_sorting": for (let i = 0; i < 6 && (await frame.locator(".lives-result").count()) === 0; i++) await stage.locator(".play-choice").first().click(); break;
    case "wipe_scrub": await stage.getByRole("button", { name: "Wipe it clear" }).click(); break;
    case "precision_timing": await stage.locator(".play-choice").last().click(); break;
    default: throw new Error(`unknown engine ${engine}`);
  }
  await expect(frame.locator(".lives-result")).toBeVisible();
  await frame.getByRole("button", { name: "Next" }).click();
}

test("ADHD Lives: a Chaos Run runs out of lives, shows the score, and AGAIN starts another", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lives");
  await expect(page.getByRole("heading", { name: "Chaos Run" })).toBeVisible();
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("img", { name: "3 of 3 lives" })).toBeVisible();
  // The shouted instruction is the only line above the stage: no kicker, no round count.
  await expect(page.locator(".lives-game .play-label")).toHaveCount(0);
  for (let i = 0; i < MAX_GAMES; i++) {
    if (await page.getByRole("button", { name: "Again" }).count()) break;
    if (await page.getByRole("button", { name: "Go", exact: true }).count()) { await page.getByRole("button", { name: "Go", exact: true }).click(); continue; }
    await playGame(page);
  }
  await expect(page.getByRole("heading", { name: /Run over|Best yet/ })).toBeVisible();
  await expect(page.locator(".lives-final")).toBeVisible();
  await page.getByRole("button", { name: "Again" }).click();
  await expect(page.getByRole("img", { name: "3 of 3 lives" })).toBeVisible();
  await expect(page.locator(".lives-game[data-beat='pre']")).toBeVisible();
});

test("ADHD Lives: the X leaves a run for the front, and the Learn tab stays current", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lives");
  await expect(page.getByRole("link", { name: "Learn" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Play" }).click();
  await page.getByRole("button", { name: "Leave the run" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});
