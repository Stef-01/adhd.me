// W106 verify gate: "the test enumerates the record classes so a NEW class fails the suite
// until it is handled."
//
// That is the whole point. W51's critical finding was not that someone wrote bad erasure
// code — it was that erasure covered the stores that existed when it was written, and the
// next store joined the tree without joining the erasure path. Enumerating by hand would
// reproduce the trap. So the registry is checked against the source tree.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RECORD_CLASSES, storedClasses } from "./record-classes";

const SRC = path.resolve(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") && !full.endsWith(".test.ts") ? [full] : [];
  });
}

const rel = (file: string) => `src/${path.relative(SRC, file).split(path.sep).join("/")}`;

/** Every module that holds a globalThis-backed store — i.e. can retain data across requests. */
function storeModules(): string[] {
  return sourceFiles(SRC)
    .filter((f) => /globalThis as \{/.test(readFileSync(f, "utf8")))
    .map(rel)
    .sort();
}

describe("W106 the registry cannot fall behind the tree", () => {
  it("declares every store module in src/", () => {
    // If this fails, a store was added without anyone answering "what happens to this on an
    // access request, and on erasure?" — which is exactly how W51's critical finding
    // happened: erasure covered the stores that existed when it was written.
    const declared = new Set(RECORD_CLASSES.map((c) => c.module));
    const missing = storeModules().filter((m) => !declared.has(m));
    expect(missing, `undeclared store modules: ${missing.join(", ")}`).toEqual([]);
  });

  it("declares nothing that no longer exists", () => {
    const files = new Set(sourceFiles(SRC).map(rel));
    const stale = RECORD_CLASSES.map((c) => c.module).filter((m) => !files.has(m));
    expect(stale, `registry names modules the tree no longer has: ${stale.join(", ")}`).toEqual([]);
  });

  it("gives every class a rationale — an undocumented classification is a guess", () => {
    for (const c of RECORD_CLASSES) {
      expect(c.rationale.length, `${c.module} has no rationale`).toBeGreaterThan(40);
      expect(c.what.length).toBeGreaterThan(3);
    }
  });

  it("treats 'derived' as a reviewed answer, not an exemption", () => {
    // Each derived class must say WHY erasing the source is sufficient.
    for (const c of RECORD_CLASSES.filter((x) => x.handling === "derived")) {
      expect(c.rationale.toLowerCase(), `${c.module} does not explain its derivation`).toMatch(
        /derive|recomput|read time|per run|source/,
      );
    }
  });
});

describe("W106 the classes W51 was about are still covered", () => {
  it("the complaints store is declared stored, not derived", () => {
    // The regression that started all of this.
    const complaints = RECORD_CLASSES.find((c) => c.module === "src/complaints/store.ts");
    expect(complaints?.handling).toBe("stored");
  });

  it("the booking rail is declared stored", () => {
    expect(RECORD_CLASSES.find((c) => c.module === "src/booking/store.ts")?.handling).toBe("stored");
  });

  it("names the classes an access request and an erasure must reach", () => {
    expect(storedClasses().map((c) => c.module).sort()).toEqual([
      "src/booking/store.ts",
      "src/complaints/store.ts",
      "src/interest/store.ts",
      "src/privacy/state.ts",
      "src/referrals/store.ts",
    ]);
  });

  it("records why the suppression list is deliberately NOT erased", () => {
    // A suppression that could be erased would let erasure re-open contact — the opposite of
    // what the patient asked for.
    const privacy = RECORD_CLASSES.find((c) => c.module === "src/privacy/state.ts");
    expect(privacy?.rationale).toMatch(/outlive|prove/i);
  });
});
