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
    const door = await page.getByRole("button", { name: "Open the door" }).boundingBox();
    expect(door!.y + door!.height).toBeLessThanOrEqual(844);
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

test("an interrupted touch drag does not pack an item; releasing on the pad does", async ({ browser, browserName }) => {
  test.skip(browserName !== "chromium", "Native touch cancellation is injected through Chromium's input protocol.");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage(); await page.goto(URL); await page.getByLabel("No timer", { exact: true }).check(); await page.getByRole("button", { name: "Play Theo’s morning" }).tap();
  const cdp = await context.newCDPSession(page);
  const target = page.getByRole("button", { name: "Pick up Keys", exact: true });
  const pad = await page.getByRole("group", { name: "Launch pad", exact: true }).boundingBox();
  for (const cancel of [true, false]) {
    const box = await target.boundingBox(), x = box!.x + box!.width / 2, y = box!.y + 30;
    const tx = pad!.x + pad!.width / 2, ty = pad!.y + pad!.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 10; step++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (tx - x) * step / 10, y: y + (ty - y) * step / 10 }] });
      await page.waitForTimeout(20);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: cancel ? "touchCancel" : "touchEnd", touchPoints: [] });
    await expect(page.locator(".theo-game")).toHaveAttribute("data-packed", cancel ? "0" : "1");
    // Wait for the cancelled object's spring to settle before grabbing it again.
    await page.waitForTimeout(500);
  }
  await context.close();
});
