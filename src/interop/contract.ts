// W237: the interop conformance contract. Any mapping — appointments now, referrals now, whatever
// arrives next — must pass this suite. Import `describeMappingContract` from the mapping's own
// test file; that green run IS the definition of a conformant mapping. W27's shape, and W27's
// reason: a bar nobody has to remember is a bar that holds.
//
// THE FIVE PROPERTIES ARE THE FINDINGS, NOT THE HABITS. Both mappings in this lane were written
// in the same hour by the same session, so a contract derived from what they DO would encode my
// habits and pass anything I would have written anyway. Each property below was a real defect in
// this tree within the hour before this file existed, and none of them is something a mapping's
// author thinks about unprompted:
//
//   1. ROUND TRIP IS TOTAL. Every record in the corpus survives out and back, compared by value.
//      W235 found `appointmentType` silently dropped by its own first draft.
//
//   2. AN UNCARRIED FIELD IS NAMED, AND "CARRIED" MEANS THE VALUE SURVIVES. W235's first field
//      check asked whether the key REAPPEARED — and `generatedByInvitation` always reappears,
//      fabricated as `false`, so a seeded `unmapped: []` left it green. The contract mutates.
//
//   3. NOTHING IS COLLAPSED. Two distinct kinds of code must not share one slot. W236 found its
//      condition code and its recorded facts both going into `orderDetail`, so a receiver could
//      not tell them apart and the reader handed back a null and an extra fact.
//
//   4. NO HUMAN-READABLE CLINICAL LABEL IS AUTHORED. A `display` beside a code is where the
//      sentence a receiving clinician reads gets written, one field further down than anybody
//      looks. Checked on the serialised resource, because a type is what a later `display?:
//      string` widens.
//
//   5. TEXT A PERSON WROTE ARRIVES UNCHANGED. Not trimmed, not normalised. W236's fixture is
//      deliberately untidy because tidying is the edit a reviewer calls harmless.
//
// AND IT IS VACUITY-PROOF BY CONSTRUCTION. A contract suite is the easiest place in a tree to
// write assertions that pass over an empty corpus — W27 takes a `populatedRange` AND an
// `emptyRange` for exactly this reason. This one refuses a corpus that is empty or uniform, so
// "every record round-trips" cannot be true because there were no records.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

export interface MappingFixture<Domain, Resource> {
  /**
   * Records to round-trip. At least three, and they must not all be identical — the contract
   * refuses a corpus that cannot fail.
   */
  corpus: readonly Domain[];
  toResource: (value: Domain) => { resource: Resource; unmapped: readonly { field: string; why: string }[] };
  fromResource: (
    resource: unknown,
  ) => { ok: true; value: Domain; unmapped: readonly { field: string; why: string }[] } | { ok: false };
  /**
   * One mutation per domain field, so "carried" can be tested as "the change survives" rather than
   * as "the key reappeared". Checked against a record's own keys, so a new field with no mutation
   * fails rather than passing unnoticed.
   */
  mutations: Record<string, (value: Domain) => Domain>;
  /** Fields a caller supplies rather than the resource carrying them. Named, never silent. */
  suppliedByCaller?: readonly string[];
  /** Where free text a person wrote lives, if anywhere. `null` when the mapping carries none. */
  humanText: ((value: Domain) => string | null) | null;
}

/** Every code system this lane may emit. Two distinct kinds of code may not share one. */
export function codeSystemsIn(resource: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node !== "object" || node === null) return;
    const record = node as Record<string, unknown>;
    if (typeof record.system === "string" && typeof record.code === "string") out.push(record.system);
    Object.values(record).forEach(walk);
  };
  walk(resource);
  return out;
}

/** One property a mapping can fail, and what failing it means. */
export type ContractFailure =
  | "corpus_too_small"
  | "corpus_uniform"
  | "round_trip"
  | "mutation_missing"
  | "not_carried_not_named"
  | "named_but_carried"
  | "reason_too_thin"
  | "codes_collapsed"
  | "display_authored"
  | "human_text_edited";

