// W212 verify gate (browser half): the microphone, driven through a real page.
//
// The unit tests in src/voice/speech.test.ts drive a fake recogniser and cover the module's own
// logic. They cannot cover the half that only exists in a browser: whether the finder ROUTES
// correctly when the API is absent, whether a denied permission lands somebody on the typing
// screen instead of a dead end, whether the transcript reaches the search, and whether the
// recogniser is actually stopped when its screen goes away.
//
// The Web Speech API is not implemented in Playwright's Chromium build, so every test here
// installs a stand-in on `window` BEFORE the page script runs, via `addInitScript`. That is the
// honest boundary of this file: it proves the FINDER handles each outcome, not that Chrome
// transcribes speech. Nothing can prove the latter in CI, and pretending otherwise with a mocked
// audio stream would be a test that passes when the feature is broken.

import { expect, test, type Page } from "@playwright/test";

/**
 * Install a controllable fake recogniser.
 *
 * Exposes `__speech` on the page so a test can drive results and errors from the outside, and
 * records `aborted` so teardown can be asserted rather than assumed.
 */
async function installFakeSpeech(page: Page, opts: { present?: boolean } = {}) {
  const present = opts.present !== false;
  await page.addInitScript((isPresent: boolean) => {
    const w = window as unknown as Record<string, unknown>;
    if (!isPresent) {
      delete w.SpeechRecognition;
      delete w.webkitSpeechRecognition;
      return;
    }
    const state = { instance: null as unknown, aborted: false, started: 0 };
    class Fake {
      lang = ""; continuous = false; interimResults = false; maxAlternatives = 0;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onstart: (() => void) | null = null;
      constructor() { state.instance = this; }
      start() { state.started += 1; }
      stop() { this.onend?.(); }
      abort() { state.aborted = true; }
    }
    w.SpeechRecognition = Fake;
    delete w.webkitSpeechRecognition;
    w.__speech = {
      state,
      say(text: string, final: boolean) {
        const inst = state.instance as Fake;
        const results = [Object.assign([{ transcript: text }], { isFinal: final })];
        inst.onresult?.({ resultIndex: 0, results });
      },
      finish() { (state.instance as Fake).onend?.(); },
      fail(error: string) { (state.instance as Fake).onerror?.({ error }); },
    };
  }, present);
}

async function openMic(page: Page) {
  await page.goto("/finder");
  // The welcome screen's one dual-function control: a microphone while the field is empty.
  // (Was "Start voice description" until the single-field collapse renamed it; this spec had
  // gone stale against that rename because e2e is outside the pnpm verify gate.)
  await page.getByRole("button", { name: /Talk instead of typing/i }).click();
}

test("a spoken request reaches the results", async ({ page }) => {
  await installFakeSpeech(page);
  await openMic(page);

  await page.evaluate(() => (window as any).__speech.say("I would like an ADHD assessment and I speak Urdu", false));
  // The interim transcript is on screen while somebody is still talking, which is the only
  // reliable signal to them that the microphone is working.
  await expect(page.locator(".listening-transcript")).toContainText("Urdu");

  await page.evaluate(() => (window as any).__speech.say("I would like an ADHD assessment and I speak Urdu", true));
  /**
   * THE END THE PERSON DID NOT ASK FOR (O46). iOS Safari closes continuous recognition on its
   * own — after a pause, or seconds in — and this used to auto-submit whatever fragment it had:
   * a results screen headlined "Cx." on the founder's phone. A browser-initiated end now lands
   * the words in the editable box, said out loud, one tap from searching. Only Done searches
   * directly (the test below this one).
   */
  await page.evaluate(() => (window as any).__speech.finish());
  const box = page.getByRole("textbox");
  await expect(box).toBeVisible();
  await expect(box).toHaveValue(/Urdu/);
  await expect(page.locator(".speech-error")).toContainText("stopped on its own");

  await page.getByRole("button", { name: "Find a GP" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 5000 });
  // And the words were actually used: the roster's one Urdu speaker ranks first. (This asked
  // for a Vietnamese speaker when the roster was fifteen invented personas; the roster is two
  // real GPs now, and O1 made an asked-for language a scored signal rather than a printed one.)
  const names = await page.locator(".clinician-row strong").allInnerTexts();
  expect(names[0]).toMatch(/Saxena/);
});

