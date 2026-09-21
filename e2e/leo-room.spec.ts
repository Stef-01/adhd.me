import { type Page } from "@playwright/test";
import { pauseNow } from "./support/fake-clock";
import { test, expect, hydratedUnderFakeClock } from "./support/test";
import { expectNoViolations } from "./support/a11y";

const URL = "/lives/lab/leo-room";
const game = (page: Page) => page.locator(".bedroom-game");
async function open(page: Page, still = true) {
  await page.emulateMedia({ reducedMotion: still ? "reduce" : "no-preference" });
  await page.goto(URL);
  await expect(game(page)).toHaveAttribute("data-ready", "true");
}
async function timed(page: Page) {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto(URL, { waitUntil: "load" });
  await hydratedUnderFakeClock(page);
  await expect(game(page)).toHaveAttribute("data-ready", "true");
  await pauseNow(page);
}
async function clear(page: Page, keyboard = false) {
  for (let n = 0; n < 20 && await page.locator(".bedroom-insect:enabled").count(); n++) {
    const insect = page.locator(".bedroom-insect:enabled").first();
    if (keyboard) { await insect.focus(); await page.keyboard.press("Enter"); }
    else await insect.click();
  }
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(0);
}
async function prepareRoom(page: Page) {
  const window = page.getByRole("button", { name: "Close the window", exact: true });
  if (await window.count()) await window.click();
  await page.getByRole("button", { name: "Put phone away", exact: true }).click();
  await clear(page);
}
async function readAndRest(page: Page) {
  const book = page.locator(".bedroom-book");
  for (let n = 0; n < 4 && await book.isEnabled(); n++) await book.press("Enter");
  await page.getByRole("button", { name: "Dim the light", exact: true }).press("Enter");
  await page.getByRole("button", { name: "Light off", exact: true }).press("Enter");
}

test("direct entry offers prevention immediately and does not invent another wave after prevention", async ({ page }) => {
  await timed(page);
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close the window", exact: true }).click();
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(3);
  await page.clock.runFor(6200);
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(3);
  await expect(page.locator(".room-outside-insects")).toBeVisible();
  await page.getByRole("button", { name: "Put phone away", exact: true }).click();
  await clear(page, true);
  await expect(game(page)).toHaveAttribute("data-mode", "wind-down");
  await page.clock.runFor(20000);
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(0);
  await readAndRest(page);
  await expect(game(page)).toHaveAttribute("data-mode", "rest");
});

test("ongoing intrusion and phone demand change Leo's pose, with a playable recovery", async ({ page }) => {
  await timed(page);
  await page.clock.runFor(11000);
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(5);
  await expect(page.locator(".bedroom-scene")).toHaveAttribute("data-notifications", "1");
  const regulation = Number(await page.locator('[role="meter"]').getAttribute("aria-valuenow"));
  expect(regulation).toBeLessThan(60);
  await expect(page.locator(".room-bed-art")).toHaveAttribute("data-mood", /irritated|overwhelmed/);
  await page.clock.runFor(21000);
  await expect(game(page)).toHaveAttribute("data-mode", "recovery");
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(6);
  await expect(page.locator('[role="timer"]')).toHaveText("Your pace");
  // Recovery keeps the world. It cannot silently clear insects or complete the routine.
  await page.getByRole("button", { name: "Close the window", exact: true }).click();
  await page.getByRole("button", { name: "Put phone away", exact: true }).click();
  await clear(page, true);
  await readAndRest(page);
  await expect(game(page)).toHaveAttribute("data-mode", "rest");
});

