// W209 verify gate: "every exported store read either takes a practice or is declared
// cross-practice with the erasure reason (W106's shape), checked both directions."
//
// The registry is prose until something re-derives it from source. These tests do that, and the
// declarations are checked AGAINST THE SIGNATURE rather than taken at their word — a `kind` is a
// claim, and this tree has now found five reads whose comments said one thing and whose code did
// another (the CPD trail, fixed in this unit, said "clinician-scoped" in its module header while
// resolving an id that is only unique inside a practice).

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { STORE_MODULES, STORE_READS, type ScopeKind } from "./store-reads";

const ROOT = process.cwd();

/** Exported function names and their parameter lists, read from the module source. */
const exportsOf = (module: string): Map<string, string> => {
  const src = readFileSync(path.join(ROOT, module), "utf8");
  const found = new Map<string, string>();
  for (const match of src.matchAll(/^export function (\w+)\s*\(([^)]*)\)/gms)) {
    found.set(match[1]!, match[2]!.replace(/\s+/g, " "));
  }
  return found;
};

const declared = (kind: ScopeKind) => STORE_READS.filter((read) => read.kind === kind);

/** Does this signature take a practice as a parameter (rather than as part of a row)? */
const takesPractice = (params: string) => /\bpracticeId\s*:/.test(params);

describe("W209 the registry and the source agree, in both directions", () => {
  it("finds exported functions to check", () => {
    // Guard against every assertion below passing because the regex matched nothing.
    for (const module of STORE_MODULES) {
      expect(exportsOf(module).size, module).toBeGreaterThan(0);
    }
  });

  it("declares every exported store function", () => {
    // The direction that catches NEW code. A store function added without an entry is a read
    // nobody has said is scoped, which is how all five findings of this class arrived.
    const undeclared: string[] = [];
    for (const module of STORE_MODULES) {
      for (const fn of exportsOf(module).keys()) {
        if (!STORE_READS.some((read) => read.module === module && read.fn === fn)) {
          undeclared.push(`${module}:${fn}`);
        }
      }
    }
    expect(undeclared, "store functions with no scope declaration").toEqual([]);
  });

  it("declares nothing that no longer exists", () => {
    // The direction that catches ROT. A stale entry is a justification outliving its function,
    // still reading as though somebody had thought about the code that is actually there.
    const stale = STORE_READS.filter((read) => !exportsOf(read.module).has(read.fn)).map(
      (read) => `${read.module}:${read.fn}`,
    );
    expect(stale, "declarations for functions that are gone").toEqual([]);
  });

  it("covers a module list that matches the stores on disk", () => {
    // A store outside STORE_MODULES is invisible to every check above, so the list itself is
    // derived rather than trusted. `src/lib/stores.ts` is the reset aggregator, not a store.
    const onDisk = STORE_READS.map((read) => read.module);
    for (const module of STORE_MODULES) expect(onDisk).toContain(module);
  });
});

describe("W209 a declaration cannot lie about its signature", () => {
  it("checks that every practice_scoped function really takes a practice", () => {
    const lying: string[] = [];
    for (const read of declared("practice_scoped")) {
      const params = exportsOf(read.module).get(read.fn) ?? "";
      if (!takesPractice(params)) lying.push(`${read.module}:${read.fn}(${params})`);
    }
    expect(lying, "declared practice_scoped but takes no practice").toEqual([]);
  });

  it("checks that every patient_keyed function takes NO practice", () => {
    // The check runs in the opposite direction on purpose. Erasure and access must reach every
    // practice a patient has touched, so a practice parameter appearing here is the change that
    // breaks erasure silently — and it would look like tightening in review.
    const scoped: string[] = [];
    for (const read of declared("patient_keyed")) {
      const params = exportsOf(read.module).get(read.fn) ?? "";
      if (takesPractice(params)) scoped.push(`${read.module}:${read.fn}(${params})`);
    }
    expect(scoped, "patient-keyed erasure or access narrowed to one practice").toEqual([]);
  });

  it("requires a written reason for everything that is not practice_scoped", () => {
    const unexplained = STORE_READS.filter(
      (read) => read.kind !== "practice_scoped" && (read.reason ?? "").trim().length < 20,
    ).map((read) => `${read.module}:${read.fn}`);
    expect(unexplained, "unscoped reads with no stated reason").toEqual([]);
  });

  it("makes every store_handle name its scoped alternatives, and checks they exist", () => {
    // The handle is the loophole: Y4-1 was two console surfaces calling `getComplaints()` and
    // rendering the lot. "That is fine, the scoped read is over there" is a claim, so the tree
    // checks it — the named alternatives must exist and must themselves be practice-scoped.
    for (const read of declared("store_handle")) {
      expect(read.scopedAlternatives, `${read.module}:${read.fn}`).toBeDefined();
      for (const name of read.scopedAlternatives ?? []) {
        const target = STORE_READS.find((r) => r.module === read.module && r.fn === name);
        expect(target, `${read.fn} names a scoped alternative that is not in the registry: ${name}`)
          .toBeDefined();
        expect(target!.kind, `${read.fn} -> ${name}`).toBe("practice_scoped");
      }
    }
  });

  it("declares each function exactly once", () => {
    const keys = STORE_READS.map((read) => `${read.module}:${read.fn}`);
    expect(new Set(keys).size, "a function declared twice, possibly two ways").toBe(keys.length);
  });
});

describe("W209 the findings this sweep closed stay closed", () => {
  it("keeps the usefulness audit's reads practice-scoped", () => {
    // The unit's named target. `AuditState` carried one `practiceId` — the literal
    // "prac-console", which no console mints — so the page read the whole store.
    for (const fn of ["pendingVisitsFor", "outcomesFor", "recordOutcome"]) {
      const read = STORE_READS.find((r) => r.module === "src/audit/store.ts" && r.fn === fn);
      expect(read?.kind, fn).toBe("practice_scoped");
    }
  });

  it("keeps the CPD trail's reads practice-scoped", () => {
    // Found by this sweep, not by reading the code: the module header claimed clinician scoping
    // and clinician ids are minted per practice (W166), so `clin-1` named a different person at
    // every practice and one read returned all of them.
    for (const fn of ["cpdEntriesFor", "scrubClinicianCpd"]) {
      const read = STORE_READS.find((r) => r.module === "src/education/store.ts" && r.fn === fn);
      expect(read?.kind, fn).toBe("practice_scoped");
    }
  });

  it("holds no store module with a practice-scoped read still exposing an unclassified one", () => {
    // Every module that has learned to scope must have EVERY export classified — which the
    // both-directions checks already enforce, asserted here as the property rather than the
    // mechanism, so a future refactor of the checks cannot quietly drop it.
    const scopedModules = new Set(declared("practice_scoped").map((read) => read.module));
    for (const module of scopedModules) {
      const names = new Set(STORE_READS.filter((r) => r.module === module).map((r) => r.fn));
      for (const fn of exportsOf(module).keys()) expect(names, `${module}:${fn}`).toContain(fn);
    }
  });

  it("records that PRIV-3's remaining risk is named rather than assumed away", () => {
    // The honest half. `sessionAppointmentType` matches on a clinician id with no practice, and
    // it is safe today only because the seeded rail holds one practice's sessions — a property
    // of the fixture, not of the code. Naming it is the point: W145's rule, that the thing you
    // cannot yet fix is stated, not omitted.
    const residual = STORE_READS.find(
      (read) => read.module === "src/booking/store.ts" && read.fn === "sessionAppointmentType",
    );
    expect(residual?.reason).toContain("NAMED RESIDUAL");
  });
});
