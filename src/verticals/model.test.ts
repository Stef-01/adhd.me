// W157 verify gate: "a vertical is unusable unless every member is usable — W119/W152's branding
// COMPOSED, not re-implemented — and a vertical with one unsigned member is refused with the
// member named."
//
// The composition half is tested twice over: once behaviourally (an unsigned member cannot get
// in) and once against the SOURCE (this module contains none of the vocabulary of sign-off). The
// second is the one that matters in a year's time, because behaviour can be preserved by a
// re-implementation that then drifts.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as verticals from "./model";
import {
  VERTICAL_REFUSAL_COPY,
  usableVertical,
  verticalHash,
  type VerticalEvidence,
  type VerticalMemberRef,
  type VerticalSpec,
} from "./model";
import type { ApprovedContent } from "@/registers/authoring";
import type { RenderableItem } from "@/education/provenance";
import type { UsablePathway } from "@/pathways/approval";
import { loadIntervals } from "@/registers/intervals";

/**
 * Fixtures.
 *
 * The branded values are cast HERE, in the test, which is the point: production code cannot do
 * this, because the brands are only mintable by W69/W119/W152's own gates. A test that could not
 * fabricate them could not exercise this module at all.
 */
// W159 exposed that this fixture was under-specified: an UsablePathway always carries criteria,
// and the original stub omitted them, so it stood in for a shape that cannot exist. Empty
// criteria are the honest minimum — the consistency checks then genuinely find nothing.
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

const EVIDENCE: VerticalEvidence = {
  pathways: [pathway("hash-a"), pathway("hash-b")],
  content: [content("content-1")],
  educationItems: [item("item-1")],
  intervals: INTERVALS,
};

