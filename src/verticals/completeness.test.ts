// W158 verify gate: golden report over a synthetic vertical; it states its own coverage; and it
// asserts zero real clinical content is present.

import { describe, expect, it } from "vitest";
import {
  type KnownMembers,
  REMAINING_CHAIN,
  assessCompleteness,
  renderCompletenessReport,
} from "./completeness";
import type { VerticalEvidence, VerticalMemberRef, VerticalSpec } from "./model";
import type { ApprovedContent } from "@/registers/authoring";
import type { RenderableItem } from "@/education/provenance";
import type { UsablePathway } from "@/pathways/approval";
import { loadIntervals } from "@/registers/intervals";

// Branded values are cast here for the reason W157's tests give: production code cannot mint
// them, so a test that could not fabricate them could not exercise this module at all.
// W159 needs the criteria an UsablePathway always carries; the original stub omitted them and so
// stood in for a shape that cannot exist.
const pathway = (versionHash: string, pathwayId = versionHash) =>
  ({
    version: {
      versionHash,
      pathwayId,
      criteria: { inclusion: [], exclusion: [], escalation: [] },
    },
  }) as unknown as UsablePathway;
const content = (id: string) => ({ record: { id } }) as unknown as ApprovedContent;
const item = (itemId: string) => ({ item: { itemId } }) as unknown as RenderableItem;

const INTERVALS = loadIntervals([
  {
    id: "int-1",
    conditionCode: "placeholder_register_a",
    name: "Example scheduled review",
    intervalMonths: 12,
    provenance: {
      citation: "Synthetic placeholder — not clinical guidance, not a real source",
      url: "https://example.invalid/placeholder",
      publishedOn: "2026-01-01",
      retrievedOn: "2026-01-01",
    },
  },
]);

const EMPTY_INTERVALS = loadIntervals([]);

const MEMBERS: VerticalMemberRef[] = [
  { kind: "pathway", ref: "hash-a" },
  { kind: "pathway", ref: "hash-b" },
  { kind: "content", ref: "content-1" },
  { kind: "education_item", ref: "item-1" },
  { kind: "interval", ref: "int-1" },
];

const spec = (over: Partial<VerticalSpec> = {}): VerticalSpec => ({
  verticalId: "vert-cardiometabolic",
  name: "Example vertical",
  members: MEMBERS,
  ...over,
});

/** Nothing signed off — the state the product actually ships in. */
const NOTHING: VerticalEvidence = {
  pathways: [],
  content: [],
  educationItems: [],
  intervals: EMPTY_INTERVALS,
};

/** One pathway through its gate; everything else outstanding. */
const PARTIAL: VerticalEvidence = { ...NOTHING, pathways: [pathway("hash-a")] };

const EVERYTHING: VerticalEvidence = {
  pathways: [pathway("hash-a"), pathway("hash-b")],
  content: [content("content-1")],
  educationItems: [item("item-1")],
  intervals: INTERVALS,
};

/** Everything written, signed off or not — except `hash-b`, which nobody has authored. */
const KNOWN: KnownMembers = {
  pathwayVersionHashes: ["hash-a"],
  contentIds: ["content-1"],
  educationItemIds: ["item-1"],
  intervalIds: ["int-1"],
};

describe("W158 it groups by what has to happen, not by member", () => {
  it("counts blockers per kind, worst-populated first", () => {
    const report = assessCompleteness(spec(), PARTIAL, KNOWN);
    expect(report.shippable).toBe(false);
    expect(report.readyMembers).toBe(1);
    expect(report.outstanding.map((o) => [o.kind, o.count])).toEqual([
      ["content", 1],
      ["education_item", 1],
      ["interval", 1],
      ["pathway", 1],
    ]);
  });

  it("names the remaining chain, which is a property of the kind", () => {
    // Static per kind rather than inferred per member: true of every member of that kind, so it
    // cannot drift out of step with one member's state.
    const report = assessCompleteness(spec(), PARTIAL, KNOWN);
    for (const group of report.outstanding) {
      expect(group.chain).toBe(REMAINING_CHAIN[group.kind]);
    }
    expect(REMAINING_CHAIN.interval).toContain("nobody can act before it");
  });

  it("an empty vertical is not shippable, which is why shippability is delegated", () => {
    // The trap W157's header names: "every member is usable" is VACUOUSLY TRUE of a vertical
    // with no members, so the obvious local implementation — readyMembers === totalMembers —
    // would report an empty bundle as ready to ship. Asking W157 gets the refusal for free.
    const empty = assessCompleteness(spec({ members: [] }), NOTHING, {
      pathwayVersionHashes: [],
      contentIds: [],
      educationItemIds: [],
      intervalIds: [],
    });
    expect(empty.totalMembers).toBe(0);
    expect(empty.readyMembers).toBe(0);
    expect(empty.readyMembers === empty.totalMembers).toBe(true); // the naive answer...
    expect(empty.shippable).toBe(false); // ...and the right one.
    expect(renderCompletenessReport(empty)).toContain("It cannot ship yet.");
  });

  it("asks W157 whether it can ship rather than deciding again", () => {
    // A second opinion on shippability is a second rule to keep in step.
    expect(assessCompleteness(spec(), EVERYTHING, KNOWN).shippable).toBe(true);
    expect(assessCompleteness(spec(), NOTHING, KNOWN).shippable).toBe(false);
  });
});

