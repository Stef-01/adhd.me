// W159 verify gate: "the contradiction is DETECTED and REPORTED, never silently resolved — and
// the resolver reads the detection (Y3-1's corollary)."
//
// The last clause is the one worth testing hardest, because it is the one Y3-1 failed. It is not
// enough that `contradictionsIn` finds a clash; `usableVertical` must be unable to return a
// usable vertical while a blocking clash stands. So the wiring is asserted through W157's
// resolver, not through this module's own return value.

import { describe, expect, it } from "vitest";
import {
  CONTRADICTION_COPY,
  blockingContradictions,
  contradictionsIn,
  reviewContradictions,
  type Contradiction,
  type ContradictionKind,
} from "./consistency";
import { usableVertical, type VerticalEvidence, type VerticalMemberRef } from "./model";
import type { GuidelineInterval } from "@/domain/types";
import type { UsablePathway } from "@/pathways/approval";
import type { PathwayCriteria, PathwayCriterion } from "@/pathways/versioning";
import { loadIntervals } from "@/registers/intervals";

const criterion = (factCode: string, requires: "present" | "absent" = "present"): PathwayCriterion => ({
  factCode,
  requires,
  rationale: "Placeholder — fixture only.",
});

const criteria = (over: Partial<PathwayCriteria> = {}): PathwayCriteria => ({
  inclusion: [],
  exclusion: [],
  escalation: [],
  ...over,
});

const pathway = (versionHash: string, pathwayId: string, c: PathwayCriteria = criteria()) =>
  ({ version: { versionHash, pathwayId, criteria: c } }) as unknown as UsablePathway;

const interval = (id: string, conditionCode: string) =>
  ({ id, conditionCode, name: "Example review", intervalMonths: 12 }) as unknown as GuidelineInterval;

describe("W159 blocking contradictions: no principled winner exists", () => {
  it("finds two versions of one pathway", () => {
    const found = contradictionsIn({
      pathways: [pathway("hash-a", "p-1"), pathway("hash-b", "p-1")],
      intervals: [],
    });
    expect(found.map((c) => c.kind)).toEqual(["two_versions_of_one_pathway"]);
    expect(found[0]?.severity).toBe("blocking");
    expect(found[0]?.members).toEqual(["hash-a", "hash-b"]);
  });

  it("finds two monitoring intervals for one condition", () => {
    const found = contradictionsIn({
      pathways: [],
      intervals: [interval("int-1", "cond-a"), interval("int-2", "cond-a")],
    });
    expect(found.map((c) => c.kind)).toEqual(["two_intervals_for_one_condition"]);
    expect(found[0]?.members).toEqual(["int-1", "int-2"]);
  });

  it("finds a pathway that excludes everyone it includes", () => {
    const found = contradictionsIn({
      pathways: [
        pathway("hash-a", "p-1", criteria({ inclusion: [criterion("f1")], exclusion: [criterion("f1")] })),
      ],
      intervals: [],
    });
    expect(found.map((c) => c.kind)).toEqual(["pathway_unsatisfiable"]);
    expect(found[0]?.subject).toBe("f1");
  });

  it("does NOT flag the ordinary case of including on present and excluding on absent", () => {
    // The polarity matters. "In if they have it, out if they do not" is how a pathway is
    // normally written; flagging it would make the check noise and the check would be turned off.
    const found = contradictionsIn({
      pathways: [
        pathway(
          "hash-a",
          "p-1",
          criteria({ inclusion: [criterion("f1", "present")], exclusion: [criterion("f1", "absent")] }),
        ),
      ],
      intervals: [],
    });
    expect(found).toEqual([]);
  });

  it("finds nothing in a vertical whose members agree", () => {
    // Non-vacuity in the other direction: the checks must be capable of being quiet.
    expect(
      contradictionsIn({
        pathways: [pathway("hash-a", "p-1"), pathway("hash-b", "p-2")],
        intervals: [interval("int-1", "cond-a"), interval("int-2", "cond-b")],
      }),
    ).toEqual([]);
  });
});

