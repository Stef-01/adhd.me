// O147: the taste law's two keyboard rules, made executable.

import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/", "/about", "/approach", "/clinicians", "/clinicians/join", "/demo", "/examples", "/faq",
  "/finder", "/practices", "/privacy", "/terms", "/thanks", "/privacy/automated-decisions",
  "/privacy/counsel-review",
];

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
  test("every control is reachable by keyboard and shows where it is", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const ringless: string[] = [];
    const unreachable: string[] = [];
    let totalStops = 0;

    for (const route of PUBLIC_ROUTES) {
      await page.goto(route, { waitUntil: "networkidle" });
      // Fonts change metrics and therefore layout; O146 was bitten by measuring before them.
      await page.evaluate(() => document.fonts.ready);

      let stops = 0;
      let first = "";
      for (let i = 0; i < 200; i += 1) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          return {
            key: `${el.tagName}.${el.className}|${(el.textContent || "").trim().slice(0, 20)}`,
            // Any of the three is a legitimate indicator; the law asks for a visible one, not a
            // particular technique.
            ring:
              (parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== "none") ||
              cs.boxShadow !== "none" ||
              cs.textDecorationLine.includes("underline"),
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
          if ((el as HTMLElement).tabIndex < 0) continue;
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

    // Non-vacuity: a walk that stopped tabbing would report a flawless sweep of nothing.
    expect(totalStops).toBeGreaterThan(100);
    expect(ringless, `focused with no visible indicator:\n${ringless.join("\n")}`).toEqual([]);
    expect(unreachable, `controls no keyboard can reach:\n${unreachable.join("\n")}`).toEqual([]);
  });
});
