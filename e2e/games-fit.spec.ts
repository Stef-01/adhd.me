// A game fits the screen, at every size, and never scrolls (founder, 2026-09-11).
//
// WHY A GATE AND NOT A LOOK. Measured before the fix, 25 of 48 game screens ran past the viewport,
// and the two ways they did it are different failures with the same cause:
//
//   * the DOCUMENT scrolled — `/approach?module=…` was 48px too tall at every width, the app
//     shell's bottom gutter under a tab bar that a run hides anyway;
//   * nothing scrolled and the CONTENT WAS CLIPPED — the memory round wanted 777px of a 568px
//     screen and `.play-card` hides its overflow, so the 209px that did not fit were the buttons.
//
// The second is the one a person actually meets, and it is invisible to a check that only asks
// whether the page scrolls. So this asserts both: the document is exactly the viewport, and no
// element with its overflow hidden is taller than its own box. A game whose round grows is named
// here with its size and the element, rather than shipping with its controls off-screen.
//
// A reading module is not a game and is not here: `/lives/learn?module=…` is text, a checklist and
// a timer, and a long read scrolls.
//
// ONE THING THIS DOES NOT EXPLAIN, LEFT WRITTEN DOWN RATHER THAN HIDDEN. The spec has only ever
// run under the default `PW_BROWSERS=chromium`. Run under `PW_BROWSERS=webkit` it reports exactly
// one failure — "Leo, ready at 390x844: 77px of scroll" — and that number does not reproduce
// anywhere outside this sweep:
//
//   * a fresh WebKit context at 390x844 on `/lives/play/leo-mosquito` measures over = 0;
//   * so does one that loads it at 320x568 first and is then resized to 390x844;
//   * so does one that additionally walks the surface immediately before it (the memory round at
//     320) and then resizes;
//   * chromium measures 0 in every one of those and in the sweep itself.
//
// So it needs the whole 48-visit sequence in one long-lived WebKit page, and what a person loading
// that URL on Safari actually gets is a screen that fits. It is NOT a confirmed product defect and
// it is NOT tolerated away: the threshold below stays where it is, the gate stays chromium as it
// has always been, and this paragraph is here so the next person starts from the evidence rather
// than from zero. Two things this hunt DID find are fixed below — the sweep was measuring surfaces
// in whatever state the previous fifteen left them in, and one surface waited out the entire test
// budget for a button that had already done its job.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";

/** Short, tall and wide. 568 is the shortest phone still in use and the one that found the clipping. */
const SIZES = [
  { w: 320, h: 568 },
  { w: 390, h: 844 },
  { w: 1280, h: 800 },
] as const;

