// W157 verify gate (the type half): a vertical is unusable unless every member is usable, and
// that is enforced by `tsc` rather than by a check somebody remembers to call.
//
// Written in W152's shape and with the same care about what each line actually proves:
// `@ts-expect-error` errors when the line beneath it COMPILES, so deleting a brand breaks the
// build. Assertions sit in a function that is never called.
//
// There are two distinct claims here and they are worth separating, because only the second is
// about this unit:
//
//   1. An `UsableVertical` cannot be fabricated. Ordinary brand mechanics.
//   2. **A vertical cannot be assembled out of UNGATED members.** `UsableVertical.pathways` is
//      `UsablePathway[]`, so a caller holding a raw `PathwayVersion` cannot build one even with
//      every other field correct. This is what "composed, not re-implemented" buys: the
//      composition is checked by the compiler, not by this module's code.

import { describe, expect, it } from "vitest";
import { usableVertical, type UsableVertical, type VerticalEvidence } from "./model";
import type { PathwayVersion } from "@/pathways/versioning";
import type { UsablePathway } from "@/pathways/approval";
import { loadIntervals } from "@/registers/intervals";

/** Stands in for W164's console: a surface that renders a vertical takes the branded type. */
function verticalSurface(vertical: UsableVertical): string {
  return vertical.name;
}

describe("W157 the vertical brand cannot be bypassed", () => {
  it("a hand-built vertical is not accepted where an UsableVertical is required", () => {
    // Never called. tsc checks the body; the runtime does not enter it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function _brandIsLoadBearing(pathway: UsablePathway): void {
      // @ts-expect-error — every declared field present and correctly typed, and the only thing
      // rejecting it is the unforgeable symbol. Deleting the brand makes this compile (TS2578).
      verticalSurface({
        verticalId: "v1",
        name: "Example",
        verticalHash: "abc",
        pathways: [pathway],
        content: [],
        educationItems: [],
        intervals: [],
      });
    }
    expect(typeof _brandIsLoadBearing).toBe("function");
  });

  it("an UNGATED pathway cannot be put into a vertical's evidence", () => {
    // The claim that belongs to this unit. A raw `PathwayVersion` is what somebody has BEFORE
    // W119 has been asked; it must not be assemblable into a vertical, and no code in
    // src/verticals is what stops it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function _membersMustBeGated(version: PathwayVersion): void {
      const raw: VerticalEvidence = {
        // @ts-expect-error — a published-but-unattested version is not an UsablePathway. Caught
        // on SHAPE as well as by the brand, so on its own it is not evidence the brand works;
        // it guards the everyday mistake of passing the unchecked value straight through.
        pathways: [version],
        content: [],
        educationItems: [],
        intervals: loadIntervals([]),
      };

      const fullyShaped: VerticalEvidence = {
        pathways: [
          // @ts-expect-error — THIS is the brand's test. Every field W119 declares is present and
          // correctly typed, and the only thing rejecting it is the unforgeable symbol (tsc says
          // so: "Property '[G5_PATHWAY_SIGNED_OFF]' is missing"). Deleting the brand makes this
          // line compile and fails typecheck with TS2578.
          {
            version,
            reviewedBy: "reviewer@x.test",
            reviewedAt: "2026-03-01",
            signedOffBy: "founder@x.test",
            signedOffAt: "2026-03-02",
          },
        ],
        content: [],
        educationItems: [],
        intervals: loadIntervals([]),
      };
      void raw;
      void fullyShaped;
    }
    expect(typeof _membersMustBeGated).toBe("function");
  });

  it("the only legitimate source is usableVertical()", () => {
    // The positive control. Without it, the assertions above could be passing because the
    // surface rejects everything.
    const pathway = {
      version: {
        versionHash: "hash-a",
        pathwayId: "p-a",
        criteria: { inclusion: [], exclusion: [], escalation: [] },
      },
    } as unknown as UsablePathway;
    const result = usableVertical(
      { verticalId: "v1", name: "Example", members: [{ kind: "pathway", ref: "hash-a" }] },
      { pathways: [pathway], content: [], educationItems: [], intervals: loadIntervals([]) },
    );
    expect(result.usable).toBe(true);
    if (!result.usable) throw new Error("unreachable");
    expect(verticalSurface(result.vertical)).toBe("Example");
  });
});
