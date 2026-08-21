// W248 verify gate: a second vertical, assembled through the SAME code path as the first, refusing
// today with every missing member named, and naming no condition anywhere.
//
// THE CLAIM THAT NEEDS PROVING IS "REUSED, NOT RE-IMPLEMENTED", AND IT IS THE ONE A TEST FILE
// NATURALLY FAILS TO CHECK. The easy version asserts that this vertical refuses and that its
// refusal names five members — every one of which would pass just as well if this file held a
// private copy of the assembly. So the sharing is asserted structurally: the two verticals'
// behaviour is compared where it must agree, and the module's own source is read for a second
// assembly path.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import { lintMessageText } from "@/messaging/templates";
import { DERMATOLOGY, DERMATOLOGY_MEMBERS, assembleDermatology, dermatologyOutstanding } from "./dermatology";
import { declareVertical, treeEvidence } from "./declare";
import { UNDECIDED_MEMBERS, UNDECIDED_NAME_QUESTION, UNDECIDED_VERTICAL } from "./undecided";

describe("W248 the second vertical goes through the first one's machinery", () => {
  it("is assembled by the same function, not by a copy of it", () => {
    // The structural check. `declareVertical` returns an object whose methods close over the
    // declaration, so two verticals built through it have methods that differ only in what they
    // closed over — and a vertical that had grown its own assembly would not match this shape.
    const rebuilt = declareVertical(UNDECIDED_VERTICAL.declaration);
    expect(Object.keys(rebuilt).sort()).toEqual(Object.keys(UNDECIDED_VERTICAL).sort());
    expect(Object.keys(DERMATOLOGY).sort()).toEqual(Object.keys(UNDECIDED_VERTICAL).sort());
    // Rebuilding from the declaration alone reproduces the vertical exactly: nothing about it
    // lives outside the declaration, which is what "the part that differs and nothing else" means.
    expect(rebuilt.spec).toEqual(UNDECIDED_VERTICAL.spec);
    expect(rebuilt.assemble()).toEqual(UNDECIDED_VERTICAL.assemble());
    expect(rebuilt.gates()).toEqual(UNDECIDED_VERTICAL.gates());
  });

  it("reads the same evidence as dermatology, because evidence is a fact about the tree", () => {
    // Not "both are empty" — both are the SAME VALUE, read from the same registries. Two verticals
    // holding two answers to "what has been signed off" would be inventing a distinction that does
    // not exist, and the first one to go stale would be the one nobody was looking at.
    expect(UNDECIDED_VERTICAL.evidence()).toEqual(DERMATOLOGY.evidence());
    expect(UNDECIDED_VERTICAL.evidence()).toEqual(treeEvidence());
  });

  it("holds no assembly of its own, checked against the module's source", () => {
    const source = readFileSync(path.join(__dirname, "undecided.ts"), "utf8");
    const code = source
      .split("\n")
      .filter((line) => {
        const trimmed = line.trimStart();
        return !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
      })
      .join("\n");
    expect(code, "the comment stripper removed the code too").toContain("UNDECIDED_MEMBERS");
    // The functions W248 moved into `declare.ts`. If any reappears here, this file has grown a
    // second copy of the assembly and the two will drift.
    for (const reimplemented of ["usableVertical", "assessCompleteness", "SHIPPED_WORKSPACE", "SHIPPED_INTERVALS"]) {
      expect(code, `${reimplemented} is called directly — the assembly has been copied`).not.toContain(
        reimplemented,
      );
    }
    // It imports exactly one thing from the machinery, which is the declaration door.
    expect(code).toContain('from "./declare"');
  });

  it("differs from dermatology in shape, so 'it generalises' is tested rather than assumed", () => {
    // A second bundle identical to the first proves the machinery works twice on one shape.
    expect(UNDECIDED_MEMBERS.length).not.toBe(DERMATOLOGY_MEMBERS.length);
    const profile = (members: readonly { kind: string }[]) =>
      members.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.kind]: (acc[m.kind] ?? 0) + 1 }), {});
    expect(profile(UNDECIDED_MEMBERS)).not.toEqual(profile(DERMATOLOGY_MEMBERS));
    // And it has the case dermatology does not: two members of one kind waiting on different acts,
    // which is what makes W158's decomposition-by-owner do work rather than restate a member list.
    const contentGates = new Set(
      UNDECIDED_MEMBERS.filter((m) => m.kind === "content").map((m) => m.waitsOn),
    );
    expect(contentGates.size).toBe(2);
  });
});

