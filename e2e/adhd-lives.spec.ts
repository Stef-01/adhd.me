// ADHD Lives (PRD v2 §98): the vertical-slice journey in a browser, under reduced motion so every
// beat ends on a button and the run is deterministic — open, PLAY, lose three lives, see the
// score, mark a moment "This is me", save the strategy, find it in the Toolkit, open the module,
// finish it, customise it, and find it "Trying". Plus: a seeded run replays (§90), and FASTER
// arrives after four successes (§59).

import { expect, test, type Page } from "@playwright/test";

const TUTORED_KEY = "adhdme.lives.tutored";
const PHONE = { width: 390, height: 844 };

test.beforeEach(async ({ page }) => {
  await page.addInitScript((k) => { try { localStorage.setItem(k, "1"); } catch { /* the tutorial shows, which is also right */ } }, TUTORED_KEY);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(PHONE);
});

/** Drive the run: Go through every intro, take the named outcome in every game, Next through every result. */
async function drive(page: Page, outcome: "hit" | "miss", until: () => Promise<boolean>, maxSteps = 240) {
  for (let i = 0; i < maxSteps; i++) {
    if (await until()) return;
    const go = page.getByRole("button", { name: "Go", exact: true });
    const act = page.locator(`[data-outcome="${outcome}"]:enabled`).first();
    const next = page.getByRole("button", { name: /^(Next|See the score)$/ });
    // Go and Next settle before the next look: a Next that opens the FASTER card must not be followed
    // by a Go pressed on that card before `until` has seen it. An action may take several taps.
    if (await go.isVisible().catch(() => false)) { await go.click(); await expect(go).toBeHidden(); continue; }
    if (await act.isVisible().catch(() => false)) { await act.click(); continue; }
    if (await next.isVisible().catch(() => false)) { await next.click(); await expect(next).toBeHidden(); continue; }
    await page.waitForTimeout(60);
  }
  throw new Error(`the run did not reach its end in ${maxSteps} steps`);
}

test("E2E Lives 1: play to the score, recognise a moment, save the strategy, finish its module, find it Trying (§98)", async ({ page }) => {
  await page.goto("/lives");
  await expect(page.getByRole("heading", { name: "Eight lives. Three of yours." })).toBeVisible();
  await page.getByRole("link", { name: "Play" }).click();
  await expect(page).toHaveURL(/\/lives\/play$/);
  await page.getByRole("button", { name: "Play" }).click();
  // Three misses: three lives, three games, the score.
  await drive(page, "miss", async () => (await page.locator(".lives-results").count()) > 0);
  await expect(page.getByRole("button", { name: "Again" })).toBeVisible();
  await expect(page.locator(".lives-survived")).toContainText("3 moments survived");
  // Anything feel familiar? At least one character came up in three games (the director steers fun to 20–30%).
  const thisIsMe = page.getByRole("button", { name: "This is me" }).first();
  await expect(thisIsMe).toBeVisible();
  await thisIsMe.click();
  await expect(thisIsMe).toHaveAttribute("aria-pressed", "true");
  // Try something useful: at most three, with Try now / Save / Not for me.
  expect(await page.locator(".lives-strategy").count()).toBeGreaterThanOrEqual(1);
  expect(await page.locator(".lives-strategy").count()).toBeLessThanOrEqual(3);
  const strategyId = await page.locator(".lives-strategy").first().getAttribute("data-strategy");
  const saved = page.locator(`.lives-strategy[data-strategy="${strategyId}"]`);
  await saved.getByRole("button", { name: "Save" }).click();
  await expect(saved.locator(".lives-saved")).toContainText("Saved");
  // Not for me on another row keeps the row, marked, rather than making it vanish mid-read.
  const other = page.locator(".lives-strategy").nth(1);
  if (await other.count()) { await other.getByRole("button", { name: "Not for me" }).click(); await expect(other).toHaveAttribute("data-dismissed", "true"); }
  // The Toolkit holds it, saved to learn.
  await page.goto("/lives/toolkit");
  const queued = page.locator(`.lives-queued[data-strategy="${strategyId}"]`);
  await expect(queued).toBeVisible();
  await queued.getByRole("link", { name: /Start|Continue/ }).click();
  await expect(page).toHaveURL(/\/lives\/learn\?module=/);
  // The module, block by block, to MAKE IT YOURS.
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole("heading", { name: "Added to your Toolkit" }).isVisible().catch(() => false)) break;
    const thought = page.locator(".lives-thought");
    const current = page.getByRole("button", { name: "Current discussion" });
    const next = page.getByRole("button", { name: /^(Next|Skip|Done)$/ });
    const yours = page.getByRole("group", { name: "Your version" }).getByRole("button").first();
    const choice = page.getByRole("group", { name: /^(Choices|Responses)$/ }).getByRole("button").first();
    if (await thought.isVisible().catch(() => false)) { await thought.click(); continue; }
    if (await current.isVisible().catch(() => false)) { await current.click(); continue; }
    if (await next.isVisible().catch(() => false)) { await next.click(); continue; }
    if (await yours.isVisible().catch(() => false)) { await yours.click(); continue; }
    if (await choice.isVisible().catch(() => false)) { await choice.click(); continue; }
    await page.waitForTimeout(60);
  }
  await expect(page.getByRole("heading", { name: "Added to your Toolkit" })).toBeVisible();
  await page.getByRole("link", { name: "Open the Toolkit" }).click();
  await expect(page.locator(`.lives-tool[data-strategy="${strategyId}"][data-status="trying"]`)).toBeVisible();
  // Nothing about the person in the URL, ever.
  expect(page.url()).not.toMatch(/this_is_me|score=|resonance/);
});

test("E2E Lives 2: a seeded run replays the same first game; FASTER after four successes (§59, §90)", async ({ page }) => {
  await page.goto("/lives/play?seed=slice");
  await page.getByRole("button", { name: "Play" }).click();
  await page.getByRole("button", { name: "Go", exact: true }).click();
  const first = await page.locator(".lives-game").getAttribute("data-game");
  await page.goto("/lives/play?seed=slice");
  await page.getByRole("button", { name: "Play" }).click();
  await page.getByRole("button", { name: "Go", exact: true }).click();
  expect(await page.locator(".lives-game").getAttribute("data-game")).toBe(first);
  // Win four in a row: the score climbs and FASTER! shows, then the run goes on.
  await drive(page, "hit", async () => (await page.locator(".lives-faster").count()) > 0);
  await expect(page.locator(".lives-faster-word")).toHaveText("FASTER!");
  await expect(page.locator(".lives-score")).not.toHaveText("0");
  await expect(page.getByRole("img", { name: "3 of 3 lives" })).toBeVisible();
});

test("E2E Lives 3: the eight lives, Learn's shelves and the lab all stand on their own", async ({ page }) => {
  await page.goto("/lives/characters");
  await expect(page.locator(".lives-character")).toHaveCount(8);
  await page.locator(".lives-character[data-character='mia']").getByRole("button", { name: "Sometimes" }).click();
  await page.goto("/lives/learn");
  await expect(page.getByRole("heading", { name: "For you" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Two-minute tools" })).toBeVisible();
  await page.goto("/lives/lab");
  await expect(page.getByRole("heading", { name: "Ranking" })).toBeVisible();
  expect(await page.locator(".lives-lab-ranking > li").count()).toBeGreaterThanOrEqual(1);
  await expect(page.locator(".lives-lab-table tbody tr")).toHaveCount(12);
});
