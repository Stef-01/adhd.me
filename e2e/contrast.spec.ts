// O157: WCAG AA colour contrast, swept. The audience this product names first is "tired, possibly
// older, possibly low-vision", and until this unit nothing in the tree had ever measured it.

import { expect, test, type Page } from "@playwright/test";

// O169: the routes are derived from `app/` now, not listed here.
//
// This sweep covered all 15 public routes and 16 of the 30 console screens — `/console/capability`,
// `/capacity`, `/credentials`, `/education`, `/interest`, `/interop`, `/outreach`, `/pathways`,
// `/responses`, `/results`, `/roi` and `/verticals` were never measured for contrast at all. The
// audience this product names first is "tired, possibly older, possibly low-vision", so a console
// screen nobody has measured is exactly the gap O157 was written to close.
//
// O168 has the argument for deriving rather than extending: a hardcoded array covers the pages
// somebody remembered on the day and stays green beside every one added afterwards. Twelve routes
// is what "afterwards" came to here.
import { CONSOLE_ROUTES, PUBLIC_ROUTES } from "./site-routes";
import { measured } from "./support/measured";
import { derivedFloor } from "./support/floors";
import { seedFixtures } from "./support/fixtures";
import { signInAndOnboard as signInAsPracticeOwner } from "./support/session";

/**
 * Every text element whose contrast is under its WCAG AA floor, with the population it came from.
 *
 * COLOURS ARE RESOLVED THROUGH A CANVAS, and that is not incidental. Tailwind v4 emits `oklch()`,
 * and the first version of this probe parsed only `rgb()` — so it skipped every button background,
 * walked up to the page behind it, and reported WHITE TEXT ON A DARK BUTTON as 1.00:1. Six
 * confident false findings. `ctx.fillStyle` resolves any CSS colour the browser can parse.
 *
 * It measures elements holding their own text, against the nearest opaque background above them,
 * which is what a reader actually sees.
 */
async function sweep(page: Page, route: string) {
  await page.goto(route, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    const parse = (c: string) => {
      if (!c || c === "transparent") return null;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return { r: d[0]!, g: d[1]!, b: d[2]!, a: d[3]! / 255 };
    };
    const lum = (c: { r: number; g: number; b: number }) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const backgroundBehind = (el: Element) => {
      let node: Element | null = el;
      while (node) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c && c.a > 0.95) return c;
        node = node.parentElement;
      }
      return { r: 255, g: 255, b: 255 };
    };

    const out: string[] = [];
    let seen = 0;
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const ownsText = Array.from(el.childNodes).some(
        (n) => n.nodeType === 3 && (n.textContent || "").trim().length > 1,
      );
      if (!ownsText) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.95) continue;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const fg = parse(cs.color);
      if (!fg) continue;

      const ratio = (Math.max(lum(fg), lum(backgroundBehind(el))) + 0.05)
        / (Math.min(lum(fg), lum(backgroundBehind(el))) + 0.05);
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight) >= 700);
      const floor = large ? 3 : 4.5;
      seen += 1;
      if (ratio < floor) {
        out.push(`${ratio.toFixed(2)}:1 (needs ${floor}) <${el.tagName.toLowerCase()}> ${size}px "${(el.textContent || "").trim().slice(0, 30)}"`);
      }
    }
    return { out, seen };
  });
}

test.describe("WCAG AA contrast", () => {
  test("no text on a public route is under its floor", async ({ page }) => {
    // O169: the derived list is 15 public routes, and the sweep resolves every text element through
    // a canvas. That does not fit the 30s default, and the default is what this suite silently sat
    // under while its route list was short.
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const offenders: string[] = [];
    let population = 0;
    for (const route of PUBLIC_ROUTES) {
      const { out, seen } = await sweep(page, route);
      population += seen;
      for (const entry of out) offenders.push(`${route} ${entry}`);
    }
    // AR6: declares + reports the population through the shared harness.
    measured("contrast.public", population);
    // AR7: derived from PUBLIC_ROUTES.length instead of transcribed. 26/route stays below the
    // observed rate (515 over 15 routes, ~34/route).
    expect(population).toBeGreaterThan(derivedFloor(PUBLIC_ROUTES.length, 26));
    expect(offenders, `under the contrast floor:\n${offenders.join("\n")}`).toEqual([]);
  });

  /**
   * The console is swept separately because it is where this failed. `--muted` and `--faint` clear
   * 4.5 on white and on `--paper` and always did; on `--stone` — the console's card and tag
   * background — they measured 4.24 and 4.48. The tokens were only ever checked against the two
   * surfaces somebody happened to look at, which is why the public sweep was spotless while thirty
   * console elements sat under the floor.
   */
  test("no text in the console is under its floor", async ({ page, request }) => {
    test.setTimeout(240_000);
    await request.post("/api/mock/console");
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAsPracticeOwner(page);
    // AR8: O174's class of gap, still open here until now — this test reset the console store but
    // never seeded the fixtures `/console/credentials`, `/console/capability`, `/console/education`
    // and eight other screens read, so it has always measured their unlinked refusal pages, not the
    // populated ones `touch-floor`/`keyboard-focus` sweep. `seedFixtures` closes it the same way.
    await seedFixtures(request);
    const offenders: string[] = [];
    let population = 0;
    for (const route of CONSOLE_ROUTES) {
      const { out, seen } = await sweep(page, route);
      population += seen;
      for (const entry of out) offenders.push(`${route} ${entry}`);
    }
    // AR6: same replacement as the public test above.
    measured("contrast.console", population);
    // AR7: derived from CONSOLE_ROUTES.length instead of transcribed. 20/route stays below the
    // observed rate (1733 over 30 routes, ~58/route).
    expect(population).toBeGreaterThan(derivedFloor(CONSOLE_ROUTES.length, 20));
    expect(offenders, `under the contrast floor:\n${offenders.join("\n")}`).toEqual([]);
  });
});
