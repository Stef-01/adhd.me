import { expect, test, type Page } from "@playwright/test";
import { expectNoViolations } from "./support/a11y";
const URL = "/lives/play/theo-out-the-door";
async function start(page: Page, level = "1") {
  await page.goto(URL); await page.getByLabel("Challenge", { exact: true }).selectOption(level);
  await page.getByRole("button", { name: "Play Theo’s morning" }).click();
}
async function pack(page: Page, items = ["Keys", "Phone", "Shoes"]) {
  for (const item of items) await page.getByRole("button", { name: `Pick up ${item}`, exact: true }).click();
}

test("Theo's hardest morning supports keyboard, door gate, replay and learning without profile writes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/approach?pane=games"); await page.getByRole("link", { name: /Just get out the door/ }).click();
  await expect(page.getByRole("heading", { name: "Just get out the door." })).toBeFocused();
  await page.getByLabel("Challenge", { exact: true }).selectOption("8");
  const before = await page.evaluate(() => localStorage.getItem("adhdme.lives.v1"));
  await page.getByRole("button", { name: "Play Theo’s morning" }).click();
  await expect(page.getByRole("timer")).toHaveText("No timer");
  await page.getByRole("button", { name: "Open the door" }).click(); await expect(page.getByRole("status")).toContainText("still missing");
  for (const item of ["Keys", "Phone", "Shoes", "Wallet", "Travel pass"]) { await page.getByRole("button", { name: `Pick up ${item}`, exact: true }).focus(); await page.keyboard.press("Enter"); }
  await expect(page.locator(".theo-game")).toHaveAttribute("data-packed", "5");
  await expect(page.getByRole("heading", { name: "Essentials. Then exit." })).toBeVisible();
  await page.getByRole("button", { name: "Open the door" }).click();
  await expect(page.getByRole("heading", { name: "And you’re off!" })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem("adhdme.lives.v1"))).toBe(before);
  await page.getByRole("button", { name: "Play again" }).click(); await expect(page.locator(".theo-game")).toHaveAttribute("data-packed", "0");
  await pack(page, ["Keys", "Phone", "Shoes", "Wallet", "Travel pass"]); await page.getByRole("button", { name: "Open the door" }).click();
  await page.getByRole("link", { name: /Give your essentials a home/ }).click(); await expect(page).toHaveURL(/module=launch_pad_v1/); expect(errors).toEqual([]);
});

test("two detours are recoverable, three end the round, and replay resets them", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await start(page);
  for (const item of ["Book", "Plant"]) await page.getByRole("button", { name: `Pick up ${item}`, exact: true }).click();
  await expect(page.getByLabel("2 of 3 detours")).toBeVisible();
  await pack(page); await page.getByRole("button", { name: "Open the door" }).click(); await expect(page.getByRole("heading", { name: "And you’re off!" })).toBeVisible();
  await page.getByRole("button", { name: "Play again" }).click();
  for (const item of ["Book", "Plant", "Laundry"]) await page.getByRole("button", { name: `Pick up ${item}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Still in the hallway." })).toBeVisible(); await expect(page.locator(".theo-result")).toContainText("Three detours later");
});

test("drag packs only on the pad; an invalid drop snaps back without picking", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" }); await page.goto(URL); await page.getByLabel("No timer", { exact: true }).check(); await page.getByRole("button", { name: "Play Theo’s morning" }).click();
  const key = page.getByRole("button", { name: "Pick up Keys", exact: true });
  const from = await key.boundingBox(), pad = await page.getByRole("group", { name: "Launch pad", exact: true }).boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + 30); await page.mouse.down(); await page.mouse.move(from!.x + 30, from!.y - 50, { steps: 8 }); await page.mouse.up();
  await expect(page.locator(".theo-game")).toHaveAttribute("data-packed", "0");
  await key.dragTo(page.getByRole("group", { name: "Launch pad", exact: true }), { targetPosition: { x: pad!.width / 2, y: pad!.height / 2 } });
  await expect(page.locator(".theo-game")).toHaveAttribute("data-packed", "1");
  await pack(page, ["Phone", "Shoes"]); await page.getByRole("button", { name: "Open the door" }).click(); await expect(page.getByRole("heading", { name: "And you’re off!" })).toBeVisible();
});

test("clock pauses and hidden tabs pause; the deadline ends only an unfinished round", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" }); await page.clock.install(); await start(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000)); await page.getByRole("button", { name: "Pause game" }).click();
  const time = await page.getByRole("timer").textContent(); await page.clock.fastForward(40000); await expect(page.getByRole("timer")).toHaveText(time!);
  await expect(page.getByRole("button", { name: "Pick up Keys", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.getByRole("heading", { name: "The world can wait." })).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); });
  await page.getByRole("button", { name: "Resume", exact: true }).click(); await page.clock.runFor(25000);
  await expect(page.getByRole("heading", { name: "Still in the hallway." })).toBeVisible(); await expect(page.locator(".theo-result")).toContainText("Time slipped away");
});

test("small phone through desktop keeps controls visible and accessible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 }); await page.goto(URL);
    await expect(page.getByLabel("No timer", { exact: true })).toBeChecked();
    await expect(page.getByRole("button", { name: "Play Theo’s morning" })).toBeInViewport();
    await page.getByLabel("Challenge", { exact: true }).selectOption("8"); await page.getByRole("button", { name: "Play Theo’s morning" }).click();
    await expect(page.getByRole("button", { name: "Open the door" })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const button of await page.locator(".theo-object").all()) { const box = await button.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(48); expect(box!.height).toBeGreaterThanOrEqual(48); }
  }
  await expectNoViolations(page, "Theo active"); await pack(page, ["Keys", "Phone", "Shoes", "Wallet", "Travel pass"]); await page.getByRole("button", { name: "Open the door" }).click(); await expectNoViolations(page, "Theo success"); expect(errors).toEqual([]);
});

test("phone touch can finish an untimed morning", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage(); await start(page);
  for (const item of ["Keys", "Phone", "Shoes"]) await page.getByRole("button", { name: `Pick up ${item}`, exact: true }).tap();
  await page.getByRole("button", { name: "Open the door" }).tap(); await expect(page.getByRole("heading", { name: "And you’re off!" })).toBeVisible(); await context.close();
});
