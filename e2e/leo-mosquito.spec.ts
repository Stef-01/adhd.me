import { expect, type Page } from "@playwright/test";
import { hydratedUnderFakeClock, test } from "./support/test";
import { expectNoViolations } from "./support/a11y";
const URL = "/lives/play/leo-mosquito";

async function catchWave(page: Page) {
  const count = await page.locator(".leo-fly:enabled").count();
  for (let i = 0; i < count; i++) await page.locator(".leo-fly:enabled").first().dispatchEvent("pointerdown", { button: 0 });
}
async function clearUntimedSwarm(page: Page, keyboard = false) {
  for (let i = 0; i < 20; i++) {
    if (await page.getByRole("heading", { name: "Quiet at last." }).isVisible()) return;
    const target = page.locator(".leo-fly:enabled").first();
    await expect(target).toBeVisible();
    if (keyboard) { await target.focus(); await page.keyboard.press("Enter"); } else await target.click();
  }
  await expect(page.getByRole("heading", { name: "Quiet at last." })).toBeVisible();
}
/**
 * The round ends INTO the routine, on the same screen the outcome is announced on, so every spec
 * that used to read a result screen walks the routine from it. Nothing here is timed.
 */
async function walkRoutine(page: Page) {
  await page.getByRole("button", { name: "Close the window", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Change the room." })).toBeVisible();
  await page.getByRole("button", { name: "Phone off", exact: true }).click();
  await expect(page.locator(".leo-phone")).toHaveAttribute("data-off", "true");
  await page.getByRole("button", { name: "Headphones on", exact: true }).click();
  await page.getByRole("button", { name: "Read a little", exact: true }).click();
  await expect(page.locator(".leo-book")).toHaveAttribute("data-open", "true");
  await page.getByRole("button", { name: "Light off", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quiet all night." })).toBeVisible();
  await expect(page.getByText("The mosquito is still out there. Leo is asleep.")).toBeVisible();
}

async function timedStart(page: Page) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // The clock goes in before the page so every timer the game makes is fake; the hydration wait
  // then polls on an interval from the test side, since the fixture's timer-driven wait would be frozen.
  await page.clock.install();
  await page.goto(URL, { waitUntil: "load" });
  await hydratedUnderFakeClock(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole("button", { name: "Play Leo’s moment" }).click();
}

test("the three untimed waves support keyboard, replay, and learning without scoring the learner", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/approach");
  await page.getByRole("link", { name: /One tiny sound/ }).click();
  await expect(page.getByRole("heading", { name: "One tiny sound." })).toBeFocused();
  // No difficulty to choose, no boxes to tick: the page is the room and one button.
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.getByRole("button", { name: "Play Leo’s moment" }).click();
  await expect(page.locator(".leo-fly:enabled")).toHaveCount(3);
  const before = await page.evaluate(() => localStorage.getItem("adhdme.lives.v1"));
  await clearUntimedSwarm(page, true);
  await expect(page.locator(".leo-swarm")).toHaveAttribute("data-caught", "12");
  await expect(page.getByRole("heading", { name: "Quiet at last." })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem("adhdme.lives.v1"))).toBe(before);
  // Catching every mosquito is not the end of the game: the routine is, and it arrives on its own.
  await walkRoutine(page);
  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.locator(".leo-fly:enabled")).toHaveCount(3);
  await expect(page.getByRole("meter", { name: "Leo’s regulation" })).toHaveAttribute("aria-valuenow", "100");
  await page.getByRole("button", { name: "Skip this round" }).click();
  await expect(page.getByRole("heading", { name: "Still wide awake." })).toBeVisible();
  // And losing is not the end either. The routine is the same either way, which is the point of it.
  await walkRoutine(page);
  await page.getByRole("link", { name: /Tiny sounds feel familiar/ }).click();
  await expect(page).toHaveURL(/module=lower_sensory_floor_v1/);
  expect(errors).toEqual([]);
});

test("waves keep coming and their cumulative noise makes Leo visibly overwhelmed", async ({ page }) => {
  await timedStart(page);
  await expect(page.locator(".leo-fly:enabled")).toHaveCount(3);
  await expect(page.getByRole("timer")).toHaveText("22s");
  await page.clock.runFor(6000);
  await expect(page.locator(".leo-fly:enabled")).toHaveCount(7);
  await expect(page.locator(".leo-bedroom")).toHaveAttribute("data-emotion", "unsettled");
  const health = Number(await page.getByRole("meter").getAttribute("aria-valuenow"));
  expect(health).toBeLessThan(70);
  await page.clock.runFor(2500);
  await expect(page.locator(".leo-fly:enabled")).toHaveCount(12);
  await expect(page.locator(".leo-bedroom")).toHaveAttribute("data-emotion", "overwhelmed");
  await page.clock.runFor(3500);
  await expect(page.getByRole("heading", { name: "Still wide awake." })).toBeVisible();
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByText("Too much buzzing. Leo needs a break.", { exact: true })).toBeVisible();
});

