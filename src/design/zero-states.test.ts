import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emptyBranchCount, UNCLASSIFIED_EMPTY_BRANCHES, ZERO_STATES } from "./zero-states";

const ROOT = path.resolve(__dirname, "../..");

describe("AR24 — three kinds of zero, registered and distinct", () => {
  it("every registered sentence renders from the file that claims it", () => {
    for (const state of ZERO_STATES) {
      const source = readFileSync(path.join(ROOT, state.file), "utf8");
      expect(source, `${state.file} no longer carries "${state.sentence.slice(0, 40)}…" — reclassify or delete the entry`).toContain(state.sentence);
      expect(state.why.length).toBeGreaterThanOrEqual(40);
    }
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
   * THE RATCHET: every `length === 0` branch is either classified above or counted here, per
   * file, exactly — growth is a new unclassified zero (classify it or the build stays red), and
   * a drop is a classification nobody recorded (move it into ZERO_STATES in the same commit).
   */
  it("unclassified empty branches hold at the measured ceiling, both directions", () => {
    const walk = (dir: string, out: Map<string, number>) => {
      for (const entry of require("node:fs").readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (/\.tsx$/.test(entry.name) && !entry.name.includes(".test.")) {
          const count = emptyBranchCount(readFileSync(full, "utf8"));
          if (count > 0) out.set(path.relative(ROOT, full).replaceAll(path.sep, "/"), count);
        }
      }
    };
    const measured = new Map<string, number>();
    walk(path.join(ROOT, "app"), measured);
    const measuredRows = [...measured.entries()].map(([file, branches]) => ({ file, branches })).sort((a, b) => a.file.localeCompare(b.file));
    expect(measuredRows).toEqual([...UNCLASSIFIED_EMPTY_BRANCHES]);
  });

  /** Predicate probe. */
  it("the branch counter counts", () => {
    expect(emptyBranchCount("a.length === 0 ? x : y; b.length === 0 && z")).toBe(2);
    expect(emptyBranchCount("a.length > 0")).toBe(0);
  });
});