describe("W248 it refuses today, and names every member rather than the first", () => {
  it("refuses, because nothing is signed off", () => {
    const result = UNDECIDED_VERTICAL.assemble();
    expect(result.usable).toBe(false);
  });

  it("names every missing member, not the first one", () => {
    // The failure mode this exists against: a caller fixes one member, re-runs, finds another —
    // n round trips through a two-person sign-off process, each discovering a fact knowable at
    // the start. W157 returns them all; this pins it for this spec.
    const result = UNDECIDED_VERTICAL.assemble();
    expect(result.usable).toBe(false);
    if (result.usable) return;
    expect(result.unusable.map((m) => m.member.ref).sort()).toEqual(
      UNDECIDED_MEMBERS.map((m) => m.ref).sort(),
    );
    expect(result.unusable.length).toBe(6);
  });

  it("names one fewer member when one member's evidence exists, so the refusal follows the evidence", () => {
    // THIS TEST WAS WEAKER THAN ITS OWN NAME AND A SEEDED FAILURE CAUGHT IT. The first version was
    // called "would become usable if the evidence existed" and never supplied any: it compared
    // member counts between the two verticals, which catches a hardcoded refusal but sails past an
    // assembly that IGNORES the evidence it is handed. Seeding exactly that — an `assemble` that
    // discards its argument — was caught by W191's dermatology suite and NOT by this one. So the
    // evidence is supplied here and the refusal has to move.
    const before = UNDECIDED_VERTICAL.assemble();
    expect(before.usable).toBe(false);
    if (before.usable) return;
    expect(before.unusable.length).toBe(UNDECIDED_MEMBERS.length);

    const pathwayRef = UNDECIDED_MEMBERS.find((m) => m.kind === "pathway")!.ref;
    const after = UNDECIDED_VERTICAL.assemble({
      ...UNDECIDED_VERTICAL.evidence(),
      pathways: [{ version: { versionHash: pathwayRef } }] as unknown as ReturnType<
        typeof treeEvidence
      >["pathways"],
    });
    expect(after.usable, "one member is not a whole vertical").toBe(false);
    if (after.usable) return;
    // The member whose evidence arrived is gone from the refusal, and every other one remains.
    expect(after.unusable.map((m) => m.member.ref)).not.toContain(pathwayRef);
    expect(after.unusable.length).toBe(UNDECIDED_MEMBERS.length - 1);
  });

  it("computes its refusal from THIS spec rather than returning one shape for every vertical", () => {
    const result = UNDECIDED_VERTICAL.assemble();
    const derm = assembleDermatology();
    expect(result.usable).toBe(false);
    expect(derm.usable).toBe(false);
    if (result.usable || derm.usable) return;
    expect(result.unusable.length).toBe(UNDECIDED_MEMBERS.length);
    expect(derm.unusable.length).toBe(DERMATOLOGY_MEMBERS.length);
    expect(derm.unusable.length).not.toBe(result.unusable.length);
  });

  it("decomposes the outstanding work by who has to act", () => {
    const report = UNDECIDED_VERTICAL.outstanding();
    expect(report.members.length).toBe(UNDECIDED_MEMBERS.length);
    expect(report.totalMembers).toBe(UNDECIDED_MEMBERS.length);
    expect(report.readyMembers).toBe(0);
    // The decomposition itself: blockers grouped by what has to happen, which is the shape that
    // turns "6 members not usable" into a plan. Fewer groups than members, or it is a member list
    // with a different heading.
    expect(report.outstanding.length).toBeGreaterThan(0);
    expect(report.outstanding.length).toBeLessThan(UNDECIDED_MEMBERS.length);
    expect(report.outstanding.reduce((n, o) => n + o.count, 0)).toBe(UNDECIDED_MEMBERS.length);
    // W158's shape reached through the shared path, and reporting on THIS spec rather than the one
    // it was written against.
    const dermReport = dermatologyOutstanding();
    expect(dermReport.members.length).toBe(DERMATOLOGY_MEMBERS.length);
    expect(report.members.length).not.toBe(dermReport.members.length);
  });

  it("lists the gates it waits on, deduplicated, and says which need no gate at all", () => {
    const gates = UNDECIDED_VERTICAL.gates();
    expect(gates.length).toBeLessThan(UNDECIDED_MEMBERS.length);
    expect(gates.some((gate) => gate.includes("G5"))).toBe(true);
    // Not everything is a founder gate, and saying so is the useful half.
    expect(gates.some((gate) => gate.includes("No founder gate"))).toBe(true);
    // The protected title appears nowhere, including in internal governance copy (W114).
    expect(gates.join(" ")).not.toMatch(/\bspecialist\b/i);
  });
});