test("clearing a wave stops its noise cost but does not win before future waves arrive", async ({ page }) => {
  await timedStart(page);
  await page.clock.runFor(1000); await catchWave(page);
  await expect(page.locator(".leo-fly:enabled")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "GET IT!" })).toBeVisible();
  const health = await page.getByRole("meter").getAttribute("aria-valuenow");
  await page.clock.runFor(2000);
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", health!);
  await page.clock.runFor(1000);
  await expect(page.locator(".leo-fly:enabled")).toHaveCount(4);
});

test("the last catch wins before the deadline, and leaving one alive times out", async ({ page }) => {
  // Three runs on headless WebKit under a fake clock did not settle the swarm's twenty-two seconds
  // inside the budget; Chromium and Firefox prove the win and the timeout. A WebKit finding, kept.
  test.skip(test.info().project.name === "webkit", "headless WebKit under a fake clock does not settle the 22-second swarm in the test budget");
  for (const win of [true, false]) {
    if (win) await timedStart(page); else {
      // The previous pass ended in the routine; Play again lives on its last screen.
      await page.getByRole("button", { name: "Play again" }).click();
    }
    await page.clock.runFor(100); await catchWave(page);
    await page.clock.runFor(3900); await catchWave(page);
    await page.clock.runFor(4000);
    for (const n of [8, 9, 10, 11]) await page.getByRole("button", { name: `Catch mosquito ${n}`, exact: true }).dispatchEvent("pointerdown", { button: 0 });
    await page.clock.runFor(13900);
    if (win) await page.getByRole("button", { name: "Catch mosquito 12", exact: true }).dispatchEvent("pointerdown", { button: 0 });
    await page.clock.runFor(1000);
    await expect(page.getByRole("heading", { name: win ? "Quiet at last." : "Still wide awake." })).toBeVisible();
    if (!win) await expect(page.getByText(/Time ran out with mosquitoes/)).toBeVisible();
    if (win) await walkRoutine(page);
  }
});

test("pause and hidden tabs freeze countdown, flight, waves, and regulation", async ({ page }) => {
  await timedStart(page); await page.clock.runFor(900);
  await page.getByRole("button", { name: "Pause game" }).click();
  const health = await page.getByRole("meter").getAttribute("aria-valuenow");
  const position = await page.locator(".leo-fly-position").first().getAttribute("style");
  await page.clock.fastForward(30000);
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", health!);
  await expect(page.locator(".leo-fly-position").first()).toHaveAttribute("style", position!);
  await expect(page.locator(".leo-fly:enabled")).toHaveCount(0);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(100);
  const target = page.getByRole("button", { name: "Catch mosquito 1", exact: true });
  const before = await page.locator(".leo-fly-position").first().getAttribute("style");
  await target.focus(); await page.clock.runFor(200);
  await expect(page.locator(".leo-fly-position").first()).toHaveAttribute("style", before!);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.getByRole("heading", { name: "Take your time." })).toBeVisible();
});

test("touch play can clear every wave, and the sound is a toolbar toggle rather than a form", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage(); await page.goto(URL);
  const sound = page.getByRole("button", { name: "Buzz sounds" });
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await sound.tap();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Play Leo’s moment" }).tap();
  for (let i = 0; i < 12; i++) await page.locator(".leo-fly:enabled").first().tap();
  await expect(page.getByRole("heading", { name: "Quiet at last." })).toBeVisible();
  await context.close();
});

