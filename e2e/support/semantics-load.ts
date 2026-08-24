// AR11: the semantics detector, in one place, so the mutation probe drives the REAL one
// (docs/AESTHETIC-REVIEW-PLAN.md Phase 2; AR9/AR10's shape, third sweep family).
//
// The probe below is O160's, moved out of `e2e/semantics.spec.ts` verbatim: one visible h1, no
// heading level jump, a `<main>` landmark, and an accessible name on every visible field. O171's
// own note holds — it is entirely route-independent, nothing in it is tuned to a screen — which
// is exactly what lets one shared function serve a 45-route sweep and a one-route mutation probe
// without either drifting from the other.
//
// A FACT THE RULE ID CARRIES, STATED RATHER THAN GLOSSED: this sweep is NOT a taste-register
// rule. O160 built it as an accessibility gate, `taste-register.ts` holds no entry for semantic
// structure, and `semantics.spec.ts` carries no `taste-rule:` tag. The id below therefore names
// the sweep family and its source unit instead of pointing into the register — inventing a
// register-shaped id for a rule the register does not hold would send a reader to a law-book
// page that does not exist. AR13's mutation report will have to represent this sweep as living
// outside the register; that is a property of the tree, not of this probe.

import type { Page } from "@playwright/test";

/** The identifier a red run names. See the header: deliberately NOT a taste-register id. */
export const SEMANTICS_RULE_ID = "a11y.semantic-structure (O160)";

/**
 * O160's four checks over the CURRENT page. Evaluate-only (AR10's split): the probe injects and
 * must re-measure without a navigation, so goto/reveal/fonts stay with the caller.
 */
export async function semanticFindings(
  page: Page,
): Promise<{ out: string[]; headings: number; fields: number }> {
  return page.evaluate(() => {
    const out: string[] = [];
    const hs = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
      .filter((h) => { const b = h.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
    const levels = hs.map((h) => Number(h.tagName[1]));
    const h1s = levels.filter((l) => l === 1).length;
    if (h1s !== 1) out.push(`h1 count = ${h1s}`);
    for (let i = 1; i < levels.length; i += 1) {
      if (levels[i]! - levels[i - 1]! > 1) {
        out.push(`heading jump h${levels[i - 1]}->h${levels[i]} at "${(hs[i]!.textContent || "").trim().slice(0, 26)}"`);
      }
    }
    if (!document.querySelector("main")) out.push("no <main> landmark");
    let fields = 0;
    for (const el of Array.from(document.querySelectorAll("input:not([type=hidden]),select,textarea"))) {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      fields += 1;
      const id = el.getAttribute("id");
      const named = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")
        || (id && document.querySelector(`label[for="${id}"]`)) || el.closest("label");
      if (!named) out.push(`unnamed <${el.tagName.toLowerCase()}> name=${el.getAttribute("name") ?? "?"}`);
    }
    return { out, headings: hs.length, fields };
  });
}

/**
 * The sweep's verdict for one route: a failure message naming the route and the rule id, or null.
 * AR9 added the id to the accent message and AR10 to the touch message for the same reason: the
 * old per-finding prefix carried the route and left the reader to discover the enforcing law.
 */
export function semanticsFinding(route: string, defects: readonly string[]): string | null {
  if (defects.length === 0) return null;
  return `${route}: ${defects.length} semantic defect(s) — breaks ${SEMANTICS_RULE_ID} — ${defects.join("; ")}`;
}
