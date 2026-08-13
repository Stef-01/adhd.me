// W191 verify gate: "the vertical is refused while its content is unsigned, with the missing
// member named."
//
// Two clauses, and the second is the one that needs work. "Refused" is one assertion. "With the
// missing member NAMED" means every member, in a stable order, with nothing dropped and nothing
// invented — because the failure this prevents is a caller fixing one member, re-running, and
// discovering the next, n times through a reviewer-then-signatory sign-off process.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DERMATOLOGY_MEMBERS,
  DERMATOLOGY_SPEC,
  assembleDermatology,
  dermatologyEvidence,
  dermatologyGates,
  dermatologyOutstanding,
} from "./dermatology";
import { VERTICAL_REFUSAL_COPY, type VerticalEvidence } from "./model";
import { lintLandingCopy } from "@/compliance/landing";
import { lintMessageText } from "@/messaging/templates";

describe("W191 the vertical is refused while its content is unsigned", () => {
  it("refuses today", () => {
    const result = assembleDermatology();
    expect(result.usable).toBe(false);
  });

  it("refuses because members are not usable, not for some incidental reason", () => {
    // A spec that refused for being unnamed or empty would pass "it refuses" while proving
    // nothing about sign-off. The reason has to be the one the gate is about.
    const result = assembleDermatology();
    if (result.usable) throw new Error("expected a refusal");
    expect(result.reasons).toContain("member_not_usable");
    expect(result.reasons).not.toContain("no_members");
    expect(result.reasons).not.toContain("unnamed");
    expect(result.reasons).not.toContain("duplicate_member");
  });

  it("names EVERY missing member, not the first", () => {
    // The gate's second clause. A refusal naming one member costs a round trip per member
    // through a process whose latency is a reviewer's calendar.
    const result = assembleDermatology();
    if (result.usable) throw new Error("expected a refusal");
    expect(result.unusable.map((u) => u.member.ref)).toEqual(
      DERMATOLOGY_MEMBERS.map((m) => m.ref),
    );
  });

  it("names them with their kind, so a reader knows which registry to look in", () => {
    const result = assembleDermatology();
    if (result.usable) throw new Error("expected a refusal");
    expect(result.unusable.map((u) => `${u.member.kind}:${u.member.ref}`)).toEqual(
      DERMATOLOGY_MEMBERS.map((m) => `${m.kind}:${m.ref}`),
    );
  });

  it("gives the same reason for every one of them, rather than guessing between two", () => {
    // "Not signed off" and "does not exist" are indistinguishable from assembled evidence, and
    // W157 refuses to invent the difference. Pinned here because a spec whose members do not
    // exist AT ALL is the case where inventing the flattering answer would be most tempting.
    const result = assembleDermatology();
    if (result.usable) throw new Error("expected a refusal");
    for (const entry of result.unusable) {
      expect(entry.reason).toBe("absent_from_signed_off_evidence");
    }
  });

  it("reports no contradictions, because members must exist before they can disagree", () => {
    const result = assembleDermatology();
    if (result.usable) throw new Error("expected a refusal");
    expect(result.contradictions).toEqual([]);
  });
});

describe("W191 the refusal is stable and complete", () => {
  it("is identical whatever order the members are declared in", () => {
    const reversed: VerticalEvidence = dermatologyEvidence();
    const forwards = assembleDermatology(reversed);
    const backwards = assembleDermatology({
      ...reversed,
      content: [...reversed.content].reverse(),
    });
    if (forwards.usable || backwards.usable) throw new Error("expected refusals");
    expect(backwards.unusable).toEqual(forwards.unusable);
  });

  it("still refuses, and names only what remains, when some members land", () => {
    // The half-signed state is the one this has to get right: a vertical that started reporting
    // "usable" the moment the first member cleared would be the worst possible bug here.
    const partial: VerticalEvidence = {
      ...dermatologyEvidence(),
      educationItems: [{ item: { itemId: "derm-education-1" } }] as unknown as VerticalEvidence["educationItems"],
    };
    const result = assembleDermatology(partial);
    if (result.usable) throw new Error("expected a refusal");
    expect(result.unusable.map((u) => u.member.ref)).not.toContain("derm-education-1");
    expect(result.unusable).toHaveLength(DERMATOLOGY_MEMBERS.length - 1);
  });

  it("carries copy explaining the refusal, so a console never has to write its own", () => {
    expect(VERTICAL_REFUSAL_COPY.member_not_usable).toContain("sign-off");
  });
});

