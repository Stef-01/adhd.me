// W118 verify gate: a published version is immutable, edits create a new version, and replay
// reproduces any version.

import { describe, expect, it } from "vitest";
import * as versioningModule from "./versioning";
import {
  PATHWAY_REJECTION_COPY,
  type PathwayCriteria,
  type PathwayEvent,
  SHIPPED_PATHWAYS,
  currentPathway,
  pathwayAt,
  replayPathway,
  versionHash,
} from "./versioning";

const PATHWAY = "pathway-placeholder-a";

function criteria(over: Partial<PathwayCriteria> = {}): PathwayCriteria {
  return {
    inclusion: [
      { factCode: "placeholder_fact_a", requires: "present", rationale: "placeholder rationale" },
    ],
    exclusion: [],
    escalation: [],
    ...over,
  };
}

function drafted(c: PathwayCriteria, at: string, by = "author@example.test"): PathwayEvent {
  return { pathwayId: PATHWAY, kind: "version_drafted", versionHash: versionHash(c), at, byEmail: by };
}

function draftedWithBody(c: PathwayCriteria, at: string, by = "author@example.test"): PathwayEvent {
  return { ...drafted(c, at, by), criteria: c };
}

function published(c: PathwayCriteria, at: string, by = "founder@example.test"): PathwayEvent {
  return { pathwayId: PATHWAY, kind: "version_published", versionHash: versionHash(c), at, byEmail: by };
}

describe("W118 G5: the catalogue ships empty", () => {
  it("no pathway content is shipped", () => {
    // Pinned so clinical content cannot arrive ahead of the ruling — the W68/W121 posture.
    expect(SHIPPED_PATHWAYS).toEqual([]);
  });
});

describe("W118 identity is content", () => {
  it("the same criteria hash the same, always", () => {
    expect(versionHash(criteria())).toBe(versionHash(criteria()));
  });

  it("any change to any field produces a different version", () => {
    const base = versionHash(criteria());
    const changes: PathwayCriteria[] = [
      criteria({ inclusion: [{ factCode: "other", requires: "present", rationale: "placeholder rationale" }] }),
      criteria({ inclusion: [{ factCode: "placeholder_fact_a", requires: "absent", rationale: "placeholder rationale" }] }),
      criteria({ inclusion: [{ factCode: "placeholder_fact_a", requires: "present", rationale: "different" }] }),
      criteria({ exclusion: [{ factCode: "x", requires: "absent", rationale: "r" }] }),
      criteria({ escalation: [{ factCode: "y", requires: "present", rationale: "r" }] }),
    ];
    for (const changed of changes) expect(versionHash(changed)).not.toBe(base);
  });

  it("reordering criteria produces a new version, conservatively", () => {
    // Reordering does not change meaning, so this is a new version for a change that arguably
    // is not one. That is the safe direction: treating two differently-ordered documents as
    // one version would let an audit be shown something that is not what the author approved.
    const two = criteria({
      inclusion: [
        { factCode: "a", requires: "present", rationale: "r" },
        { factCode: "b", requires: "present", rationale: "r" },
      ],
    });
    const swapped = criteria({ inclusion: [...two.inclusion].reverse() });
    expect(versionHash(swapped)).not.toBe(versionHash(two));
  });
});

describe("W118 a published version is immutable", () => {
  it("the module exports no way to change one", () => {
    // The guarantee is an absence. A mutable pathway store could only ever answer what a
    // version says NOW, and the question an audit asks is what it said in March.
    for (const name of Object.keys(versioningModule)) {
      expect(name.toLowerCase(), `${name} looks like a mutator`).not.toMatch(
        /^(update|edit|set|patch|mutate|amend|rewrite|delete|remove)/,
      );
    }
    // Non-vacuous: the module does export things.
    expect(Object.keys(versioningModule).length).toBeGreaterThan(5);
  });

  it("editing a published version is a new version, and the old one survives intact", () => {
    const v1 = criteria();
    const v2 = criteria({ exclusion: [{ factCode: "excl", requires: "present", rationale: "r" }] });
    const history = replayPathway(
      [
        draftedWithBody(v1, "2026-03-01T00:00:00Z"),
        published(v1, "2026-03-02T00:00:00Z"),
        draftedWithBody(v2, "2026-06-01T00:00:00Z"),
        published(v2, "2026-06-02T00:00:00Z"),
      ],
      PATHWAY,
    );

    expect(history.versions).toHaveLength(2);
    const [first, second] = history.versions;
    expect(first!.state).toBe("superseded");
    expect(first!.criteria).toEqual(v1); // unchanged by the later edit
    expect(first!.supersededAt).toBe("2026-06-02T00:00:00Z");
    expect(second!.state).toBe("published");
    expect(history.rejected).toEqual([]);
  });

  it("publishing the same version twice is refused", () => {
    const v1 = criteria();
    const history = replayPathway(
      [
        draftedWithBody(v1, "2026-03-01T00:00:00Z"),
        published(v1, "2026-03-02T00:00:00Z"),
        published(v1, "2026-04-02T00:00:00Z"),
      ],
      PATHWAY,
    );
    expect(history.rejected).toHaveLength(1);
    expect(history.rejected[0]?.reason).toBe("already_published");
    expect(history.versions[0]?.publishedAt).toBe("2026-03-02T00:00:00Z");
  });
});

