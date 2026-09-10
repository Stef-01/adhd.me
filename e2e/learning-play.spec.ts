import { expect } from "@playwright/test";
import { test } from "./support/test";
import { expectNoViolations } from "./support/a11y";

test("all four navigation labels and header controls fit phone, tablet and desktop widths", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach");
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const nav = page.getByRole("navigation", { name: "Sections" });
    await expect(nav.getByRole("link")).toHaveCount(4);
    for (const locator of [page.locator(".platform-brand"), page.locator(".platform-utilities"), ...await nav.getByRole("link").all()]) {
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(await locator.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("the brand is text-only and learning activities respond without completing the module", async ({ page }) => {
  await page.goto("/approach?module=adhd");
  await expect(page.locator(".platform-brand")).toHaveText("ADHD.ME");
  await expect(page.locator(".platform-brand svg")).toHaveCount(0);
  const activity = page.getByRole("complementary", { name: "Explore three ideas" });
  for (const label of ["Attention", "Working memory", "Getting started"]) await activity.getByRole("button", { name: new RegExp(label) }).click();
  await expect(activity).toContainText("Three ideas explored");
  expect(await page.evaluate(() => localStorage.getItem("adhdme.learn.v1"))).toBeNull();
});

test("the step builder gives feedback and can be completed with the keyboard", async ({ page }) => {
  await page.goto("/approach?module=everyday");
  await expect(page.locator(".learn-lesson:visible")).toHaveCount(1);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".learn-lesson:visible")).toHaveCount(1);
  const activity = page.getByRole("complementary", { name: "Build a first step" });
  await activity.getByRole("button", { name: "Add one bullet" }).click();
  await expect(activity.getByRole("status")).toContainText("Try the action");
  for (const label of ["Open the document", "Write a rough title", "Add one bullet"]) {
    await activity.getByRole("button", { name: label }).focus();
    await page.keyboard.press("Enter");
  }
  await expect(activity).toContainText("3 / 3 placed");
  await activity.getByRole("button", { name: "Try again" }).click();
  await expect(activity).toContainText("0 / 3 placed");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".learn-lesson:visible")).toHaveCount(1);
});

test("personal meditation pauses, resumes, completes and respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/approach/meditate", { waitUntil: "load" });
  await page.getByRole("button", { name: "2 min", exact: true }).click();
  await page.getByRole("button", { name: "Start my moment" }).click();
  await expect(page.getByRole("heading", { name: "Nothing else to do." })).toBeFocused();
  await page.clock.fastForward(15_000);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const time = await page.getByRole("timer").innerText();
  await page.clock.fastForward(30_000);
  await expect(page.getByRole("timer")).toHaveText(time);
  await expect(page.locator(".meditation-breath")).toHaveCSS("transform", "none");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.fastForward(125_000);
  await expect(page.getByRole("heading", { name: "Here you are." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Here you are." })).toBeFocused();
  await page.getByRole("button", { name: "Choose another moment" }).click();
  await expect(page.getByRole("button", { name: "Start my moment" })).toBeVisible();
});

test("a delayed server clock cannot change a personal timer and normal-motion focus follows the view", async ({ page }) => {
  await page.clock.install();
  let answerClock: (() => Promise<void>) | undefined;
  await page.route("**/api/meditation/session", route => new Promise<void>(resolve => {
    answerClock = async () => { await route.fulfill({ json: { serverNow: Date.now() + 3_600_000 } }); resolve(); };
  }));
  await page.goto("/approach/meditate");
  await page.getByRole("button", { name: "Start my moment" }).click();
  await expect(page.getByRole("heading", { name: "Nothing else to do." })).toBeFocused();
  await answerClock?.();
  await expect(page.getByRole("timer")).toHaveText(/0[45]:[0-5][0-9]/);
  await page.getByRole("button", { name: "Finish early" }).click();
  await expect(page.getByRole("heading", { name: /A little less doing/ })).toBeFocused();
});

test("shared sessions join the server clock and gracefully handle a failed clock", async ({ page }) => {
  const now = Date.UTC(2026, 8, 7, 12, 1);
  await page.clock.install({ time: now });
  await page.route("**/api/meditation/session", route => route.fulfill({ json: { serverNow: now } }));
  await page.goto("/approach/meditate");
  await page.getByRole("button", { name: "Join session" }).click();
  await expect(page.getByRole("timer")).toHaveText(/0[34]:[0-5][0-9]/);
  await expect(page.getByText("Shared session")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Leave this session" }).click();
  await page.route("**/api/meditation/session", route => route.abort());
  await page.reload();
  await expect(page.getByText(/shared clock is unavailable/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Start my moment" })).toBeEnabled();
});

test("colourful activities and the meditation player remain accessible on a phone", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const module of ["adhd", "cost", "changed", "myth-or-fact"]) {
    await page.goto(`/approach?module=${module}`);
    await page.locator(".learn-lesson.is-current").waitFor();
    await expectNoViolations(page, module);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
  await page.goto("/approach/meditate");
  await expectNoViolations(page, "meditation lobby");
  await page.getByRole("button", { name: "Start my moment" }).click();
  await page.getByRole("button", { name: "Chimes off" }).click();
  await expect(page.getByRole("button", { name: "Chimes on" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Chimes on" }).click();
  const finish = await page.getByRole("button", { name: "Finish early" }).boundingBox();
  expect(finish!.y + finish!.height).toBeLessThanOrEqual(844);
  await expectNoViolations(page, "meditation player");
});
