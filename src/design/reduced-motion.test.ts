// taste-rule: motion.reduced-motion
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classifyMotionFile, MOTION_CONFIG_BOUNDARIES, motionImportingFiles } from "./reduced-motion";

const ROOT = path.resolve(__dirname, "../..");

describe("AR20 — reduced motion is checked at the hook (O127), provably", () => {
  const files = motionImportingFiles(ROOT);

  it("every motion-importing file is covered: hook, drilled prop, or a declared boundary", () => {
    const uncovered = files.filter(
      (file) => classifyMotionFile(file, readFileSync(path.join(ROOT, file), "utf8")).kind === "uncovered",
    );
    expect(
      uncovered,
      "these files import motion/react with no useReducedMotion, no reducedMotion prop, and no declared MotionConfig boundary — O127 says the hook is where reduce must be checked",
    ).toEqual([]);
  });

  it("every declared boundary is real in both directions", () => {
    for (const boundary of MOTION_CONFIG_BOUNDARIES) {
      // The covered file must still need the entry — an entry for a file that gained the hook
      // (or the prop) is stale paperwork hiding the register's actual coverage.
      const source = readFileSync(path.join(ROOT, boundary.file), "utf8");
      expect(/useReducedMotion|\breducedMotion\b/.test(source), `${boundary.file} now handles reduce itself — delete its boundary entry`).toBe(false);
      expect(files, `${boundary.file} no longer imports motion/react — delete its boundary entry`).toContain(boundary.file);
      // And the named ancestor must really render the config that does the covering.
      const ancestor = readFileSync(path.join(ROOT, boundary.ancestor), "utf8");
      expect(ancestor, `${boundary.ancestor} does not render MotionConfig reducedMotion="user" — the boundary is a claim, not a fact`).toMatch(
        /<MotionConfig reducedMotion="user">/,
      );
      expect(boundary.why.length).toBeGreaterThanOrEqual(40);
    }
  });

  it("the census is non-vacuous and sees all three legal states in the real tree", () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
    const kinds = new Set(files.map((file) => classifyMotionFile(file, readFileSync(path.join(ROOT, file), "utf8")).kind));
    expect(kinds).toContain("hook");
    expect(kinds).toContain("prop");
    expect(kinds).toContain("boundary");
  });

  /** The classifier's fourth state exists and fires — driven on the REAL function. */
  it("a motion import with none of the three states is named uncovered", () => {
    expect(classifyMotionFile("app/x.tsx", 'import { motion } from "motion/react";')).toEqual({ kind: "uncovered" });
    expect(classifyMotionFile("app/x.tsx", 'import { useReducedMotion } from "motion/react";')).toEqual({ kind: "hook" });
  });
});
