import { test, expect, hydratedUnderFakeClock } from "./support/test";
import { pauseNow } from "./support/fake-clock";
import type { Page } from "@playwright/test";
import { expectNoViolations } from "./support/a11y";
const URL = "/lives/play/theo-out-the-door";
const firstRoute = ["phone", "bottle", "keys", "bag", "phone", "bag", "shoes"];
async function begin(page: Page, timed = false) {
  await page.emulateMedia({ reducedMotion: timed ? "no-preference" : "reduce" });
  if (timed) {
    await page.clock.install(); await page.goto(URL, { waitUntil: "load" }); await hydratedUnderFakeClock(page);
    await expect(page.locator(".tm-game")).toHaveAttribute("data-ready", "true");
    await pauseNow(page);
  } else await page.goto(URL);
  await expect(page.getByRole("heading", { name: "One train. One busy brain." })).toBeVisible();
}
async function task(page: Page, command: string, timed = false) {
  if (command === "door") await page.getByRole("button", { name: "Leave", exact: true }).click();
  else await page.locator(`[data-command="${command}"]`).click();
  if (timed) for (let i = 0; i < 70 && await page.locator(".tm-game").getAttribute("data-intent"); i++) await page.clock.runFor(500);
}
async function firstMorning(page: Page, timed = false) { for (const command of firstRoute) await task(page, command, timed); await task(page, "door", timed); }
async function arrange(page: Page) {
  await page.getByRole("button", { name: "Later that evening" }).click();
  for (const name of ["Keys", "Phone", "Water"]) await page.getByRole("button", { name: `Place ${name} in Hall`, exact: true }).click();
}
async function secondMorning(page: Page) {
  await page.getByRole("button", { name: "Tomorrow", exact: true }).click();
  for (const command of ["keys", "phone", "bag", "bottle", "bag", "shoes", "umbrella", "door"]) await task(page, command);
}

test("the public card enters the new house directly; keyboard actions have physical dependencies", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/approach?pane=games");
  await page.getByRole("link", { name: "Play Theo", exact: true }).click(); await expect(page).toHaveURL(new RegExp(URL));
  await expect(page.getByRole("heading", { name: "One train. One busy brain." })).toBeVisible();
  await expect(page.getByRole("slider")).toHaveCount(0); await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.getByRole("button", { name: "Leave", exact: true }).click(); await expect(page.getByRole("status")).toHaveText("Three essentials in the bag first.");
  const phone = page.getByRole("button", { name: "Charge phone" }); await phone.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Charging"); await expect(page.locator(".tm-game")).toHaveAttribute("data-node", "bedroom");
  for (const c of ["bottle", "keys"]) await task(page, c);
  await task(page, "phone"); await expect(page.getByRole("status")).toContainText("Hands full");
  await expect(page.locator(".tm-game")).toHaveAttribute("data-hands", "keys,bottle");
  await task(page, "bag"); await expect(page.locator(".tm-game")).toHaveAttribute("data-packed", "2");
});

