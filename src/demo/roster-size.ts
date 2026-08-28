// O215: the roster's size in words, derived — never transcribed.
//
// This lived in `src/network/gallery.ts` until the finder and the network were split into separate
// deployments. It was never network-specific: it is a fact about the ROSTER, and the finder states
// the same count for the same reason the gallery did. `honesty.claim-earned` says a count stands
// alone — a page may say how many GPs there are and may not dress the number as a selection, a
// shortlist, or a promise about coverage.
//
// The spelling rule is unchanged: spelled for the small numbers a sentence reads better with,
// numeric past ten. Somebody who knows they are looking at two doctors can decide what to do with
// that; somebody who expected forty feels misled.

import { clinicians } from "./clinicians";

const SPELLED = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export const ROSTER_SIZE = clinicians.length;

export function rosterSizeInWords(size: number = ROSTER_SIZE): string {
  return SPELLED[size] ?? String(size);
}