describe("W248 it names no condition, because nobody has picked one", () => {
  const source = readFileSync(path.join(__dirname, "undecided.ts"), "utf8");

  it("makes no clinical claim, checked with the tree's linters rather than a fresh regex", () => {
    for (const declared of UNDECIDED_MEMBERS) {
      expect(lintLandingCopy(declared.waitsOn), declared.ref).toEqual([]);
      expect(lintMessageText(declared.waitsOn), declared.ref).toEqual([]);
    }
    expect(lintLandingCopy(UNDECIDED_VERTICAL.spec.name)).toEqual([]);
    expect(lintLandingCopy(UNDECIDED_NAME_QUESTION)).toEqual([]);
  });

  it("carries no field that could hold what a member says", () => {
    for (const declared of UNDECIDED_MEMBERS) {
      expect(Object.keys(declared).sort()).toEqual(["kind", "ref", "waitsOn"]);
    }
  });

  it("names no care area anywhere — including the one the row asked for", () => {
    // THE WHOLE FILE, comments included, and that is the difference from dermatology's version of
    // this test. There the scan strips comments because the module legitimately discusses
    // dermatology. Here the point is that the domain the row names does not appear AT ALL except
    // where the file explains why it does not: this scan runs over the raw source, and the words
    // below are the pre-reorientation domain and the candidate named in W186's row.
    const mentions = (word: string) => (source.match(new RegExp(`\\b${word}\\b`, "gi")) ?? []).length;
    // "women's health" and "autism" appear only in the provenance note that explains the
    // contradiction — never as a member ref, a spec name or a gate.
    for (const declared of UNDECIDED_MEMBERS) {
      expect(`${declared.ref} ${declared.waitsOn}`.toLowerCase()).not.toMatch(
        /\b(women|womens|perinatal|autism|adhd|menopause|maternal|pregnan\w*)\b/,
      );
    }
    expect(UNDECIDED_VERTICAL.spec.name.toLowerCase()).not.toMatch(
      /\b(women|womens|perinatal|autism|menopause|maternal)\b/,
    );
    expect(UNDECIDED_VERTICAL.spec.verticalId).not.toMatch(/women|autism|perinatal/i);
    // Non-vacuity: the scanner does find the words where they legitimately are, so a zero above
    // means they are absent rather than that the regex never matches anything.
    expect(mentions("autism"), "the scanner matches nothing — the counts above are meaningless").toBeGreaterThan(0);
  });

  it("declares refs as placeholders rather than fabricating version hashes", () => {
    for (const declared of UNDECIDED_MEMBERS) {
      expect(declared.ref).toMatch(/^vert2-/);
      expect(declared.ref).not.toMatch(/^[0-9a-f]{12,}$/);
    }
  });

  it("carries the open question as a value, so it travels with the code waiting on it", () => {
    expect(UNDECIDED_NAME_QUESTION).toMatch(/W186/);
    expect(UNDECIDED_NAME_QUESTION).toMatch(/§4/);
    expect(UNDECIDED_NAME_QUESTION.length).toBeGreaterThan(200);
  });
});

describe("W248 zero clinical content is COMPUTED, not asserted", () => {
  it("reports no signed-off clinical content because it checked, not because it says so", () => {
    // W158's rule: only worth claiming if something checked it. The evidence is read from the
    // tree's registries, so this holds today and stops holding the moment one of them fills.
    const evidence = UNDECIDED_VERTICAL.evidence();
    expect(evidence.pathways).toEqual([]);
    expect(evidence.content).toEqual([]);
    expect(evidence.educationItems).toEqual([]);
    expect(evidence.intervals.intervals).toEqual([]);
    // And the vertical's own verdict follows from that rather than from a constant.
    expect(UNDECIDED_VERTICAL.assemble().usable).toBe(false);
    // W158 already COMPUTES this answer — `noSignedOffClinicalContent` is the report's own field,
    // derived from the evidence above. Reading it is the difference between the row's "asserts
    // zero clinical content present" being checked and being restated: a fresh assertion here
    // would be a second claim about the same fact, and the second claim is the one that drifts.
    const report = UNDECIDED_VERTICAL.outstanding();
    expect(report.noSignedOffClinicalContent).toBe(true);
    expect(report.shippable).toBe(false);
    // Non-vacuity for that field: it is not hardcoded true — it tracks the evidence it was given.
    // The fake carries the one thing the report reads off a pathway, a `version.versionHash`
    // matching a declared member. A shapeless `{}` threw here rather than reporting `false`, which
    // is worth recording: a probe that crashes proves nothing either, and the first version of
    // this assertion would have been deleted as "impossible to write" if the error had been
    // slightly quieter.
    const pathwayRef = UNDECIDED_MEMBERS.find((m) => m.kind === "pathway")!.ref;
    const withContent = UNDECIDED_VERTICAL.outstanding({
      ...UNDECIDED_VERTICAL.evidence(),
      pathways: [{ version: { versionHash: pathwayRef } }] as unknown as ReturnType<
        typeof treeEvidence
      >["pathways"],
    });
    expect(
      withContent.readyMembers,
      "the seeded pathway did not reach the report — the assertion below would pass vacuously",
    ).toBe(1);
    expect(
      withContent.noSignedOffClinicalContent,
      "the field reports the same answer whatever the evidence — it is checking nothing",
    ).toBe(false);
  });
});