test("swarm controls and meters fit four screen widths and remain accessible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 }); await page.goto(URL);
    await expect(page.getByRole("timer")).toHaveText("No timer");
    await expect(page.getByRole("button", { name: "Play Leo’s moment" })).toBeVisible();
    const play = await page.getByRole("button", { name: "Play Leo’s moment" }).boundingBox();
    expect(play!.y + play!.height).toBeLessThanOrEqual(844);
    await page.getByRole("button", { name: "Play Leo’s moment" }).click();
    const room = await page.locator(".leo-room").boundingBox();
    for (const target of await page.locator(".leo-fly:enabled").all()) {
      const box = await target.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(48);
      expect(box!.x).toBeGreaterThanOrEqual(room!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(room!.x + room!.width);
      expect(box!.y).toBeGreaterThanOrEqual(room!.y);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await expectNoViolations(page, "Leo swarm active");
  await clearUntimedSwarm(page);
  await expectNoViolations(page, "Leo swarm result");
  await expectNoViolations(page, "Leo routine");
  await walkRoutine(page);
  await expectNoViolations(page, "Leo settled");
  await expect(page.getByRole("button", { name: "Skip this round" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Leo's swarm clears in the Chaos Run and keeps navigation visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("adhdme.lives.tutored", "1"));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 844 }); await page.goto("/lives/play?seed=leo-qa-2");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.locator(".lives-scene")).toHaveAttribute("data-game", "leo_mosquito");
    await page.getByRole("button", { name: "Go", exact: true }).click();
    for (let i = 0; i < 20 && !(await page.locator(".lives-result").count()); i++) await page.locator(".leo-fly:enabled").first().click();
    await expect(page.locator(".lives-result")).toContainText("Quiet at last.");
    await expect(page.getByRole("link", { name: "Leave the run" })).toBeInViewport();
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.locator(".lives-scene")).not.toHaveAttribute("data-game", "leo_mosquito");
  }
});

test("each mosquito has a buzz voice, and catch, mute, pause and exit stop it", async ({ page }) => {
  test.skip(test.info().project.name === "webkit", "WebKit headless refuses to resume an AudioContext from Play; the game offers Enable buzzing instead");
  await page.addInitScript(() => {
    const original = window.AudioContext;
    const log = { created: 0, stopped: 0, closed: 0 };
    (window as unknown as { leoAudio: typeof log }).leoAudio = log;
    window.AudioContext = class extends original {
      createOscillator() {
        const node = super.createOscillator(); log.created++;
        const stop = node.stop.bind(node);
        node.stop = (when?: number) => { log.stopped++; stop(when); };
        return node;
      }
      close() { log.closed++; return super.close(); }
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(URL);
  await page.getByRole("button", { name: "Play Leo’s moment" }).click();
  const audio = () => page.evaluate(() => (window as unknown as { leoAudio: { created: number; stopped: number; closed: number } }).leoAudio);
  await expect(page.getByRole("button", { name: "Mute buzzing" })).toBeVisible();
  await expect.poll(async () => (await audio()).created).toBe(3);
  await page.getByRole("button", { name: "Catch mosquito 1", exact: true }).click();
  await expect.poll(async () => (await audio()).stopped).toBe(1);
  await page.getByRole("button", { name: "Pause game" }).click();
  await expect.poll(async () => (await audio()).stopped).toBe(3);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect.poll(async () => (await audio()).created).toBe(5);
  await page.getByRole("button", { name: "Mute buzzing" }).click();
  await expect.poll(async () => (await audio()).stopped).toBe(5);
  await page.getByRole("button", { name: "Enable buzzing" }).click();
  await expect.poll(async () => (await audio()).created).toBe(7);
  await page.getByRole("link", { name: "Back to learning" }).click();
  await expect.poll(async () => (await audio()).closed).toBe(1);
  await expect.poll(async () => (await audio()).stopped).toBe(7);
});
