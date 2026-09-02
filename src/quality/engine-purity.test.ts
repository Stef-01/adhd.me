// O221: the engine-purity law — see engine-purity.ts for what is claimed and why.
// O222: ONE walk at module scope (three per-test walks re-read ~2 MB across ~288 syscalls for
// identical pure results), and the specifier probes drive reachability's real scanner since the
// walk now runs on it.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { specifiersIn } from "@/security/reachability";
import { eachOf } from "./non-vacuous";
import {
  CORE_ENTRY_DIRS,
  CORE_ENTRY_FILES,
  NODE_IMPORT_EXCEPTIONS,
  stripNonCode,
  walkCore,
} from "./engine-purity";

const ROOT = path.resolve(__dirname, "../..");
const { closure, findings } = walkCore(ROOT, (dir) => readdirSync(dir));

describe("O221 — the engine core is host-agnostic, as the app plan claims", () => {
  it("the closure is non-trivial and reaches beyond the entry directories", () => {
    // 34 production files in the four dirs when this law landed; the closure must also reach
    // the out-of-dir modules the core actually imports, or the walk is not walking.
    expect(closure.length).toBeGreaterThanOrEqual(34);
    expect(closure.some((f) => !CORE_ENTRY_DIRS.some((d) => f.startsWith(d)))).toBe(true);
    for (const entry of eachOf(CORE_ENTRY_FILES, "the core entry files")) {
      expect(closure).toContain(entry);
    }
  });

  it("LAW A: no framework import, no client boundary, no DOM global — zero exceptions", () => {
    const a = findings.filter((f) => f.law === "A");
    expect(a, a.map((f) => `${f.file}: ${f.detail}`).join("\n")).toEqual([]);
  });

  it("LAW B: node builtins only where declared, and every declaration is live", () => {
    const b = findings.filter((f) => f.law === "B");
    expect(b, b.map((f) => `${f.file}: ${f.detail}`).join("\n")).toEqual([]);
    // Both directions: an exception whose file left the closure (or dropped its node: import)
    // is paperwork shielding nothing — the register shrinks in the same commit.
    for (const exception of eachOf(NODE_IMPORT_EXCEPTIONS, "the node-import exceptions")) {
      expect(closure, `${exception.file} is declared but not in the closure`).toContain(exception.file);
      // RAW source: specifiersIn strips comments itself, and an import specifier is code.
      const source = readFileSync(path.join(ROOT, exception.file), "utf8");
      expect(
        specifiersIn(source).some((s) => s.startsWith("node:")),
        `${exception.file} is declared but imports no node: module any more — delete its entry`,
      ).toBe(true);
    }
  });

  it("the finder never reads the engine over a defaulted roster (O222 seam pin)", () => {
    // The tickbox threads ONE roster through ranking and every derived read; the review found
    // two profile reads (matchEvidence, missedAsks) silently falling back to the default real
    // roster while the ranking ran over 22 entries — a defaulted parameter is a seam with no
    // enforcement, and the 13th call site would have failed the same way. This pin refuses the
    // shape itself: in care-finder.tsx, no roster-defaulting engine call may end at `request)`.
    const source = readFileSync(path.join(ROOT, "app/care-finder.tsx"), "utf8");
    // O224 dropped `rankClinicians` from this list WITH the code: matches became derived state,
    // so the finder ranks through exactly one `rankCliniciansNear` expression and the plain form
    // has no call site left to police.
    const rosterDefaulting = [
      "matchQuality", "topTieNote", "unservedAsks", "rankBands", "needsFor",
      "matchEvidence", "missedAsks", "getPersonalizedMatch", "rankCliniciansNear",
    ];
    for (const fn of eachOf(rosterDefaulting, "the roster-defaulting engine reads")) {
      // Non-vacuous per function: the finder genuinely calls each of these.
      expect(source.includes(`${fn}(`), `${fn} is no longer called from care-finder — update this pin`).toBe(true);
      const defaulted = source.match(new RegExp(String.raw`\b${fn}\((?:[^()]*,\s*)?request\s*\)`, "g")) ?? [];
      expect(
        defaulted,
        `${fn} is called with the roster left to default — thread \`roster\` explicitly:\n${defaulted.join("\n")}`,
      ).toEqual([]);
    }
    // The trailing-`request)` shape above catches the defect class the review found; the two
    // ranking entry points can also default with a roster-less arg in LAST position, so their
    // known short forms are refused by name. (A call spanning lines or a new short form is
    // outside this source pin's reach — it is a ratchet on the shapes that have actually
    // occurred, not a parser.)
    for (const short of [/\brankCliniciansNear\(\s*[\w.]+\s*,\s*[\w.]+\s*\)/g]) {
      const hits = source.match(short) ?? [];
      expect(hits, `a ranking call defaults its roster:\n${hits.join("\n")}`).toEqual([]);
    }
  });

  it("the scanner itself discriminates — a planted violation is caught, not passed", () => {
    // The AR9 probe rule at vitest scale: prove the detector can go red before trusting green.
    expect(specifiersIn('import { useMemo } from "react";')).toContain("react");
    // Single-quoted and bare side-effect imports — the two shapes the O221 copy missed.
    expect(specifiersIn("import './register';")).toContain("./register");
    // Prose cannot vouch: a commented-out import is not a dependency.
    expect(specifiersIn('// import { useMemo } from "react";')).toEqual([]);
    expect(stripNonCode('const prose = "document. as a word"; window.alert(1)')).not.toContain("document. as a word");
    expect(stripNonCode("window.alert(1)")).toMatch(/window\s*\./);
    // A URL inside a string must not truncate the code after it (the stripper-order bug).
    expect(stripNonCode('const u = "https://x.y"; document.title = "z"')).toMatch(/document\s*\./);
  });
});
