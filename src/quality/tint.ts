// IS THIS COLOUR STATE, OR IS IT THE PRODUCT'S OWN INK?
//
// Two console specs ask that question — `interop-console`'s "shows no success styling anywhere on
// the page" and `capacity-console`'s "does not style the drift verdict as a grade" — and both used
// to ask it as "are the channels more than 24 apart?". That was true of the palette it was written
// against. It stopped being true of this one: the blue scheme's neutrals are deliberately cool, and
// `--ink` is 28 apart, so the console's ordinary body text began reporting as a green tick. Both
// specs failed on `main` for that reason, on every push, with the same 107 false positives.
//
// Spread alone cannot separate the two. The DIRECTION can. A tick is green, a badge is amber, a
// warning is red — every one of them pulls RED or GREEN to the top. A cool grey pulls BLUE.
//
//   --ink    #172033    23, 32, 51    spread 28    blue     the body colour
//   --muted  #565f70    86, 95, 112   spread 26    blue     the secondary colour
//   --faint  #626b7b    98, 107, 123  spread 25    blue     the meta colour
//   a tick   #16a34a    22, 163, 74   spread 141   green    what these specs exist to catch
//   a badge  #d97706   217, 119, 6    spread 211   red      likewise
//
// So the threshold keeps every tooth it had and loses its false positives: a colour this far apart
// that is ALSO blue-dominant is not a state, it is a grey. Nothing here weakens what is caught — a
// green, an amber or a red at or over the threshold still fails, which is the whole of the rule.
//
// IT LIVES HERE BECAUSE IT IS ONE RULE, AND BECAUSE A RULE SHOULD BE TESTED. It was written out
// twice, in two specs, and the two copies had already begun to differ (one scans every element
// under `main`, the other three surfaces of one block). This tree's CI job carries the same lesson
// in its own comment: a list that is copied drifts, a list that is called cannot. In `src/` it also
// gets `tint.test.ts` beside it, which is the part that matters — the old rule was never checked
// against a colour at all, which is how it could be wrong about five of them on every push.
//
// The MEASURING stays in the page, where a canvas can resolve whatever the browser emits
// (`oklch()`, `color(srgb …)`); only the JUDGEMENT is here.

/** How far apart the channels must be before a colour is worth judging at all. */
export const TINT_SPREAD = 24;

export type Rgb = readonly [number, number, number];

/** True when a colour reads as state — a tick, a badge, a warning — rather than as ink. */
export function isStateTint([r, g, b]: Rgb): boolean {
  if (Math.max(r, g, b) - Math.min(r, g, b) < TINT_SPREAD) return false;
  // Blue on top is this palette's own cool grey; red or green on top is a verdict.
  return Math.max(r, g, b) !== b;
}

/** The same question for a whole page's worth of measurements, keeping what failed and why. */
export function stateTints<T extends { readonly rgb: Rgb }>(measured: readonly T[]): T[] {
  return measured.filter((m) => isStateTint(m.rgb));
}
