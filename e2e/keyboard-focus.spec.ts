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
import { installFakeSpeech } from "./support/fake-speech";
import { STAGES, openStage } from "./support/finder-stages";
import { measured } from "./support/measured";
import { derivedFloor } from "./support/floors";
import { seedFixtures } from "./support/fixtures";
import { signInAndOnboard } from "./support/session";

/**
 * Signed-in setup plus O174's corrected fixture seeding.
 *
 * AR8: the eleven-fixture list and the post/check/collect loop are now `seedFixtures` (one place
 * both are written, shared with `touch-floor.spec.ts`); it throws naming every fixture that failed
 * to seed instead of this function asserting an empty `failed` array by hand.
 */
async function signInAndSeed(page: Page, request: APIRequestContext) {
  // O174: `POST /api/mock/console` RESETS the console store, so it goes FIRST and the practice is
  // created straight after; anything that reads `practices[0]` comes later. Posting it mid-list is
  // what made three fixtures return 500 and left the touch sweep measuring unlinked refusal pages.
  await request.post("/api/mock/console");
  await signInAndOnboard(page);

  await seedFixtures(request);
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
  /**
   * U9: a surface is a name and the way to open it. A route opens by URL; a finder stage opens by
   * driving the finder there (`e2e/support/finder-stages.ts`), because a URL reaches only the
   * welcome screen and the other seven stages had never been tabbed through.
   */
  type Surface = { readonly name: string; readonly open: (page: Page) => Promise<void> };
  const byUrl = (routes: readonly string[]): Surface[] =>
    routes.map((route) => ({ name: route, open: (page) => page.goto(route, { waitUntil: "networkidle" }).then(() => undefined) }));

  async function walk(page: Page, surfaces: readonly Surface[]) {
    const ringless: string[] = [];
    const unreachable: string[] = [];
    let totalStops = 0;

    for (const { name: route, open } of surfaces) {
      await open(page);
      // Fonts change metrics and therefore layout; O146 was bitten by measuring before them.
      await page.evaluate(() => document.fonts.ready);
      // U9: a stage arrives with its heading focused (that is the unit). Resting styles must be
      // recorded at rest, and the walk below must start from the document's top as it does on a
      // route — so focus is released first. Chromium keeps the sequential-focus starting point at
      // the released element, which is what the body-wrap tolerance in the loop is for.
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

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
      let passedBody = false;
      for (let i = 0; i < 200; i += 1) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const now = `${cs.outlineStyle} ${cs.outlineWidth}|${cs.boxShadow}|${cs.textDecorationLine}|${cs.backgroundColor}|${cs.color}`;
          const rest = el.getAttribute("data-focus-rest");
          return {
            // U9: the tag it was given at rest is the identity where there is one. Two icon-only
            // buttons with no class and no text — the scenario screen's previous/next pair —
            // shared a key, so a walk that started on the first read the second as "back at the
            // first stop" and reported one stop for six controls.
            key:
              el.getAttribute("data-focus-probe") ??
              `${el.tagName}.${el.className}|${(el.textContent || "").trim().slice(0, 20)}`,
            // The indicator must be ATTRIBUTABLE TO FOCUS. An element with no recorded resting
            // style appeared after tagging (a skip link revealed on focus is the usual case), and
            // for those, appearing at all is the change.
            ring: rest === null ? true : now !== rest,
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || "").trim().slice(0, 32),
          };
        });
        // U9: focus falling to the body is the end of the ring — ONCE. A stage walk starts from
        // its heading, mid-document, so the first pass reaches the end and the ring wraps through
        // the body to the controls before the heading; the walk ends when it returns to its first
        // stop, exactly as a route walk does, and a second pass through the body (a page with no
        // controls at all) still ends it.
        if (!info) {
          if (passedBody) break;
          passedBody = true;
          continue;
        }
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
          // O226: a control inside a CLOSED details keeps a laid-out box in Chromium
          // (content-visibility, not display:none), so the zero-rect check above does not
          // catch it — but the HTML spec makes it unfocusable until the disclosure opens,
          // so the tab walk can never reach it and must not be asked to. The summary itself
          // stays counted: it is the visible, focusable way in.
          const closedDetails = el.closest("details:not([open])");
          if (closedDetails && !el.closest("summary")) continue;
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
    const { ringless, unreachable, totalStops } = await walk(page, byUrl(PUBLIC_ROUTES));

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
    const { ringless, unreachable, totalStops } = await walk(page, byUrl(CONSOLE_ROUTES));

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

  test("every finder stage is reachable by keyboard and shows where it is", async ({ page }) => {
    // U9: THE SEVEN SCREENS A URL NEVER REACHES. `/finder` is in PUBLIC_ROUTES, so the welcome
    // screen has been walked since O147 — and the microphone, the results, a profile, the compare
    // screen and the booking screen never had, because each of them exists only after a person has
    // done something. The driver does what the person does; the walk is the same walk.
    test.setTimeout(240_000);
    await installFakeSpeech(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const { ringless, unreachable, totalStops } = await walk(
      page,
      STAGES.map((stage) => ({ name: `/finder (${stage})`, open: (p: Page) => openStage(p, stage) })),
    );

    console.log(`KEYBOARD_FINDER ${STAGES.length} stages, ${totalStops} stops`);
    measured("keyboard-focus.finder-stops", totalStops);
    // Derived from STAGES.length; 3/stage stays below the observed rate (see the KEYBOARD_FINDER
    // line — the listening screen alone has five controls).
    expect(totalStops).toBeGreaterThan(derivedFloor(STAGES.length, 3));
    expect(ringless, `focused with no visible indicator:\n${ringless.join("\n")}`).toEqual([]);
    expect(unreachable, `controls no keyboard can reach:\n${unreachable.join("\n")}`).toEqual([]);
  });
});
