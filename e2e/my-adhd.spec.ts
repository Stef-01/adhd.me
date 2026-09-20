// The My ADHD map, end to end: the tab is one picture and three ways out of it.
//
// The line this holds hardest is the one the tab is built on — NO NUMBER ABOUT ANYBODY. The
// screen reads a cost of 8 out of 10 out of the record and must never print it. The regex below
// is the same guard `my-map.spec.ts` uses, and it is why this tab can say a person is struggling
// without scoring them for it.
//
// It also holds the thing the budget could not see for as long as this screen has existed: what a
// RETURNING person meets. Every assertion here runs against `LIVED_RECORD`, the same seed the text
// budget now walks, so the screen the gate measures is the screen this drives.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { expectNoViolations } from "./support/a11y";
// The library is plain ESM the CLI shares; the types are loose on purpose. One seed record for
// the instrument and for this spec, so the screen the gate measures is the screen this drives.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LIVED_RECORD } from "../scripts/text-budget-lib.mjs";

const MODEL_KEY = "adhdme.model.v1";

async function seed(page: Page, record: unknown = LIVED_RECORD): Promise<void> {
  await page.goto("/my-adhd");
  await page.evaluate(([k, rec]) => localStorage.setItem(k!, rec!), [MODEL_KEY, JSON.stringify(record)]);
  await page.reload();
}

async function clear(page: Page): Promise<void> {
  await page.goto("/my-adhd");
  await page.evaluate((k) => localStorage.removeItem(k), MODEL_KEY);
  await page.reload();
}

