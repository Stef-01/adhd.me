// W237: the contract's own test — a deliberately NON-CONFORMANT mapping must fail it.
//
// A contract suite that has only ever run against conformant mappings is a suite nobody has
// watched fail. Every property below is driven through a small broken mapping built to break
// exactly that property and nothing else, so a green run of the real contract means something.
//
// The five properties are the five findings from W235 and W236, and the broken mappings here are
// those defects, reconstructed.

import { describe, expect, it } from "vitest";
import {
  codeSystemsIn,
  contractViolations,
  describeMappingContract,
  type MappingFixture,
} from "./contract";

interface Toy {
  id: string;
  kind: "a" | "b";
  extra: string;
  note: string | null;
  tags: readonly string[];
}

const CORPUS: Toy[] = [
  { id: "1", kind: "a", extra: "keep", note: "  untidy  words ", tags: ["t1", "t2"] },
  { id: "2", kind: "b", extra: "keep", note: null, tags: [] },
  { id: "3", kind: "a", extra: "other", note: "second", tags: ["t3"] },
];

const MUTATIONS: MappingFixture<Toy, unknown>["mutations"] = {
  id: (t) => ({ ...t, id: `${t.id}-x` }),
  kind: (t) => ({ ...t, kind: t.kind === "a" ? "b" : "a" }),
  extra: (t) => ({ ...t, extra: `${t.extra}-x` }),
  note: (t) => ({ ...t, note: t.note === null ? "written" : null }),
  tags: (t) => ({ ...t, tags: [...t.tags, "added"] }),
};

/** A conformant baseline, so every failure below is attributable to the one thing it changes. */
const good = (): MappingFixture<Toy, unknown> => ({
  corpus: CORPUS,
  toResource: (t) => ({
    resource: {
      id: t.id,
      kindCoding: { system: "https://example.test/kind", code: t.kind },
      tagCodings: t.tags.map((code) => ({ system: "https://example.test/tag", code })),
      ...(t.note === null ? {} : { note: t.note }),
    },
    unmapped: [
      {
        field: "extra",
        why: "Deliberately not carried by this toy mapping, so the contract has a named field to check against — and this reason is long enough to satisfy the contract's own bar.",
      },
    ],
  }),
  fromResource: (resource) => {
    const r = resource as Record<string, unknown>;
    const kind = (r.kindCoding as { code?: string } | undefined)?.code;
    if (kind !== "a" && kind !== "b") return { ok: false as const };
    return {
      ok: true as const,
      value: {
        id: String(r.id),
        kind,
        extra: "keep",
        note: typeof r.note === "string" ? r.note : null,
        tags: ((r.tagCodings ?? []) as { code: string }[]).map((c) => c.code),
      },
      unmapped: [],
    };
  },
  mutations: MUTATIONS,
  humanText: (t) => t.note,
});

/**
 * The failures a fixture produces, from the CONTRACT ITSELF.
 *
 * The first version of this file re-implemented all five properties here — which is the shape of
 * three other guards corrected this session: a rule re-stated beside the thing it governs passes
 * whatever the thing does, and drifts from the real rule the first time either is edited. The
 * checks now live in `contractViolations` and both this file and `describeMappingContract` call it.
 */
const failuresOf = (fixture: MappingFixture<Toy, unknown>): string[] =>
  contractViolations(fixture).map((v) => v.failure);