const SURFACES: ReadonlyArray<{ name: string; path: string; act?: (page: Page) => Promise<void> }> = [
  { name: "Leo, ready", path: "/lives/play/leo-mosquito" },
  { name: "Leo, playing", path: "/lives/play/leo-mosquito", act: async (p) => {  } },
  { name: "Leo, the routine", path: "/lives/play/leo-mosquito", act: async (p) => {

    await p.locator('.bedroom-game[data-ready="true"]').waitFor();
    for (let roundTap = 0; roundTap < 12 && await p.locator('.bedroom-game[data-mode="challenge"]').count(); roundTap++) await p.locator(".bedroom-insect:enabled").first().click();
    await p.getByRole("button", { name: "Close the window", exact: true }).click();
    await p.getByRole("button", { name: "Put phone away", exact: true }).click();
    for (let i = 0; i < 12 && await p.locator(".bedroom-insect:enabled").count(); i++) await p.locator(".bedroom-insect:enabled").first().click();
    await p.getByRole("button", { name: "Read a little", exact: true }).click();
  } },
  { name: "The Chaos Run, title", path: "/lives/play" },
  { name: "The Chaos Run, first round", path: "/lives/play", act: async (p) => {  await p.locator(".lives-scene").waitFor(); } },
  // The lab's one-game run (added on main while this gate was being written). A game surface the
  // gate did not know about is the case this file's own comment warns of: a game that fits only
  // because somebody tuned its numbers stops fitting on the next one.
  { name: "The lab, one game", path: "/lives/lab/play?game=leo_mosquito" },
  { name: "The lab, captioned targets", path: "/lives/lab/play?game=arjun_lock_in", act: async (p) => { await p.locator(".lives-run[data-phase=active]").waitFor(); } },
  { name: "The lab, one game playing", path: "/lives/lab/play?game=leo_mosquito", act: async (p) => {  await p.locator(".lives-scene").waitFor(); } },
  // A trace game, because its choices are the ONE row in the set positioned absolutely over the
  // stage rather than laid out under it, and that is the row that was cut. The Chaos Run picks
  // its games by seed, so reaching this through /lives/play is a coin toss; the lab names it.
  { name: "The lab, a trace game", path: "/lives/lab/play?game=maya_crossing", act: async (p) => { await p.locator(".lives-scene").waitFor(); } },
  { name: "A run inside a module, title", path: "/approach?module=starting" },
  { name: "A run inside a module, the memory round", path: "/approach?module=working-memory", act: async (p) => {
    /*
     * "Tap to play" only exists while the run has not started, and this sweep visits every surface
     * ONCE PER VIEWPORT against one page whose localStorage carries the module's progress — so on
     * the second and third passes the run is already open and that button is gone. Clicking it
     * unconditionally stalled the entire test budget waiting for a control that had already done
     * its job: 240s, then 600s, on WebKit. Chromium passed the whole time, which is why this sat
     * here unnoticed — the spec only ever ran under the default `PW_BROWSERS=chromium`.
     *
     * What the surface is FOR is the round card, so that is what it waits for; starting the run is
     * only how you get there when it has not started yet.
     */
    const start = p.getByRole("button", { name: "Tap to play" });
    if (await start.waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false)) {
      await start.click();
    }
    await p.locator(".play-card.is-round").waitFor();
  } },
];

/**
 * Every control the viewport slices. A stage that hides its overflow cuts a control without the
 * DOCUMENT scrolling at all, so the two scroll numbers above cannot see it: the Chaos Run's trace
 * games shipped a choice with 12px off its right edge, because `.lives-choices` carries
 * `width: 100%` and on an absolutely positioned box that beats `left`/`right`. A control inside a
 * real horizontal scroller is not cut — a person can reach it.
 */
async function offscreen(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("button, a[href], [role=button]")) {
      if (el.closest('[aria-hidden="true"], [inert], details:not([open])')) continue;
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0) continue;
      let scrollable = false;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if ((ox === "auto" || ox === "scroll") && a.scrollWidth > a.clientWidth + 1) { scrollable = true; break; }
      }
      if (scrollable) continue;
      if (b.right > vw + 0.5 || b.left < -0.5) {
        const cut = b.left < -0.5 ? Math.round(-b.left) : Math.round(b.right - vw);
        out.push(`"${(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 24)}" cut ${cut}px off the ${b.left < -0.5 ? "left" : "right"}`);
      }
    }
    return [...new Set(out)].slice(0, 4);
  });
}

/** Every box that hides its overflow and holds more than it shows. The sr-only clip is not one. */
async function clipped(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => {
        if (el.closest(".sr-only, .skip-link") || el.classList.contains("sr-only")) return false;
        const cs = getComputedStyle(el);
        if (cs.overflowY === "visible" || cs.overflowY === "auto" || cs.overflowY === "scroll") return false;
        return el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1;
      })
      .map((el) => `<${el.tagName.toLowerCase()} class="${el.className}"> holds ${el.scrollHeight} in ${el.clientHeight}`)
      .slice(0, 4));
}

