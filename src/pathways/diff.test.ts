// W122 verify gate: "golden diff; no change renderable without its author and date."
//
// The golden covers the whole rendered document, so the wording a clinical reviewer reads
// cannot drift without a deliberate edit. The provenance gate is tested from both directions:
// the type will not let a diff be built without author and date, and the renderer throws if
// they arrive blank anyway — which is the case that matters, because a diff rehydrated from
// storage has no compiler standing over it.

import { describe, expect, it } from "vitest";
import {
  diffPathwayVersions,
  renderDiff,
  UnattributedDiffError,
  type PathwayDiff,
} from "./diff";
import { versionHash, type PathwayCriteria, type PathwayVersion } from "./versioning";

const criterion = (factCode: string, requires: "present" | "absent", rationale: string) => ({
  factCode,
  requires,
  rationale,
});

function version(criteria: PathwayCriteria, over: Partial<PathwayVersion> = {}): PathwayVersion {
  return {
    pathwayId: "path-1",
    versionHash: versionHash(criteria),
    ordinal: 1,
    criteria,
    state: "published",
    draftedAt: "2026-03-01",
    draftedBy: "author@x.example",
    publishedAt: "2026-03-02",
    publishedBy: "author@x.example",
    supersededAt: null,
    withdrawnAt: null,
    withdrawnBy: null,
    withdrawnReason: null,
    publications: [],
    ...over,
  };
}

const BEFORE: PathwayCriteria = {
  inclusion: [
    criterion("fact_stay", "present", "Placeholder reason, unchanged between versions."),
    criterion("fact_gone", "present", "Placeholder reason for a criterion later removed."),
  ],
  exclusion: [criterion("fact_flip", "present", "Placeholder reason for the flipping rule.")],
  escalation: [criterion("fact_why", "present", "Placeholder reason, first wording.")],
};

const AFTER: PathwayCriteria = {
  inclusion: [
    criterion("fact_stay", "present", "Placeholder reason, unchanged between versions."),
    criterion("fact_new", "absent", "Placeholder reason for a newly added criterion."),
  ],
  exclusion: [criterion("fact_flip", "absent", "Placeholder reason for the flipping rule.")],
  escalation: [criterion("fact_why", "present", "Placeholder reason, second wording.")],
};

const before = version(BEFORE, { ordinal: 3 });
const after = version(AFTER, {
  ordinal: 4,
  draftedBy: "editor@x.example",
  draftedAt: "2026-04-01",
});

const GOLDEN = `# Pathway changes — path-1, version 3 to 4

Drafted by editor@x.example on 2026-04-01.

## Inclusion

- **Removed** \`fact_gone\` — previously must be recorded present.
  - Its stated reason was: Placeholder reason for a criterion later removed.
- **Added** \`fact_new\` — must be recorded absent.
  - Why: Placeholder reason for a newly added criterion.

## Exclusion

- **Changed** \`fact_flip\` — was must be recorded present, now must be recorded absent.
  - Why: Placeholder reason for the flipping rule.

## Escalation

- **Reason rewritten** for \`fact_why\` — the rule itself is unchanged (must be recorded present).
  - Was: Placeholder reason, first wording.
  - Now: Placeholder reason, second wording.

From \`${versionHash(BEFORE).slice(0, 12)}\` to \`${versionHash(AFTER).slice(0, 12)}\`.

A criterion that moved between lists appears twice — once removed, once added — because
moving a rule from inclusion to exclusion inverts what it does to a patient, and one line
would invite that to be read as a tidy-up.
`;

describe("W122 golden diff", () => {
  it("renders the golden exactly", () => {
    expect(renderDiff(diffPathwayVersions(before, after))).toBe(GOLDEN);
  });

  it("orders deterministically — by list, then by fact code", () => {
    const diff = diffPathwayVersions(before, after);
    expect(diff.changes.map((c) => [c.list, c.kind])).toEqual([
      ["inclusion", "removed"],
      ["inclusion", "added"],
      ["exclusion", "requirement_changed"],
      ["escalation", "rationale_changed"],
    ]);
  });

  it("says so when nothing changed, rather than rendering an empty section", () => {
    // "No criteria changed" and a page with no bullet points are different claims, and the
    // second one reads as "nothing important".
    const rendered = renderDiff(diffPathwayVersions(before, version(BEFORE, { ordinal: 4 })));
    expect(rendered).toContain("**No criteria changed.**");
    expect(rendered).not.toContain("## Inclusion");
  });
});

