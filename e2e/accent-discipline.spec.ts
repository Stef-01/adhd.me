// O176: the accent carries at most one meaning per screen, across every public surface.
//
// `adhdme-taste` reserves the accent for LIVE TOKENS — "the value that changes, the word that
// matters" — and says outright: "If everything is accented, nothing is." O166 enforced that on the
// clinician profile, where a canvas sweep found the accent painting SIX elements in FOUR unrelated
// meanings, and that was the whole reason the screen read as noise. The rule was then enforced on
// exactly one screen and nowhere else. This is the site-wide half.
//
// WHY A CANVAS AND NOT A GREP. Tailwind v4 and this stylesheet both emit `oklch()`, and the accent
// reaches elements through custom properties a component can inherit, alias or `color-mix()`.
// Grepping `var(--accent)` finds the declarations somebody wrote; it does not find the colour
// somebody's element actually paints. W229 drew this line for a drift verdict and O166 reused it.
//
// A CAP, NOT AN ALLOW-LIST, AND THE DISTINCTION IS THE DESIGN. O166 could name its one permitted
// site because it audited one screen. Listing every accent site that exists today across fifteen
// surfaces would be a transcription of the current state wearing a rule's clothes — the detector
// tuned until it agrees with the code. A cap cannot be satisfied that way: adding a fourth accented
// thing fails whatever it is called.
//
// WHERE THE PROXY DISAGREES WITH A READER, STATED RATHER THAN HIDDEN. "Meaning" is counted by
// class, and class is a rough proxy. `/finder` paints `dual-input-field` and `dual-input-action` —
// two classes, but one meaning to anybody looking at it ("the thing you are doing right now").
// `/clinicians/join` paints `mix-percent` and `mix-condition`, which are two halves of the mix
// hero — the taste law's own example of a live token. So the cap is 2 rather than 1: it permits one
// meaning expressed in a pair of classes, and refuses a genuine third.

// taste-rule: type.accent-live-tokens

import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./site-routes";

/**
 * The observed distribution when this was written, after O176's three demotions.
 *
 * Seven surfaces paint no accent at all, five paint one, and the three richest paint two. The cap is
 * set FROM this rather than before it — W48's rule, and the one I broke twice earlier in this
 * session by writing a figure and measuring afterwards.
 *
 * AND IT WAS SET TWICE, because the first distribution came from a probe that could not see
 * pseudo-elements: `/clinicians` measured 1 when it paints 2 (the step rail is an `::after`), and
 * 3 rather than 4 before this unit's demotions. The cap happens to be unchanged at 2; the figures
 * behind it are not, and a cap justified by wrong figures is a number somebody made up.
 */
const MEANINGS_CAP = 2;

test("no public surface lets the accent carry more than one meaning", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(PUBLIC_ROUTES.length, "the derived route list collapsed").toBeGreaterThan(12);

  const report: string[] = [];
  const over: string[] = [];
  let totalSites = 0;

  for (const route of PUBLIC_ROUTES) {
    await page.goto(route, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const sites = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const rgb = (value: string): [number, number, number, number] => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0]!, d[1]!, d[2]!, d[3]!];
      };
      const accent = rgb(getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
      // Tolerance, because the accent reaches some elements through `color-mix` and a blur layer.
      // Wide enough to catch a near shade, narrow enough that ink and muted do not qualify.
      const near = (a: [number, number, number, number]) =>
        a[3] > 0 &&
        Math.abs(a[0] - accent[0]) < 26 &&
        Math.abs(a[1] - accent[1]) < 26 &&
        Math.abs(a[2] - accent[2]) < 26;

      const out: string[] = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const cs = getComputedStyle(el);
        // PSEUDO-ELEMENTS ARE SWEPT TOO, AND A SCREENSHOT IS WHY. `getComputedStyle(el)` returns
        // the element's own styles and says nothing about `::before`/`::after`, so every accent
        // painted through a pseudo-element was invisible to this sweep. The `qa/` capture showed
        // the step rail on `/clinicians` filled in accent while the sweep reported one site — a
        // rule the canvas could not see. Third blind spot in this probe found in one unit, after
        // the SVG `className` collapse; both UNDER-reported.
        const shown = (pseudo: string) => {
          const p = getComputedStyle(el, pseudo);
          return p.content && p.content !== "none" ? p : null;
        };
        const before = shown("::before");
        const after = shown("::after");
        const candidates: Array<[string, string]> = [
          [cs.color, ""], [cs.backgroundColor, ""], [cs.borderTopColor, ""],
        ];
        for (const [pseudo, style] of [["::before", before], ["::after", after]] as const) {
          if (!style) continue;
          candidates.push([style.backgroundColor, pseudo], [style.color, pseudo], [style.borderTopColor, pseudo]);
        }
        for (const [value, pseudo] of candidates) {
          if (near(rgb(value))) {
            // `className` is an SVGAnimatedString on SVG elements, so `String(el.className)` yields
            // "[object SVGAnimatedString]" and collapses every SVG into one bogus meaning. That bug
            // UNDERCOUNTED: the finder read 3 when the truth was 4, and the extra one was a real
            // finding — an accented icon on a control whose own label is muted.
            const cls = typeof el.className === "string" ? el.className.split(" ")[0] : "";
            const parent =
              el.parentElement && typeof el.parentElement.className === "string"
                ? el.parentElement.className.split(" ")[0]
                : "";
            out.push((cls || `${el.tagName.toLowerCase()}@${parent || "?"}`) + pseudo);
            break;
          }
        }
      }
      return out;
    });

    const meanings = [...new Set(sites)];
    totalSites += sites.length;
    report.push(`${route} sites=${sites.length} meanings=${meanings.length} [${meanings.join(", ")}]`);
    if (meanings.length > MEANINGS_CAP) {
      over.push(`${route}: ${meanings.length} distinct accent meanings — ${meanings.join(", ")}`);
    }
  }

  console.log("ACCENT_LOAD\n  " + report.join("\n  "));

  // NON-VACUITY, AND IT IS LOAD-BEARING HERE MORE THAN ANYWHERE. A cap is satisfied perfectly by a
  // detector that finds nothing — and "nothing" would also mean the live tokens had lost their own
  // accent, which is a different regression this same sweep should catch.
  expect(totalSites, "no element on any public surface paints the accent — the sweep is looking at nothing").toBeGreaterThan(4);
  expect(over, `the accent is carrying more than one meaning:\n${over.join("\n")}`).toEqual([]);
});