describe("W118 replay reproduces any version", () => {
  const v1 = criteria();
  const v2 = criteria({ inclusion: [{ factCode: "second", requires: "present", rationale: "r" }] });
  const events = [
    draftedWithBody(v1, "2026-03-01T00:00:00Z"),
    published(v1, "2026-03-02T00:00:00Z"),
    draftedWithBody(v2, "2026-06-01T00:00:00Z"),
    published(v2, "2026-06-02T00:00:00Z"),
  ];

  it("answers what was in force at an instant, not what is in force now", () => {
    // The question an audit asks about a decision made in March.
    expect(pathwayAt(events, PATHWAY, "2026-04-15T00:00:00Z")?.criteria).toEqual(v1);
    expect(pathwayAt(events, PATHWAY, "2026-07-15T00:00:00Z")?.criteria).toEqual(v2);
    expect(currentPathway(events, PATHWAY)?.criteria).toEqual(v2);
  });

  it("nothing in force before the first publication is null, not an error", () => {
    expect(pathwayAt(events, PATHWAY, "2026-01-01T00:00:00Z")).toBeNull();
    // Including the window between drafting and publishing — a draft is not in force.
    expect(pathwayAt(events, PATHWAY, "2026-03-01T12:00:00Z")).toBeNull();
  });

  it("the boundary instant belongs to the version published at it", () => {
    expect(pathwayAt(events, PATHWAY, "2026-03-02T00:00:00Z")?.criteria).toEqual(v1);
    expect(pathwayAt(events, PATHWAY, "2026-06-02T00:00:00Z")?.criteria).toEqual(v2);
  });

  it("at most one version is in force at any instant", () => {
    for (const at of [
      "2026-03-02T00:00:00Z",
      "2026-04-01T00:00:00Z",
      "2026-06-02T00:00:00Z",
      "2026-12-01T00:00:00Z",
    ]) {
      const inForce = replayPathway(events, PATHWAY).versions.filter(
        (v) => v.publishedAt !== null && v.publishedAt <= at && (v.supersededAt === null || v.supersededAt > at),
      );
      expect(inForce.length, `two versions in force at ${at}`).toBeLessThanOrEqual(1);
    }
  });

  it("two versions published at the same instant: the later one is in force", () => {
    // Found by mutation-checking the supersession guard, which turned out to be compensating
    // for a wrong selection rather than expressing the rule — at a shared timestamp the old
    // implementation returned null, reporting no pathway in force when one plainly was.
    const a = criteria({ inclusion: [{ factCode: "a", requires: "present", rationale: "r" }] });
    const b = criteria({ inclusion: [{ factCode: "b", requires: "present", rationale: "r" }] });
    const same = "2026-05-01T00:00:00Z";
    const at = [
      draftedWithBody(a, "2026-04-01T00:00:00Z"),
      draftedWithBody(b, "2026-04-02T00:00:00Z"),
      published(a, same),
      published(b, same),
    ];

    expect(pathwayAt(at, PATHWAY, same)?.criteria).toEqual(b);
    expect(pathwayAt(at, PATHWAY, "2026-09-01T00:00:00Z")?.criteria).toEqual(b);
    expect(currentPathway(at, PATHWAY)?.criteria).toEqual(b);
  });

  it("ingest order cannot change the verdict", () => {
    const shuffled = [events[3]!, events[1]!, events[2]!, events[0]!];
    expect(replayPathway(shuffled, PATHWAY)).toEqual(replayPathway(events, PATHWAY));
  });

  it("another pathway's events are not replayed into this one", () => {
    const foreign: PathwayEvent = { ...draftedWithBody(v1, "2026-02-01T00:00:00Z"), pathwayId: "other" };
    expect(replayPathway([foreign, ...events], PATHWAY)).toEqual(replayPathway(events, PATHWAY));
  });
});

describe("W118 nothing is dropped silently", () => {
  it("every event lands in applied or rejected", () => {
    const v1 = criteria();
    const events: PathwayEvent[] = [
      draftedWithBody(v1, "2026-03-01T00:00:00Z"),
      draftedWithBody(v1, "2026-03-03T00:00:00Z"), // same content
      published(v1, "2026-03-04T00:00:00Z"),
      published(criteria({ exclusion: [{ factCode: "never-drafted", requires: "present", rationale: "r" }] }), "2026-03-05T00:00:00Z"),
      drafted(v1, "2026-03-06T00:00:00Z"), // no criteria carried
    ];
    const history = replayPathway(events, PATHWAY);
    expect(history.applied.length + history.rejected.length).toBe(events.length);
    expect(history.rejected.map((r) => r.reason)).toEqual([
      "duplicate_draft",
      "unknown_version",
      "missing_criteria",
    ]);
  });

  it("a hash that does not describe its own criteria is refused", () => {
    // Recomputed rather than trusted: otherwise a version could be published under an
    // identity it does not have, and the audit trail would name the wrong document.
    const lying: PathwayEvent = { ...draftedWithBody(criteria(), "2026-03-01T00:00:00Z"), versionHash: "0".repeat(64) };
    const history = replayPathway([lying], PATHWAY);
    expect(history.versions).toEqual([]);
    expect(history.rejected[0]?.reason).toBe("hash_mismatch");
  });

  it("an empty draft is refused", () => {
    const empty = { inclusion: [], exclusion: [], escalation: [] };
    const history = replayPathway([draftedWithBody(empty, "2026-03-01T00:00:00Z")], PATHWAY);
    expect(history.rejected[0]?.reason).toBe("missing_criteria");
  });

  it("every rejection has copy that says what to do", () => {
    for (const [reason, copy] of Object.entries(PATHWAY_REJECTION_COPY)) {
      expect(copy.length, reason).toBeGreaterThan(30);
    }
  });
});