describe("W191 the outstanding work is decomposed by who has to act", () => {
  it("applies W158's report rather than re-deriving a member list", () => {
    // "5 members not usable" is not a plan. W158 exists on that argument and this uses it.
    const report = dermatologyOutstanding();
    expect(report.members).toHaveLength(DERMATOLOGY_MEMBERS.length);
    const source = readFileSync(path.join(__dirname, "dermatology.ts"), "utf8");
    expect(source).toContain("assessCompleteness");
  });

  it("says indeterminate rather than guessing, with no pool of what exists", () => {
    // W158's first refusal: without a second input, "exists but unsigned" and "never authored"
    // are the same absence. Nothing here exists, so indeterminate is also the true answer.
    for (const assessment of dermatologyOutstanding().members) {
      expect(assessment.status).toBe("indeterminate");
    }
  });

  it("distinguishes them once told what exists at all", () => {
    const report = dermatologyOutstanding(dermatologyEvidence(), {
      pathwayVersionHashes: ["derm-pathway-1"],
      contentIds: [],
      educationItemIds: [],
      intervalIds: [],
    });
    const byRef = new Map(report.members.map((m) => [m.member.ref, m.status]));
    expect(byRef.get("derm-pathway-1")).toBe("awaiting_gate");
    expect(byRef.get("derm-pathway-2")).toBe("not_authored");
  });

  it("names the gate each member waits on, which is what a founder is pricing", () => {
    const gates = dermatologyGates();
    expect(gates.join(" ")).toContain("G5");
    expect(gates.join(" ")).toContain("W119");
    // The protected title appears nowhere, including in internal governance copy (W114).
    expect(gates.join(" ")).not.toMatch(/\bspecialist\b/i);
    // Not everything is a founder gate, and saying so is the useful half: one member needs an
    // author and no signature at all.
    expect(gates.some((gate) => gate.includes("No founder gate"))).toBe(true);
  });
});

describe("W191 the G5 line — governance is declared, content is not", () => {
  const source = readFileSync(path.join(__dirname, "dermatology.ts"), "utf8");
  const code = source
    .split("\n")
    .filter((line) => {
      const trimmed = line.trimStart();
      return !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
    })
    .join("\n");

  it("has code to scan", () => {
    expect(code).toContain("DERMATOLOGY_MEMBERS");
  });

  it("makes no clinical claim, checked with the tree's linters rather than a fresh regex", () => {
    // W127's rule with a different file extension: the natural way to make a member list
    // readable is to say what each member is FOR, and what a dermatology pathway is for IS the
    // content G5 gates. The linters are applied, not restated — W139/W184's law.
    for (const declared of DERMATOLOGY_MEMBERS) {
      expect(lintLandingCopy(declared.waitsOn), declared.ref).toEqual([]);
      expect(lintMessageText(declared.waitsOn), declared.ref).toEqual([]);
    }
    expect(lintLandingCopy(DERMATOLOGY_SPEC.name)).toEqual([]);
  });

  it("carries no field that could hold what a member says", () => {
    // The obvious addition is a one-line description per member. It does not exist, because for
    // a clinical pathway that line is the gated content.
    for (const declared of DERMATOLOGY_MEMBERS) {
      expect(Object.keys(declared).sort()).toEqual(["kind", "ref", "waitsOn"]);
    }
  });

  it("names no condition, symptom or clinical criterion anywhere in its code", () => {
    expect(code).not.toMatch(
      /\b(acne|eczema|psoriasis|melanoma|rash|lesion|biopsy|mole|dermatitis|itch)\b/i,
    );
  });

  it("declares refs as placeholders rather than fabricating version hashes", () => {
    // A real version hash is the hash of signed content. Inventing one would put a fabricated
    // identity into W160's migration path, where it would look exactly like a real one.
    for (const declared of DERMATOLOGY_MEMBERS) {
      expect(declared.ref).toMatch(/^derm-/);
      expect(declared.ref).not.toMatch(/^[0-9a-f]{12,}$/);
    }
  });
});

describe("W191 the spec itself is well-formed, so the refusal means what it says", () => {
  it("declares no member twice", () => {
    const keys = DERMATOLOGY_SPEC.members.map((m) => `${m.kind}:${m.ref}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("declares members of every kind the model knows about", () => {
    // A spec exercising one kind would leave the other three registries untested against it.
    expect(new Set(DERMATOLOGY_SPEC.members.map((m) => m.kind))).toEqual(
      new Set(["pathway", "content", "education_item", "interval"]),
    );
  });

  it("keeps the spec and the declaration in step", () => {
    expect(DERMATOLOGY_SPEC.members).toEqual(
      DERMATOLOGY_MEMBERS.map(({ kind, ref }) => ({ kind, ref })),
    );
  });
});
