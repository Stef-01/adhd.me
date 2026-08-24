// AR12: the contrast detector, in one place, so the mutation probe drives the REAL one
// (docs/AESTHETIC-REVIEW-PLAN.md Phase 2; AR9-AR11's shape, fourth and last sweep family).
//
// The measurement is O157's, moved out of `e2e/contrast.spec.ts` verbatim — the canvas colour
// resolution (Tailwind v4 emits `oklch()`, and the first draft parsed only `rgb()`, reporting
// white-on-dark-button as 1.00:1 six times), the nearest-opaque-background walk, the WCAG AA
// floors with the large-text branch. The spec keeps the sweep's own job: navigation, sign-in,
// fixtures, route loops, `measured()`/`derivedFloor`.
//
// LIKE AR11's SEMANTICS, THIS IS NOT A TASTE-REGISTER RULE: O157 built it as a WCAG gate, the
// register holds no contrast entry (AR17-18 are its future colour work), and the spec carries no
// `taste-rule:` tag. The id names the law and its source unit rather than a register page that
// does not exist.

import type { Page } from "@playwright/test";

/** The identifier a red run names. Deliberately not a taste-register id — see the header. */
export const CONTRAST_RULE_ID = "wcag-aa.contrast (O157)";

/**
 * Every text element on the CURRENT page under its WCAG AA floor, with the population seen.
 * Evaluate-only (AR10/AR11's split): the probe injects and re-measures without a navigation,
 * so goto and fonts.ready stay with the caller.
 */
export async function contrastFindings(page: Page): Promise<{ out: string[]; seen: number }> {
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

/**
 * The sweep's verdict for one route: a failure message naming the route and the rule id, or null.
 * The same addition AR9-AR11 made to their families' messages, for the same reason.
 */
export function contrastFinding(route: string, offenders: readonly string[]): string | null {
  if (offenders.length === 0) return null;
  return `${route}: ${offenders.length} text element(s) under the contrast floor — breaks ${CONTRAST_RULE_ID} — ${offenders.join("; ")}`;
}

/** The text the probe stamps; distinctive enough that no product copy collides with it. */
export const PROBE_TEXT_PREFIX = "ar12 contrast probe ";

/**
 * Appends one visible text block with the given colours and size, self-backgrounded so the
 * measurement is independent of whatever palette the page paints behind it (the detector reads
 * the element's OWN background first when it is opaque). Numbering continues from probe elements
 * already in the document — AR9's duplicate-label lesson, standing.
 */
export async function injectText(
  page: Page,
  style: { color: string; background: string; fontSizePx: number },
): Promise<string> {
  return page.evaluate(
    ({ color, background, fontSizePx, prefix }) => {
      const already = document.querySelectorAll(`[data-ar12-probe]`).length;
      const el = document.createElement("div");
      el.setAttribute("data-ar12-probe", String(already));
      el.textContent = `${prefix}${already}`;
      el.style.cssText = `color:${color};background-color:${background};font-size:${fontSizePx}px;font-weight:400;opacity:1;display:block;`;
      document.body.appendChild(el);
      return el.textContent!;
    },
    { ...style, prefix: PROBE_TEXT_PREFIX },
  );
}