export interface ContractViolation {
  failure: ContractFailure;
  detail: string;
}

/**
 * Run every property against a fixture and return what failed. Pure — no test framework.
 *
 * THE CHECKS LIVE HERE AND NOWHERE ELSE. `describeMappingContract` wraps this in `it()` blocks and
 * the contract's own test calls it directly, so there is one implementation rather than two that
 * agree until they do not. The first version of that test re-implemented all five properties in the
 * test file, which is the same shape as three other guards corrected this session: a rule
 * re-stated beside the thing it governs passes whatever the thing does.
 */
export function contractViolations<Domain, Resource>(
  fixture: MappingFixture<Domain, Resource>,
): ContractViolation[] {
  const out: ContractViolation[] = [];
  const add = (failure: ContractFailure, detail: string) => out.push({ failure, detail });
  const { corpus, toResource, fromResource, mutations, suppliedByCaller, humanText } = fixture;

  if (corpus.length < 3) add("corpus_too_small", `${corpus.length} records`);
  if (corpus.length > 0 && new Set(corpus.map((v) => JSON.stringify(v))).size <= 1) {
    add("corpus_uniform", "every record in the corpus is identical");
  }
  if (corpus.length === 0) return out;

  const first = corpus[0]!;
  const named = new Set([...toResource(first).unmapped.map((u) => u.field), ...(suppliedByCaller ?? [])]);
  const strip = (v: Domain) => {
    const copy = { ...(v as Record<string, unknown>) };
    for (const field of named) delete copy[field];
    return JSON.stringify(copy);
  };
  const same = (a: unknown, b: unknown) =>
    a === b || (typeof a === "object" && typeof b === "object" && JSON.stringify(a) === JSON.stringify(b));

  // W247: these two details used to carry `JSON.stringify(value).slice(0, 60)` — the first sixty
  // characters of the record itself. Harmless over the synthetic corpora this runs against today,
  // and a patient-data leak onto an error path the first time a conformance check is pointed at
  // real records, which is exactly what a conformance check is for. The index identifies the record
  // for anybody holding the corpus and tells anybody who is not holding it nothing at all.
  corpus.forEach((value, index) => {
    const back = fromResource(toResource(value).resource);
    if (!back.ok) {
      add("round_trip", `record ${index} did not survive the round trip`);
      return;
    }
    if (strip(back.value) !== strip(value)) {
      add("round_trip", `record ${index} changed across the round trip`);
    }
  });

  const fields = Object.keys(first as Record<string, unknown>);
  for (const field of fields) {
    const mutate = mutations[field];
    if (mutate === undefined) {
      add("mutation_missing", `${field} has no mutation, so it can pass unchecked`);
      continue;
    }
    const mutated = mutate(first);
    const back = fromResource(toResource(mutated).resource);
    if (!back.ok) {
      add("not_carried_not_named", `${field}: the mutated record did not round trip`);
      continue;
    }
    // Compared STRUCTURALLY, not with `===`. The first version used identity and reported
    // `recordedFactCodes` — an array whose contents round-trip perfectly — as uncarried, because
    // two arrays with equal contents are never `===`. A contract that cannot see an array carried
    // would push the next author to declare a carried field as unmapped (a lie in the register) or
    // to drop it (the silent loss the lane exists to stop). Found by the contract failing on the
    // second mapping that used it.
    const carried = same(
      (back.value as Record<string, unknown>)[field],
      (mutated as Record<string, unknown>)[field],
    );
    if (!carried && !named.has(field)) add("not_carried_not_named", field);
    if (carried && named.has(field)) add("named_but_carried", field);
  }

  for (const { field, why } of toResource(first).unmapped) {
    if (why.length <= 60) add("reason_too_thin", field);
  }

  // W236's lossy round trip, detected MECHANICALLY: mutate each field and record which system's
  // codes moved. Two different domain fields moving codes under the SAME system is the collapse.
  const codesUnder = (value: Domain) => {
    const pairs = new Map<string, Set<string>>();
    const walk = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (typeof node !== "object" || node === null) return;
      const record = node as Record<string, unknown>;
      if (typeof record.system === "string" && typeof record.code === "string") {
        pairs.set(record.system, (pairs.get(record.system) ?? new Set()).add(record.code));
      }
      Object.values(record).forEach(walk);
    };
    walk(toResource(value).resource);
    return pairs;
  };
  const baseline = codesUnder(first);
  const movedBy = new Map<string, string[]>();
  for (const [field, mutate] of Object.entries(mutations)) {
    for (const [system, codes] of codesUnder(mutate(first))) {
      const before = baseline.get(system);
      const changed =
        before === undefined || before.size !== codes.size || [...codes].some((c) => !before.has(c));
      if (changed) movedBy.set(system, [...(movedBy.get(system) ?? []), field]);
    }
  }
  for (const [system, movers] of movedBy) {
    if (movers.length > 1) add("codes_collapsed", `${system} carries codes from ${movers.join(", ")}`);
  }

  for (const value of corpus) {
    if (JSON.stringify(toResource(value).resource).includes('"display"')) {
      add("display_authored", "a coding carries a display");
    }
  }

  if (humanText !== null) {
    for (const value of corpus.filter((v) => humanText(v) !== null)) {
      const back = fromResource(toResource(value).resource);
      if (back.ok && humanText(back.value) !== humanText(value)) {
        add("human_text_edited", "text a person wrote was edited in transit");
      }
    }
  }

  return out;
}

