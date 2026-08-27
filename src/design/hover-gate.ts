// O199: the hover half of `interaction.hover-focus`, made executable.
//
// THE LAW HAD NO ENFORCER, AND NOBODY KNEW. `adhdme-taste` says hover styles are gated behind
// `@media (hover: hover)`. The taste register (AR1) names three enforcers against that rule — the
// two keyboard-focus tab-walks and AR23's focus-ring census — and every one of them enforces the
// FOCUS half of the sentence. The hover clause was a rule the register reported as covered and no
// check in the tree had ever read. 37 of the stylesheet's 53 `:hover` rules broke it.
//
// WHERE THE QUESTION CAME FROM. O198 found a hover underline running 110px past its own text,
// latent since O192 and invisible to nine screenshot rounds, because a hover state only exists
// under a cursor and every capture in this tree is taken without one. That was luck, and luck is
// not a control. This is the general question it raised.
//
// WHAT THIS DOES *NOT* CLAIM. The obvious harm is sticky hover on a phone, and O199 probed for it
// rather than asserting it: `(hover: hover)` is indeed false under device emulation, so ungated
// rules do apply there — but after tapping a card and navigating back, nothing matched `:hover`.
// (The unit's first probe reported a stuck style and that was the instrument, not the product: the
// tap navigated, so the element it re-read was null.) Emulated Chromium is not iOS Safari and this
// does not clear the rule; it does mean this module enforces a LAW rather than a defect anybody has
// seen. Recorded here because a check whose stated reason is bigger than its evidence is how a rule
// gets weakened later by somebody who checks.
//
// THE TRAP, AND IT IS WHY A MECHANICAL WRAP WOULD HAVE BEEN WORSE THAN THE VIOLATION. 14 of the 37
// paired `:hover` with `:focus-visible` (or `:focus-within`) in one selector list. Wrapping those
// whole would have deleted the FOCUS style on touch devices — a real regression, and a worse one
// than the unenforced law it fixed. They were SPLIT: the focus half stays ungated, the hover half
// moves inside the gate. Every rule kept the declarations it had; nothing was restyled.

/** A `:hover` rule found in the stylesheet, and where it sits. */
export interface HoverRule {
  /** The selector list as written, whitespace-collapsed. */
  selector: string;
  /** Inside `@media (hover: hover)` — the gated state the law asks for. */
  gated: boolean;
  /**
   * Inside `@media (prefers-reduced-motion: reduce)`.
   *
   * LEGITIMATELY UNGATED, and the distinction is the reason this is a classifier rather than a
   * grep. A reduced-motion block OVERRIDES an already-gated rule — `.network-card-open:hover img
   * { transform: none }` exists to switch off a hover flourish, and nesting it inside a hover gate
   * as well would say nothing extra while making the sheet harder to read.
   */
  reducedMotionOverride: boolean;
}

/**
 * Every `:hover` rule in a stylesheet, classified.
 *
 * COMMENTS ARE MASKED BEFORE SCANNING, and that is not defensive coding — the first version of this
 * scan reported 42 ungated rules and one of them was a sentence of PROSE inside a comment block
 * that happened to quote a deleted `:hover` selector. A scanner that reads its own documentation as
 * code reports a number nobody can act on.
 */
export function hoverRules(css: string): HoverRule[] {
  const masked = css.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));

  const spansOf = (pattern: RegExp): Array<[number, number]> => {
    const spans: Array<[number, number]> = [];
    for (const m of masked.matchAll(pattern)) {
      let depth = 1;
      let i = m.index! + m[0].length;
      while (depth > 0 && i < masked.length) {
        if (masked[i] === "{") depth += 1;
        else if (masked[i] === "}") depth -= 1;
        i += 1;
      }
      spans.push([m.index!, i]);
    }
    return spans;
  };

  const hoverGates = spansOf(/@media\s*\(hover:\s*hover\)[^{]*\{/g);
  const reduceGates = spansOf(/@media\s*\(prefers-reduced-motion:\s*reduce\)[^{]*\{/g);
  const inside = (spans: Array<[number, number]>, at: number) =>
    spans.some(([a, b]) => at >= a && at < b);

  const rules: HoverRule[] = [];
  for (const m of masked.matchAll(/([^{}]*?:hover[^{}]*?)\{/g)) {
    const selector = m[1]!.split(/\s+/).filter(Boolean).join(" ");
    if (!selector) continue;
    rules.push({
      selector,
      gated: inside(hoverGates, m.index!),
      reducedMotionOverride: inside(reduceGates, m.index!),
    });
  }
  return rules;
}

/** The rules the law refuses: a `:hover` style that applies on a device with no pointer. */
export function ungatedHoverRules(css: string): HoverRule[] {
  return hoverRules(css).filter((r) => !r.gated && !r.reducedMotionOverride);
}

/**
 * Selectors allowed to carry `:hover` outside a gate, each with the reason emptiness is correct.
 *
 * EMPTY, AND THAT IS THE POINT RATHER THAN AN OVERSIGHT. O199 fixed all 37 violations rather than
 * pinning a remainder, because unlike O196's 146 vacuous assertions these were mechanical and fully
 * classified before the first edit. A ratchet above zero would have invited somebody to satisfy the
 * census by adding a number.
 *
 * Kept as a register rather than as a bare `toEqual([])` so that a future genuine exception has
 * somewhere to be ARGUED. `non-vacuous.ts`'s `LEGITIMATELY_EMPTY` is the same shape: an exception
 * that cannot say why it is correct is a fix waiting to be written.
 */
export interface HoverException {
  selector: string;
  why: string;
}

export const HOVER_EXCEPTIONS: readonly HoverException[] = [];

/**
 * The count the census pins, so a violation cannot arrive quietly.
 *
 * ZERO, DELIBERATELY. See `HOVER_EXCEPTIONS`.
 */
export const UNGATED_HOVER_ALLOWED = 0;