test("still mode preserves causal decisions, interrupted reading and the following evening", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await open(page);
  const saved = await page.evaluate(() => localStorage.getItem("adhdme.lives.v1"));
  await page.getByRole("button", { name: "Read a little", exact: true }).click();
  await page.getByRole("button", { name: "Turn the page", exact: true }).click();
  await expect(game(page)).toHaveAttribute("data-page", "0");
  await page.getByRole("button", { name: "Headphones on", exact: true }).click();
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(5);
  await prepareRoom(page);
  await readAndRest(page);
  await expect(game(page)).toHaveAttribute("data-mode", "rest");
  await expect(page.getByRole("heading", { name: "Nothing else to chase." })).toBeFocused();
  await page.getByRole("button", { name: "Tomorrow evening", exact: true }).click();
  await expect(game(page)).toHaveAttribute("data-mode", "revisit");
  await expect(game(page)).toHaveAttribute("data-page", "2");
  await expect(page.getByRole("button", { name: "Window secured" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Phone parked" })).toBeDisabled();
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(1);
  await page.getByRole("button", { name: "Find your place" }).click();
  await page.getByRole("button", { name: "Turn the page" }).click();
  await expect(game(page)).toHaveAttribute("data-page", "2");
  await clear(page, true);
  await readAndRest(page);
  await expect(game(page)).toHaveAttribute("data-mode", "complete");
  expect(await page.evaluate(() => localStorage.getItem("adhdme.lives.v1"))).toBe(saved);
  await page.getByRole("button", { name: "Another evening" }).click();
  await expect(game(page)).toHaveAttribute("data-scenario", "1");
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Window secured" })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("pause, hiding the tab, keyboard focus and pace switching leave the state intact", async ({ page }) => {
  await timed(page);
  await page.clock.runFor(800);
  await page.getByRole("button", { name: "Pause game" }).click();
  const value = await page.locator('[role="meter"]').getAttribute("aria-valuenow");
  const time = await page.locator('[role="timer"]').textContent();
  const position = await page.locator(".bedroom-insect-flight").first().getAttribute("style");
  await page.clock.runFor(20000);
  await expect(page.locator('[role="meter"]')).toHaveAttribute("aria-valuenow", value!);
  await expect(page.locator('[role="timer"]')).toHaveText(time!);
  await expect(page.locator(".bedroom-insect-flight").first()).toHaveAttribute("style", position!);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Play at my pace" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Pause game" })).toBeFocused();
  await expect(game(page)).toHaveAttribute("data-still", "true");
  await page.clock.runFor(8000);
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(3);
  await expect(game(page)).toHaveAttribute("data-mode", "challenge");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("touch can play both evenings and audio is always an explicit choice", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("adhdme-privacy-ack", "1"));
  await page.goto(URL); await expect(game(page)).toHaveAttribute("data-ready", "true");
  await expect(page.getByRole("button", { name: "Enable room sounds" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Close the window" }).tap();
  await page.getByRole("button", { name: "Put phone away" }).tap();
  for (let n = 0; n < 3; n++) await page.locator(".bedroom-insect:enabled").first().tap();
  await page.getByRole("button", { name: "Read a little" }).tap();
  await page.getByRole("button", { name: "Turn the page" }).tap();
  await page.getByRole("button", { name: "Turn the page" }).tap();
  await page.getByRole("button", { name: "Dim the light" }).tap();
  await page.getByRole("button", { name: "Light off", exact: true }).tap();
  await expect(game(page)).toHaveAttribute("data-mode", "rest");
  await page.getByRole("button", { name: "Tomorrow evening" }).tap();
  await page.locator(".bedroom-insect:enabled").tap();
  await page.getByRole("button", { name: "Find your place" }).tap();
  await page.getByRole("button", { name: "Turn the page" }).tap();
  await page.getByRole("button", { name: "Dim the light" }).tap();
  await page.getByRole("button", { name: "Light off", exact: true }).tap();
  await expect(game(page)).toHaveAttribute("data-mode", "complete");
  await context.close();
});

test("every scene control fits small phones, landscape, tablets and full desktop", async ({ page }) => {
  test.setTimeout(90000);
  for (const [width, height] of [[320,568],[390,844],[768,1024],[1440,900],[1920,1080],[844,390],[568,320],[667,375]]) {
    await page.setViewportSize({ width: width!, height: height! }); await open(page);
    for (const phase of ["challenge", "rest", "revisit", "complete"]) {
      await expect(game(page)).toHaveAttribute("data-mode", phase);
      for (const control of await page.locator(".bedroom-game button:visible, .bedroom-game a:visible").all()) {
        const box = await control.boundingBox(); expect(box).not.toBeNull();
        expect(box!.x, `${width} ${phase} left`).toBeGreaterThanOrEqual(0);
        expect(box!.y, `${width} ${phase} top`).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, `${width} ${phase} right`).toBeLessThanOrEqual(width! + 1);
        expect(box!.y + box!.height, `${width} ${phase} bottom`).toBeLessThanOrEqual(height! + 1);
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        if (await control.isEnabled()) {
          const unobscured = await control.evaluate(el => {
            const r = el.getBoundingClientRect();
            const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return top === el || el.contains(top);
          });
          expect(unobscured, await control.getAttribute("aria-label") ?? await control.innerText()).toBe(true);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width!);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height!);
      if (phase === "challenge") { await prepareRoom(page); await readAndRest(page); }
      if (phase === "rest") await page.getByRole("button", { name: "Tomorrow evening" }).click();
      if (phase === "revisit") { await clear(page); await readAndRest(page); }
    }
  }
});

test("active room, pause, enacted routine and revisit meet accessibility checks", async ({ page }) => {
  test.setTimeout(120000);
  await open(page);
  await expectNoViolations(page, "bedroom challenge");
  await page.getByRole("button", { name: "Pause game" }).click();
  await expectNoViolations(page, "bedroom pause");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await prepareRoom(page);
  await page.getByRole("button", { name: "Read a little" }).click();
  await expectNoViolations(page, "bedroom open book");
  await readAndRest(page);
  await expectNoViolations(page, "bedroom rest");
  await page.getByRole("button", { name: "Tomorrow evening" }).click();
  await expectNoViolations(page, "bedroom revisit");
  await clear(page); await readAndRest(page);
  await expectNoViolations(page, "bedroom completion");
});




test("sound voices follow catches, comfort, mute, pause and leaving the room", async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    const log = { started: 0, stopped: 0, beds: 0, closed: 0 };
    (window as unknown as { roomAudio: typeof log }).roomAudio = log;
    if (typeof Native !== "function") return;
    window.AudioContext = class extends Native {
      createOscillator() {
        const node = super.createOscillator();
        const start = node.start.bind(node), stop = node.stop.bind(node);
        node.start = (when?: number) => { log.started++; start(when); };
        node.stop = (when?: number) => { log.stopped++; stop(when); };
        return node;
      }
      createBufferSource() { log.beds++; return super.createBufferSource(); }
      close() { log.closed++; return super.close(); }
    };
  });
  await open(page);
  const audio = () => page.evaluate(() => (window as unknown as { roomAudio: { started: number; stopped: number; beds: number; closed: number } }).roomAudio);
  expect((await audio()).started).toBe(0);
  await page.getByRole("button", { name: "Enable room sounds" }).click();
  await expect.poll(async () => await page.getByRole("button", { name: "Mute room sounds" }).count() > 0 || await page.getByRole("status").textContent() === "Sound unavailable. Everything still works quietly.").toBe(true);
  if (await page.getByRole("status").textContent() === "Sound unavailable. Everything still works quietly.") {
    expect(await page.evaluate(() => typeof window.AudioContext)).toBe("undefined");
    test.info().annotations.push({ type: "environment", description: "This headless WebKit exposes no Web Audio API. Verified quiet fallback; native oscillator lifecycle is tested on Chromium and Firefox." });
    expect((await audio()).started).toBe(0);
    await page.getByRole("button", { name: "Headphones on" }).click();
    await expect(page.getByRole("status")).not.toContainText("unavailable");
    await prepareRoom(page); await readAndRest(page);
    await expect(game(page)).toHaveAttribute("data-mode", "rest");
    return;
  }
  await expect(page.getByRole("button", { name: "Mute room sounds" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await audio()).started).toBe(3);
  await page.locator(".bedroom-insect:enabled").first().click();
  await expect.poll(async () => (await audio()).stopped).toBe(1);
  await page.getByRole("button", { name: "Headphones on" }).click();
  await expect.poll(async () => (await audio()).beds).toBe(1);
  await page.getByRole("button", { name: "Pause game" }).click();
  await expect.poll(async () => (await audio()).started - (await audio()).stopped).toBe(0);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect.poll(async () => (await audio()).started - (await audio()).stopped).toBe(2);
  await page.getByRole("button", { name: "Mute room sounds" }).click();
  await expect.poll(async () => (await audio()).started - (await audio()).stopped).toBe(0);
  await page.getByRole("button", { name: "Enable room sounds" }).click();
  await page.getByRole("link", { name: "Back to learning" }).click();
  await expect.poll(async () => (await audio()).closed).toBe(1);
  await expect.poll(async () => (await audio()).started - (await audio()).stopped).toBe(0);
});




