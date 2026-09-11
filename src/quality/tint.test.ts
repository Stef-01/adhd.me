// The rule the two console specs enforce, checked against actual colours.
//
// The version this replaced was a bare channel spread written out inside two `page.evaluate`
// blocks, and it was never tested against a single colour. That is how it came to report the
// product's own body text as a green tick on every push, in two specs at once, while reading like
// a careful instrument: "a green or amber tint pulls one channel away from the others. Neutral
// greys do not." True of a neutral grey; this palette's greys are deliberately cool.
//
// So the table below is the point of this file rather than a formality. It runs in BOTH
// directions, which is the half the old rule could not have passed: every neutral the palette
// declares must read as ink, and every state colour — including the pale washes, which are the
// ones a loosened threshold would quietly let through — must still read as state.

import { describe, expect, it } from "vitest";
import { eachOf } from "./non-vacuous";
import { isStateTint, TINT_SPREAD, type Rgb } from "./tint";

/** The palette's own neutrals, from `:root` in app/globals.css, with their channel spreads. */
const INK: ReadonlyArray<readonly [string, Rgb]> = [
  ["--ink #172033", [23, 32, 51]],
  ["--muted #565f70", [86, 95, 112]],
  ["--faint #626b7b", [98, 107, 123]],
  ["--line #d8deea", [216, 222, 234]],
  ["--line-strong #b9c2d6", [185, 194, 214]],
  ["--paper #f7f8fc", [247, 248, 252]],
  ["--stone #edf0f6", [237, 240, 246]],
  // The value CI reported 107 times: a color-mix of ink into muted, resolved by the browser.
  ["a color-mix of ink and muted", [75, 84, 101]],
];

/** What the console must never show, and what a threshold-only rule would let through. */
const STATE: ReadonlyArray<readonly [string, Rgb]> = [
  ["a green tick #16a34a", [22, 163, 74]],
  ["a pale green badge #dcfce7", [220, 252, 231]],
  ["an amber badge #d97706", [217, 119, 6]],
  ["a soft amber wash #fef3c7", [254, 243, 199]],
  ["a red warning #b91c1c", [185, 28, 28]],
  ["a pale red wash #fee2e2", [254, 226, 226]],
  ["the tree's own --play-go #2f7d5b", [47, 125, 91]],
  ["the tree's own --play-alert #d9603f", [217, 96, 63]],
];

describe("the state-tint rule", () => {
  it("reads every neutral this palette declares as ink, not as state", () => {
    for (const [name, rgb] of eachOf(INK, "the palette's neutrals")) {
      expect(isStateTint(rgb), `${name} is the product's ink and must not read as state`).toBe(false);
    }
  });

  it("still catches every green, amber and red, including the pale washes", () => {
    for (const [name, rgb] of eachOf(STATE, "the state colours")) {
      expect(isStateTint(rgb), `${name} is state styling and must be caught`).toBe(true);
    }
  });

  it("keeps the threshold: a colour under it is never state, whatever its direction", () => {
    // The fix narrows by DIRECTION, never by distance. The number is untouched, which matters:
    // raising it instead would have been the easy fix and would have let the pale washes above
    // through — #dcfce7 is only 32 apart.
    expect(TINT_SPREAD).toBe(24);
    expect(isStateTint([120, 140, 120])).toBe(false); // green on top, but only 20 apart
  });

  it("is decided by which channel leads, with the threshold unchanged", () => {
    // Same distance apart, opposite verdicts: blue on top is this palette's grey, green on top is
    // a tick. This is the whole of the change, stated as a pair.
    const apart = TINT_SPREAD + 2;
    expect(isStateTint([100, 100 + apart, 100])).toBe(true);
    expect(isStateTint([100, 100, 100 + apart])).toBe(false);
    // And under the threshold, neither is state.
    expect(isStateTint([100, 100 + TINT_SPREAD - 1, 100])).toBe(false);
  });
});