describe("W122 no change is renderable without its author and date", () => {
  it("takes provenance from the after-version's own draft record", () => {
    // Not passed in, so a diff cannot be attributed to somebody who did not draft it.
    const diff = diffPathwayVersions(before, after);
    expect(diff.authoredBy).toBe("editor@x.example");
    expect(diff.authoredAt).toBe("2026-04-01");
  });

  it("refuses to render without an author", () => {
    const diff: PathwayDiff = { ...diffPathwayVersions(before, after), authoredBy: "  " };
    expect(() => renderDiff(diff)).toThrow(UnattributedDiffError);
    expect(() => renderDiff(diff)).toThrow(/nobody can attribute/);
  });

  it("refuses to render without a date", () => {
    const diff: PathwayDiff = { ...diffPathwayVersions(before, after), authoredAt: "" };
    expect(() => renderDiff(diff)).toThrow(UnattributedDiffError);
  });

  it("throws rather than rendering a document with a gap in it", () => {
    // W67's rule: a boolean nobody reads is not a gate, and neither is a placeholder. A diff
    // rendered with "unknown author" would still be read.
    const diff: PathwayDiff = { ...diffPathwayVersions(before, after), authoredBy: "" };
    let rendered: string | null = null;
    try {
      rendered = renderDiff(diff);
    } catch {
      rendered = null;
    }
    expect(rendered).toBeNull();
  });

  it("cannot be constructed without provenance in the first place", () => {
    // Every other field is present and correctly typed, so the ONLY thing wrong with this
    // object is the missing provenance — otherwise the directive would be satisfied by
    // something else and prove nothing (the W65 trap).
    // @ts-expect-error — authoredBy and authoredAt are required on PathwayDiff.
    const diff: PathwayDiff = {
      pathwayId: "path-1",
      fromVersionHash: "a",
      toVersionHash: "b",
      fromOrdinal: 1,
      toOrdinal: 2,
      changes: [],
    };
    expect(diff).toBeDefined();
  });
});

describe("W122 what counts as a change", () => {
  it("a rationale-only edit is a change, with both texts", () => {
    // Easy to render as "no functional change" and wrong: the rationale is the part a
    // clinical reviewer actually reviews, and W118 hashes it, so it IS a new version.
    const rendered = renderDiff(diffPathwayVersions(before, after));
    expect(rendered).toContain("**Reason rewritten**");
    expect(rendered).toContain("Was: Placeholder reason, first wording.");
    expect(rendered).toContain("Now: Placeholder reason, second wording.");
  });

  it("a requirement flip is reported as the headline, not as a rationale edit", () => {
    const both: PathwayCriteria = {
      inclusion: [],
      exclusion: [criterion("fact_flip", "absent", "A different reason as well.")],
      escalation: [],
    };
    const diff = diffPathwayVersions(
      version({ inclusion: [], exclusion: BEFORE.exclusion, escalation: [] }),
      version(both),
    );
    expect(diff.changes.map((c) => c.kind)).toEqual(["requirement_changed"]);
  });

  it("a criterion moved between lists appears twice, as a removal and an addition", () => {
    // Moving a rule from inclusion to exclusion INVERTS what it does to a patient. One line
    // would invite that to be skimmed as a tidy-up.
    const moved = criterion("fact_moved", "present", "Placeholder reason.");
    const diff = diffPathwayVersions(
      version({ inclusion: [moved], exclusion: [], escalation: [] }),
      version({ inclusion: [], exclusion: [moved], escalation: [] }),
    );
    expect(diff.changes.map((c) => [c.list, c.kind])).toEqual([
      ["inclusion", "removed"],
      ["exclusion", "added"],
    ]);
    const rendered = renderDiff(diff);
    expect(rendered).toContain("**Removed** `fact_moved`");
    expect(rendered).toContain("**Added** `fact_moved`");
    expect(rendered).toContain("inverts what it does to a patient");
  });

  it("a removal carries the reason the rule used to give", () => {
    // The reviewer's question about a deletion is what it was there for.
    const rendered = renderDiff(diffPathwayVersions(before, after));
    expect(rendered).toContain("Its stated reason was: Placeholder reason for a criterion later removed.");
  });
});