test("every game fits its screen, and nothing on it is scrolled or cut", async ({ page }) => {
  /*
   * This is a sweep, not a test of one thing: 3 viewports x 16 surfaces is 48 page visits, each
   * with four measurements on it. Chromium walks it in ~28s; WebKit is several times slower per
   * navigation, so the budget is generous rather than tight. It is NOT generous to absorb a hang —
   * the WebKit failure that raised it from 240s turned out to be a surface waiting forever for a
   * button that no longer existed, and the fix for that is at the surface (see "the memory round").
   */
  test.setTimeout(480_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  /*
   * EVERY SURFACE IS MEASURED IN THE STATE IT NAMES. The sweep walks 16 surfaces through ONE page,
   * and the games keep their progress in localStorage — so by the second viewport pass "Leo, ready"
   * was not ready and "the memory round" had already started, and the gate was measuring whatever
   * the previous fifteen surfaces left behind while reporting it under the name of a state nobody
   * was in. It cost two WebKit failures that read as product defects and were not: a 77px overflow
   * on Leo that a fresh context at the same size does not have, and a click that waited out the
   * whole test budget for a button already spent.
   *
   * Cleared here rather than between surfaces, because this runs at every document start and a
   * `page.evaluate` before the first navigation is on about:blank, where localStorage throws. The
   * two tutorial flags are SET for the same reason the rest is cleared: the sweep wants the game,
   * not the tutorial in front of it.
   */
  await page.addInitScript(() => {
    for (const key of ["adhdme.lives.v1", "adhdme.learn.cursor.v1", "adhdme.model.v1", "adhdme.match.v1"]) {
      localStorage.removeItem(key);
    }
    localStorage.setItem("adhdme.play.tutored", "1");
    localStorage.setItem("adhdme.lives.tutored", "1");
  });
  const failures: string[] = [];
  for (const size of SIZES) {
    await page.setViewportSize({ width: size.w, height: size.h });
    for (const surface of SURFACES) {
      await page.goto(surface.path);
      if (surface.act) await surface.act(page);
      const doc = await page.evaluate(() => ({
        over: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      const where = `${surface.name} at ${size.w}x${size.h}`;
      /*
       * Two pixels, not one. The games size themselves in `svh`, and WebKit resolves that to a
       * fractional body height — measured 843.98 against an 844 viewport — which rounds into a 2px
       * `scrollHeight` difference once the viewport has been changed mid-sweep. It reported exactly
       * "2px of scroll" on three surfaces at 390 while a fresh WebKit context on the same screen
       * reported 0, and chromium reports 0 either way. What this assertion is for is stated in its
       * own message — a control somewhere nobody can reach — and two pixels is not that. Anything
       * a person could actually scroll past still fails.
       */
      if (doc.over > 2) failures.push(`${where}: ${doc.over}px of scroll`);
      if (doc.sideways > 2) failures.push(`${where}: ${doc.sideways}px sideways`);
      for (const cut of await clipped(page)) failures.push(`${where}: ${cut}`);
      for (const off of await offscreen(page)) failures.push(`${where}: ${off}`);

      /*
       * AND THERE IS SOMETHING TO DO. The whole suite runs under reduced motion, which is the
       * state where a game has to end on a choice rather than on a clock — games-to-leo-standard
       * asks for "`Skip this round` under reduced motion" for exactly that reason. A drawn scene
       * whose pieces render but whose controls do not is a screen a reduced-motion player is stuck
       * on, and it passes every other check in this file: it fits, nothing is clipped, nothing is
       * off-screen, and nothing can be done.
       *
       * Measured across all 22 game surfaces when this went in, the floor was 2 and the median 4,
       * so a floor of one is not the assertion passing by luck. The page's own chrome — back,
       * pause, the tab bar, the skip link — is excluded, because none of it is a way to play.
       *
       * POLLED, NOT READ ONCE. An engine mounts its pieces after the navigation resolves, and the
       * surfaces with no `act` step measure the instant the page arrives: the first version of
       * this read zero on six of them and every one had its pieces a second later. A gate that
       * races the thing it measures is worse than no gate, because it fails for a reason that is
       * not the reason it names.
       */
      const countActionable = () => page.evaluate(() => {
        const chrome = ".leo-toolbar, .tm-header, .play-top, .lives-top, .app-tabs, .platform-header, nav, header, .skip-link";
        return [...document.querySelectorAll("button, [role=button], a[href]")]
          .filter((e) => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true }))
          .filter((e) => !e.closest(chrome))
          .filter((e) => !(e instanceof HTMLButtonElement && e.disabled))
          .length;
      });
      let actionable = await countActionable();
      for (let waited = 0; actionable < 1 && waited < 4_000; waited += 250) {
        await page.waitForTimeout(250);
        actionable = await countActionable();
      }
      if (actionable < 1) failures.push(`${where}: nothing on it a reduced-motion player can do`);
    }
  }
  expect(failures, "a game that does not fit is a game with its controls somewhere nobody can reach").toEqual([]);
});
