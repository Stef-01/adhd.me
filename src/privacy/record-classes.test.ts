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
import { NO_PATIENT_LINKAGE, RECORD_CLASSES, storedClasses } from "./record-classes";

const SRC = path.resolve(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") && !full.endsWith(".test.ts") ? [full] : [];
  });
}

const rel = (file: string) => `src/${path.relative(SRC, file).split(path.sep).join("/")}`;

/**
 * Source with comments and string literals removed, so a scan reads CODE.
 *
 * W247 needed this: the moment `record-classes.ts` explained in a rationale which keyword the
 * detector looks for, the detector found that keyword — in its own explanation — and reported the
 * register as an undeclared store. A scan that matches the sentence describing the rule is a scan
 * that punishes documenting it, and this tree has now hit that exact shape four times.
 */
function codeOnly(file: string): string {
  const raw = readFileSync(file, "utf8");
  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ")
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
  return stripped;
}

/** Every module that holds a globalThis-backed store — i.e. can retain data across requests. */
function storeModules(): string[] {
  return sourceFiles(SRC)
    .filter((f) => /globalThis as \{/.test(codeOnly(f)))
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

describe("W247 the detector's own reach, and the lane it could not see", () => {
  it("strips comments and literals without stripping the code", () => {
    // A stripper that removes too much silently disables the detector: every file reads as empty,
    // `storeModules()` returns nothing, and the suite goes green because it is looking at nothing.
    // W246 hit this class of vacuity twice. So the stripper is checked in both directions.
    const booking = path.join(SRC, "booking/store.ts");
    const stripped = codeOnly(booking);
    expect(stripped, "the stripper removed the code too").toMatch(/globalThis as \{/);
    expect(stripped.length, "the stripper emptied the file").toBeGreaterThan(200);
    // And it DOES remove the thing it exists to remove.
    expect(codeOnly(path.join(SRC, "privacy/record-classes.ts"))).not.toMatch(/globalThis as \{/);
    // Non-vacuity for the detector itself: it still finds the stores W51 was about.
    expect(storeModules()).toContain("src/booking/store.ts");
    expect(storeModules().length).toBeGreaterThan(5);
  });

  it("classifies every module in the interop lane, one way or the other", () => {
    // WHY THE LANE AND NOT THE TREE. W239 went undeclared through its own unit because W106 finds a
    // record class by looking for `globalThis` — a PROXY for holding data — and W239 holds nothing
    // while being the module whose whole subject is what left the tree about a named patient. The
    // obvious repair is a tree-wide rule on modules naming a patient id. W247 measured that first:
    // 39 undeclared modules name `patientId` in code, nearly all of them pure functions that PASS
    // one through. A rule with 39 exceptions is weaker than no rule, and it is the same shape as
    // the gap W246 recorded in W200 — a register that checks the direction its author had in mind.
    // So this is bounded to the lane where the miss happened: eight modules, each with an answer.
    const laneFiles = sourceFiles(path.join(SRC, "interop")).map(rel).sort();
    expect(laneFiles.length, "the lane sweep found no files").toBeGreaterThan(5);
    const declared = new Set(RECORD_CLASSES.map((c) => c.module));
    const unanswered = laneFiles.filter(
      (m) => !declared.has(m) && !NO_PATIENT_LINKAGE.some((n) => n.module === m),
    );
    expect(
      unanswered,
      `interop modules with no record-class answer: ${unanswered.join(", ")}`,
    ).toEqual([]);
  });

  it("makes the no-linkage list an answer rather than an exemption", () => {
    // Same bar `derived` has to meet. A list of names with no reasons is a way to make the check
    // above pass without anybody deciding anything.
    for (const entry of NO_PATIENT_LINKAGE) {
      expect(entry.why.length, `${entry.module} is exempted without a reason`).toBeGreaterThan(80);
    }
    // And it names only files that exist, so a deleted module cannot leave a live exemption behind.
    const files = new Set(sourceFiles(SRC).map(rel));
    for (const entry of NO_PATIENT_LINKAGE) {
      expect(files.has(entry.module), `${entry.module} no longer exists`).toBe(true);
    }
    // Nothing may be in both lists: a module is classified once.
    const declared = new Set(RECORD_CLASSES.map((c) => c.module));
    for (const entry of NO_PATIENT_LINKAGE) {
      expect(declared.has(entry.module), `${entry.module} is classified twice`).toBe(false);
    }
  });

  it("keeps the argument for the lane scope checkable, without pinning a moving number", () => {
    // docs/HARDENING-Q19.md argues the tree-wide rule is not worth writing because it would carry
    // too many exceptions, and cites 39 modules naming a patient id in code at the time of W247.
    // Pinning 39 exactly would fail on unrelated work and teach the next builder to edit the number
    // rather than read the argument — W207's bug, a point-in-time figure pinned to a live tree. So
    // the ARGUMENT is what is pinned: the gap is still large enough that a blanket rule would be
    // exceptions with a rule attached. If this ever drops below the bound, the tree-wide version
    // has become worth writing and this test is the thing that says so.
    const named = sourceFiles(SRC)
      .filter((f) => /\bpatientId\b/.test(codeOnly(f)))
      .map(rel);
    const declared = new Set([
      ...RECORD_CLASSES.map((c) => c.module),
      ...NO_PATIENT_LINKAGE.map((n) => n.module),
    ]);
    const undeclared = named.filter((m) => !declared.has(m));
    expect(named.length, "the patient-id sweep found nothing — it is reading no code").toBeGreaterThan(20);
    expect(
      undeclared.length,
      "the tree-wide record-class rule may now be worth writing: see docs/HARDENING-Q19.md",
    ).toBeGreaterThan(20);
  });

  it("declares the disclosure ledger, which is the module that went missing", () => {
    const ledger = RECORD_CLASSES.find((c) => c.module === "src/interop/disclosure-ledger.ts");
    expect(ledger, "W239 is undeclared again").toBeDefined();
    expect(ledger!.handling).toBe("derived");
    // The trigger is the part that matters: this classification is correct only while there is no
    // store, and the entry has to say what changes it.
    expect(ledger!.rationale).toMatch(/TRIGGER/);
    expect(ledger!.rationale).toMatch(/G9/);
    // And the detector still cannot see it — which is why the lane rule above exists.
    expect(storeModules()).not.toContain("src/interop/disclosure-ledger.ts");
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
