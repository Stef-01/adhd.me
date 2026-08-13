// W119 verify gate (the type half): an unapproved pathway is unusable BY TYPE.
//
// The runtime half lives in approval.test.ts and proves the gate refuses correctly. That is
// not the unit's claim. The claim is that a downstream unit CANNOT ACCEPT an unsigned pathway
// even if its author forgets the gate exists — so the check has to happen in `tsc`, not in
// vitest, and this file is written to fail `pnpm typecheck` rather than to fail a test run.
//
// `@ts-expect-error` is the mechanism: it errors when the line beneath it COMPILES. So if
// anyone widens `UsablePathway` such that a raw `PathwayVersion` satisfies it, or removes the
// brand, these lines start compiling and the build breaks. It is the only way to assert the
// absence of a type error's inverse.
//
// (These are the only `@ts-expect-error` directives in the tree. They are asserting that an
// error EXISTS, which is the opposite of suppressing one — a future audit sweeping for
// suppressed diagnostics should not count them as debt.)

import { describe, expect, it } from "vitest";
import type { UsablePathway } from "./approval";
import { usablePathway } from "./approval";
import { type PathwayEvent, type PathwayVersion, replayPathway, versionHash } from "./versioning";

/** Stands in for W120's evaluator and W123's binding: downstream takes the branded type. */
function downstreamConsumer(pathway: UsablePathway): string {
  return pathway.version.versionHash;
}

const CRITERIA = {
  inclusion: [{ factCode: "placeholder_fact_a", requires: "present" as const, rationale: "r" }],
  exclusion: [],
  escalation: [],
};

function published(): PathwayVersion {
  const hash = versionHash(CRITERIA);
  const events: PathwayEvent[] = [
    { pathwayId: "p", kind: "version_drafted", versionHash: hash, at: "2026-03-01T00:00:00Z", byEmail: "a@x.test", criteria: CRITERIA },
    { pathwayId: "p", kind: "version_published", versionHash: hash, at: "2026-03-02T00:00:00Z", byEmail: "f@x.test" },
  ];
  return replayPathway(events, "p").versions[0]!;
}

describe("W119 the brand cannot be bypassed", () => {
  it("a raw PathwayVersion is not accepted where a UsablePathway is required", () => {
    // The assertions live in a function that is NEVER CALLED. tsc checks its body; the
    // runtime never enters it. Executing these lines would only prove that reading
    // `.version.versionHash` off the wrong shape throws, which is not the claim.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function _brandIsLoadBearing(version: PathwayVersion): void {
      // @ts-expect-error — an unsigned version must not satisfy UsablePathway. Note what
      // this one does and does not prove: a PathwayVersion is missing the reviewedBy/
      // signedOffBy fields too, so it would be rejected on shape even with no brand at all.
      // It guards the everyday mistake (passing the raw version), not the brand.
      downstreamConsumer(version);

      // @ts-expect-error — THIS is the brand's test. Every declared field is present and
      // correctly typed, so the only thing rejecting it is the unforgeable symbol. Deleting
      // the brand makes this line compile and fails `pnpm typecheck` with TS2578, which is
      // how the guarantee was confirmed rather than assumed.
      downstreamConsumer({
        version,
        reviewedBy: "specialist@x.test",
        reviewedAt: "2026-03-03T00:00:00Z",
        signedOffBy: "founder@x.test",
        signedOffAt: "2026-03-04T00:00:00Z",
      });
    }

    // Referenced so the declaration is not dead weight, and so a reader can see it exists.
    expect(typeof _brandIsLoadBearing).toBe("function");
    // And the runtime agrees with the types: the gate refuses this version.
    expect(usablePathway(published(), []).usable).toBe(false);
  });

  it("the only legitimate source is usablePathway()", () => {
    const version = published();
    const attestations = [
      { pathwayId: "p", versionHash: version.versionHash, kind: "specialist_review" as const, byEmail: "s@x.test", at: "2026-03-03T00:00:00Z", finding: "checked" },
      { pathwayId: "p", versionHash: version.versionHash, kind: "founder_sign_off" as const, byEmail: "f@x.test", at: "2026-03-04T00:00:00Z", finding: "accepted" },
    ];
    const result = usablePathway(version, attestations);
    expect(result.usable).toBe(true);
    if (!result.usable) throw new Error("unreachable");

    // Compiles, because it came through the gate. This is the positive control: without it,
    // the two @ts-expect-error lines above could be passing because the consumer rejects
    // everything rather than because the brand works.
    expect(downstreamConsumer(result.pathway)).toBe(version.versionHash);
  });
});