test("pressing Done mid-sentence keeps what was already said", async ({ page }) => {
  await installFakeSpeech(page);
  await openMic(page);
  await page.evaluate(() => (window as any).__speech.say("my son is struggling at school", true));
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".results-head h1")).toContainText(/school|assessment/i);
});

test("silence goes to typing with no error, because a quiet room is not a failure", async ({ page }) => {
  await installFakeSpeech(page);
  await openMic(page);
  await page.evaluate(() => (window as any).__speech.finish());

  await expect(page.getByRole("textbox")).toBeVisible();
  await expect(page.locator(".speech-error")).toHaveCount(0);
});

test.describe("every failure lands on the typed route, not a dead end", () => {
  for (const [error, expected] of [
    ["not-allowed", /blocked the microphone/i],
    ["audio-capture", /No microphone was found/i],
    ["network", /speech service could not be reached/i],
    ["some-unknown-code", /did not work/i],
  ] as const) {
    test(`a ${error} error explains itself in plain words`, async ({ page }) => {
      await installFakeSpeech(page);
      await openMic(page);
      await page.evaluate((e) => (window as any).__speech.fail(e), error);

      await expect(page.getByRole("textbox")).toBeVisible();
      const message = page.locator(".speech-error");
      await expect(message).toBeVisible();
      await expect(message).toContainText(expected);
      // No error code ever reaches a patient.
      await expect(message).not.toContainText(error);
      // And typing still works from here.
      await page.getByRole("textbox").fill("I think I have ADHD");
      await page.getByRole("button", { name: "Find a GP" }).click();
      await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 5000 });
    });
  }
});

test("a browser without the API never shows a microphone screen at all", async ({ page }) => {
  // Firefox. Showing a listening screen that cannot listen is the failure this prevents.
  await installFakeSpeech(page, { present: false });
  await openMic(page);
  await expect(page.getByRole("textbox")).toBeVisible();
  await expect(page.locator(".listening-transcript")).toHaveCount(0);
  await expect(page.locator(".speech-error")).toHaveCount(0);
});

test("leaving the screen aborts the recogniser, so the mic light cannot outlive its page", async ({ page }) => {
  await installFakeSpeech(page);
  await openMic(page);
  await page.evaluate(() => (window as any).__speech.say("partial", false));

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__speech.state.aborted)).toBe(true);
});

test("the disclosure is on screen before anything is said", async ({ page }) => {
  // It has to be readable at the moment somebody decides to press the button, not afterwards.
  await installFakeSpeech(page);
  await openMic(page);
  const disclosure = page.locator(".speech-disclosure");
  await expect(disclosure).toBeVisible();
  await expect(disclosure).toContainText(/browser/i);
  await expect(disclosure).toContainText(/does not record/i);
});

test("the recogniser is configured for Australian English and long pauses", async ({ page }) => {
  await installFakeSpeech(page);
  await openMic(page);
  const config = await page.evaluate(() => {
    const i = (window as any).__speech.state.instance;
    return { lang: i.lang, continuous: i.continuous, interim: i.interimResults, started: (window as any).__speech.state.started };
  });
  expect(config).toEqual({ lang: "en-AU", continuous: true, interim: true, started: 1 });
});

test("starting twice does not leave two recognisers running", async ({ page }) => {
  await installFakeSpeech(page);
  await openMic(page);
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: /Talk instead of typing/i }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__speech.state.started)).toBe(2);
  // The first one was aborted before the second started.
  expect(await page.evaluate(() => (window as any).__speech.state.aborted)).toBe(true);
});
