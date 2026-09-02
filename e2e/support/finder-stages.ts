// U9: the finder's stages, reachable by name from a fresh visit — the one driver the a11y spec and
// the two sweeps (keyboard-focus, touch-floor) share, so "how do you get to the compare screen" is
// written once and a control that is renamed breaks one file, not three.
//
// Every step is a real interaction on a real control, the way a person reaches the screen: the
// microphone toggle, the row, the "Compare with" control inside its disclosure. The fake recogniser
// (`installFakeSpeech`) stands in for the browser's — nothing here transcribes speech — and the
// sentence is the one finder-history.spec.ts speaks, so a real GP's row (with a booking control,
// O217) is on the results and the headline is derived from the words.
//
// `via` chooses how a control is activated: `pointer` is a click; `keyboard` focuses the control and
// presses Enter, which is what the a11y spec wants — a transition a keyboard user makes, so the
// focus that follows it is the focus they get.

import { expect, type Locator, type Page } from "@playwright/test";
import { STAGES, type Stage } from "../../src/finder/state";

export { STAGES, type Stage };

export const FINDER_SENTENCE = "my son Oliver cannot sit still in class and the school keeps calling";

export type Via = "pointer" | "keyboard";

export const stageOf = (page: Page) => page.locator("main[data-stage]");

export async function expectStage(page: Page, stage: Stage) {
  await expect(stageOf(page)).toHaveAttribute("data-stage", stage);
}

async function activate(control: Locator, via: Via) {
  if (via === "pointer") {
    await control.click();
    return;
  }
  await control.focus();
  await control.press("Enter");
}

/**
 * A fresh visit: `about:blank` first, because Chromium treats a `goto` to the URL already open as
 * a reload, and U8 resumes the stage on a reload (finder-history.spec.ts proves it). The fake
 * recogniser must be installed by the caller BEFORE the first goto of the test — it is an init
 * script — so this takes the page as it is.
 */
export async function freshFinder(page: Page) {
  await page.goto("about:blank");
  await page.goto("/finder");
  await expectStage(page, "welcome");
}

/** welcome → scenarios. */
export async function toScenarios(page: Page, via: Via = "pointer") {
  await activate(page.locator(".scenario-toggle"), via);
  await expectStage(page, "scenarios");
}

/** welcome → listening. Needs the fake recogniser. */
export async function toListening(page: Page, via: Via = "pointer") {
  await activate(page.getByRole("button", { name: /Talk instead of typing/i }), via);
  await expectStage(page, "listening");
}

/** listening → type, by the person's own choice ("Type instead"). */
export async function toType(page: Page, via: Via = "pointer") {
  await activate(page.getByRole("button", { name: "Type instead" }), via);
  await expectStage(page, "type");
}

/** listening → results: speak the sentence, tap the microphone to finish. */
export async function toResults(page: Page, via: Via = "pointer") {
  await page.evaluate((text) => (window as any).__speech.say(text, true), FINDER_SENTENCE);
  await activate(page.getByRole("button", { name: "Microphone" }), via);
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 5000 });
  await expectStage(page, "results");
}

/** results → profile, on a real GP's row (an example profile has no booking control, O217). */
export async function toProfile(page: Page, via: Via = "pointer") {
  const showAll = page.getByRole("button", { name: /Show the other/i });
  if (await showAll.isVisible()) await activate(showAll, via);
  await activate(page.locator(".clinician-row", { hasText: "Saxena" }).first(), via);
  await expectStage(page, "profile");
}

/** profile → compare: the control lives inside the "Why matched" disclosure. */
export async function toCompare(page: Page, via: Via = "pointer") {
  const disclosure = page.locator(".profile-disclosure", { hasText: "Why matched" });
  if (!(await disclosure.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await activate(disclosure.locator("summary"), via);
  }
  await activate(page.locator(".profile-compare"), via);
  await expectStage(page, "compare");
}

/** profile → booking. */
export async function toBooking(page: Page, via: Via = "pointer") {
  await activate(page.getByRole("button", { name: /available times|how to book/i }).first(), via);
  await expectStage(page, "booking");
}

/**
 * Reach a stage from a fresh visit. The caller installs the fake recogniser once per test; every
 * stage past `scenarios` is reached through the microphone.
 */
/**
 * A stage, open and still: the old screen has finished leaving and the new one has finished
 * arriving. The `data-stage` attribute changes the moment the transition starts, and a sweep that
 * measured at that moment saw the OLD screen's controls (still exiting, and shrinking) with the new
 * screen's at zero size — so the first finder floor sweep reported every control on the stage
 * BEFORE the one it named. Infinite loops (the microphone's halo) are not waited on.
 */
export async function settled(page: Page) {
  await expect(stageOf(page).locator(".screen"), "one screen in the finder").toHaveCount(1);
  // The entrance is JS-driven (`stageVariants`: opacity, y and a blur), so `getAnimations()` does
  // not see it; the screen has arrived when its computed style is back at rest.
  await page.waitForFunction(
    () => {
      const screen = document.querySelector("main[data-stage] .screen");
      if (!screen) return false;
      const cs = getComputedStyle(screen);
      return cs.opacity === "1" && cs.transform === "none" && (cs.filter === "none" || cs.filter === "blur(0px)");
    },
    undefined,
    { timeout: 15_000 },
  );
}

/** Reach `stage` from a fresh visit and wait for it to be still (`settled`). */
export async function openStage(page: Page, stage: Stage, via: Via = "pointer") {
  await freshFinder(page);
  if (stage === "welcome") return settled(page);
  if (stage === "scenarios") await toScenarios(page, via);
  else {
    await toListening(page, via);
    if (stage === "type") await toType(page, via);
    else if (stage !== "listening") {
      await toResults(page, via);
      if (stage !== "results") {
        await toProfile(page, via);
        if (stage === "compare") await toCompare(page, via);
        else if (stage === "booking") await toBooking(page, via);
      }
    }
  }
  await settled(page);
}
