// W250 verify gate: there is ONE answer to "who must act", and a third vertical costs no machinery.
//
// THE TEST THAT MATTERS IS THE RECONCILIATION ONE, and it is worth saying why it did not exist
// before. W158 chose a static per-kind sentence so the chain would be, in its own words, "true of
// every member of that kind and cannot drift". That reasoning is about drifting from the MEMBER's
// state, and it holds. What it did not cover is drifting from another module: the declaration
// layer W191 opened and W248 generalised carries a `waitsOn` per member, and by the time W250
// looked, the two disagreed about whether an education item needs a founder gate at all.
//
// So the property here is not "the sentences match today" — that is a fact that decays. It is that
// a vertical's declared act is what the report PRINTS, so there is one sentence rather than two
// that happen to agree.

import { describe, expect, it } from "vitest";
import { REMAINING_CHAIN } from "./completeness";
import { declareVertical } from "./declare";
import { DERMATOLOGY, DERMATOLOGY_MEMBERS } from "./dermatology";
import { UNDECIDED_VERTICAL } from "./undecided";
import { THIRD_VERTICAL, THIRD_MEMBERS } from "./third";

const ALL = [DERMATOLOGY, UNDECIDED_VERTICAL, THIRD_VERTICAL];

describe("W250 one answer to who must act, across every declared vertical", () => {
  it("prints the declared act itself, never a second wording of it", () => {
    for (const vertical of ALL) {
      const report = vertical.outstanding();
      const printed = new Set(report.outstanding.map((o) => o.chain));
      for (const member of vertical.members) {
        expect(
          printed.has(member.waitsOn),
          `${vertical.spec.verticalId}/${member.ref}: the report does not print the declared act`,
        ).toBe(true);
      }
      // And it prints NOTHING ELSE — no fallback sentence sneaking in beside the declared ones.
      const declared = new Set(vertical.members.map((m) => m.waitsOn));
      for (const chain of printed) {
        expect(declared.has(chain), `${vertical.spec.verticalId}: printed an undeclared act`).toBe(true);
      }
    }
  });

  it("groups by the act, so two members of one kind waiting on different things are separate", () => {
    // W248's second vertical declares two content members: one needing only a signature, one not
    // yet drafted. Grouped by KIND they were one row that was false for one of them.
    const report = UNDECIDED_VERTICAL.outstanding();
    const contentGroups = report.outstanding.filter((o) => o.kinds.includes("content"));
    expect(contentGroups.length, "the two content members collapsed into one act").toBe(2);
    expect(contentGroups.every((g) => g.count === 1)).toBe(true);
  });

  it("still totals every blocked member exactly once, whatever the grouping", () => {
    // Regrouping is where members get lost or double-counted, and neither shows up in a spot check.
    for (const vertical of ALL) {
      const report = vertical.outstanding();
      const total = report.outstanding.reduce((n, o) => n + o.count, 0);
      expect(total, vertical.spec.verticalId).toBe(report.totalMembers - report.readyMembers);
      expect(total).toBe(vertical.members.length);
    }
  });

  it("keeps the fallback for a spec with no declaration behind it", () => {
    // The per-kind chain is still the answer when nothing finer exists — it is the coarser answer
    // now rather than the only one.
    expect(Object.keys(REMAINING_CHAIN).sort()).toEqual([
      "content",
      "education_item",
      "interval",
      "pathway",
    ]);
  });
});

describe("W250 the protected title is gone from the report, not just from the declarations", () => {
  it("appears in no chain a founder reads, declared or fallback", () => {
    // W114 refuses the title everywhere, and W191 already applied that to the declaration layer —
    // its test asserts the `waitsOn` sentences do not use it. `REMAINING_CHAIN` did, twice, in the
    // document the founder actually opens, with the wording pinned into a golden string so it read
    // as intended output. Both layers are checked here so the next edit cannot restore it to one.
    for (const chain of Object.values(REMAINING_CHAIN)) {
      expect(chain).not.toMatch(/\bspecialist\b/i);
    }
    for (const vertical of ALL) {
      for (const member of vertical.members) {
        expect(member.waitsOn, `${vertical.spec.verticalId}/${member.ref}`).not.toMatch(
          /\bspecialist\b/i,
        );
      }
      for (const group of vertical.outstanding().outstanding) {
        expect(group.chain).not.toMatch(/\bspecialist\b/i);
      }
    }
  });

  it("names W119's actual roles instead, which is the more accurate sentence", () => {
    // The correction is not a euphemism swap: W119 requires a reviewer and a separate signatory and
    // does not require the reviewer to hold a protected title. The old wording claimed it did.
    expect(REMAINING_CHAIN.pathway).toMatch(/reviewer/);
    expect(REMAINING_CHAIN.pathway).toMatch(/signatory who is not the reviewer/);
  });
});

describe("W250 a third vertical costs a declaration and no machinery", () => {
  it("is carried by the same door as the other two", () => {
    const rebuilt = declareVertical(THIRD_VERTICAL.declaration);
    expect(rebuilt.spec).toEqual(THIRD_VERTICAL.spec);
    expect(rebuilt.assemble()).toEqual(THIRD_VERTICAL.assemble());
    expect(Object.keys(THIRD_VERTICAL).sort()).toEqual(Object.keys(DERMATOLOGY).sort());
  });

  it("refuses today, naming every member", () => {
    const result = THIRD_VERTICAL.assemble();
    expect(result.usable).toBe(false);
    if (result.usable) return;
    expect(result.unusable.map((m) => m.member.ref).sort()).toEqual(
      THIRD_MEMBERS.map((m) => m.ref).sort(),
    );
  });

  it("differs in shape from both of the others, so three is not one shape three times", () => {
    const profile = (members: readonly { kind: string }[]) =>
      members.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.kind]: (acc[m.kind] ?? 0) + 1 }), {});
    expect(profile(THIRD_MEMBERS)).not.toEqual(profile(DERMATOLOGY_MEMBERS));
    expect(profile(THIRD_MEMBERS)).not.toEqual(profile(UNDECIDED_VERTICAL.members));
  });

  it("names no care area, same as the second", () => {
    for (const member of THIRD_MEMBERS) {
      expect(`${member.ref} ${member.waitsOn}`.toLowerCase()).not.toMatch(
        /\b(women|womens|perinatal|autism|adhd|menopause|maternal|respiratory|asthma|copd)\b/,
      );
    }
    expect(THIRD_VERTICAL.spec.name.toLowerCase()).not.toMatch(
      /\b(women|perinatal|autism|respiratory|asthma|copd)\b/,
    );
  });

  it("reads the same evidence as the other two, because evidence is a fact about the tree", () => {
    expect(THIRD_VERTICAL.evidence()).toEqual(DERMATOLOGY.evidence());
    expect(THIRD_VERTICAL.evidence()).toEqual(UNDECIDED_VERTICAL.evidence());
  });
});
