// U9: focus, the live line and the one microphone control — the finder for a keyboard or a
// screen reader, proven on the real stages.
//
// What the finder used to do on every transition was nothing: the old screen unmounted with the
// control the person was on, focus fell to the top of the document, and an `aria-live` wrapper
// around the whole machine read the entire new screen aloud. This file holds the new contract:
//
//   * after every transition the focused element is the new stage's heading — or the first
//     result on the results screen, or the text box on the typing screen — and it is reached
//     the way a keyboard user reaches it (a control focused and Enter pressed, never a click);
//   * the shell carries no live region at all and each stage owns exactly one `role="status"`
//     line, whose text after the transition is the one sentence `src/finder/announce.ts` scripts
//     for it — nothing more is live, so a re-rank says its count and never re-reads the list;
//   * the microphone is ONE toggle: `aria-pressed` while listening, `aria-busy` (and "Finishing")
//     between the tap and the recogniser's last phrase, and a language control announces the
//     restart in the language's own name;
//   * axe's WCAG 2.2 AA tag set finds nothing on any of the eight stages — the route sweep in
//     a11y.spec.ts scans the welcome screen only, because that is all a URL reaches.
//
// The walk runs twice, under `prefers-reduced-motion: reduce` and with no preference, because
// the two settings mount the new screen on different timings (`AnimatePresence` waits out the
// exit) and the focus effect has to land on both. The fake recogniser stands in for the
// browser's; nothing here transcribes speech.

import { expect, test, type Page } from "@playwright/test";
import { expectNoViolations } from "./support/a11y";
import { installFakeSpeech } from "./support/fake-speech";
import {
  FINDER_SENTENCE,
  STAGES,
  expectStage,
  freshFinder,
  openStage,
  toBooking,
  toCompare,
  toListening,
  toProfile,
  toScenarios,
  toType,
} from "./support/finder-stages";

// Both scoped to the finder's own `main`: Next mounts its route announcer (`aria-live`, role
// alert) at the end of `body` on every page, and it is silent unless the route changes — which
// U8 made sure a stage transition never does (`finder-history.spec.ts`).
const finder = (page: Page) => page.locator("main[data-stage]");
const live = (page: Page) => finder(page).locator("[role=status]");
const liveWrappers = (page: Page) => finder(page).locator("[aria-live]");

/** Press Enter on a control, as a keyboard user reaches the next stage. */
async function press(page: Page, name: string | RegExp) {
  const control = page.getByRole("button", { name }).first();
  await control.focus();
  await control.press("Enter");
}

/**
 * The landing contract: no live wrapper anywhere, one status line whose text is `line`, and
 * focus on `focus`. Each expectation polls — the line takes a beat after mount by design
 * (`StatusLine`), and the new screen mounts only after the old one has left.
 */
