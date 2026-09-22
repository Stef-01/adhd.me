// "Focus remains visible" is in PRODUCT.md's accessibility line, and nothing measured it.
//
// THE MEASUREMENT IS THE WHOLE DIFFICULTY, and getting it wrong reports the opposite of the truth.
// This tree styles `:focus-visible`, not `:focus` — correctly, so a mouse click does not leave a
// ring behind. Chromium does not match `:focus-visible` for a focus moved by script with no
// keyboard interaction before it, so a sweep that calls `element.focus()` and looks for an outline
// finds NOTHING STYLED ANYWHERE. Run that way this reported 16 screens of bare controls; driven by
// real Tab presses, all 684 tab stops across 84 screens have a ring.
//
// It is the same artefact that makes a heading look wrongly ringed in `scripts/screens.mjs`
// captures, in the other direction: there, programmatic focus DOES match because the navigation
// had no pointer input before it. Both are in AESTHETIC.md's method for that reason.
//
// So: press Tab, ask the browser what is focused, and require an outline or a shadow on it.

import { expect } from "@playwright/test";
import { test } from "./support/test";
// The library is plain ESM the CLI shares; the types are loose on purpose.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { contextFor, reach, routes } from "../scripts/text-budget-lib.mjs";

type Route = { path: string; name: string; state?: string };

/** Enough to cover a screen's own controls without walking the whole shell on all 84 of them. */
const STOPS_PER_SCREEN = 12;

test("every keyboard stop on a patient screen shows a focus ring", async ({ browser, baseURL }) => {
  test.setTimeout(600_000);
  const base = baseURL!;
  const options = contextFor(base) as Parameters<typeof browser.newContext>[0];
  let context = await browser.newContext(options);
  let page = await context.newPage();

  const bare: string[] = [];
  const unreached: string[] = [];
  let stops = 0;
  for (const route of routes() as Route[]) {
    // The console is staff tooling; this is the patient law.
    if (route.path.startsWith("/console")) continue;
    try {
      if (route.state === "finder-results" || route.state === "finder-profile") {
        await context.close();
        context = await browser.newContext(options);
        page = await context.newPage();
      }
      await reach(page, route, base);
    } catch (error) {
      unreached.push(`${route.name}: ${String(error).slice(0, 60)}`);
      continue;
    }
    const seen = new Set<string>();
    for (let i = 0; i < STOPS_PER_SCREEN; i++) {
      await page.keyboard.press("Tab");
      const stop = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 22);
        return {
          key: `<${el.tagName.toLowerCase()} class="${String(el.className || "").slice(0, 26)}"> "${name}"`,
          ringed: (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none",
        };
      });
      if (!stop) break;
      if (seen.has(stop.key)) continue;
      seen.add(stop.key);
      stops += 1;
      if (!stop.ringed) bare.push(`${route.name}: ${stop.key}`);
    }
  }
  await context.close();

  // "0 findings" and "measured nothing" print the same.
  expect(unreached, "a screen this could not reach is a screen whose focus nobody checked").toEqual([]);
  expect(stops, "the focus sweep found no tab stops at all — Tab is probably not reaching the page").toBeGreaterThan(300);
  expect(bare, "a keyboard stop with no visible focus indicator").toEqual([]);
});
