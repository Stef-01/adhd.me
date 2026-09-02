// U14 (R0): the downward ratchet as a test — the tree measured against its floors on every
// `pnpm test`, the register held to its own laws, the plan's figures held to the plan's text, and
// the reader proven on fixtures so a green here is not vacuous.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bankable,
  floors,
  PLAN_FIGURES,
  RATCHET,
  type RatchetEntry,
  registerFindings,
  sizeCensusVerdicts,
} from "./size-census";
import { eachOf } from "./non-vacuous";
import { closure, importGraph, importSpecifiers, lineCount, measureTree, resolveImport } from "./size-census-read";

const measured = measureTree();

describe("U14 the size census against its floors", () => {
  it("measures every number the register pins, and pins every number it measures", () => {
    const verdicts = sizeCensusVerdicts(measured);
    expect(verdicts.filter((v) => v.kind === "unpinned-measure")).toEqual([]);
    expect(verdicts.filter((v) => v.kind === "vanished-measure")).toEqual([]);
  });

  it("finds no measure above its floor — the ratchet only turns downward", () => {
    const over = sizeCensusVerdicts(measured).filter((v) => v.kind === "over-floor");
    expect(
      over,
      over.map((v) => `${v.measure}: ${v.measured} > floor ${v.floor} — lower it, or append a dated, reasoned raise`).join("\n"),
    ).toEqual([]);
  });

  it("is not vacuous: the reader produces the plan's measures with real values", () => {
    expect(Object.keys(measured).length).toBeGreaterThanOrEqual(30);
    expect(measured["src-lines"]).toBeGreaterThan(10_000);
    expect(measured["css-rule-blocks"]).toBeGreaterThan(100);
    expect(measured["app-console-pages"]).toBeGreaterThan(0);
    expect(measured["src-reached-modules"]! + measured["src-unreached-modules"]!).toBe(measured["src-modules"]);
    expect(measured["src-reached-lines"]! + measured["src-unreached-lines"]!).toBe(measured["src-lines"]);
  });

  it("lists the gains still to bank, if any, as entries the register accepts", () => {
    // Empty whenever every floor is exactly the tree's number — the state the ratchet aims for —
    // and declared so in LEGITIMATELY_EMPTY.
    for (const gain of bankable(measured, RATCHET, "2099-01-01")) {
      expect(registerFindings([...RATCHET, gain])).toEqual([]);
    }
  });
});