test("the busiest room keeps six targets and all props separately reachable", async ({ page }) => {
  test.setTimeout(90000);
  for (const [width, height] of [[320,568],[390,844],[768,1024],[1440,900],[844,390],[568,320],[667,375]]) {
    await page.setViewportSize({ width: width!, height: height! }); await open(page);
    for (let n = 0; n < 9; n++) await page.locator(".bedroom-headphones").click();
    await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(6);
    await page.getByRole("button", { name: "Read a little" }).click();
    // Both fixed perches and moving paths must respect the same reserved control area.
    for (const motion of ["reduce", "no-preference"] as const) {
      await page.emulateMedia({ reducedMotion: motion });
      for (let sample = 0; sample < 5; sample++) {
        const overlaps = await page.locator(".bedroom-scene").evaluate(scene => {
          const elements = Array.from(scene.querySelectorAll<HTMLButtonElement>("button:enabled"));
          const collisions: string[] = [];
          for (let a = 0; a < elements.length; a++) for (let b = a + 1; b < elements.length; b++) {
            const first = elements[a]!, second = elements[b]!;
            const x = first.getBoundingClientRect(), y = second.getBoundingClientRect();
            if (Math.min(x.right,y.right) - Math.max(x.left,y.left) > 1 && Math.min(x.bottom,y.bottom) - Math.max(x.top,y.top) > 1) {
              collisions.push(first.getAttribute("aria-label") + " / " + second.getAttribute("aria-label"));
            }
          }
          return collisions;
        });
        expect(overlaps, `${width}x${height} ${motion} sample ${sample}`).toEqual([]);
        await page.waitForTimeout(240);
      }
    }
  }
});

