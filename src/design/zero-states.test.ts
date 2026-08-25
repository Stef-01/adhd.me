import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emptyBranchCount, NOT_A_ZERO_STATES, ZERO_STATES } from "./zero-states";

const ROOT = path.resolve(__dirname, "../..");

describe("AR24/AR25 — three kinds of zero, registered, distinct, and covering every branch", () => {
  it("every registered sentence renders from the file that claims it", () => {
    for (const state of ZERO_STATES) {
      const source = readFileSync(path.join(ROOT, state.sentenceFile ?? state.file), "utf8");
      expect(source, `${state.sentenceFile ?? state.file} no longer carries "${state.sentence.slice(0, 40)}…" — reclassify or delete the entry`).toContain(state.sentence);
      expect(state.why.length).toBeGreaterThanOrEqual(40);
    }
    for (const absent of NOT_A_ZERO_STATES) expect(absent.reason.length).toBeGreaterThanOrEqual(40);
  });

  /** THE DISTINCTNESS LAW: the same words may never serve two kinds of zero. */
  it("no sentence serves two kinds, and every kind exists", () => {
    const byKind = new Map<string, string>();
    for (const state of ZERO_STATES) {
      const seen = byKind.get(state.sentence);
      expect(seen === undefined || seen === state.kind, `"${state.sentence.slice(0, 50)}…" serves both ${seen} and ${state.kind}`).toBe(true);
      byKind.set(state.sentence, state.kind);
    }
    const kinds = new Set(ZERO_STATES.map((state) => state.kind));
    expect(kinds).toContain("no-data");
    expect(kinds).toContain("no-results");
    expect(kinds).toContain("broken");
  });

  /**
   * THE COVERAGE LAW (AR25, replacing AR24's ceiling with its own zero): every file's
   * `length === 0` branch count may not exceed that file's classifications — zero-state
   * entries plus declared not-a-zero-state absences. A file may hold MORE entries than
   * branches (a page can render a kind-carrying zero without a length test — outreach's
   * sample sentence, interop's whole view), so this is a floor on classification, not a
   * bijection; what it forbids is the thing AR24 forbade: a new empty branch nobody says
   * the kind of.
   */
  it("every empty branch is classified: branches per file never exceed classifications", () => {
    const classified = new Map<string, number>();
    for (const state of ZERO_STATES) classified.set(state.file, (classified.get(state.file) ?? 0) + 1);
    for (const absent of NOT_A_ZERO_STATES) classified.set(absent.file, (classified.get(absent.file) ?? 0) + 1);

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of require("node:fs").readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx$/.test(entry.name) && !entry.name.includes(".test.")) {
          const rel = path.relative(ROOT, full).replaceAll(path.sep, "/");
          const branches = emptyBranchCount(readFileSync(full, "utf8"));
          if (branches > (classified.get(rel) ?? 0)) {
            offenders.push(`${rel}: ${branches} empty branches, ${classified.get(rel) ?? 0} classified — say which kind of zero the new branch renders, or declare it renders none`);
          }
        }
      }
    };
    walk(path.join(ROOT, "app"));
    expect(offenders).toEqual([]);
    // Non-vacuity: the law must actually be counting a populated tree.
    expect([...classified.values()].reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(30);
  });

  /** Predicate probe. */
  it("the branch counter counts", () => {
    expect(emptyBranchCount("a.length === 0 ? x : y; b.length === 0 && z")).toBe(2);
    expect(emptyBranchCount("a.length > 0")).toBe(0);
  });
});
