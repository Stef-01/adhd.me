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
import { installFakeSpeech } from "./support/fake-speech";

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

test("a permission failure offers the microphone again as a button, and the tap restarts listening (O48)", async ({ page }) => {
  // WebKit starts recognition only from a screen tap, so the O18 auto-retry that runs after
  // the Allow dialog can be refused regardless — the recovery that works on an iPhone is the
  // person tapping again with permission now granted. The copy said "try once more"; this
  // pins the once-more as a control, and that tapping it actually listens again.
  await installFakeSpeech(page);
  await openMic(page);
  await page.evaluate(() => (window as any).__speech.fail("service-not-allowed"));
  const retry = page.getByRole("button", { name: "Try the microphone again" });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(page.locator(".listening-screen")).toBeVisible();
  // And a non-permission failure does not offer it: a missing microphone will not appear
  // because somebody taps again.
  await page.evaluate(() => (window as any).__speech.fail("audio-capture"));
  await expect(page.getByRole("button", { name: "Try the microphone again" })).toHaveCount(0);
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

test("choosing a roster language restarts listening in it, with the honesty line on screen (O59)", async ({ page }) => {
  await installFakeSpeech(page);
  await openMic(page);

  // English is the default and carries no note — nothing changed for the common path.
  const languageLine = page.getByTestId("speech-language");
  await expect(languageLine).toContainText("Listening in English");
  await expect(page.locator(".speech-language-note")).toHaveCount(0);

  // The choices are the roster's own languages, in their own script.
  await languageLine.getByRole("button", { name: "हिन्दी" }).click();
  await expect(page.getByTestId("speech-language")).toContainText("हिन्दी");

  // The recogniser was actually restarted in the chosen language — not just relabelled.
  await expect.poll(() => page.evaluate(() => (window as any).__speech.state.started)).toBe(2);
  expect(await page.evaluate(() => (window as any).__speech.state.instance.lang)).toBe("hi-IN");

  // And the honesty line is up BEFORE anything is said: kept and shown, may not order.
  const note = page.locator(".speech-language-note");
  await expect(note).toBeVisible();
  await expect(note).toContainText(/reads English/i);

  // The design record: the listening screen with the picker and the honesty line.
  await page.screenshot({ path: "qa/_runs/voice-o59/listening-hindi-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "qa/_runs/voice-o59/listening-hindi-mobile.png" });

  // Spoken words still land in the box and still search — no dead end behind the picker.
  await page.evaluate(() => (window as any).__speech.say("मुझे ADHD जांच चाहिए", true));
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 5000 });
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