test("Leo's ending opens a usable strategy and saves the chosen plan to the Toolkit", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  try {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("adhdme-privacy-ack", "1"));
    await page.goto(URL);
    await expect(game(page)).toHaveAttribute("data-ready", "true");
    await page.getByRole("button", { name: "Close the window", exact: true }).tap();
    await page.getByRole("button", { name: "Put phone away", exact: true }).tap();
    const book = page.locator(".bedroom-book");
    async function settle(expected: "rest" | "complete") {
      for (let n = 0; n < 20 && await page.locator(".bedroom-insect:enabled").count(); n++) {
        await page.locator(".bedroom-insect:enabled").first().tap();
      }
      await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(0);
      for (let n = 0; n < 4 && await book.isEnabled(); n++) await book.tap();
      await page.getByRole("button", { name: "Dim the light", exact: true }).tap();
      await page.getByRole("button", { name: "Light off", exact: true }).tap();
      await expect(game(page)).toHaveAttribute("data-mode", expected);
    }
    await settle("rest");
    await page.getByRole("button", { name: "Tomorrow evening", exact: true }).tap();
    await expect(game(page)).toHaveAttribute("data-mode", "revisit");
    await settle("complete");
    await page.getByRole("link", { name: "Bring it into your day" }).tap();
    await expect(page.locator(".lives-module")).toHaveAttribute("data-module", "lower_sensory_floor_v1");
    const title = page.locator("#lives-module-title");
    await expect(title).toHaveText("Lower the Sensory Floor");
    async function next() {
      const previous = await title.textContent();
      await page.getByRole("button", { name: "Next", exact: true }).tap();
      await expect(title).not.toHaveText(previous!);
    }
    await next();
    await next();
    await page.getByRole("checkbox", { name: "Notification sounds off", exact: true }).check();
    await next();
    await page.getByRole("button", { name: "Skip", exact: true }).tap();
    await page.getByRole("group", { name: "Your version" }).getByRole("button", { name: "Do not disturb from 10pm", exact: true }).tap();
    await expect(page.getByRole("heading", { name: "Added to your Toolkit", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Open the Toolkit" }).tap();
    const saved = page.locator('.lives-tool[data-strategy="lower_sensory_floor"][data-status="trying"]');
    await expect(saved).toBeVisible();
    await expect(saved).toContainText("Do not disturb from 10pm");
    await page.reload();
    await expect(saved).toBeVisible();
    await expect(saved).toContainText("Do not disturb from 10pm");
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("pressing a flying mosquito holds its position until the click lands", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await timed(page);
  const target = page.getByRole("button", { name: "Catch mosquito 1", exact: true });
  const anchor = page.locator(".bedroom-insect-anchor").first();
  let before = (await target.boundingBox())!;
  let offset = 0;
  // Press while it is away from its resting point, not during the forgiving perch phase.
  for (let frame = 0; frame < 40; frame++) {
    await page.clock.runFor(100);
    before = (await target.boundingBox())!;
    const origin = (await anchor.boundingBox())!;
    offset = Math.abs(before.x + before.width / 2 - origin.x);
    if (offset > before.width / 2 + 3) break;
  }
  expect(offset).toBeGreaterThan(before.width / 2 + 3);
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.clock.runFor(120);
  const held = (await target.boundingBox())!;
  await page.mouse.up();
  await page.clock.runFor(200);
  await expect(target).toHaveCount(0);
  expect(Math.abs(held.x - before.x)).toBeLessThan(2);
  expect(Math.abs(held.y - before.y)).toBeLessThan(2);
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(2);
});

test("keyboard focus holds a flying target and releases it on blur", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await timed(page);
  await page.clock.runFor(2700);
  const target = page.getByRole("button", { name: "Catch mosquito 1", exact: true });
  const before = (await target.boundingBox())!;
  await target.focus();
  await page.clock.runFor(700);
  const held = (await target.boundingBox())!;
  expect(Math.abs(held.x - before.x)).toBeLessThan(2);
  expect(Math.abs(held.y - before.y)).toBeLessThan(2);
  await page.getByRole("button", { name: "Close the window", exact: true }).focus();
  await page.clock.runFor(900);
  const moving = (await target.boundingBox())!;
  expect(Math.hypot(moving.x - held.x, moving.y - held.y)).toBeGreaterThan(3);
  await target.focus();
  await page.keyboard.press("Space");
  await page.clock.runFor(200);
  await expect(target).toHaveCount(0);
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(2);
});


test("Learn opens the living room directly and the old preview remains compatible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach?pane=games");
  await page.getByRole("link", { name: /One tiny sound/ }).click();
  await expect(page).toHaveURL(/lives\/play\/leo-mosquito/);
  await expect(game(page)).toHaveAttribute("data-ready", "true");
  await expect(page.getByRole("button", { name: "Close the window", exact: true })).toBeDisabled();
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(page.locator(".leo-practice")).toHaveCount(0);
  await page.goto("/lives/lab/leo-room");
  await expect(game(page)).toHaveAttribute("data-ready", "true");
});

test("removing the countdown keeps future sources active until the room is changed", async ({ page }) => {
  await timed(page);
  await page.getByRole("button", { name: "Pause game" }).click();
  await page.getByRole("button", { name: "Continue without countdown" }).click();
  await expect(game(page)).toHaveAttribute("data-mode", "recovery");
  await page.clock.runFor(10500);
  await expect(page.locator(".bedroom-insect:enabled")).toHaveCount(5);
  await expect(page.locator(".bedroom-scene")).toHaveAttribute("data-notifications", "1");
  await expect(page.getByRole("timer")).toHaveText("Your pace");
  await prepareRoom(page);
  await readAndRest(page);
  await expect(game(page)).toHaveAttribute("data-mode", "rest");
});
