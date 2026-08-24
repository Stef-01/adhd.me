// AR10: the touch-floor detector, in one place, so the mutation probe drives the REAL one
// (docs/AESTHETIC-REVIEW-PLAN.md Phase 2; AR9's shape, applied to the second sweep family).
//
// The measurement below is O145/O148's sweep moved out of `e2e/touch-floor.spec.ts` verbatim —
// the three principled exclusions, the label hit-area rule, the O153 tabindex lesson — so that
// `touch-probe.spec.ts` and the sweep cannot drift apart: a probe against a copy proves the copy.
// The spec keeps what is the SWEEP's own job (route loops, fixture seeding, `measured()` floors);
// this module owns what a control under the floor IS.

import type { Page } from "@playwright/test";

/** The register id this sweep enforces (`src/design/taste-register.ts`). */
export const TOUCH_RULE_ID = "interaction.touch-44";

/** O14's floor. The HIT AREA must reach it on both axes; the glyph may be smaller. */
export const TOUCH_FLOOR_PX = 44;

/**
 * Every control on the CURRENT page whose hit area is under the floor, with the population seen.
 *
 * Evaluate-only, deliberately: the probe injects an element and must re-measure WITHOUT a
 * navigation (a reload would clear its mutation), so page setup — goto, revealCollapsedSurfaces,
 * fonts.ready — stays with the caller. The sweep does all three; the probe does them once and
 * then measures twice.
 *
 * Three exclusions, each principled rather than convenient (O148/O153):
 *   * a link sitting inline inside a sentence — WCAG 2.5.8 exempts these explicitly;
 *   * an EXPLICIT tabindex="-1" (the honeypot) — a decision, where a role=button div that merely
 *     lacks tabindex is precisely the oversight this must catch;
 *   * `.sr-only` inputs, where the visible affordance is somewhere else.
 * And the hit area is the LABEL's when a label wraps or references the control: an 18px checkbox
 * inside a 44px label is compliant (measuring the input reported 70 findings where there were 61).
 */
export async function underFloorControls(page: Page): Promise<{ out: string[]; seen: number }> {
  return page.evaluate((floor) => {
    const out: string[] = [];
    let seen = 0;
    const inlineInProse = (el: Element) => {
      if (el.tagName !== "A") return false;
      if (el.closest("p")) return true;
      const parent = el.parentElement;
      if (!parent) return false;
      if (getComputedStyle(el).display !== "inline") return false;
      return (parent.textContent || "").replace(el.textContent || "", "").trim().length > 0;
    };
    const selector = 'a, button, input:not([type=hidden]), select, summary, [role="button"]';
    for (const el of Array.from(document.querySelectorAll(selector))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (inlineInProse(el)) continue;
      const tabAttr = el.getAttribute("tabindex");
      if (tabAttr !== null && Number(tabAttr) < 0) continue;
      if (el.classList.contains("sr-only")) continue;

      let box = rect;
      const label =
        el.closest("label") ?? (el.id ? document.querySelector(`label[for="${el.id}"]`) : null);
      if (label) {
        const lr = (label as HTMLElement).getBoundingClientRect();
        if (lr.width * lr.height > box.width * box.height) box = lr;
      }
      seen += 1;
      if (box.height < floor || box.width < floor) {
        const name = (el.getAttribute("aria-label") || el.textContent || (label && label.textContent) || "").trim().slice(0, 40);
        out.push(`<${el.tagName.toLowerCase()}> "${name}" ${Math.round(box.width)}x${Math.round(box.height)}`);
      }
    }
    return { out, seen };
  }, TOUCH_FLOOR_PX);
}

/**
 * The sweep's verdict for one route: a failure message naming the route and the rule id, or null.
 *
 * AR10's verify line requires the probe to assert the sweep "names the route and the rule id";
 * the spec's old message carried the route per offender line but named no rule anywhere, so a
 * reader who hit it had to find the enforcing spec to learn which register rule had broken —
 * the same gap AR9 closed for the accent message.
 */
export function floorFinding(route: string, offenders: readonly string[]): string | null {
  if (offenders.length === 0) return null;
  return `${route}: ${offenders.length} control(s) under the ${TOUCH_FLOOR_PX}px floor — breaks ${TOUCH_RULE_ID} — ${offenders.join("; ")}`;
}

/** The aria-label prefix the probe stamps; distinctive enough that no product control collides. */
export const PROBE_LABEL_PREFIX = "ar10-touch-probe-";

/**
 * Appends `count` real, visible, focusable buttons of the given size to the current page, and
 * returns their aria-labels. Numbering continues from probe elements already in the document —
 * AR9's helper numbered from zero on every call, re-emitted a duplicate on the second call, and
 * its probe caught it only at the boundary; this one starts where that lesson ended.
 *
 * They are real buttons at a real rendered size: the detector measures `getBoundingClientRect`,
 * so a mutation it can see has to be a rendered thing, not a source edit.
 */
export async function injectControls(
  page: Page,
  count: number,
  size: { width: number; height: number },
): Promise<string[]> {
  return page.evaluate(
    ({ n, w, h, prefix }) => {
      const already = document.querySelectorAll(`[aria-label^="${prefix}"]`).length;
      const added: string[] = [];
      for (let i = 0; i < n; i += 1) {
        const el = document.createElement("button");
        el.setAttribute("aria-label", `${prefix}${already + i}`);
        el.textContent = "probe";
        el.style.cssText = `display:block;width:${w}px;height:${h}px;padding:0;border:1px solid;`;
        document.body.appendChild(el);
        added.push(el.getAttribute("aria-label")!);
      }
      return added;
    },
    { n: count, w: size.width, h: size.height, prefix: PROBE_LABEL_PREFIX },
  );
}