async function expectLanding(page: Page, focus: string, line: string | RegExp) {
  await expect(liveWrappers(page), "nothing in the finder is a live wrapper").toHaveCount(0);
  await expect(live(page), "exactly one status line per stage").toHaveCount(1);
  await expect(live(page)).toHaveText(line);
  await expect(page.locator(focus).first()).toBeFocused();
}

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`keyboard-only through every stage, focus and the live line land (${reducedMotion})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion });
    await installFakeSpeech(page, { holdStop: true });
    await freshFinder(page);

    // A fresh arrival is the page itself: nothing is announced and nothing is focused for the
    // person — the keyboard-focus sweep tabs in from the body, and it must still reach the
    // header first.
    await expect(live(page)).toHaveCount(0);
    await expect(liveWrappers(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);

    await toScenarios(page, "keyboard");
    await expectLanding(page, "main[data-stage=scenarios] h1", "Example searches.");
    await press(page, "Back to start");
    await expectStage(page, "welcome");
    await expectLanding(page, "main[data-stage=welcome] h1", "Back at the start.");

    await toListening(page, "keyboard");
    await expectLanding(page, "main[data-stage=listening] h1", "Listening.");
    const mic = page.getByRole("button", { name: "Microphone" });
    await expect(mic).toHaveAttribute("aria-pressed", "true");
    await expect(mic).not.toHaveAttribute("aria-busy", /.+/);

    // A language restart says so, in the language's own name; the stage does not change.
    await press(page, "हिन्दी");
    await expectStage(page, "listening");
    await expect(live(page)).toHaveText("Listening again in हिन्दी.");
    await expect(page.getByTestId("speech-language")).toContainText("Listening in हिन्दी.");

    // The toggle: pressed while listening, busy (and still enabled) while the recogniser
    // finishes, and gone with the stage once the words arrive.
    await page.evaluate((text) => (window as any).__speech.say(text, true), FINDER_SENTENCE);
    await mic.focus();
    await mic.press("Enter");
    await expect(mic).toHaveAttribute("aria-busy", "true");
    await expect(mic).toHaveAttribute("aria-pressed", "false");
    await expect(mic).toBeEnabled();
    await expect(page.locator(".mic-caption")).toHaveText("Finishing…");
    await expect(live(page)).toHaveText("Finishing.");
    await page.evaluate(() => (window as any).__speech.finish());
    await expectStage(page, "results");
    await expectLanding(page, ".clinician-row", /^\d+ matches\.$/);

    // O237: the place is set on the profile, not here; the one live line is the landing line, and
    // nothing else on the screen is live to read the list.
    await expect(live(page)).toHaveCount(1);

    await toProfile(page, "keyboard");
    await expectLanding(page, "main[data-stage=profile] h1", /^Profile: Dr .*Saxena\.$/);
    await toCompare(page, "keyboard");
    await expectLanding(page, "main[data-stage=compare] h1", /^Comparing Dr .+ and Dr .+\.$/);
    await press(page, "Back to results");
    await expectStage(page, "results");
    await expectLanding(page, ".clinician-row", /^\d+ matches\.$/);

    await toProfile(page, "keyboard");
    await toBooking(page, "keyboard");
    await expectLanding(page, "main[data-stage=booking] h1", /^Booking Dr .*Saxena\.$/);
    await press(page, "Back to profile");
    await expectStage(page, "profile");
    await expectLanding(page, "main[data-stage=profile] h1", /^Profile: Dr .*Saxena\.$/);

    // Back to the words: the text box takes focus, and the line says what the screen is for
    // (the microphone was not involved in reaching it this way).
    await press(page, "Back to results");
    await expectStage(page, "results");
    await press(page, /Change what you said/i);
    await expectStage(page, "type");
    await expectLanding(page, "#doctor-request", "Type what you are looking for.");
    await expect(page.locator("#doctor-request")).toHaveValue(/Oliver/);
  });
}

test("leaving the microphone for the keyboard says the microphone stopped, then focuses the words", async ({ page }) => {
  await installFakeSpeech(page);
  await freshFinder(page);
  await toListening(page, "keyboard");
  await toType(page, "keyboard");
  await expectLanding(page, "#doctor-request", "Listening stopped.");

  // And a microphone that stops on its own reads its own message after the fact of the stop —
  // the same sentence the screen shows, not a second wording of it.
  await press(page, "Go back");
  await expectStage(page, "welcome");
  await toListening(page, "keyboard");
  await page.evaluate((text) => (window as any).__speech.say(text, true), FINDER_SENTENCE);
  await page.evaluate(() => (window as any).__speech.finish());
  await expectStage(page, "type");
  await expectLanding(page, "#doctor-request", /^Listening stopped\. The microphone stopped on its own\./);
  await expect(page.locator(".speech-error")).toContainText(/stopped on its own/);
});

test("axe finds nothing on any of the eight stages", async ({ page }) => {
  test.setTimeout(240_000);
  // W49's choice, kept: scan what a reduced-motion user sees. The route sweep in a11y.spec.ts
  // explains why — a token read mid-fade is a contrast failure that is not there.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFakeSpeech(page);
  for (const stage of STAGES) {
    await openStage(page, stage);
    await expectNoViolations(page, `/ (${stage})`);
  }
});
