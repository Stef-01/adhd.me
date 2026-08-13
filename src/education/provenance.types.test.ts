// W152 verify gate (the type half): an item with no signed-off source is unrenderable BY TYPE.
//
// The runtime half proves `renderable()` refuses correctly. That is not the unit's claim. The
// claim is that a display surface CANNOT ACCEPT an unsourced item even if its author never
// calls the check — so the assertion has to happen in `tsc`, and this file is written to fail
// `pnpm typecheck` rather than to fail a test run.
//
// Same mechanism and same care as W119's: `@ts-expect-error` errors when the line beneath it
// COMPILES, so widening `RenderableItem` or deleting its brand breaks the build. Assertions sit
// in a function that is never called — running them would only prove that reading a field off
// the wrong shape throws, which is not the claim.
//
// W119's version of this file overstated what one of its two assertions proved. The same care
// is taken here: each line below says which failure it actually guards.

import { describe, expect, it } from "vitest";
import type { EducationItem } from "./curation";
import type { RenderableItem, SignedOffSource } from "./provenance";
import { renderable } from "./provenance";

/** Stands in for W151's console: a display surface takes the branded type. */
function displaySurface(entry: RenderableItem): string {
  return entry.item.title;
}

const ITEM: EducationItem = {
  itemId: "item-1",
  conditionCode: "placeholder_register_a",
  title: "Placeholder material",
  sourceRef: "content-1",
  relevantFactCodes: [],
};

const SOURCE: SignedOffSource = {
  ref: "content-1",
  kind: "register_content",
  signedOffBy: "founder@x.test",
  signedOffAt: "2026-03-04T00:00:00Z",
};

describe("W152 the brand cannot be bypassed", () => {
  it("an unchecked item is not accepted where a RenderableItem is required", () => {
    // Never called. tsc checks the body; the runtime does not enter it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function _brandIsLoadBearing(item: EducationItem, source: SignedOffSource): void {
      // @ts-expect-error — a raw item must not satisfy RenderableItem. This guards the everyday
      // mistake of passing the unchecked value straight through; it is caught on SHAPE as well
      // as by the brand, so it is not on its own evidence the brand works.
      displaySurface(item);

      // @ts-expect-error — THIS is the brand's test. Every declared field is present and
      // correctly typed, and the only thing rejecting it is the unforgeable symbol. Deleting
      // the brand makes this line compile and fails typecheck with TS2578.
      displaySurface({ item, source });
    }

    expect(typeof _brandIsLoadBearing).toBe("function");
    // The runtime agrees with the types: with no catalogue, nothing is renderable.
    expect(renderable(ITEM, []).renderable).toBe(false);
  });

  it("the only legitimate source is renderable()", () => {
    const result = renderable(ITEM, [SOURCE]);
    expect(result.renderable).toBe(true);
    if (!result.renderable) throw new Error("unreachable");

    // Compiles, because it came through the check. The positive control — without it, the two
    // assertions above could be passing because the surface rejects everything.
    expect(displaySurface(result.item)).toBe("Placeholder material");
  });
});
