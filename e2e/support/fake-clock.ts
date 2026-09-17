// U10: a fixed clock the finder's screens can still change under.
//
// `page.clock.install()` fakes Date, performance.now and the timer functions, and `fastForward`
// jumps them — but not `document.timeline`, which the browser owns. `motion` starts a WAAPI
// animation by handing it a `startTime` read from the faked `performance.now`, so an animation
// begun after a 60 s jump is scheduled 60 real seconds into the document's future and holds its
// first frame until then: the exiting screen never leaves, the next never mounts, and a test that
// jumped past the listening timeout waits on a transition that is, to the browser, not due yet.
//
// Without `Element.prototype.animate`, motion drives every animation on its own frameloop, whose
// timestamps are the faked clock's — the same clock the jump moved — so the transition plays at
// once. That is the only difference this helper makes: nothing about what is animated changes,
// only which timeline plays it. Install BEFORE `goto`, as with any init script.

import { type Page } from "@playwright/test";

export async function installFakeClock(page: Page) {
  await page.clock.install();
  await page.addInitScript(() => {
    (Element.prototype as { animate?: unknown }).animate = undefined;
  });
}

/**
 * Pauses the fake clock at the page's present. `pauseAt` refuses a time the fake clock has already
 * passed, and the clock keeps flowing between the page reading `Date.now()` and the pause landing,
 * so a fixed margin is a race a loaded runner loses ("Cannot fast-forward to the past": two of
 * eighteen local runs at three workers, and the same shape on CI). The margin starts where the
 * spec wants it and widens only when the machine needs it, so the pause lands as close to now as
 * the runner allows instead of as far ahead as the slowest runner would need.
 */
export async function pauseNow(page: Page, margin = 100): Promise<void> {
  let last: unknown;
  for (let step = margin; step <= margin * 64; step *= 2) {
    try {
      await page.clock.pauseAt(await page.evaluate(() => Date.now()) + step);
      return;
    } catch (error) {
      if (!/past/i.test(String(error))) throw error;
      last = error;
    }
  }
  throw last;
}
