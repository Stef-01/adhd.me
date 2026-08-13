// W167 verify gate: the register is checked against the tree, and a new fold site fails the
// suite until it carries a tie-break test or a written rationale.

import { describe, expect, it } from "vitest";
import {
  FOLD_SITES,
  diffFoldRegister,
  discoverFoldSites,
  foldIsOrderIndependent,
} from "./order-independence";

const actual = () => discoverFoldSites(process.cwd());

describe("W167 the register is checked against the tree", () => {
  it("finds the folds that are actually there", () => {
    // Guard against a vacuous pass: a discovery bug returning nothing would satisfy every
    // assertion below, which is how a register control dies quietly.
    const found = actual();
    expect(found.length).toBeGreaterThan(8);
    expect(found.map((f) => f.module)).toContain("src/verticals/binding.ts");
  });

  it("declares every module that folds", () => {
    const diff = diffFoldRegister(actual());
    expect(
      diff.undeclared,
      `declare these in FOLD_SITES with a tie-break test or a rationale: ${diff.undeclared.join(", ")}`,
    ).toEqual([]);
  });

  it("declares nothing that has stopped folding", () => {
    // The failure nobody catches: a register describing code that has moved reads as coverage.
    const diff = diffFoldRegister(actual());
    expect(
      diff.stale,
      `these declarations name modules that no longer fold: ${diff.stale.join(", ")}`,
    ).toEqual([]);
  });

  it("notices a fold ADDED to an already-declared module", () => {
    // The gap a module-level register would otherwise leave: declaring a file once and then
    // adding a second, unconsidered fold to it.
    const diff = diffFoldRegister(actual());
    expect(
      diff.countChanged,
      `fold counts changed — a fold was added or removed: ${JSON.stringify(diff.countChanged)}`,
    ).toEqual([]);
  });

  it("every entry carries a disposition, and only the two kinds", () => {
    // "Someone looked at it" is not a disposition.
    for (const site of FOLD_SITES) {
      if (site.disposition.kind === "rationale") {
        expect(site.disposition.why.length, site.module).toBeGreaterThan(60);
      } else {
        expect(site.disposition.test, site.module).toMatch(/^src\/.+\.test\.ts :: /);
      }
    }
  });

  it("is sorted and free of duplicates, so a diff reads cleanly", () => {
    const modules = FOLD_SITES.map((s) => s.module);
    expect(modules).toEqual([...modules].sort());
    expect(new Set(modules).size).toBe(modules.length);
  });
});

describe("W167 the register would notice a change", () => {
  it("reports an undeclared module", () => {
    expect(diffFoldRegister([{ module: "src/new/thing.ts", folds: 1 }], []).undeclared).toEqual([
      "src/new/thing.ts",
    ]);
  });

  it("reports a declaration whose module has gone", () => {
    const diff = diffFoldRegister([], [
      { module: "src/gone.ts", folds: 1, disposition: { kind: "rationale", why: "x" } },
    ]);
    expect(diff.stale).toEqual(["src/gone.ts"]);
  });

  it("reports a fold added to a declared module", () => {
    const diff = diffFoldRegister([{ module: "src/a.ts", folds: 2 }], [
      { module: "src/a.ts", folds: 1, disposition: { kind: "rationale", why: "x" } },
    ]);
    expect(diff.countChanged).toEqual([{ module: "src/a.ts", declared: 1, actual: 2 }]);
  });
});

describe("W167 the property helper", () => {
  const pickLatest = (rows: readonly { at: string; who: string }[]) =>
    rows.reduce((a, b) => (a.at >= b.at ? a : b));

  const pickLatestTieBroken = (rows: readonly { at: string; who: string }[]) =>
    rows.reduce((a, b) => {
      if (a.at === b.at) return a.who <= b.who ? a : b;
      return a.at > b.at ? a : b;
    });

  const TIED = [
    { at: "2026-03-01T00:00:00Z", who: "zoe@x.test" },
    { at: "2026-03-01T00:00:00Z", who: "ada@x.test" },
  ];

  it("catches a fold that answers differently by input order", () => {
    // The helper has to fail on the untie-broken version, or it proves nothing about the ones
    // it passes.
    const result = foldIsOrderIndependent(pickLatest, TIED);
    expect(result.stable).toBe(false);
    expect(result.forward.who).not.toBe(result.reversed.who);
  });

  it("passes a fold with a deterministic tie-break", () => {
    const result = foldIsOrderIndependent(pickLatestTieBroken, TIED);
    expect(result.stable).toBe(true);
    expect(result.forward.who).toBe("ada@x.test");
  });

  it("requires the caller to supply the tie", () => {
    // Records that do not tie pass trivially, which is the vacuous version of this test — the
    // helper cannot construct a tie because only the caller knows what the fold compares.
    const untied = [
      { at: "2026-03-01T00:00:00Z", who: "zoe@x.test" },
      { at: "2026-04-01T00:00:00Z", who: "ada@x.test" },
    ];
    expect(foldIsOrderIndependent(pickLatest, untied).stable).toBe(true);
  });
});
