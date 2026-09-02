// AR19: the visual fold register — the check `layout.fold-governed` actually needs.
//
// The taste rule: "Nothing above the fold that is not the idea; a fold may never cut a tied
// band or separate a claim from its qualifier." Its citation (W167) was a false friend — that
// register governs order-independent REDUCES, not viewports — and until this unit no check
// asserted the visual rule. Two mechanical halves now do:
//   1. THE IDEA ABOVE THE FOLD — every public route's h1 sits fully inside the initial
//      viewport at both shipped widths (e2e/fold.spec.ts, route-derived).
//   2. TIED BANDS NEVER CUT — the pairs below: a claim and the qualifier it must never be
//      read without. At initial scroll, the pair's union box must not straddle the fold —
//      a reader who can see part of the band and not the rest has been handed the claim
//      without its qualifier, which is the exact harm the taste rule names.
//
// SCOPE, stated rather than implied: the INITIAL fold only. Once a reader scrolls, the fold
// is continuous and every band crosses it at some instant — the rule governs what the page
// chooses to show first, which is the only fold a layout controls.

/** The cut predicate, shared by the vitest probe and the e2e sweep so both drive the SAME logic. */
export function bandCut(unionTop: number, unionBottom: number, viewportHeight: number): boolean {
  return unionTop < viewportHeight && unionBottom > viewportHeight;
}

export type TiedBand = {
  /** Public route the pair renders on at initial scroll. */
  readonly route: string;
  /** Short name for failure output. */
  readonly name: string;
  /** Two selectors; the band is their union box. Both must resolve or the sweep fails as vacuous. */
  readonly selectors: readonly [string, string];
  /** Why these two are one band — which claim would be read naked if the fold cut here. */
  readonly why: string;
};

export const TIED_BANDS: readonly TiedBand[] = [
  {
    // O230 moved the story to `/story`; the band is a fact about that hero, so it moved with it.
    route: "/story",
    name: "hero claim + qualifier",
    selectors: [".story-hero h1", ".story-hero-sub"],
    why: "The hero's statement and the sentence that grounds it — the claim without its qualifier is exactly the unearned-claim shape the honesty gates exist to prevent.",
  },
  {
    route: "/clinicians/join",
    name: "funnel heading + email action",
    selectors: [".join-email-heading", ".join-email-cta"],
    why: "O189's funnel ends in 'Start your journey today' and the mailto that IS the journey — a fold between them shows an imperative with no way to act on it.",
  },
];
