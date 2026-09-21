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
    await p.getByRole("button", { name: "Tap to play" }).click();
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
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
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
      if (doc.over > 1) failures.push(`${where}: ${doc.over}px of scroll`);
      if (doc.sideways > 1) failures.push(`${where}: ${doc.sideways}px sideways`);
      for (const cut of await clipped(page)) failures.push(`${where}: ${cut}`);
      for (const off of await offscreen(page)) failures.push(`${where}: ${off}`);
    }
  }
  expect(failures, "a game that does not fit is a game with its controls somewhere nobody can reach").toEqual([]);
});
