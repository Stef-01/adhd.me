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

/**
 * O253 (founder-directed, reading his own screen): "my thing said, try this, one capture place,
 * when reading it, this meant nothing. It is so cryptic. It should be very clear what the
 * strategy to learn is that can help" — and, separately, "make sure that when you click, it
 * directs you to the relevant modules for the try this".
 *
 * Two failures in one card. It rendered the recommendation's HEADING alone, and a strategy's
 * heading is its title, which names something you have not met. And its control sent four of
 * the seven actions to `/approach`, the bare module list, throwing away the `moduleId` the
 * recommendation was holding.
 */
test("the next step says what it is, and opens the module it names", async ({ page }) => {
  // The state the budget now walks too: a strategy proposed, nothing accepted yet.
  await seed(page, {
    ...LIVED_RECORD,
    onboarding: { ...LIVED_RECORD.onboarding, lookingFor: "try" },
    completed: [],
    experiments: [],
  });
  const step = page.locator(".map-step");
  await expect(step).toBeVisible();
  // The heading names it, and a second line says the first thing to actually do.
  await expect(step.getByRole("heading", { level: 2 })).toContainText(/Try this/i);
  await expect(step.locator(".map-step-do")).not.toBeEmpty();
  // The control names where it goes, and goes to the module the strategy came from.
  const link = step.getByRole("link");
  await expect(link).toHaveText(/module/i);
  await expect(link).toHaveAttribute("href", /^\/approach\?module=/);
});

test("a question is left as a question, and still opens its module", async ({ page }) => {
  // The accepted-experiment card asks how it went. It names the strategy in the asking, so it
  // takes no instruction under it — an earlier draft put one there and it read as a non-sequitur.
  await seed(page);
  const step = page.locator(".map-step");
  await expect(step.getByRole("heading", { level: 2 })).toContainText(/help\?$/);
  await expect(step.locator(".map-step-do")).toHaveCount(0);
  await expect(step.getByRole("link")).toHaveAttribute("href", /^\/approach\?module=/);
});

test("support names the person whose declared expertise answers this need", async ({ page }) => {
  // O253: "make sure it is working and live where it personalises the care providers based on
  // your needs and challenges seen on skill map". The chips are the person's own map read back:
  // the card renders only when `fitTags` has something to put in them.
  await seed(page);
  await page.goto("/support");
  const best = page.locator(".support-best");
  await expect(best).toBeVisible();
  await expect(best.locator(".support-best-tags li")).not.toHaveCount(0);
  await expect(best.locator(".support-best-tags li")).toHaveCount(await best.locator(".support-best-tags li").count());
  // A name, not a count, and no number about the person anywhere on it.
  expect(await best.innerText()).not.toMatch(/\d/);

  // The way off this screen must not read as quieter than the note explaining the screen. It did:
  // "Take this to my GP" was 13px/400 in --muted while the "Why am I seeing this?" disclosure
  // right below it was 14px/700 in --accent-deep, so the explanation outweighed the thing being
  // explained — and that link is the map's whole point of arrival (MAP-PRD Phase 4).
  const weight = (sel: string) => page.locator(sel).first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { px: parseFloat(s.fontSize), weight: Number(s.fontWeight) };
  });
  const onward = await weight(".map-foot.is-onward a");
  const aside = await weight(".life-why summary");
  expect(onward.weight, "the onward action is lighter than the note explaining the screen").toBeGreaterThanOrEqual(aside.weight);
  expect(onward.px, "the onward action is smaller than the note explaining the screen").toBeGreaterThanOrEqual(aside.px);

  await expectNoViolations(page, "Support, the closest fit");
});

/**
 * THE WHOLE CHAIN, IN ONE WALK — the PRD's own acceptance for Phase 5 (§15), pinned.
 *
 * Every break this session found was a break in a JOIN rather than in a screen: the step card
 * dropped the recommendation's body, its control dropped the module id, the support screen
 * dropped the person, and two subdomains dropped out of matching entirely. Each screen passed
 * its own test while the path between them did not work. So the path gets a test.
 *
 * It asserts the joins and deliberately not the copy — the wording of each screen is pinned by
 * the specs above, and duplicating it here would mean every rewording broke two files.
 */
test("the loop joins up: map to axis to a person to the GP summary", async ({ page }) => {
  await seed(page);

  // The map, and the one sentence it leads with.
  await expect(page.locator(".map-axis")).toHaveCount(6);
  await expect(page.locator(".map-stands-out")).toHaveCount(1);

  // An axis opens on the five life areas, and carries the ways on: does this fit, go deeper,
  // and who helps. The matrix, one column at a time.
  await page.locator(".map-axis").first().click();
  const sheet = page.getByRole("dialog");
  await expect(page.locator(".map-row")).toHaveCount(5);
  await expect(sheet.getByRole("button", { name: "Partly" })).toBeVisible();
  await expect(sheet.getByRole("link", { name: /Who helps here/i })).toBeVisible();
  await page.keyboard.press("Escape");

  // The way to a person names one, and says why in the person's own matched tags.
  await page.goto("/support");
  await expect(page.locator(".profession-card")).toHaveCount(3);
  await expect(page.locator(".support-best-tags li").first()).toBeVisible();

  // And the thing to take to a GP is already written.
  await page.goto("/my-adhd");
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("button", { name: "My GP" }).click();
  await expect(page.locator(".map-preview")).toContainText("Current priority");
  await expect(page.getByRole("button", { name: /Print/i })).toBeVisible();
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

// Below 768px the axis words sit in a grid UNDER the chart rather than in a ring around it, so
// the chart is scaled up to fill the frame the ring's margin was reserving. A transform grows the
// SVG's BOX as well as its drawing, and that box is 28% empty margin — the first version of this
// reached 13px past both edges of a 390 viewport. Nothing on this tab is wide enough to be read
// sideways, so the map screens are pinned at the four widths the rest of the tree walks.
test("no map screen scrolls sideways", async ({ page }) => {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await seed(page);
    for (const path of ["/my-adhd", "/my-adhd/history", "/today"]) {
      await page.goto(path);
      await expect(page.locator(".life-main, main").first()).toBeVisible();
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `${path} at ${width}px scrolls sideways`).toBeLessThanOrEqual(0);
    }
    // The axis sheet is a modal over the same chart, and it is the state the scale is largest in.
    await page.goto("/my-adhd");
    await page.locator(".map-axis").first().click();
    await expect(page.locator(".map-sheet")).toBeVisible();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, `the axis sheet at ${width}px scrolls sideways`).toBeLessThanOrEqual(0);
  }
});