describe("W159 review contradictions: a real disagreement this module may not settle", () => {
  it("finds a fact that one member includes on and another escalates on", () => {
    const found = contradictionsIn({
      pathways: [
        pathway("hash-a", "p-1", criteria({ inclusion: [criterion("f1")] })),
        pathway("hash-b", "p-2", criteria({ escalation: [criterion("f1")] })),
      ],
      intervals: [],
    });
    expect(found.map((c) => c.kind)).toEqual(["included_here_escalated_there"]);
    expect(found[0]?.severity).toBe("review");
  });

  it("finds two members requiring the same fact with opposite polarity for entry", () => {
    const found = contradictionsIn({
      pathways: [
        pathway("hash-a", "p-1", criteria({ inclusion: [criterion("f1", "present")] })),
        pathway("hash-b", "p-2", criteria({ inclusion: [criterion("f1", "absent")] })),
      ],
      intervals: [],
    });
    expect(found.map((c) => c.kind)).toEqual(["opposite_entry_polarity"]);
    expect(found[0]?.severity).toBe("review");
  });

  it("says in its copy that Meherr does not decide which side is right", () => {
    // The distinction from Y3-1: that failure RESOLVED an ambiguity with no principled winner.
    // Declining to resolve is the opposite mistake avoided, and the copy has to make that
    // legible to whoever reads the finding.
    expect(CONTRADICTION_COPY.included_here_escalated_there).toContain("Meherr does not decide");
    expect(CONTRADICTION_COPY.opposite_entry_polarity).toContain("clinical judgement");
  });

  it("does not flag a fact that appears in only one member", () => {
    expect(
      contradictionsIn({
        pathways: [
          pathway("hash-a", "p-1", criteria({ inclusion: [criterion("f1")] })),
          pathway("hash-b", "p-2", criteria({ inclusion: [criterion("f2")] })),
        ],
        intervals: [],
      }),
    ).toEqual([]);
  });
});

describe("W159 the resolver reads the detection — Y3-1's corollary", () => {
  const EVIDENCE = (pathways: UsablePathway[], intervals: unknown[] = []): VerticalEvidence => ({
    pathways,
    content: [],
    educationItems: [],
    intervals: loadIntervals(intervals),
  });
  const refs = (...hashes: string[]): VerticalMemberRef[] =>
    hashes.map((ref) => ({ kind: "pathway" as const, ref }));

  it("REFUSES a vertical containing two versions of one pathway", () => {
    // The whole unit. Detecting this and returning `usable: true` would be Y3-1 rebuilt: a
    // conflict filed, and the answer given anyway.
    const result = usableVertical(
      { verticalId: "v1", name: "Example", members: refs("hash-a", "hash-b") },
      EVIDENCE([pathway("hash-a", "p-1"), pathway("hash-b", "p-1")]),
    );
    expect(result.usable).toBe(false);
    if (result.usable) return;
    expect(result.reasons).toEqual(["members_contradict"]);
    expect(result.contradictions.map((c) => c.kind)).toEqual(["two_versions_of_one_pathway"]);
  });

  it("REFUSES a vertical containing an unsatisfiable pathway", () => {
    const bad = pathway(
      "hash-a",
      "p-1",
      criteria({ inclusion: [criterion("f1")], exclusion: [criterion("f1")] }),
    );
    const result = usableVertical(
      { verticalId: "v1", name: "Example", members: refs("hash-a") },
      EVIDENCE([bad]),
    );
    expect(result.usable).toBe(false);
    if (result.usable) return;
    expect(result.reasons).toEqual(["members_contradict"]);
  });

  it("ACCEPTS a vertical whose only findings need review, and carries them with it", () => {
    // Review findings must not block — blocking them would be this module making the clinical
    // judgement it just declined to make — but they must not evaporate either.
    const result = usableVertical(
      { verticalId: "v1", name: "Example", members: refs("hash-a", "hash-b") },
      EVIDENCE([
        pathway("hash-a", "p-1", criteria({ inclusion: [criterion("f1")] })),
        pathway("hash-b", "p-2", criteria({ escalation: [criterion("f1")] })),
      ]),
    );
    expect(result.usable).toBe(true);
    if (!result.usable) return;
    expect(result.vertical.contradictions.map((c) => c.kind)).toEqual([
      "included_here_escalated_there",
    ]);
  });

  it("carries no blocking finding on a usable vertical, by construction", () => {
    const result = usableVertical(
      { verticalId: "v1", name: "Example", members: refs("hash-a") },
      EVIDENCE([pathway("hash-a", "p-1")]),
    );
    expect(result.usable).toBe(true);
    if (!result.usable) return;
    expect(blockingContradictions(result.vertical.contradictions)).toEqual([]);
  });

  it("reports a missing member before comparing members that are not all there", () => {
    const result = usableVertical(
      { verticalId: "v1", name: "Example", members: refs("hash-a", "missing") },
      EVIDENCE([pathway("hash-a", "p-1")]),
    );
    expect(result.usable).toBe(false);
    if (result.usable) return;
    expect(result.reasons).toContain("member_not_usable");
    expect(result.contradictions).toEqual([]);
  });
});

