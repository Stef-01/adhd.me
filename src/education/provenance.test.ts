// W152 verify gate (runtime half): an item with no signed-off source is not renderable, and a
// source catalogue can only be built from things that already cleared G5. The type half is
// provenance.types.test.ts.

import { describe, expect, it } from "vitest";
import * as provenanceModule from "./provenance";
import {
  PROVENANCE_REFUSAL_COPY,
  type SignedOffSource,
  renderable,
  renderableItems,
  sourcesFromContent,
  sourcesFromPathways,
  unrenderableItems,
} from "./provenance";
import type { EducationItem } from "./curation";
import type { ConditionCode } from "@/domain/types";
import {
  type ContentRecord,
  draft,
  review,
  signOff,
  submitForReview,
  usableContent,
} from "@/registers/authoring";

/**
 * A record driven through W69's real workflow rather than hand-built. The point of this unit is
 * that a source can only come from something that actually cleared G5, so a fixture that faked
 * the signed-off state would test the opposite.
 */
function signedOffRecord(): ContentRecord {
  let record = draft(
    {
      id: "content-1",
      conditionCode: "placeholder_register_a" as ConditionCode,
      kind: "condition_description",
      body: "Placeholder body for a signed-off content record.",
    },
    "author@x.test",
    "2026-03-01T00:00:00Z",
  );
  for (const step of [
    () => submitForReview(record, "author@x.test", "2026-03-02T00:00:00Z"),
    () => review(record, "specialist@x.test", "2026-03-03T00:00:00Z"),
    () => signOff(record, "founder@x.test", "2026-03-04T00:00:00Z"),
  ]) {
    const result = step();
    if (!result.ok) throw new Error(`fixture must advance: ${result.error}`);
    record = result.record;
  }
  return record;
}

function item(over: Partial<EducationItem> = {}): EducationItem {
  return {
    itemId: "item-1",
    conditionCode: "placeholder_register_a",
    title: "Placeholder material",
    sourceRef: "content-1",
    relevantFactCodes: [],
    ...over,
  };
}

const SOURCES: SignedOffSource[] = [
  { ref: "content-1", kind: "register_content", signedOffBy: "founder@x.test", signedOffAt: "2026-03-04T00:00:00Z" },
];

describe("W152 an item with no signed-off source is not renderable", () => {
  it("renders when the source is signed off", () => {
    const result = renderable(item(), SOURCES);
    expect(result.renderable).toBe(true);
    if (!result.renderable) throw new Error("unreachable");
    expect(result.item.source.signedOffBy).toBe("founder@x.test");
  });

  for (const [label, ref] of [
    ["an empty ref", ""],
    ["whitespace", "   "],
  ] as const) {
    it(`refuses ${label}`, () => {
      expect(renderable(item({ sourceRef: ref }), SOURCES)).toEqual({
        renderable: false,
        reason: "no_source_ref",
      });
    });
  }

  it("refuses a plausible-looking ref that is not in the catalogue", () => {
    // The failure that matters is not fabricated material — it is material that LOOKS sourced.
    expect(renderable(item({ sourceRef: "content-99" }), SOURCES)).toEqual({
      renderable: false,
      reason: "source_not_signed_off",
    });
    expect(renderable(item({ sourceRef: "TODO" }), SOURCES).renderable).toBe(false);
  });

  it("refuses everything when nothing is signed off", () => {
    // The shipped state: W69 and W119 both ship with zero sign-offs.
    expect(renderable(item(), []).renderable).toBe(false);
    expect(renderableItems([item(), item({ itemId: "item-2" })], [])).toEqual([]);
  });
});