describe("U14 the register's own laws", () => {
  it("has no raise without a reason, no date out of order, no malformed date", () => {
    expect(registerFindings()).toEqual([]);
  });

  it("dates every entry and takes the newest as the floor", () => {
    for (const entry of eachOf(RATCHET, "the ratchet")) expect(entry.on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const f = floors();
    for (const measure of new Set(RATCHET.map((e) => e.measure))) {
      const last = [...RATCHET].reverse().find((e) => e.measure === measure)!;
      expect(f[measure]).toBe(last.value);
    }
  });

  it("goes red on a planted regression: a floor raised in memory without a reason", () => {
    const first = RATCHET[0]!;
    const planted: RatchetEntry[] = [...RATCHET, { measure: first.measure, value: floors()[first.measure]! + 1, on: "2099-01-01" }];
    expect(registerFindings(planted).map((x) => x.kind)).toEqual(["raise-without-reason"]);
    // The same raise with its argument stated is what the law asks for.
    expect(registerFindings([...RATCHET, { ...planted[planted.length - 1]!, reason: "planted" }])).toEqual([]);
  });

  it("goes red on a planted regression: the tree measured one line above a floor", () => {
    const grown = { ...measured, "src-lines": floors()["src-lines"]! + 1 };
    expect(sizeCensusVerdicts(grown)).toEqual([
      { measure: "src-lines", kind: "over-floor", floor: floors()["src-lines"], measured: floors()["src-lines"]! + 1 },
    ]);
    const lowered = RATCHET.filter((e) => e.measure !== "css-lines");
    expect(sizeCensusVerdicts(measured, lowered).map((v) => v.kind)).toEqual(["unpinned-measure"]);
    expect(sizeCensusVerdicts(measured, [...RATCHET, { measure: "gone", value: 1, on: "2026-09-02" }]).map((v) => v.kind)).toEqual([
      "vanished-measure",
    ]);
  });
});

describe("U14 the plan's figures are the tree's figures on the day", () => {
  const plan = readFileSync("docs/ONE-YEAR-BUILD-PLAN.md", "utf8");
  const premise = plan.slice(plan.indexOf("## 1. The premise, measured"), plan.indexOf("## 2."));
  const ratchet = plan.slice(plan.indexOf("**The ratchet**"), plan.indexOf("### 2.6"));
  const text = premise + ratchet;

  it("quotes every figure the register carries, in §1 or §2.5, as the doc prints it", () => {
    expect(premise.length).toBeGreaterThan(1000);
    expect(ratchet.length).toBeGreaterThan(500);
    for (const [measure, figure] of Object.entries(PLAN_FIGURES)) {
      const printed = figure.toLocaleString("en-US");
      expect(text.includes(printed), `${measure}: ${printed} is not in §1/§2.5`).toBe(true);
    }
  });

  it("pins a figure for every measure the plan quotes, and only for measures the reader produces", () => {
    for (const measure of Object.keys(PLAN_FIGURES)) expect(measure in measured, measure).toBe(true);
    // The plan's headline sizes are the ones a reader would check first; each must be pinned.
    for (const measure of ["app-lines", "src-lines", "css-lines", "src-reached-lines", "vitest-lines", "e2e-spec-lines"]) {
      expect(PLAN_FIGURES[measure], measure).toBeDefined();
    }
    // The measures the plan handed to U14 carry no plan figure, by the plan's own text.
    expect(ratchet).toContain("U14 pins");
    expect(ratchet).toContain("U14 counts");
    for (const measure of ["actions-lines", "app-console-lines", "css-dead-classes"]) {
      expect(PLAN_FIGURES[measure], measure).toBeUndefined();
    }
  });
});

describe("U14 the reader", () => {
  it("counts lines as wc -l does", () => {
    expect(lineCount("")).toBe(0);
    expect(lineCount("a\nb\n")).toBe(2);
    expect(lineCount("a\nb")).toBe(1);
  });

  it("finds import specifiers and ignores prose", () => {
    const source = `
      // import { no } from "./comment";
      /* import "./block"; */
      import a from "./a";
      import { b, type C } from "@/lib/b";
      import type { D } from "../d";
      export { e } from "./e";
      import "./side";
      const lazy = () => import("./lazy");
      const url = "https://example.test/from/x";
    `;
    expect(importSpecifiers(source)).toEqual(["./a", "@/lib/b", "../d", "./e", "./lazy", "./side"]);
  });

  it("resolves aliases, relative paths, extensions and index files; leaves packages out", () => {
    const files = new Set(["src/lib/b.ts", "src/x/a.tsx", "src/x/dir/index.ts", "app/page.tsx"]);
    expect(resolveImport("app/page.tsx", "@/lib/b", files)).toBe("src/lib/b.ts");
    expect(resolveImport("src/x/c.ts", "./a", files)).toBe("src/x/a.tsx");
    expect(resolveImport("src/x/c.ts", "./dir", files)).toBe("src/x/dir/index.ts");
    expect(resolveImport("src/x/c.ts", "../lib/b.ts", files)).toBe("src/lib/b.ts");
    expect(resolveImport("src/x/c.ts", "react", files)).toBeUndefined();
    expect(resolveImport("src/x/c.ts", "./missing", files)).toBeUndefined();
  });

  it("walks the closure from the roots and no further", () => {
    const graph = new Map<string, string[]>([
      ["app/page.tsx", ["src/a.ts"]],
      ["src/a.ts", ["src/b.ts", "src/a.ts"]],
      ["src/b.ts", []],
      ["src/orphan.ts", ["src/b.ts"]],
    ]);
    expect([...closure(["app/page.tsx"], graph)].sort()).toEqual(["app/page.tsx", "src/a.ts", "src/b.ts"]);
  });

  it("builds the real graph with this test's neighbours in it", () => {
    const graph = importGraph(["src/quality/size-census.ts", "src/quality/size-census-read.ts", "src/design/dead-css.ts"], process.cwd());
    expect(graph.get("src/quality/size-census.ts")).toEqual(["src/quality/size-census-read.ts"]);
    expect(graph.get("src/quality/size-census-read.ts")).toEqual(["src/design/dead-css.ts"]);
  });
});
