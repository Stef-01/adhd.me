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
  { name: "Leo, playing", path: "/lives/play/leo-mosquito", act: async (p) => { await p.getByRole("button", { name: "Play Leo’s moment" }).click(); } },
  { name: "Leo, the routine", path: "/lives/play/leo-mosquito", act: async (p) => {
    await p.getByRole("button", { name: "Play Leo’s moment" }).click();
    await p.getByRole("button", { name: "Skip this round" }).click();
    await p.getByRole("button", { name: "Close the window", exact: true }).click();
  } },
  { name: "The Chaos Run, title", path: "/lives/play" },
  { name: "The Chaos Run, first round", path: "/lives/play", act: async (p) => { await p.getByRole("button", { name: "Play", exact: true }).click(); await p.locator(".lives-scene").waitFor(); } },
  { name: "A run inside a module, title", path: "/approach?module=starting" },
  { name: "A run inside a module, the memory round", path: "/approach?module=working-memory", act: async (p) => {
    await p.getByRole("button", { name: "Tap to play" }).click();
    await p.locator(".play-card.is-round").waitFor();
  } },
];

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
    }
  }
  expect(failures, "a game that does not fit is a game with its controls somewhere nobody can reach").toEqual([]);
});