describe("W152 withdrawal needs no invalidation step", () => {
  it("an item stops being renderable the instant its source leaves the catalogue", () => {
    // The catalogue is assembled from what is signed off AT CALL TIME, so a withdrawn source is
    // simply absent. Nothing has to notice, and no cached flag can go stale.
    const before = renderable(item(), SOURCES);
    expect(before.renderable).toBe(true);

    const afterWithdrawal = SOURCES.filter((s) => s.ref !== "content-1");
    expect(renderable(item(), afterWithdrawal)).toEqual({
      renderable: false,
      reason: "source_not_signed_off",
    });
  });

  it("reports one reason, because it cannot honestly draw the distinction", () => {
    // "Withdrawn" and "never existed" are both simply absent from a catalogue built at call
    // time. Splitting them would mean guessing which one it was.
    expect(PROVENANCE_REFUSAL_COPY.source_not_signed_off).toContain("may have been withdrawn");
  });
});

describe("W152 the catalogue can only be built from cleared content", () => {
  it("exports no way to add a bare string as a source", () => {
    // The guarantee is an absence: there is no addSource(ref: string). Every constructor takes
    // an already-branded value, so an unsigned source cannot get in.
    for (const name of Object.keys(provenanceModule)) {
      expect(name.toLowerCase(), `${name} looks like a back door`).not.toMatch(
        /^(add|register|declare|trust|force|allow)source/,
      );
    }
    expect(Object.keys(provenanceModule)).toContain("sourcesFromContent");
    expect(Object.keys(provenanceModule)).toContain("sourcesFromPathways");
  });

  it("builds sources from W69 register content", () => {
    const record = signedOffRecord();
    const approved = usableContent(record);
    expect(approved).not.toBeNull();

    const [source] = sourcesFromContent([approved!]);
    expect(source).toEqual({
      ref: record.id,
      kind: "register_content",
      signedOffBy: record.signedOffBy,
      signedOffAt: record.signedOffAt,
    });
  });

  it("a draft produces no source at all", () => {
    // usableContent() is the only way to obtain the branded value the constructor requires, and
    // it returns null for anything unsigned — so the catalogue simply has no entry.
    const draftRecord: ContentRecord = { ...signedOffRecord(), state: "draft" };
    expect(usableContent(draftRecord)).toBeNull();
    expect(sourcesFromContent([])).toEqual([]);
  });
});

describe("W152 nothing disappears silently", () => {
  it("every item lands in renderable or unrenderable, with a reason", () => {
    const items = [
      item({ itemId: "ok" }),
      item({ itemId: "no-ref", sourceRef: "" }),
      item({ itemId: "bad-ref", sourceRef: "content-99" }),
    ];
    const shown = renderableItems(items, SOURCES);
    const hidden = unrenderableItems(items, SOURCES);

    expect(shown.map((r) => r.item.itemId)).toEqual(["ok"]);
    expect(hidden.map((h) => [h.item.itemId, h.reason])).toEqual([
      ["no-ref", "no_source_ref"],
      ["bad-ref", "source_not_signed_off"],
    ]);
    expect(shown.length + hidden.length).toBe(items.length);
  });

  it("withheld items are reported, not dropped", () => {
    // W68's reason: an item silently missing from a console is indistinguishable from one that
    // was never authored, and the person who has to fix a broken reference needs telling.
    for (const [reason, copy] of Object.entries(PROVENANCE_REFUSAL_COPY)) {
      expect(copy.length, reason).toBeGreaterThan(40);
    }
  });

  it("sourcesFromPathways keys on the W118 content hash", () => {
    // Not on a pathway id: the hash is the version's identity, so material citing version 3
    // does not silently start citing version 4 when a new one is published.
    const usable = {
      version: { versionHash: "abc123", pathwayId: "path-1" },
      signedOffBy: "founder@x.test",
      signedOffAt: "2026-04-01T00:00:00Z",
    } as unknown as Parameters<typeof sourcesFromPathways>[0][number];

    expect(sourcesFromPathways([usable])).toEqual([
      { ref: "abc123", kind: "pathway_version", signedOffBy: "founder@x.test", signedOffAt: "2026-04-01T00:00:00Z" },
    ]);
  });
});
