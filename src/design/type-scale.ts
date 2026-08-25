// AR21: type scale and rhythm from the tokens — asserted rather than remembered.
//
// Measured at claim time: globals.css holds ZERO px font-sizes (O60's rem migration held — 325
// rem sites), so the census PINS that zero as a floor instead of migrating anything: the first
// `font-size: …px` to land in the stylesheet fails the suite. Component-side, inline px type is
// confined to two files that already carry AR17 exception entries for the same underlying
// reason, registered here with the same rationales — growth in either fails.
//
// tabular-nums is the register's second half: the taste law says "wherever numbers change or
// align", and TABULAR_SITES names those places so removal fails. Deliberately NOT on the story
// stat rail: its values are phrases ("Months to years", "$1k to $5k" as a range sentence), not
// aligned numerals — tabular figures there would be scope creep wearing rigour's clothes.

import { readFileSync } from "node:fs";
import path from "node:path";

/** globals.css `font-size: …px` sites — pinned at zero, the floor O60 earned. */
export const CSS_PX_TYPE_FLOOR = 0;

/** Files allowed inline px type, each for a reason the stylesheet cannot fix. */
export const COMPONENT_PX_TYPE_EXCEPTIONS: ReadonlyArray<{
  readonly file: string;
  readonly why: string;
}> = [
  {
    file: "app/opengraph-image.tsx",
    why: "Satori renders the OG card to a PNG with no stylesheet and no rem context — px is the only unit that means anything there.",
  },
];

/** Selectors whose numbers change or align — each rule must carry font-variant-numeric: tabular-nums. */
export const TABULAR_SITES: ReadonlyArray<{
  readonly selector: string;
  readonly why: string;
}> = [
  { selector: ".seq-n span", why: "the story sequence's step numerals align down a rail" },
  { selector: ".mc-weight", why: "matching-console weights are compared down a column" },
  { selector: ".mc-num", why: "matching-console figures are compared down a column" },
  { selector: ".cv2-mix-card strong", why: "the walkthrough's LIVE slider percentage — 31% must not be narrower than 30% while the reader drags" },
  { selector: ".cv2-practice-hero strong", why: "the practice stage's stat figures (184 / 46 / 31%) — changing numbers per the taste register" },
];

/** True when the stylesheet gives `selector` a rule carrying tabular-nums — the test's predicate. */
export function selectorHasTabularNums(css: string, selector: string): boolean {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped + String.raw`[^{}]*\{[^}]*font-variant-numeric:\s*tabular-nums`).test(css);
}

export function cssPxTypeCount(css: string): number {
  return (css.match(/font-size:\s*[0-9.]+px/g) ?? []).length;
}

export function readGlobalsCss(repoRoot: string): string {
  return readFileSync(path.join(repoRoot, "app/globals.css"), "utf8");
}