describe("W237 the contract fails a mapping that breaks each property", () => {
  it("passes a conformant toy mapping, so every failure below is attributable", () => {
    expect(failuresOf(good())).toEqual([]);
  });

  it("catches a corpus too small to fail, and one that is uniform", () => {
    // A REAL GAP FOUND BY SEEDING: removing the corpus-size check left every test in the lane
    // green, because no fixture in it has a corpus below three. A vacuity guard that only ever
    // sees corpora which satisfy it is a guard nobody has watched work.
    const tiny = good();
    tiny.corpus = CORPUS.slice(0, 2);
    expect(failuresOf(tiny)).toContain("corpus_too_small");

    const uniform = good();
    uniform.corpus = [CORPUS[0]!, CORPUS[0]!, CORPUS[0]!];
    expect(failuresOf(uniform)).toContain("corpus_uniform");

    const empty = good();
    empty.corpus = [];
    expect(failuresOf(empty)).toContain("corpus_too_small");
  });

  it("catches a named field that is actually carried, and a reason too thin to be one", () => {
    // The other direction of the register, and the bar on its reasons. Both are cheap to get
    // wrong and neither shows up in any fixture the lane currently has.
    const lying = good();
    const base = lying.toResource;
    lying.toResource = (t) => ({
      resource: base(t).resource,
      unmapped: [{ field: "id", why: base(t).unmapped[0]!.why }],
    });
    expect(failuresOf(lying)).toContain("named_but_carried");

    const thin = good();
    const baseThin = thin.toResource;
    thin.toResource = (t) => ({ resource: baseThin(t).resource, unmapped: [{ field: "extra", why: "no" }] });
    expect(failuresOf(thin)).toContain("reason_too_thin");
  });

  it("catches a domain field with no mutation written for it", () => {
    const unchecked = good();
    unchecked.mutations = { ...MUTATIONS };
    delete (unchecked.mutations as Record<string, unknown>).tags;
    expect(failuresOf(unchecked)).toContain("mutation_missing");
  });

  it("catches a silently dropped field", () => {
    const broken = good();
    const base = broken.toResource;
    broken.toResource = (t) => ({ resource: base(t).resource, unmapped: [] });
    expect(failuresOf(broken)).toContain("not_carried_not_named");
  });

  it("catches a field that comes back as a fabricated default", () => {
    // W235's defect exactly: the key reappears, the value is invented. Identity-on-the-key would
    // have missed it; mutating the field is what catches it.
    const broken = good();
    const base = broken.fromResource;
    broken.fromResource = (resource) => {
      const back = base(resource);
      return back.ok ? { ...back, value: { ...back.value, id: "always-this" } } : back;
    };
    expect(failuresOf(broken)).toContain("round_trip");
  });

  it("catches two kinds of code collapsed into one system", () => {
    // W236's defect exactly: the tags and the kind sharing one system.
    const broken = good();
    broken.toResource = (t) => ({
      resource: {
        id: t.id,
        kindCoding: { system: "https://example.test/tag", code: t.kind },
        tagCodings: t.tags.map((code) => ({ system: "https://example.test/tag", code })),
        ...(t.note === null ? {} : { note: t.note }),
      },
      unmapped: good().toResource(t).unmapped,
    });
    expect(failuresOf(broken)).toContain("codes_collapsed");
  });

  it("catches an authored display", () => {
    const broken = good();
    broken.toResource = (t) => {
      const built = good().toResource(t);
      const resource = built.resource as Record<string, unknown>;
      return {
        resource: { ...resource, kindCoding: { ...(resource.kindCoding as object), display: `Kind ${t.kind}` } },
        unmapped: built.unmapped,
      };
    };
    expect(failuresOf(broken)).toContain("display_authored");
  });

  it("catches text tidied in transit", () => {
    const broken = good();
    broken.toResource = (t) => {
      const built = good().toResource(t);
      const resource = built.resource as Record<string, unknown>;
      return {
        resource: { ...resource, ...(t.note === null ? {} : { note: t.note.trim() }) },
        unmapped: built.unmapped,
      };
    };
    const failures = failuresOf(broken);
    expect(failures).toContain("human_text_edited");
    // And the round trip notices too, which is the belt to that braces.
    expect(failures).toContain("round_trip");
  });
});

describe("W237 the contract refuses a corpus that cannot fail", () => {
  it("finds code systems at any depth", () => {
    expect(codeSystemsIn({ a: [{ coding: [{ system: "s1", code: "c" }] }], b: { system: "s2", code: "d" } }).sort())
      .toEqual(["s1", "s2"]);
    expect(codeSystemsIn({ system: "no-code" })).toEqual([]);
  });
});

// The contract, run against the toy mapping for real — so this file exercises the exported suite
// rather than only its reconstruction above.
describeMappingContract("toy (W237 self-test)", good());