test("a complete morning, physical evening arrangement and rainy revisit carry state and reduce trips", async ({ page }) => {
  await begin(page); const storage = await page.evaluate(() => JSON.stringify(localStorage));
  await firstMorning(page); await expect(page.locator(".tm-game")).toHaveAttribute("data-phase", "departure");
  const trips = Number(await page.locator(".tm-game").getAttribute("data-trips"));
  await arrange(page); await page.getByRole("button", { name: "Leave twelve seconds earlier" }).click(); await page.getByRole("button", { name: "Later note" }).click();
  await page.getByRole("button", { name: "Tomorrow", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("102s");
  await expect(page.locator(".tm-items-hall [data-command]")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Take phone", exact: true })).toBeVisible();
  for (const c of ["keys", "phone", "bag", "bottle", "bag", "shoes"]) await task(page, c);
  await task(page, "door"); await expect(page.getByRole("status")).toContainText("umbrella");
  await task(page, "umbrella"); await task(page, "door");
  await expect(page.getByRole("heading", { name: "A little less to carry." })).toBeVisible();
  expect(Number(await page.locator(".tm-game").getAttribute("data-trips"))).toBeLessThan(trips);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(storage);
  await expect(page.getByRole("link", { name: "Make your own launch pad" })).toHaveAttribute("href", "/lives/learn?module=launch_pad_v1");
  await page.getByRole("button", { name: "Another morning" }).click();
  await expect(page.locator(".tm-items-living [data-command=phone]")).toBeVisible();
  await expect(page.locator(".tm-game")).toHaveAttribute("data-packed", "0");
});

test("ordinary timing has real travel, interruptible routes, and a feasible train deadline", async ({ page }) => {
  test.setTimeout(120_000); // WebKit executes the full simulated minute; keep every timer tick.
  await begin(page, true);
  await page.getByRole("button", { name: "Charge phone" }).click();
  await page.clock.runFor(1000);
  await expect(page.locator(".tm-game")).toHaveAttribute("data-node", "hall");
  const before = await page.locator(".tm-character").getAttribute("style");
  await page.getByRole("button", { name: "Take keys" }).click();
  const after = await page.locator(".tm-character").getAttribute("style");
  const coordinates = (value: string | null) => (value?.match(/-?[\d.]+/g) ?? []).map(Number);
  const a = coordinates(before), b = coordinates(after);
  // A queued 100 ms render may land between the two browser reads; a whole-room jump may not.
  expect(Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!)).toBeLessThan(2);
  await expect(page.locator(".tm-game")).toHaveAttribute("data-node", "hall");
  await page.getByRole("button", { name: "Charge phone" }).click();
  for (let i = 0; i < 15 && await page.locator(".tm-game").getAttribute("data-intent"); i++) await page.clock.runFor(500);
  for (const c of firstRoute.slice(1)) await task(page, c, true);
  await task(page, "door", true);
  await expect(page.getByRole("heading", { name: "Made it out." })).toBeVisible();
});

test("a missed train preserves progress and Ari's changed plan; pause and hidden tabs freeze play", async ({ page }) => {
  test.setTimeout(120_000); // WebKit executes the full simulated minute; keep every timer tick.
  await begin(page, true); await task(page, "keys", true);
  await page.getByRole("button", { name: "Pause game" }).click();
  const time = await page.getByRole("timer").textContent(); await page.clock.runFor(5000);
  await expect(page.getByRole("timer")).toHaveText(time!); await expect(page.getByRole("button", { name: "Fill water", includeHidden: true })).toBeDisabled();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.locator(".tm-game")).toHaveAttribute("data-paused", "true");
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); });
  await page.getByRole("button", { name: "Resume", exact: true }).click(); await page.clock.runFor(91000);
  await expect(page.getByRole("timer")).toHaveText("Departed"); await expect(page.locator(".tm-game")).toHaveAttribute("data-hands", "keys");
  await page.getByRole("button", { name: "Update Ari" }).click(); await page.clock.runFor(2000);
  await expect(page.getByRole("status")).toContainText("I’ll go ahead"); await expect(page.getByRole("button", { name: "Update Ari" })).toHaveCount(0);
  await page.getByRole("button", { name: "Pause game" }).click(); await page.getByRole("button", { name: "Play at your pace" }).click(); await page.getByRole("button", { name: "Resume", exact: true }).click();
  for (const c of ["bag", "phone", "bottle", "bag", "phone", "bag", "shoes", "door"]) await task(page, c);
  await expect(page.locator(".tm-game")).toHaveAttribute("data-phase", "departure");
});

