// W46: placeholder resolution shared by both generators, so the deck and the
// one-pager can never disagree about a figure.

import { figure } from "@/collateral/figures";

const PLACEHOLDER = /\{\{([a-z0-9.-]+)\}\}/gi;

/** Replace every {{figure.id}} with its registered display value. Unknown ids throw. */
export function resolveFigures(text: string): string {
  return text.replace(PLACEHOLDER, (_match, id: string) => figure(id).display);
}

/** Every figure id referenced by a piece of copy. */
export function referencedFigureIds(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1] as string);
}

/**
 * A bare number in asset copy would bypass the register, so the test bans it.
 * Placeholders are stripped first; what remains must carry no digits, apart from
 * the few that are plainly not claims (an item number inside a placeholder label,
 * ordinals, and the like are avoided in the copy itself).
 */
export function literalNumbersIn(text: string): string[] {
  const withoutPlaceholders = text.replace(PLACEHOLDER, "");
  return [...withoutPlaceholders.matchAll(/\$?\d[\d,.]*%?/g)].map((m) => m[0]);
}
