// U8 (O229): the finder's stages are history entries — Back, Forward and reload, in a real browser.
//
// The unit tests in src/finder/state.test.ts prove the model against a fake host. This file
// proves the wiring against the browser's own history: the buttons the browser draws (Back,
// Forward, reload) walk the stages instead of leaving the site or losing the words, and the
// address bar carries the suburb and never the sentence. The plan's §2.8 Q-A rule — patient text
// never appears in a URL or a history entry — is asserted here on the real `history.state`.

import { expect, test, type Page } from "@playwright/test";
import { installFakeSpeech } from "./support/fake-speech";

const SENTENCE = "my son Oliver cannot sit still in class and the school keeps calling";

const stage = (page: Page) => page.locator("main[data-stage]");

/** Speak the sentence and tap the microphone to finish: welcome → listening → results. */
async function speakToResults(page: Page) {
  await installFakeSpeech(page);
  await page.goto("/finder");
  await expect(stage(page)).toHaveAttribute("data-stage", "welcome");
  await page.getByRole("button", { name: /Talk instead of typing/i }).click();
  await expect(stage(page)).toHaveAttribute("data-stage", "listening");
  await page.evaluate((text) => (window as any).__speech.say(text, true), SENTENCE);
  await page.getByRole("button", { name: "Microphone" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 5000 });
  await expect(stage(page)).toHaveAttribute("data-stage", "results");
}

/** Every history state the page can see, flattened — for the "nowhere else" check. */
async function historyState(page: Page): Promise<string> {
  return page.evaluate(() => JSON.stringify(window.history.state));
}

test("Back and Forward walk the stages, and a reload resumes them with the words", async ({ page }) => {
  await speakToResults(page);
  // The headline is derived from the words ("my son … school"), so it is the words' witness on the
  // results screen; the example request the finder falls back to reads differently.
  const headline = page.locator(".results-head h1");
  await expect(headline).toContainText(/school/i);

  // A real GP's row: an example profile has no booking control by design (O217).
  const showAll = page.getByRole("button", { name: /Show the other/i });
  if (await showAll.isVisible()) await showAll.click();
  await page.locator(".clinician-row", { hasText: "Saxena" }).first().click();
  await expect(stage(page)).toHaveAttribute("data-stage", "profile");
  await page.getByRole("button", { name: /available times|how to book/i }).first().click();
  await expect(stage(page)).toHaveAttribute("data-stage", "booking");

  // The browser's own Back, twice: booking → profile → results. Still on the site, words intact.
  await page.goBack();
  await expect(stage(page)).toHaveAttribute("data-stage", "profile");
  await page.goBack();
  await expect(stage(page)).toHaveAttribute("data-stage", "results");
  await expect(headline).toContainText(/school/i);
  expect(page.url()).toContain("/finder");

  // Forward is still there: nothing in-app rewrote the stack.
  await page.goForward();
  await expect(stage(page)).toHaveAttribute("data-stage", "profile");

  // A reload resumes the same stage from the tab; the sentence is still the request, verbatim.
  await page.reload();
  await expect(stage(page)).toHaveAttribute("data-stage", "profile");
  await page.getByRole("button", { name: /Back to results/i }).click();
  await expect(stage(page)).toHaveAttribute("data-stage", "results");
  await expect(headline).toContainText(/school/i);
  await page.getByRole("button", { name: /Change what you said/i }).click();
  await expect(stage(page)).toHaveAttribute("data-stage", "type");
  await expect(page.getByRole("textbox")).toHaveValue(/Oliver/);
});

test("the address bar carries the place and never the words; history entries carry neither", async ({ page }) => {
  await speakToResults(page);

  // Not a word of the request in the URL or on the entry.
  for (const word of ["Oliver", "sit", "school"]) {
    expect(page.url(), `"${word}" reached the URL`).not.toContain(word);
    expect(await historyState(page), `"${word}" reached history.state`).not.toContain(word);
  }
  // The entry is the finder's: a stage and an index, stamped so Next's router keeps the page.
  expect(await historyState(page)).toContain('"stage":"results"');

  // The place is the one thing the URL learns, rewritten in place: no new entry to Back through.
  await page.getByLabel(/Where are you/i).fill("Hornsby");
  await expect.poll(() => page.url()).toContain("place=Hornsby");
  expect(page.url()).not.toContain("Oliver");
  // Back from results is the listening entry, revisited — which lands on the typing screen (a
  // revisited `listening` never restarts the microphone), with the words one tap from a search.
  await page.goBack();
  await expect(stage(page)).toHaveAttribute("data-stage", "type");
  await expect(page.getByRole("textbox")).toHaveValue(/Oliver/);
});

test("a shared link with a place ranks from it, and a fresh visit starts at the beginning", async ({ page }) => {
  await installFakeSpeech(page);
  await page.goto("/finder?place=Hornsby");
  await expect(stage(page)).toHaveAttribute("data-stage", "welcome");
  await page.getByRole("button", { name: /Talk instead of typing/i }).click();
  await page.evaluate((text) => (window as any).__speech.say(text, true), SENTENCE);
  await page.getByRole("button", { name: "Microphone" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 5000 });
  await expect(page.getByLabel(/Where are you/i)).toHaveValue("Hornsby");
  expect(page.url()).toContain("place=Hornsby");

  // Arriving again by address — not Back, not reload — is a fresh start: the last visit's words
  // are cleared from the tab, not resumed into a stranger's session on a shared device.
  await page.goto("/finder");
  await expect(stage(page)).toHaveAttribute("data-stage", "welcome");
  await expect(page.getByRole("textbox")).toHaveValue("");
});

test("Cancel on the listening screen is the browser's Back, not a new entry", async ({ page }) => {
  await installFakeSpeech(page);
  await page.goto("/finder");
  const before = await page.evaluate(() => window.history.length);
  await page.getByRole("button", { name: /Talk instead of typing/i }).click();
  await expect(stage(page)).toHaveAttribute("data-stage", "listening");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(stage(page)).toHaveAttribute("data-stage", "welcome");
  // One entry for listening, walked back: the stack did not grow with the tap.
  expect(await page.evaluate(() => window.history.length)).toBe(before + 1);
  // And Forward still reaches it — as the typing screen, never the microphone.
  await page.goForward();
  await expect(stage(page)).toHaveAttribute("data-stage", "type");
});
