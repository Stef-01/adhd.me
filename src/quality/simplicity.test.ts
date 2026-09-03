// U15 (R0): the simplicity laws, held to the tree and each proven able to fail.
//
// The plan's verify for this unit is one sentence — "each register's test fails on a planted
// violation (an untagged unreached module, an unlisted 700-line file, a copied block, a module
// imported only by its test and not tagged)" — and the four `goes red` tests below are that
// sentence, one each. A register nobody has watched fail is a list.

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACCEPTED_DUPLICATES,
  DUPLICATE_WINDOW,
  duplicateFindings,
  LONG_FILE_LINES,
  LONG_FILES,
  longFileFindings,
  SINGLE_IMPORTER_MEASURE,
  TEST_HELD_MEASURE,
} from "./simplicity";
import { duplicateBlocks, fileLengths, simplicityFiles } from "./simplicity-read";
import { deletions, MODULE_REASONS, moduleReasonFindings, tagCounts } from "./module-reasons";
import { measureTree, walk, importGraph, closure } from "./size-census-read";
import { eachOf } from "./non-vacuous";

const files = simplicityFiles();
const lengths = fileLengths(files);

/** The census's own definition of "the product does not import this", re-derived here. */
function unreachedModules(): string[] {
  const isTs = (f: string): boolean => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f);
  const app = walk("app").filter(isTs);
  const src = walk("src").filter(isTs);
  const reached = closure(app, importGraph([...app, ...src], process.cwd()));
  return src.filter((f) => !reached.has(f));
}

const unreached = unreachedModules();

describe("U15 law 2: a module is reached, lawful, gated — or deleted", () => {
  it("explains every unreached module, and every explanation names a real one", () => {
    const findings = moduleReasonFindings(unreached);
    expect(findings, findings.map((f) => `${f.kind} ${f.module}: ${f.detail}`).join("\n")).toEqual([]);
  });

  it("agrees with the census about how many there are", () => {
    // The register and U14's ratchet count the same population. If these ever disagree, one of the
    // two definitions of "unreached" has drifted and both numbers become opinions.
    expect(MODULE_REASONS.length).toBe(unreached.length);
    expect(measureTree()["src-unreached-modules"]).toBe(unreached.length);
  });

  it("is not vacuous: the tags describe a real mix, not one bucket", () => {
    const counts = tagCounts();
    expect(counts["law"]).toBeGreaterThan(20);
    expect(counts["gated"]).toBeGreaterThan(20);
    // Exactly one module was found with no reader, no gate and no unit: src/lib/version.ts.
    expect(deletions()).toEqual(["src/lib/version.ts"]);
    for (const entry of eachOf(MODULE_REASONS, "the module-reasons register")) {
      expect(entry.module.startsWith("src/"), entry.module).toBe(true);
    }
  });

  it("goes red on a planted violation: an unreached module nobody tagged", () => {
    const planted = moduleReasonFindings([...unreached, "src/planted/orphan.ts"]);
    expect(planted.map((f) => f.kind)).toEqual(["untagged"]);
  });

  it("goes red on a planted violation: a tag naming a module the product now reaches", () => {
    const [first, ...rest] = unreached;
    expect(first).toBeDefined();
    expect(moduleReasonFindings(rest).map((f) => f.kind)).toEqual(["stale"]);
  });

  it("goes red on a gate reference that is not a gate", () => {
    const planted = [...MODULE_REASONS, { module: "src/x/y.ts", tag: "gated:soon" as const, why: "x".repeat(20) }];
    expect(moduleReasonFindings([...unreached, "src/x/y.ts"], planted).map((f) => f.kind)).toEqual(["bad-gate"]);
  });
});

describe("U15 law 3: a long file carries a dated reason", () => {
  it("lists every file over the floor, and nothing that has come back under it", () => {
    const findings = longFileFindings(lengths);
    expect(findings, findings.map((f) => `${f.kind} ${f.file}: ${f.detail}`).join("\n")).toEqual([]);
  });

  it("argues each one in sentences, with a date and a length", () => {
    for (const entry of eachOf(LONG_FILES, "the long-file register")) {
      expect(entry.on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.lines).toBeGreaterThan(LONG_FILE_LINES);
      expect(entry.why.split(" ").length, entry.file).toBeGreaterThan(20);
      // The argued length is a ceiling with a little room, never a rubber stamp on any size.
      expect(entry.lines - lengths[entry.file]!, `${entry.file}: the entry allows far more than the file uses`).toBeLessThan(120);
    }
  });

  it("goes red on a planted violation: a 700-line file nobody listed", () => {
    const planted = longFileFindings({ ...lengths, "src/planted/huge.ts": 700 });
    expect(planted.map((f) => f.kind)).toEqual(["unlisted"]);
  });

  it("goes red when a listed file grows past the length that was argued", () => {
    const first = LONG_FILES[0]!;
    const planted = longFileFindings({ ...lengths, [first.file]: first.lines + 1 });
    expect(planted.map((f) => f.kind)).toEqual(["grown"]);
  });

  it("goes red when a listed file no longer needs its entry, so a win is banked rather than kept", () => {
    const first = LONG_FILES[0]!;
    const planted = longFileFindings({ ...lengths, [first.file]: 120 });
    expect(planted.map((f) => f.kind)).toEqual(["stale"]);
  });
});

