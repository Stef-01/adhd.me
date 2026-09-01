// O221: the engine-purity law — see engine-purity.ts for what is claimed and why.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { eachOf } from "./non-vacuous";
import {
  CORE_ENTRY_DIRS,
  CORE_ENTRY_FILES,
  importSpecifiers,
  NODE_IMPORT_EXCEPTIONS,
  stripNonCode,
  walkCore,
} from "./engine-purity";

const ROOT = path.resolve(__dirname, "../..");
const walk = () => walkCore(ROOT, (dir) => readdirSync(dir));

describe("O221 — the engine core is host-agnostic, as the app plan claims", () => {
  it("the closure is non-trivial and reaches beyond the entry directories", () => {
    const { closure } = walk();
    // 34 production files in the four dirs when this law landed; the closure must also reach
    // the out-of-dir modules the core actually imports, or the walk is not walking.
    expect(closure.length).toBeGreaterThanOrEqual(34);
    expect(closure.some((f) => !CORE_ENTRY_DIRS.some((d) => f.startsWith(d)))).toBe(true);
    for (const entry of eachOf(CORE_ENTRY_FILES, "the core entry files")) {
      expect(closure).toContain(entry);
    }
  });

  it("LAW A: no framework import, no client boundary, no DOM global — zero exceptions", () => {
    const findings = walk().findings.filter((f) => f.law === "A");
    expect(
      findings,
      findings.map((f) => `${f.file}: ${f.detail}`).join("\n"),
    ).toEqual([]);
  });

  it("LAW B: node builtins only where declared, and every declaration is live", () => {
    const { closure, findings } = walk();
    const b = findings.filter((f) => f.law === "B");
    expect(b, b.map((f) => `${f.file}: ${f.detail}`).join("\n")).toEqual([]);
    // Both directions: an exception whose file left the closure (or dropped its node: import)
    // is paperwork shielding nothing — the register shrinks in the same commit.
    for (const exception of eachOf(NODE_IMPORT_EXCEPTIONS, "the node-import exceptions")) {
      expect(closure, `${exception.file} is declared but not in the closure`).toContain(exception.file);
      // RAW source, deliberately: stripNonCode blanks string literals, and an import specifier
      // IS a string literal — the first draft stripped away the thing it was checking for.
      const source = readFileSync(path.join(ROOT, exception.file), "utf8");
      expect(
        importSpecifiers(source).some((s) => s.startsWith("node:")),
        `${exception.file} is declared but imports no node: module any more — delete its entry`,
      ).toBe(true);
    }
  });

  it("the scanner itself discriminates — a planted violation is caught, not passed", () => {
    // The AR9 probe rule at vitest scale: prove the detector can go red before trusting green.
    expect(importSpecifiers('import { useMemo } from "react";')[0]).toBe("react");
    expect(stripNonCode('const prose = "document. as a word"; window.alert(1)')).not.toContain("document. as a word");
    expect(stripNonCode("window.alert(1)")).toMatch(/window\s*\./);
  });
});
