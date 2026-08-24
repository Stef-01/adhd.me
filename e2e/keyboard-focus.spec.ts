// O147: the taste law's two keyboard rules, made executable.
// taste-rule: interaction.hover-focus

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// O175: the routes are derived from `app/`, and the console half exists at all.
//
// Until this unit the sweep covered the 15 public routes and ZERO console routes. That is not a
// partial list like the other five sweeps O168 measured — it is a missing half. Every screen
// practice staff work on had never been checked for keyboard reachability or a visible focus
// indicator, and the console is where the FORMS are: O174 found a withdraw-reason input and a Save
// button under O14's touch floor on `/console/credentials` and `/console/case-mix`, both of them
// controls no keyboard test had ever tabbed through.
import { CONSOLE_ROUTES, PUBLIC_ROUTES } from "./site-routes";
import { measured } from "./support/measured";
import { derivedFloor } from "./support/floors";

/** Signed-in setup plus O174's corrected fixture seeding. */
async function signInAndSeed(page: Page, request: APIRequestContext) {
  // O174: `POST /api/mock/console` RESETS the console store, so it goes FIRST and the practice is
  // created straight after; anything that reads `practices[0]` comes later. Posting it mid-list is
  // what made three fixtures return 500 and left the touch sweep measuring unlinked refusal pages.
  await request.post("/api/mock/console");
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("owner@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);

  const LINKED = new Set(["credentials", "education"]);
  const failed: string[] = [];
  for (const fixture of [
    "referrals", "registers", "usefulness", "ops", "credentials",
    "capability", "case-mix", "education", "pathways", "verticals", "state",
  ]) {
    const query = LINKED.has(fixture) ? "?linkEmail=owner@demo.practice.example" : "";
    const response = await request.post(`/api/mock/${fixture}${query}`);
    if (!response.ok()) failed.push(`${fixture} -> ${response.status()}`);
  }
  // O174's rule, inherited rather than re-learned: a fixture that does not seed leaves this sweep
  // tabbing through an empty page while reporting it covered.
  expect(failed, `a fixture did not seed, so this walk is measuring a page it did not populate: ${failed.join(", ")}`).toEqual([]);
}

test.describe("keyboard focus", () => {
  /**
   * WHY THIS IS DRIVEN WITH REAL TABS.
   *
   * `:focus-visible` does not match a programmatic `element.focus()` — it is the browser's own
   * judgement about whether the focus came from a keyboard. A probe that called `.focus()` would
   * measure the `:focus` styles instead and report a ring the keyboard user never sees, which is
   * the exact failure this test exists to catch. So it presses Tab.
   *
   * Two properties per route, and the second matters as much as the first: every stop shows a
   * visible indicator, AND the number of stops is at least the number of visible, enabled,
   * in-tab-order controls. A page can honour the ring rule perfectly and still strand a control
   * nobody can tab to.
   */
  /**
   * O175: the walk, extracted so the console gets the SAME assertions rather than a lighter
   * variant. Sharing the body is the point — a console-only copy would drift, and the first thing
   * to drift out of a copy is the resting-style comparison that keeps this test able to fail.
   */
  async function walk(page: Page, routes: readonly string[]) {
    const ringless: string[] = [];
    const unreachable: string[] = [];
    let totalStops = 0;

    for (const route of routes) {
      await page.goto(route, { waitUntil: "networkidle" });
      // Fonts change metrics and therefore layout; O146 was bitten by measuring before them.
      await page.evaluate(() => document.fonts.ready);

      // O153: TAG AND RECORD EVERY CONTROL'S RESTING STYLE FIRST.
      //
      // The predicate this replaces read the focused element's computed style and accepted any
      // outline, box-shadow or underline. Measured, 14 controls across `/practices`, `/privacy`,
      // `/terms` and `/privacy/counsel-review` satisfied it WITHOUT BEING FOCUSED AT ALL — they
      // are permanently underlined links. For those the test could not fail, which is the one
      // thing an accessibility gate must never be. The property that actually matters is not
      // "has an indicator" but "looks different once you tab to it", so the resting style is
      // recorded up front and the focused style is compared against it.
      await page.evaluate(() => {
        const selector = 'a[href], button, input:not([type=hidden]), select, summary, textarea, [role="button"]';
        document.querySelectorAll(selector).forEach((el, i) => {
          const cs = getComputedStyle(el);
          el.setAttribute("data-focus-probe", String(i));
          el.setAttribute(
            "data-focus-rest",
            `${cs.outlineStyle} ${cs.outlineWidth}|${cs.boxShadow}|${cs.textDecorationLine}|${cs.backgroundColor}|${cs.color}`,
          );
        });
      });

      let stops = 0;
      let first = "";
      for (let i = 0; i < 200; i += 1) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const now = `${cs.outlineStyle} ${cs.outlineWidth}|${cs.boxShadow}|${cs.textDecorationLine}|${cs.backgroundColor}|${cs.color}`;
          const rest = el.getAttribute("data-focus-rest");
          return {
            key: `${el.tagName}.${el.className}|${(el.textContent || "").trim().slice(0, 20)}`,
            // The indicator must be ATTRIBUTABLE TO FOCUS. An element with no recorded resting
            // style appeared after tagging (a skip link revealed on focus is the usual case), and
            // for those, appearing at all is the change.
            ring: rest === null ? true : now !== rest,
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || "").trim().slice(0, 32),
          };
        });
        if (!info) break;
        // Identical controls legitimately share a key — forty checkboxes on the join form — so a
        // repeat is not the end of the tab ring. Returning to the FIRST stop is. Breaking on a
        // repeat is what made an early version of this report 4 stops where the truth was 43.
        if (stops > 0 && info.key === first) break;
        if (stops === 0) first = info.key;
        stops += 1;
        if (!info.ring) ringless.push(`${route} <${info.tag}> "${info.text}"`);
      }

      const controls = await page.evaluate(() => {
        let n = 0;
        const selector = 'a[href], button, input:not([type=hidden]), select, summary, textarea, [role="button"]';
        for (const el of Array.from(document.querySelectorAll(selector))) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          // O153: see touch-floor.spec.ts — an absent tabindex on a role=button is the defect,
          // not an exemption from being counted.
          const tabAttr = el.getAttribute("tabindex");
          if (tabAttr !== null && Number(tabAttr) < 0) continue;
          if ((el as HTMLInputElement).disabled) continue;
          n += 1;
        }
        return n;
      });

      totalStops += stops;
      // More stops than controls is fine and expected: skip links and `[tabindex="0"]` wrappers
      // are focusable and outside the selector. Fewer means something visible cannot be reached.
      if (stops < controls) unreachable.push(`${route}: ${stops} tab stops for ${controls} controls`);
    }

    return { ringless, unreachable, totalStops };
  }

  test("every public control is reachable by keyboard and shows where it is", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(PUBLIC_ROUTES.length, "the derived public list collapsed").toBeGreaterThan(12);
    const { ringless, unreachable, totalStops } = await walk(page, PUBLIC_ROUTES);

    // Non-vacuity: a walk that stopped tabbing would report a flawless sweep of nothing.
    console.log(`KEYBOARD_PUBLIC ${PUBLIC_ROUTES.length} routes, ${totalStops} stops`);
    // AR6: the runtime-measured population declared through the shared harness.
    measured("keyboard-focus.public-stops", totalStops);
    // AR7: derived from PUBLIC_ROUTES.length instead of transcribed. 6/route stays below the
    // observed rate (145 over 15 routes, ~9.7/route).
    expect(totalStops).toBeGreaterThan(derivedFloor(PUBLIC_ROUTES.length, 6));
    expect(ringless, `focused with no visible indicator:\n${ringless.join("\n")}`).toEqual([]);
    expect(unreachable, `controls no keyboard can reach:\n${unreachable.join("\n")}`).toEqual([]);
  });

  test("every console control is reachable by keyboard and shows where it is", async ({ page, request }) => {
    // O175: THE HALF THAT DID NOT EXIST. Its own test rather than more routes in the one above, for
    // two reasons: a failure names which half without reading the route out of a message, and the
    // console needs a signed-in session with seeded fixtures that the public walk must not carry.
    test.setTimeout(600_000);
    await signInAndSeed(page, request);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(CONSOLE_ROUTES.length, "the derived console list collapsed").toBeGreaterThan(26);
    const { ringless, unreachable, totalStops } = await walk(page, CONSOLE_ROUTES);

    // The floor is MEASURED for this walk rather than borrowed from the public one — O170, O171 and
    // O174 each found a non-vacuity floor that had gone stale when the thing it bounded grew, and
    // inheriting `> 100` here would have been the same mistake made deliberately.
    console.log(`KEYBOARD_CONSOLE ${CONSOLE_ROUTES.length} routes, ${totalStops} stops`);
    // AR6: same replacement as the public walk above.
    measured("keyboard-focus.console-stops", totalStops);
    // AR7: derived from CONSOLE_ROUTES.length instead of transcribed. 5/route stays below the
    // observed rate (247 over 30 routes, ~8.2/route).
    expect(
      totalStops,
      "the console walk stopped tabbing — a clean result here would mean nothing",
    ).toBeGreaterThan(derivedFloor(CONSOLE_ROUTES.length, 5));
    expect(ringless, `focused with no visible indicator:\n${ringless.join("\n")}`).toEqual([]);
    expect(unreachable, `controls no keyboard can reach:\n${unreachable.join("\n")}`).toEqual([]);
  });
});
