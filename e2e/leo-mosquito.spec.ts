import { expect, test } from "@playwright/test";
import { expectNoViolations } from "./support/a11y";

const URL = "/lives/play/leo-mosquito";

test("Leo can be played with a keyboard, replayed, and explored without scoring the learner", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/lives/learn");
  await page.getByRole("link", { name: /One tiny sound/ }).click();
  await expect(page.getByRole("heading", { name: "One tiny sound." })).toBeFocused();
  await page.getByLabel("Challenge").selectOption("8");
  await page.getByRole("button", { name: "Play Leo’s moment" }).click();
  await expect(page.getByRole("button", { name: /Catch mosquito/ })).toHaveCount(3);
  const before = await page.evaluate(() => localStorage.getItem("adhdme.lives.v1"));
  for (const target of await page.getByRole("button", { name: /Catch mosquito/ }).all()) { await target.focus(); await page.keyboard.press("Enter"); }
  await expect(page.getByRole("heading", { name: "Quiet at last." })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem("adhdme.lives.v1"))).toBe(before);
  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.locator(".leo-fly:not(:disabled)")).toHaveCount(3);
  await page.getByRole("button", { name: "Skip this round" }).click();
  await expect(page.getByRole("heading", { name: "Still wide awake." })).toBeVisible();
  await page.getByRole("link", { name: /Tiny sounds feel familiar/ }).click();
  await expect(page).toHaveURL(/module=lower_sensory_floor_v1/);
  expect(errors).toEqual([]);
});

test("a timed game pauses, ignores input while paused, resumes, and times out", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto(URL);
  await page.getByRole("button", { name: "Play Leo’s moment" }).click();
  await page.clock.runFor(900);
  await page.getByRole("button", { name: "Pause game" }).click();
  const bar = await page.locator(".leo-clock span").getAttribute("style");
  const insect = await page.locator(".leo-fly-position").getAttribute("style");
  await page.clock.fastForward(30_000);
  await expect(page.locator(".leo-clock span")).toHaveAttribute("style", bar!);
  await expect(page.locator(".leo-fly-position")).toHaveAttribute("style", insect!);
  await expect(page.getByRole("button", { name: /Catch mosquito/ })).toBeDisabled();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(250);
  await expect(page.getByRole("heading", { name: "GET IT!" })).toBeVisible();
  await page.clock.runFor(5000);
  await expect(page.getByRole("heading", { name: "Still wide awake." })).toBeFocused();
});

test("the last catch wins immediately, before its visual reaction has finished", async ({ page }) => {
  await page.clock.install();
  await page.goto(URL);
  await page.getByRole("button", { name: "Play Leo’s moment" }).click();
  await page.clock.runFor(4700);
  const insect = page.getByRole("button", { name: "Catch mosquito 1" });
  await insect.dispatchEvent("pointerdown", { button: 0 });
  await page.clock.runFor(1000);
  await expect(page.getByRole("heading", { name: "Quiet at last." })).toBeVisible();
});

test("touch play and untimed mode work without changing the device motion setting", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto(URL);
  await page.getByLabel("No timer or movement").check();
  await page.getByRole("button", { name: "Play Leo’s moment" }).tap();
  const insect = page.getByRole("button", { name: "Catch mosquito 1" });
  await insect.tap();
  await expect(page.getByRole("heading", { name: "Quiet at last." })).toBeVisible();
  await context.close();
});

test("the scene and controls fit phone, tablet and desktop and remain accessible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(URL);
    await expect(page.locator(".aoc-band")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(844);
    const play = await page.getByRole("button", { name: "Play Leo’s moment" }).boundingBox();
    expect(play!.y + play!.height).toBeLessThanOrEqual(844);
    await page.getByRole("button", { name: "Play Leo’s moment" }).click();
    const room = await page.locator(".leo-room").boundingBox();
    const target = await page.getByRole("button", { name: "Catch mosquito 1" }).boundingBox();
    expect(target!.width).toBeGreaterThanOrEqual(48);
    expect(target!.x).toBeGreaterThanOrEqual(room!.x);
    expect(target!.x + target!.width).toBeLessThanOrEqual(room!.x + room!.width);
    expect(target!.y).toBeGreaterThanOrEqual(room!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await expectNoViolations(page, "Leo active");
  await page.getByRole("button", { name: "Catch mosquito 1" }).click();
  await expect(page.getByRole("button", { name: "Skip this round" })).toHaveCount(0);
  await expectNoViolations(page, "Leo result");
  await page.getByRole("button", { name: "Change challenge" }).click();
  await expectNoViolations(page, "Leo ready");
});

test("keyboard focus freezes a moving target in place and hiding the page pauses play", async ({ page }) => {
  await page.clock.install();
  await page.goto(URL);
  await page.getByRole("button", { name: "Play Leo’s moment" }).click();
  await page.clock.runFor(1200);
  const position = page.locator(".leo-fly-position");
  const before = await position.getAttribute("style");
  await page.getByRole("button", { name: "Catch mosquito 1" }).focus();
  await page.clock.runFor(200);
  await expect(position).toHaveAttribute("style", before!);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("heading", { name: "Take your time." })).toBeVisible();
  const bar = await page.locator(".leo-clock span").getAttribute("style");
  await page.clock.fastForward(30000);
  await expect(page.locator(".leo-clock span")).toHaveAttribute("style", bar!);
  await expect(page.getByRole("button", { name: "Catch mosquito 1" })).toBeDisabled();
});
