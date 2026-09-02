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