test("the empty map is a door, not a dashboard", async ({ page }) => {
  await clear(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("My ADHD.");
  // Six axes from the first moment: the shape of a life is the same before anybody answers, and
  // what is missing is the app's question rather than the person's gap.
  await expect(page.locator(".map-axis")).toHaveCount(6);
  for (const text of await page.locator(".map-axis").allInnerTexts()) {
    expect(text).toContain("Unasked");
  }
  await expect(page.getByRole("link", { name: /^Start/ })).toBeVisible();
  // Nothing to share before there is anything to share.
  await expect(page.getByRole("button", { name: "Share" })).toHaveCount(0);
  await expectNoViolations(page, "My ADHD, empty");
});

test("a lived-in map says words, never a number about the person", async ({ page }) => {
  await seed(page);
  await expect(page.locator(".map-axis")).toHaveCount(6);
  await expect(page.locator(".map-axis").first()).toContainText("Starting");

  // The record behind this holds a cost of 8 out of 10. It may not reach the screen.
  const shown = (await page.locator("main").innerText()).replace(/ADHD\.ME|ADHD\s*me/gi, "");
  expect(shown, "a count of a person is the one thing this tab is built not to be").not.toMatch(/\d/);

  // The one sentence, the one strength, the one next step.
  await expect(page.locator(".map-stands-out")).toHaveCount(1);
  await expect(page.locator(".map-step")).toHaveCount(1);
  await expectNoViolations(page, "My ADHD, lived in");
});

test("every axis is a real control, and one opens in place", async ({ page }) => {
  await seed(page);
  for (const axis of await page.locator(".map-axis").all()) {
    const box = await axis.boundingBox();
    expect(box!.height, "an axis is a 44px target").toBeGreaterThanOrEqual(44);
  }
  await page.locator(".map-axis").first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Starting" })).toBeVisible();

  // The five areas of a life, as rows inside the axis. This is the matrix, one column at a time.
  await expect(page.locator(".map-row")).toHaveCount(5);
  await expect(page.locator(".map-row").first()).toContainText("Work & Study");
  await expectNoViolations(page, "My ADHD, an axis open");

  // Escape closes it and leaves the map where it was.
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(page.locator(".map-axis")).toHaveCount(6);
});

test("the summary is built already, and nothing leaves the device", async ({ page }) => {
  await seed(page);
  await page.getByRole("button", { name: "Share" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();

  // Audience first, then the page itself.
  await sheet.getByRole("button", { name: "My GP" }).click();
  await expect(page.locator(".map-preview")).toBeVisible();
  const before = await page.locator(".map-preview").innerText();
  expect(before).toContain("Current priority");

  // Removing a section takes it out of the document, not just out of view.
  const first = page.locator(".map-preview-remove").first();
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  const after = await page.locator(".map-preview").innerText();
  expect(after.length).toBeLessThan(before.length);

  await expect(page.getByText("Nothing leaves your device until you send it.")).toBeVisible();
  await expectNoViolations(page, "My ADHD, the summary open");
});

test("the export is a real file, written on the device", async ({ page }) => {
  await seed(page);
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("button", { name: "My GP" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.docx$/);
  const path = await file.path();
  expect(path, "an empty download is not an export").toBeTruthy();
});

test("what you tried lives off the hub, one word away", async ({ page }) => {
  await seed(page);
  await page.goto("/my-adhd/history");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What you tried.");
  await expect(page.getByText("Helped a lot")).toBeVisible();
  await expect(page.locator("#main-content").getByRole("link", { name: "My ADHD" })).toBeVisible();
  await expectNoViolations(page, "What you tried");
});

test("Today is its own screen again, and it leads back to the map", async ({ page }) => {
  await seed(page);
  await page.goto("/today");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Today.");
  await expect(page.getByRole("link", { name: "View my map" })).toBeVisible();
  await expectNoViolations(page, "Today, lived in");
});

test("deleting everything is in settings, where somebody goes looking for it", async ({ page }) => {
  await seed(page);
  await page.getByRole("button", { name: "Settings" }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Your data")).toBeVisible();
  await sheet.getByRole("button", { name: /^Delete/ }).click();
  await sheet.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(sheet.getByText("Deleted from this browser.")).toBeVisible();
  const held = await page.evaluate((k) => localStorage.getItem(k), MODEL_KEY);
  expect(held, "the record is gone from the device, not hidden").toBeFalsy();
});

test("the map fills in when a survey is answered, and says so", async ({ page }) => {
  // Somebody who has only been through the door: one goal, nothing built, nothing answered. This
  // is the person the reward is for, and the person for whom a survey genuinely moves the map.
  await seed(page, {
    ...LIVED_RECORD,
    resonance: {},
    answers: {},
    insights: {},
    experiments: [],
    completed: [],
    surveys: {},
  });
  await page.goto("/survey?id=work-study");
  // Answer every question with its first option, then finish. The forward control says "Next"
  // until the last question, where it says "See my pattern".
  for (let i = 0; i < 24; i++) {
    // The questions crossfade, so wait for the card to settle before pressing anything on it.
    const option = page.locator(".onboarding-options .learn-option").first();
    const scale = page.locator(".onboarding-scale input");
    if (await scale.count()) await scale.fill("8");
    else {
      await option.waitFor({ state: "visible" });
      await expect(option).toBeEnabled();
      await option.click({ force: true });
    }
    const forward = page.locator(".learn-primary").first();
    await forward.waitFor({ state: "visible" });
    const label = (await forward.innerText()).trim();
    await forward.click({ force: true });
    if (/pattern/i.test(label)) break;
    await page.waitForTimeout(250);
  }
  // The map moment: the shape moved, and the screen says so.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your map just got clearer.");
  await expect(page.locator(".map-chart")).toBeVisible();
  // One authored sentence, and still no number ABOUT ANYBODY. A duration badge on the next
  // module ("7 min") is a fact about a module and stays; what may never appear is a figure that
  // measures the person, and the record behind this holds a cost of 8 out of 10.
  await expect(page.locator(".map-stands-out")).toHaveCount(1);
  const aboutThem = [
    await page.locator(".map-stands-out").innerText(),
    await page.locator(".map-axes").innerText(),
    await page.getByRole("heading", { level: 1 }).innerText(),
  ].join(" ");
  expect(aboutThem, "a count of a person is the one thing this tab is built not to be").not.toMatch(/\d/);
});