const MEMBERS: VerticalMemberRef[] = [
  { kind: "pathway", ref: "hash-a" },
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

describe("W157 a vertical is usable only when every member is", () => {
  it("accepts a vertical all of whose members are in the signed-off evidence", () => {
    const result = usableVertical(spec(), EVIDENCE);
    expect(result.usable).toBe(true);
    if (!result.usable) return;
    expect(result.vertical.pathways).toHaveLength(1);
    expect(result.vertical.content).toHaveLength(1);
    expect(result.vertical.educationItems).toHaveLength(1);
    expect(result.vertical.intervals).toHaveLength(1);
  });

  it.each<VerticalMemberRef>([
    { kind: "pathway", ref: "hash-unsigned" },
    { kind: "content", ref: "content-unsigned" },
    { kind: "education_item", ref: "item-unsigned" },
    { kind: "interval", ref: "int-unsigned" },
  ])("refuses a vertical with one unusable %o, and NAMES it", (bad) => {
    const result = usableVertical(spec({ members: [...MEMBERS, bad] }), EVIDENCE);
    expect(result.usable).toBe(false);
    if (result.usable) return;
    expect(result.reasons).toContain("member_not_usable");
    expect(result.unusable.map((u) => u.member)).toEqual([bad]);
  });

  it("names EVERY unusable member, not the first", () => {
    // A refusal that names one problem sends somebody round the loop once per member.
    const result = usableVertical(
      spec({
        members: [
          { kind: "pathway", ref: "hash-unsigned" },
          { kind: "content", ref: "content-unsigned" },
        ],
      }),
      EVIDENCE,
    );
    expect(result.usable).toBe(false);
    if (result.usable) return;
    expect(result.unusable).toHaveLength(2);
  });

  it("carries only the members the spec asked for, not everything signed off", () => {
    // `hash-b` is usable and not a member. A vertical that absorbed whatever happened to be
    // signed off would be a different bundle each time the catalogue grew.
    const result = usableVertical(spec(), EVIDENCE);
    expect(result.usable).toBe(true);
    if (!result.usable) return;
    expect(result.vertical.pathways.map((p) => p.version.versionHash)).toEqual(["hash-a"]);
  });

  it("stops being usable the moment a member leaves the evidence", () => {
    // Withdrawal propagates with nothing noticing: evidence is assembled at call time, so a
    // revoked review removes the pathway and the vertical citing it fails on the next call.
    const withdrawn: VerticalEvidence = { ...EVIDENCE, pathways: [pathway("hash-b")] };
    const result = usableVertical(spec(), withdrawn);
    expect(result.usable).toBe(false);
    if (result.usable) return;
    expect(result.unusable.map((u) => u.member.ref)).toEqual(["hash-a"]);
  });

  it("cannot tell 'never existed' from 'no longer signed off', and says so with one reason", () => {
    const result = usableVertical(spec({ members: [{ kind: "pathway", ref: "nope" }] }), EVIDENCE);
    expect(result.usable).toBe(false);
    if (result.usable) return;
    expect(result.unusable[0]?.reason).toBe("absent_from_signed_off_evidence");
  });
});

describe("W157 an empty vertical is refused, because emptiness would pass", () => {
  it("refuses a vertical with no members", () => {
    // "Every member is usable" is VACUOUSLY TRUE of a bundle with none. Without this rule the
    // gate is passable by shipping nothing.
    const result = usableVertical(spec({ members: [] }), EVIDENCE);
    expect(result.usable).toBe(false);
    if (result.usable) return;
    expect(result.reasons).toContain("no_members");
  });

  it("says why in words a reader can act on", () => {
    expect(VERTICAL_REFUSAL_COPY.no_members).toContain("nothing in it to fail");
  });

  it("refuses a vertical with no id or no name", () => {
    expect(usableVertical(spec({ verticalId: " " }), EVIDENCE).usable).toBe(false);
    expect(usableVertical(spec({ name: "" }), EVIDENCE).usable).toBe(false);
  });

  it("refuses the same member listed twice", () => {
    const result = usableVertical(
      spec({ members: [MEMBERS[0]!, MEMBERS[0]!] }),
      EVIDENCE,
    );
    expect(result.usable).toBe(false);
    if (result.usable) return;
    expect(result.reasons).toContain("duplicate_member");
  });
});

describe("W157 the identity of a vertical is its membership", () => {
  it("changes when a member changes", () => {
    const before = verticalHash(MEMBERS);
    const after = verticalHash([...MEMBERS.slice(1), { kind: "pathway", ref: "hash-b" }]);
    expect(after).not.toBe(before);
  });

  it("does not change when the same members are listed in a different order", () => {
    // A version that changed because somebody reordered a list would make W160's migration rules
    // fire on nothing.
    expect(verticalHash([...MEMBERS].reverse())).toBe(verticalHash(MEMBERS));
  });

  it("distinguishes members that share a ref across kinds", () => {
    const a: VerticalMemberRef[] = [{ kind: "pathway", ref: "x" }];
    const b: VerticalMemberRef[] = [{ kind: "content", ref: "x" }];
    expect(verticalHash(a)).not.toBe(verticalHash(b));
  });
});

describe("W157 the gates are composed, never re-implemented", () => {
  it("contains none of the vocabulary of sign-off", () => {
    // The assertion that matters in a year. A fourth implementation of the G5 rule is a fourth
    // thing to keep in step, and the copy is always what drifts. This module may ask whether a
    // member is present in signed-off evidence; it may not work out whether it should be.
    const source = readFileSync(path.join(__dirname, "model.ts"), "utf8");
    const body = source
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
      .join("\n");
    for (const banned of [
      "signedOffBy",
      "signedOffAt",
      "reviewedBy",
      "reviewedAt",
      "specialist_review",
      "founder_sign_off",
      "revokedAt",
      "contentHash(",
      "state ===",
    ]) {
      expect(body, `model.ts decides sign-off itself: "${banned}"`).not.toContain(banned);
    }
  });

  it("exports no way to build a usable vertical without the evidence", () => {
    for (const name of Object.keys(verticals)) {
      expect(name, `"${name}" reads as a bypass`).not.toMatch(
        /^(force|assume|trust|unsafe|asUsable|markUsable)/i,
      );
    }
  });

  it("takes the interval CATALOGUE rather than a bare array", () => {
    // The one asymmetry, pinned so it cannot quietly widen: intervals are gated by validation
    // (W56) rather than by a brand, and taking the catalogue is the strongest available form.
    // Branding them touches the module whose VALUES are blocked on G5 (W163).
    expect(Array.isArray(EVIDENCE.intervals)).toBe(false);
    expect(EVIDENCE.intervals.intervals).toHaveLength(1);
    expect(EVIDENCE.intervals.rejected).toEqual([]);
  });

  it("refuses an interval that W56 rejected at load", () => {
    // The validation gate has to actually bite: a row with no citation never reaches the
    // catalogue, so a vertical naming it is refused.
    const bad = loadIntervals([{ id: "int-bad", conditionCode: "c", name: "x", intervalMonths: 12 }]);
    expect(bad.rejected).toHaveLength(1);
    const result = usableVertical(
      spec({ members: [{ kind: "interval", ref: "int-bad" }] }),
      { ...EVIDENCE, intervals: bad },
    );
    expect(result.usable).toBe(false);
  });
});

describe("W157 every refusal explains itself", () => {
  it("has copy for each reason, in terms of what to do", () => {
    for (const [reason, copy] of Object.entries(VERTICAL_REFUSAL_COPY)) {
      expect(copy.length, reason).toBeGreaterThan(40);
    }
  });
});