describe("W159 the report does not depend on the order members arrive in", () => {
  // This module exists because of an order-dependence audit finding. Producing findings whose
  // content or sequence depended on member order would be the ninth instance of that class.
  const A = pathway("hash-a", "p-1", criteria({ inclusion: [criterion("f1")] }));
  const B = pathway("hash-b", "p-1", criteria({ escalation: [criterion("f1")] }));
  const I1 = interval("int-1", "cond-a");
  const I2 = interval("int-2", "cond-a");

  it("returns identical findings in both orders", () => {
    const forwards = contradictionsIn({ pathways: [A, B], intervals: [I1, I2] });
    const backwards = contradictionsIn({ pathways: [B, A], intervals: [I2, I1] });
    expect(backwards).toEqual(forwards);
    expect(forwards.length).toBeGreaterThan(1);
  });

  it("names the members of a pair in a fixed order", () => {
    const forwards = contradictionsIn({ pathways: [A, B], intervals: [] });
    const backwards = contradictionsIn({ pathways: [B, A], intervals: [] });
    expect(forwards[0]?.members).toEqual(["hash-a", "hash-b"]);
    expect(backwards[0]?.members).toEqual(["hash-a", "hash-b"]);
  });

  it("reports each unordered pair once, not twice", () => {
    const found = contradictionsIn({ pathways: [A, B], intervals: [] });
    expect(found.filter((c) => c.kind === "included_here_escalated_there")).toHaveLength(1);
  });
});

describe("W159 every finding explains itself, and the severities are exhaustive", () => {
  it("has copy for every kind", () => {
    const kinds: ContradictionKind[] = [
      "two_versions_of_one_pathway",
      "two_intervals_for_one_condition",
      "pathway_unsatisfiable",
      "included_here_escalated_there",
      "opposite_entry_polarity",
    ];
    for (const kind of kinds) expect(CONTRADICTION_COPY[kind].length, kind).toBeGreaterThan(60);
  });

  it("splits every finding into exactly one of blocking or review", () => {
    const all: Contradiction[] = contradictionsIn({
      pathways: [
        pathway("hash-a", "p-1", criteria({ inclusion: [criterion("f1")], exclusion: [criterion("f1")] })),
        pathway("hash-b", "p-1", criteria({ escalation: [criterion("f1")] })),
      ],
      intervals: [interval("int-1", "cond-a"), interval("int-2", "cond-a")],
    });
    expect(all.length).toBeGreaterThan(2);
    expect(blockingContradictions(all).length + reviewContradictions(all).length).toBe(all.length);
    for (const c of blockingContradictions(all)) expect(c.severity).toBe("blocking");
    for (const c of reviewContradictions(all)) expect(c.severity).toBe("review");
  });
});
