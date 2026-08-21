// O145: the 44px touch floor (O14), swept mechanically instead of remembered per unit.

import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/", "/about", "/approach", "/clinicians", "/clinicians/join", "/demo", "/examples", "/faq",
  "/finder", "/practices", "/privacy", "/terms", "/thanks", "/privacy/automated-decisions",
  "/privacy/counsel-review",
];

/**
 * The one control still under the floor, named rather than tolerated silently.
 *
 * A range input's target is its thumb, whose geometry is engine-specific and not settable by the
 * same padding trick the other twelve fixes used — raising it needs a visual judgement and a
 * capture, which is a unit of its own, not a line in this one. Named here so that fixing it FAILS
 * this test and forces the exception to be deleted: an allowlist that outlives its reason is the
 * failure mode W53's audit gate was built to avoid.
 */
const ACCEPTED: ReadonlyArray<{ route: string; name: string }> = [
  { route: "/clinicians", name: "Target practice mix" },
];

test.describe("O14's 44px touch floor", () => {
  test("no control on a public route is under the floor, except the one recorded", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const offenders: { route: string; entry: string }[] = [];
    let population = 0;

    for (const route of PUBLIC_ROUTES) {
      await page.goto(route, { waitUntil: "networkidle" });
      const found = await page.evaluate(() => {
        const out: string[] = [];
        let seen = 0;
        const selector = 'a, button, input:not([type=hidden]), select, summary, [role="button"]';
        for (const el of Array.from(document.querySelectorAll(selector))) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          // An inline link inside prose is not a touch target in the sense the floor means, and
          // WCAG 2.5.8 exempts it explicitly. Counting them would drown the real findings.
          if (el.closest("p")) continue;
          // Out of the tab order: honeypots and the like. Not a control a person reaches for.
          if ((el as HTMLElement).tabIndex < 0) continue;
          // The visible affordance is elsewhere; this exists for screen readers.
          if (el.classList.contains("sr-only")) continue;

          // THE HIT AREA, NOT THE GLYPH. The taste law allows a small visual inside a large
          // clickable label — an 18px checkbox in a 44px row is compliant. Measuring the input
          // reported 70 findings where there were 61, all of them styled checkboxes.
          let box = rect;
          const label =
            el.closest("label") ?? (el.id ? document.querySelector(`label[for="${el.id}"]`) : null);
          if (label) {
            const lr = (label as HTMLElement).getBoundingClientRect();
            if (lr.width * lr.height > box.width * box.height) box = lr;
          }
          seen += 1;
          if (box.height < 44 || box.width < 44) {
            const name = (el.getAttribute("aria-label") || el.textContent || (label && label.textContent) || "").trim().slice(0, 40);
            out.push(`<${el.tagName.toLowerCase()}> "${name}" ${Math.round(box.width)}x${Math.round(box.height)}`);
          }
        }
        return { out, seen };
      });
      population += found.seen;
      for (const entry of found.out) offenders.push({ route, entry });
    }

    // Non-vacuity: a selector that stopped matching would report a perfectly clean sweep.
    expect(population).toBeGreaterThan(150);

    const unexpected = offenders
      .filter((o) => !ACCEPTED.some((a) => a.route === o.route && o.entry.includes(`"${a.name}"`)))
      .map((o) => `${o.route} ${o.entry}`);
    expect(unexpected, `controls under the 44px floor:\n${unexpected.join("\n")}`).toEqual([]);
    // And the accepted one is still there — when it is fixed, delete it from ACCEPTED.
    expect(offenders.length, "an ACCEPTED exception no longer fires; delete it from the list").toBe(ACCEPTED.length);
  });
});
