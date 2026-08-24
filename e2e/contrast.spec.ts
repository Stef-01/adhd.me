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
import { contrastFinding, contrastFindings } from "./support/contrast-load";

/**
 * AR12: the measurement itself now lives in `e2e/support/contrast-load.ts`, so the mutation probe
 * in `e2e/support/contrast-probe.spec.ts` drives THIS detector rather than a copy. The canvas
 * colour story (oklch, the six confident false findings) moved with it, comments and all; what
 * stays here is the sweep's own job — navigation, fonts, sign-in, fixtures, loops and floors.
 */
async function sweep(page: Page, route: string) {
  await page.goto(route, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return contrastFindings(page);
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
      // AR12: the per-route verdict names the route AND the rule id (AR9-AR11's change, last family).
      const finding = contrastFinding(route, out);
      if (finding) offenders.push(finding);
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
      // AR12: the per-route verdict names the route AND the rule id (AR9-AR11's change, last family).
      const finding = contrastFinding(route, out);
      if (finding) offenders.push(finding);
    }
    // AR6: same replacement as the public test above.
    measured("contrast.console", population);
    // AR7: derived from CONSOLE_ROUTES.length instead of transcribed. 20/route stays below the
    // observed rate (1733 over 30 routes, ~58/route).
    expect(population).toBeGreaterThan(derivedFloor(CONSOLE_ROUTES.length, 20));
    expect(offenders, `under the contrast floor:\n${offenders.join("\n")}`).toEqual([]);
  });
});