export function describeMappingContract<Domain, Resource>(
  label: string,
  fixture: MappingFixture<Domain, Resource>,
): void {
  describe(`interop contract: ${label}`, () => {
    const violations = () => contractViolations(fixture);
    const of = (...failures: ContractFailure[]) =>
      violations().filter((v) => failures.includes(v.failure));

    it("has a corpus that could fail — at least three records, and not all alike", () => {
      expect(of("corpus_too_small", "corpus_uniform")).toEqual([]);
    });

    it("round-trips every record in the corpus, by value", () => {
      expect(of("round_trip")).toEqual([]);
    });

    it("names every field it does not carry, and carries every field it does not name", () => {
      expect(of("mutation_missing", "not_carried_not_named", "named_but_carried")).toEqual([]);
    });

    it("gives every named field a reason somebody could disagree with", () => {
      expect(of("reason_too_thin")).toEqual([]);
    });

    it("collapses no two kinds of code into one system", () => {
      expect(of("codes_collapsed")).toEqual([]);
    });

    it("authors no human-readable clinical label", () => {
      expect(of("display_authored")).toEqual([]);
    });

    it("carries text a person wrote exactly as they wrote it", () => {
      if (fixture.humanText !== null) {
        const withText = fixture.corpus.filter((v) => fixture.humanText!(v) !== null);
        expect(withText.length, "no record carries human text, so this is vacuous").toBeGreaterThan(0);
      }
      expect(of("human_text_edited")).toEqual([]);
    });
  });
}

/**
 * The lane-wide check: no module in `src/interop/` reaches a network.
 *
 * Applied by directory walk rather than per file, so a third mapping cannot arrive with a client
 * attached and its own test quietly not looking — which is the whole difference between a property
 * of the lane and a habit of whoever wrote each module.
 */
export function describeNoLiveEndpoint(): void {
  describe("interop contract: nothing in this lane reaches a network", () => {
    it("finds no client, endpoint or socket in any interop module", () => {
      const dir = path.join(process.cwd(), "src/interop");
      const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
      expect(files.length, "the interop directory read returned nothing").toBeGreaterThan(2);
      for (const file of files) {
        const code = readFileSync(path.join(dir, file), "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, " ")
          .replace(/\/\/[^\n]*/g, " ")
          .replace(/"(?:[^"\\]|\\.)*"/g, '""')
          .replace(/'(?:[^'\\]|\\.)*'/g, "''");
        expect(code, `${file}: the stripper removed the code too`).toMatch(/export (function|const|interface|type)/);
        expect(code, `${file} reaches a network`).not.toMatch(
          /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\baxios\b|\bhttps?\.request\b/,
        );
      }
    });
  });
}