test("phone through desktop keeps spatial controls usable and each stage accessible", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  for (const [width, height] of [[320,568],[390,844],[768,1024],[1440,900],[1920,1080],[844,390],[568,320]]) {
    await page.setViewportSize({ width: width!, height: height! }); await page.goto(URL);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width!);
    for (const button of await page.locator(".tm-object").all()) {
      const box = (await button.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(48); expect(box.height).toBeGreaterThanOrEqual(48);
      const visible = await button.evaluate(el => { const r = el.getBoundingClientRect(); const house = el.closest(".tm-house")!.getBoundingClientRect(); return r.left >= house.left && r.right <= house.right && r.top >= house.top && r.bottom <= house.bottom; }); expect(visible).toBe(true);
    }
    if (info.project.name === "chromium" && [390,1440].includes(width!)) await page.screenshot({ path: `qa/_runs/theo-morning-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 }); await expectNoViolations(page, "Theo house");
  await firstMorning(page); await arrange(page); await expectNoViolations(page, "Theo evening");
  if (info.project.name === "chromium") await page.screenshot({ path: "qa/_runs/theo-evening-390.png", fullPage: true });
  await secondMorning(page); await expectNoViolations(page, "Theo complete"); expect(errors).toEqual([]);
});

test("touch can play both mornings without drag precision", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
  await context.addInitScript(() => localStorage.setItem("adhdme-privacy-ack", "1")); const page = await context.newPage();
  await page.goto(URL); await expect(page.locator(".tm-game")).toHaveAttribute("data-still", "true");
  for (const command of firstRoute) await page.locator(`[data-command="${command}"]`).tap();
  await page.getByRole("button", { name: "Leave", exact: true }).tap(); await expect(page.locator(".tm-game")).toHaveAttribute("data-phase", "departure");
  await arrange(page); await secondMorning(page); await expect(page.locator(".tm-game")).toHaveAttribute("data-phase", "complete");
  await context.close();
});

test("every offered home arrangement remains reachable on the smallest phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const room of ["Kitchen", "Bedroom", "Hall"]) {
    await begin(page); await firstMorning(page); await page.getByRole("button", { name: "Later that evening" }).click();
    for (const name of ["Keys", "Phone", "Water"]) await page.getByRole("button", { name: `Place ${name} in ${room}`, exact: true }).click();
    await page.getByRole("button", { name: "Tomorrow", exact: true }).click();
    for (const button of await page.locator(".tm-object").all()) {
      await button.scrollIntoViewIfNeeded();
      expect(await button.evaluate(el => { const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); })).toBe(true);
    }
    for (const c of ["keys", "phone", "bag", "bottle", "bag", "shoes", "umbrella", "door"]) await task(page, c);
    await expect(page.locator(".tm-game")).toHaveAttribute("data-phase", "complete");
  }
});

// The evening's three essentials are pill buttons in a flex row, and a flex item cannot shrink
// below its own content, so without wrap the third ran to x357 in a 320 viewport and the screen
// scrolled sideways by 37px. Three drawn props at 320 take two rows, which is the right outcome —
// the alternative was shrinking the art to force one line — so this pins the overflow, not the
// row count.
test("the evening's essentials never push the screen sideways", async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await begin(page);
    await firstMorning(page);
    await arrange(page);
    const items = page.locator(".tm-setup-items");
    await expect(items).toBeVisible();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, `the evening arrangement at ${width}px scrolls sideways`).toBeLessThanOrEqual(0);
    // And every essential stays inside the viewport, wherever it wrapped to.
    const outside = await items.evaluate((el) => [...el.children]
      .filter((c) => c.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5)
      .map((c) => c.textContent?.trim() ?? ""));
    expect(outside, `an essential hangs off the side at ${width}px`).toEqual([]);
  }
});

 test("exit stays reachable after scrolling and Theo stays above clickable props", async ({ page }) => {
  for (const [width, height] of [[320,568], [844,390], [1440,900]] as const) {
    await page.setViewportSize({width, height}); await begin(page);
    const layers = await page.evaluate(() => ({
      theo: Number(getComputedStyle(document.querySelector(".tm-character-space")!).zIndex),
      props: Number(getComputedStyle(document.querySelector(".tm-bag-position")!).zIndex),
    }));
    expect(layers.theo).toBeGreaterThan(layers.props);
    await task(page, "keys"); // Character overlaps the collected object's scene without intercepting input.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const exit = page.getByRole("link", {name: "Back to games"});
    expect(await exit.evaluate(el => { const r=el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); })).toBe(true);
    await exit.click(); await expect(page).toHaveURL(/approach\?pane=games/);
  }
 });