describe("W158 it refuses to guess", () => {
  it("with the pool, tells an unwritten member from one awaiting its gate", () => {
    const report = assessCompleteness(spec(), PARTIAL, KNOWN);
    const byRef = new Map(report.members.map((m) => [m.member.ref, m.status]));
    expect(byRef.get("hash-a")).toBe("ready");
    expect(byRef.get("content-1")).toBe("awaiting_gate");
    // Nobody has written hash-b — a different act from signing something off.
    expect(byRef.get("hash-b")).toBe("not_authored");
  });

  it("without the pool, says it cannot tell instead of choosing", () => {
    // From evidence alone the two are indistinguishable, and picking one would invent the more
    // flattering answer roughly half the time.
    const report = assessCompleteness(spec(), PARTIAL);
    const statuses = new Set(report.members.map((m) => m.status));
    expect(statuses).toEqual(new Set(["ready", "indeterminate"]));
    expect(report.coverage.poolSupplied).toBe(false);
  });

  it("never reports which stage of a gate a member is stuck at", () => {
    // Asking would mean a second copy of the sign-off vocabulary W157 avoided.
    const rendered = renderCompletenessReport(assessCompleteness(spec(), PARTIAL, KNOWN));
    for (const banned of ["reviewed by", "awaiting review", "signed off by", "reviewer has"]) {
      expect(rendered.toLowerCase()).not.toContain(banned);
    }
  });
});

describe("W158 zero real clinical content", () => {
  it("is computed, not asserted", () => {
    // Only worth claiming if something checked it.
    expect(assessCompleteness(spec(), NOTHING, KNOWN).noSignedOffClinicalContent).toBe(true);
    expect(assessCompleteness(spec(), PARTIAL, KNOWN).noSignedOffClinicalContent).toBe(false);
  });

  it("holds for the state the product ships in", () => {
    // W69, W119, W152 and W56 all ship with nothing signed off, so a vertical assembled today
    // contains no clinical content whatever its spec names.
    const report = assessCompleteness(spec(), NOTHING);
    expect(report.readyMembers).toBe(0);
    expect(report.noSignedOffClinicalContent).toBe(true);
    expect(renderCompletenessReport(report)).toContain("contains no clinical content");
  });

  it("says the opposite plainly once something is signed off", () => {
    const rendered = renderCompletenessReport(assessCompleteness(spec(), EVERYTHING, KNOWN));
    expect(rendered).toContain("cleared their sign-off and carry clinical content");
  });
});

describe("W158 it states its own coverage", () => {
  it("reports whether it had the pool, and what that cost", () => {
    const without = renderCompletenessReport(assessCompleteness(spec(), PARTIAL));
    expect(without).toContain("CANNOT be told apart");

    const withPool = renderCompletenessReport(assessCompleteness(spec(), PARTIAL, KNOWN));
    expect(withPool).toContain("is told apart from one that is written");
  });

  it("says nothing about kinds the vertical does not contain", () => {
    const narrow = assessCompleteness(
      spec({ members: [{ kind: "pathway", ref: "hash-a" }] }),
      PARTIAL,
      KNOWN,
    );
    expect(narrow.coverage.kindsAssessed).toEqual(["pathway"]);
    expect(renderCompletenessReport(narrow)).toContain("Kinds assessed: pathway.");
  });

  it("carries W157's honest asymmetry rather than smoothing it over", () => {
    const rendered = renderCompletenessReport(assessCompleteness(spec(), EVERYTHING, KNOWN));
    expect(rendered).toContain('"Usable" is a weaker word for intervals');
  });
});

describe("W158 golden report", () => {
  it("renders exactly this, for a partially-built synthetic vertical", () => {
    // One exact string (W20/W96). A report asserted clause by clause passes while its shape
    // rots; this fails on any change to what it says, which is what a golden is for.
    expect(renderCompletenessReport(assessCompleteness(spec(), PARTIAL, KNOWN))).toBe(
      `# Example vertical — what it needs before it can ship

1 of 5 members are ready. It cannot ship yet.

## What is outstanding

Grouped by what has to happen, not by member — the members in one group are all waiting
on the same act, and several of these groups are waiting on the same person.

| Members | Kind | What it needs |
|---|---|---|
| 1 | content | a specialist review and then a founder sign-off (G5) |
| 1 | education_item | an author, and a signed-off source for it to cite |
| 1 | interval | the G5 ruling on guideline values — nobody can act before it |
| 1 | pathway | a specialist review and then a founder sign-off (G5) |

## Members

| Reference | Kind | Status |
|---|---|---|
| hash-a | pathway | ready |
| hash-b | pathway | nothing exists under this reference |
| content-1 | content | written, not yet through its gate |
| item-1 | education_item | written, not yet through its gate |
| int-1 | interval | written, not yet through its gate |

## Clinical content

1 member(s) have cleared their sign-off and carry clinical content.

## What this report could and could not see

A list of everything that exists was supplied, so a reference that names nothing is told apart from one that is written but not yet signed off.

Kinds assessed: content, education_item, interval, pathway. Nothing is said about kinds this vertical does not contain.

"Usable" is a weaker word for intervals than for the other three kinds: pathways, content and education items are gated by a type that cannot be forged, while intervals are gated by validation and could in principle be constructed by hand (W157's own note).

This report never says which stage of a gate a member is stuck at. Knowing a pathway is not usable does not say whether a specialist has looked, and asking here would mean a second copy of the sign-off rules.
`,
    );
  });

  it("a shippable vertical reads differently and drops the outstanding table", () => {
    const rendered = renderCompletenessReport(assessCompleteness(spec(), EVERYTHING, KNOWN));
    expect(rendered).toContain("Every member of this vertical is usable. It can ship.");
    expect(rendered).not.toContain("## What is outstanding");
  });
});
