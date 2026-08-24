// AR9: e2e/support/accent-load.ts — the accent-discipline detector, in one place, so a probe can
// drive the REAL one (docs/AESTHETIC-REVIEW-PLAN.md AR9, Phase 2: "every sweep must prove it can
// go red").
//
// WHY THIS FILE EXISTS AT ALL, AND IT IS THE WHOLE POINT OF THE UNIT. A mutation probe written
// against a COPY of the detector proves that the copy works. It is the most comfortable way to
// build this — no refactor, no risk to a green sweep — and it establishes nothing about the sweep
// that actually guards the site, which is the one thing AR9 asks. So `accent-discipline.spec.ts`
// stops owning its measurement and calls in here, and the probe calls the same two functions in
// the same order. There is exactly one detector; the probe either makes it fail or reports that it
// cannot be made to fail.
//
// THE SLIVER THIS DOES NOT COVER, NAMED RATHER THAN GLOSSED. The probe drives `accentSites` in a
// real browser on a real route and feeds the result through the real `overCapFinding`. What it does
// not re-run is the sweep's `for (const route of PUBLIC_ROUTES)` loop and its final `expect(over)`
// — three lines of aggregation that hold no rule logic. A probe that walked all fifteen routes
// twice to cover them would cost several minutes per run to assert that a `push` into an array
// works. The claim this unit earns is "the detector and its verdict can be made to fail on a real
// page", not "the entire spec file was mutation-tested"; the difference is small and stated here
// rather than left for a reader to discover.

import type { Page } from "@playwright/test";

// AR10: ProbeVerdict/probeVerdict moved to ./probe — the verdict was never accent-specific and
// the touch probe is its second caller. Importers now take it from there.

/** The register id this sweep enforces (`src/design/taste-register.ts`). */
export const ACCENT_RULE_ID = "type.accent-live-tokens";

/**
 * The cap, unchanged from O176, which set it FROM the observed distribution rather than before it.
 *
 * Two, not one, because "meaning" is counted by class and class is a rough proxy: `/finder` paints
 * `dual-input-field` and `dual-input-action` — two classes, one meaning to anybody looking at it.
 * The cap permits one meaning expressed in a pair of classes and refuses a genuine third.
 */
export const MEANINGS_CAP = 2;

/**
 * Every element on the current page painting the accent, labelled by the class that carries it.
 *
 * A CANVAS AND NOT A GREP (W229, reused by O166): Tailwind v4 and this stylesheet both emit
 * `oklch()`, and the accent reaches elements through custom properties a component can inherit,
 * alias or `color-mix()`. Grepping `var(--accent)` finds the declarations somebody wrote; it does
 * not find the colour somebody's element actually paints.
 */
export async function accentSites(page: Page): Promise<string[]> {
  return page.evaluate(() => {
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
      // PSEUDO-ELEMENTS ARE SWEPT TOO, AND A SCREENSHOT IS WHY. `getComputedStyle(el)` returns the
      // element's own styles and says nothing about `::before`/`::after`, so every accent painted
      // through a pseudo-element was invisible to this sweep. The `qa/` capture showed the step
      // rail on `/clinicians` filled in accent while the sweep reported one site — a rule the
      // canvas could not see. Third blind spot found in one unit, after the SVG `className`
      // collapse; both UNDER-reported.
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
}

/** The distinct meanings among a route's accent sites — the number the cap applies to. */
export function meaningsOf(sites: readonly string[]): string[] {
  return [...new Set(sites)];
}

/**
 * The sweep's verdict for one route: a failure message, or `null` when the route is within the cap.
 *
 * THE MESSAGE NAMES THE RULE ID, WHICH IT DID NOT BEFORE. AR9's verify line requires a probe to
 * assert the sweep "names the route AND names the rule id"; O176's message named only the route, so
 * a reader who hit it had to find the enforcing spec to learn which register rule had been broken.
 * Adding the id here is the smallest change that makes the requirement satisfiable honestly —
 * rather than the alternative, which is a probe that quietly asserts less than the plan asked for.
 */
export function overCapFinding(
  route: string,
  meanings: readonly string[],
  cap: number = MEANINGS_CAP,
): string | null {
  if (meanings.length <= cap) return null;
  return `${route}: ${meanings.length} distinct accent meanings (cap ${cap}) — breaks ${ACCENT_RULE_ID} — ${meanings.join(", ")}`;
}

/** The class prefix the probe paints with; distinct enough that no product class can collide. */
export const PROBE_CLASS_PREFIX = "ar9-accent-probe-";

/**
 * Paints `count` NEW distinct accent meanings onto the current page, and returns their labels.
 *
 * Each injected element carries its own class, so the detector — which labels a site by its first
 * class — reads them as separate meanings rather than one repeated one. They are real elements
 * painting the real `var(--accent)` at a real size: the detector measures rendered colour, so a
 * mutation it can see has to be a rendered thing, not a source edit.
 *
 * NEW MEANS NEW, AND THE FIRST VERSION OF THIS DID NOT. It numbered from zero on every call, so a
 * second call on the same page re-emitted `…-0` — a label the detector had already counted, which
 * `meaningsOf` then deduplicated away. The probe that injected two and then one more measured
 * two, and the helper's own doc comment was the thing that was wrong. Numbering continues from the
 * probe elements already in the document, so successive calls extend the count instead of
 * colliding with themselves. (The probe caught this the first time it crossed the cap in two
 * steps rather than one — which is the entire argument for testing a boundary from both sides.)
 */
export async function injectAccentMeanings(page: Page, count: number): Promise<string[]> {
  return page.evaluate(
    ({ n, prefix }) => {
      const already = document.querySelectorAll(`[class^="${prefix}"]`).length;
      const added: string[] = [];
      for (let i = 0; i < n; i += 1) {
        const el = document.createElement("div");
        el.className = `${prefix}${already + i}`;
        el.style.cssText = "width:12px;height:12px;background-color:var(--accent);";
        document.body.appendChild(el);
        added.push(el.className);
      }
      return added;
    },
    { n: count, prefix: PROBE_CLASS_PREFIX },
  );
}
