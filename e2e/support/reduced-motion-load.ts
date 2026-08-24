// AR20: the reduced-motion rest-state detector, in one place, so the mutation probe drives the
// REAL detector rather than a copy (the AR9–AR12 rule). Under emulated prefers-reduced-motion,
// a settled page must satisfy two properties:
//   1. NO ELEMENT RESTS TRANSFORMED — a non-identity INLINE transform at rest is motion/react
//      residue: the entrance CSS cannot leave (media-gated), so inline style is exactly where a
//      missed `useReducedMotion` shows up (O127's finding, made mechanical).
//   2. EVERY REVEAL'S CONTENT IS PRESENT — a text-bearing element resting at computed opacity 0
//      is a reveal that never revealed: reduce users get a blank where a sentence should be.
//
// Exceptions are DECLARED, per element, with the reason inline — never inferred.

import type { Page } from "@playwright/test";

export type ReducedMotionFinding = { readonly route: string; readonly kind: "rests-transformed" | "hidden-content"; readonly detail: string };

/** Selectors allowed to rest transformed under reduce, each with its reason. */
export const ALLOWED_TRANSFORMS: ReadonlyArray<{ readonly selector: string; readonly why: string }> = [
  {
    selector: ".story-progress",
    why: "The scroll progress bar rests at scaleX(0) at the top of the page by definition — it is scroll FEEDBACK (direct manipulation, vestibular-safe), not preference-gated motion, and it grows only as the reader scrolls.",
  },
];

/**
 * Runs both checks on the CURRENT page state. Kept as one function so the probe spec and the
 * sweep call literally the same code — a probe that drives a copy proves nothing (AR9's law).
 */
export async function reducedMotionFindings(page: Page, route: string): Promise<ReducedMotionFinding[]> {
  const allowed = ALLOWED_TRANSFORMS.map((entry) => entry.selector);
  const raw = await page.evaluate((allowedSelectors: string[]) => {
    const out: Array<{ kind: "rests-transformed" | "hidden-content"; detail: string }> = [];
    const identity = new Set(["none", "matrix(1, 0, 0, 1, 0, 0)"]);
    for (const el of document.querySelectorAll<HTMLElement>("[style*='transform']")) {
      if (allowedSelectors.some((selector) => el.matches(selector))) continue;
      const computed = getComputedStyle(el).transform;
      if (!identity.has(computed)) {
        const name = `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0] ?? ""}`;
        out.push({ kind: "rests-transformed", detail: `${name} rests at ${computed} (inline: ${el.style.transform})` });
      }
    }
    for (const el of document.querySelectorAll<HTMLElement>("*")) {
      if (!el.childElementCount && (el.textContent ?? "").trim().length > 0) {
        if (getComputedStyle(el).opacity === "0") {
          const name = `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0] ?? ""}`;
          out.push({ kind: "hidden-content", detail: `${name} "${(el.textContent ?? "").trim().slice(0, 40)}" rests at opacity 0` });
        }
      }
    }
    return out;
  }, allowed);
  return raw.map((finding) => ({ route, ...finding }));
}