describe("U15 law 1: one implementation per concept", () => {
  it("finds no copied block over the window in the tree today", () => {
    const found = duplicateBlocks(files, DUPLICATE_WINDOW);
    const findings = duplicateFindings(found);
    expect(findings, findings.map((f) => f.detail).join("\n")).toEqual([]);
    // The acceptance list is empty because there is nothing to accept. The test below is what
    // stops that from being a green test with no content: it plants a real copy and requires the
    // real walk to find it.
    expect(ACCEPTED_DUPLICATES).toEqual([]);
  });

  it("goes red on a planted violation: the same block in two files", () => {
    // A detector that has never found anything is a detector nobody has tested. This plants a real
    // copy in a real directory and runs the real walk over it.
    const dir = mkdtempSync(join(tmpdir(), "u15-dup-"));
    try {
      mkdirSync(join(dir, "src"), { recursive: true });
      const block = Array.from({ length: 16 }, (_, i) => `const value${i} = compute(${i}, "shared block");`).join("\n");
      writeFileSync(join(dir, "src", "a.ts"), `// header\n${block}\n`);
      // Re-indented and re-spaced, to prove the normalisation is doing work.
      writeFileSync(join(dir, "src", "b.ts"), `// other header\n${block.split("\n").map((l) => `    ${l.replace(/ /g, "  ")}`).join("\n")}\n`);
      const found = duplicateBlocks(["src/a.ts", "src/b.ts"], DUPLICATE_WINDOW, dir);
      expect(found).toHaveLength(1);
      expect(found[0]!.left).toBe("src/a.ts");
      expect(found[0]!.right).toBe("src/b.ts");
      expect(duplicateFindings(found).map((f) => f.kind)).toEqual(["unaccepted"]);
      // Accepted with a reason, the same block is not a finding.
      expect(
        duplicateFindings(found, [{ files: ["src/a.ts", "src/b.ts"], on: "2026-09-02", why: "planted" }]),
      ).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not report a file against itself, or a block under the window", () => {
    const dir = mkdtempSync(join(tmpdir(), "u15-dup2-"));
    try {
      mkdirSync(join(dir, "src"), { recursive: true });
      const short = Array.from({ length: 8 }, (_, i) => `const short${i} = ${i};`).join("\n");
      writeFileSync(join(dir, "src", "a.ts"), `${short}\n${short}\n`);
      writeFileSync(join(dir, "src", "b.ts"), `${short}\n`);
      expect(duplicateBlocks(["src/a.ts", "src/b.ts"], DUPLICATE_WINDOW, dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("U15 law 4: a module needed by one caller is a shape, not a crime", () => {
  it("counts rather than lists, and the count is the census's own", () => {
    const measured = measureTree();
    // The law is enforced by U14's ratchet — these keys ARE the enforcement, and naming them here
    // is what stops the two files describing the same law with different words.
    expect(measured[SINGLE_IMPORTER_MEASURE]).toBeGreaterThan(0);
    expect(measured[TEST_HELD_MEASURE]).toBeGreaterThan(0);
  });

  it("goes red on a planted violation: a module only its own test imports and nobody tagged", () => {
    // The test-held population is inside the unreached population by construction — a module no
    // product file imports cannot be reached — so the module-reasons register is what catches it,
    // and this proves the two laws are actually connected rather than merely adjacent.
    const planted = moduleReasonFindings([...unreached, "src/planted/test-held.ts"]);
    expect(planted.map((f) => f.kind)).toEqual(["untagged"]);
    expect(planted[0]!.detail).toContain("tag it law, gated:<ref> or delete");
  });
});

describe("U15 the laws document says what the registers do", () => {
  const doc = readFileSync("docs/SIMPLICITY-LAWS.md", "utf8");

  it("quotes the figures the registers actually hold", () => {
    const counts = tagCounts();
    // A document that states numbers has to state the tree's numbers, or it is a description of
    // whatever was true the day somebody wrote it — U14's stale-check, applied to prose.
    expect(doc).toContain(`**Today: ${MODULE_REASONS.length} modules — ${counts["law"]} \`law\`, ${counts["gated"]} \`gated\`, ${counts["delete"]} \`delete\`.**`);
    expect(doc).toContain(`Naming all ${measureTree()[SINGLE_IMPORTER_MEASURE]} single-importer modules`);
    expect(doc).toContain(`**Today: nine files.**`);
    expect(LONG_FILES).toHaveLength(9);
    expect(doc).toContain(`Over ${LONG_FILE_LINES} lines`);
    expect(doc).toContain(`normalised ${DUPLICATE_WINDOW}-line`);
  });

  it("names each register and each way it fails, so a reader can find the code", () => {
    for (const symbol of [
      "MODULE_REASONS",
      "ACCEPTED_DUPLICATES",
      "LONG_FILES",
      "src/quality/module-reasons.ts",
      "src/quality/simplicity.ts",
      "src/quality/simplicity-read.ts",
      SINGLE_IMPORTER_MEASURE,
      TEST_HELD_MEASURE,
    ]) {
      expect(doc, `${symbol} is not named in the laws`).toContain(symbol);
    }
    for (const kind of ["unlisted", "grown", "stale", "no-reason", "bad-gate"]) {
      expect(doc, `the ${kind} finding is not explained`).toContain(kind);
    }
  });

  it("keeps the deletion it names in step with the register", () => {
    for (const module of eachOf(deletions(), "the deletions U15 names")) expect(doc).toContain(module);
  });
});
