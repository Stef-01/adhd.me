// AR20: reduced-motion equality — the census half.
//
// O127 established WHERE reduced motion must be checked: at the hook (`useReducedMotion`), not
// only in CSS, because motion/react drives inline styles that no `@media (prefers-reduced-motion)`
// block can reach. This register makes that law scannable. Every app file importing motion/react
// must hold exactly one of three LEGAL states, each verifiable from source:
//   1. HOOK      — the file calls useReducedMotion itself;
//   2. PROP      — the file takes a drilled `reducedMotion` prop (the finder stages' pattern:
//                  one hook call in care-finder, honest data flow below it);
//   3. BOUNDARY  — the file is declared below, naming the ancestor whose
//                  <MotionConfig reducedMotion="user"> covers it — the state a naive hook-grep
//                  cannot see, which is exactly why it must be WRITTEN DOWN and the ancestor
//                  separately asserted to really render that config.
// A fourth state — motion import, none of the above — fails the suite with the file named.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type MotionCoverage =
  | { readonly kind: "hook" }
  | { readonly kind: "prop" }
  | { readonly kind: "boundary"; readonly ancestor: string }
  | { readonly kind: "uncovered" };

/** Files whose reduce handling lives in an ANCESTOR MotionConfig, not in their own source. */
export const MOTION_CONFIG_BOUNDARIES: ReadonlyArray<{
  readonly file: string;
  readonly ancestor: string;
  readonly why: string;
}> = [
  {
    file: "app/finder-stages/profile-stage.tsx",
    ancestor: "app/care-finder.tsx",
    why:
      "Its lone motion element is the portrait's layoutId shared-element transition; care-finder wraps every stage in <MotionConfig reducedMotion=\"user\">, which suppresses layout/transform animation for reduce users globally — the file needs no hook because the boundary already decides for it.",
  },
];

/** Classifies one motion-importing file — the same logic the test sweeps the tree with. */
export function classifyMotionFile(file: string, source: string): MotionCoverage {
  if (/useReducedMotion/.test(source)) return { kind: "hook" };
  if (/\breducedMotion\b/.test(source)) return { kind: "prop" };
  const boundary = MOTION_CONFIG_BOUNDARIES.find((entry) => entry.file === file);
  if (boundary) return { kind: "boundary", ancestor: boundary.ancestor };
  return { kind: "uncovered" };
}

/** Every app source importing motion/react, app-relative, tests excluded. */
export function motionImportingFiles(repoRoot: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) {
        const source = readFileSync(full, "utf8");
        if (/from "motion\/react"/.test(source)) out.push(path.relative(repoRoot, full).replaceAll(path.sep, "/"));
      }
    }
  };
  walk(path.join(repoRoot, "app"));
  return out.sort();
}
