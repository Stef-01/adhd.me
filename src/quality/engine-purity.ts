// O221 (STANDALONE-APP-PLAN.md Phase 2): the engine seam, made law.
//
// The app appraisal's central engineering fact was measured, not asserted: the matching engine,
// the roster, the gazetteer and the compliance linters import no React, no Next and no DOM —
// a pure-TS core any runtime can host. That purity existed BY ACCIDENT of discipline; nothing
// failed if somebody added `import { useMemo } from "react"` to a ranking file. This module is
// the accident made law: the plan's Phase 2 in its cheap, correct-first form (an import-boundary
// census now; a workspace package only if native ever needs one).
//
// WHAT IS CLAIMED, PRECISELY, because a purity law that overclaims gets excepted to death:
//   * LAW A (framework/DOM, absolute): no file in the core's transitive import closure imports a
//     UI framework, marks a client boundary, or touches a DOM global. This is the claim the app
//     plan leans on and it holds with zero exceptions.
//   * LAW B (node builtins, portability): `node:` imports keep the core off React Native and the
//     browser. One module legitimately needs them and is DECLARED below rather than silently
//     allowed: a census that reads the repo's own tree is test/build-time machinery, and an app
//     port takes the core WITHOUT it.
//
// THE CLOSURE IS WALKED, NOT LISTED. A file the core imports is the core's problem wherever it
// lives (`@/domain/types`, `@/messaging/templates`, `@/education/advice-lint` are all reached
// today) — a directory list would let impurity hide one hop away.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/** Where the core starts: the four directories the app plan names, plus the onboarding types. */
export const CORE_ENTRY_DIRS = ["src/matching", "src/demo", "src/geo", "src/compliance"] as const;
export const CORE_ENTRY_FILES = ["src/onboarding/types.ts"] as const;

/** LAW B's declared exceptions — module path, and why a reviewer should accept it. */
export const NODE_IMPORT_EXCEPTIONS: ReadonlyArray<{ file: string; rationale: string }> = [
  {
    file: "src/compliance/surfaces.ts",
    rationale:
      "The surface census walks app/ on disk to refuse unregistered public routes — repo-introspection consumed by tests and the build, never by a rendering surface. An app port takes the core WITHOUT this module; anything else in the closure growing a node: import must argue its own entry here.",
  },
];

/** Import specifiers LAW A refuses anywhere in the closure. */
const FRAMEWORK_SPECIFIER = /^(react(-dom)?($|\/)|next($|\/)|motion($|\/)|framer-motion|@vercel\/|@phosphor-icons\/)/;

/** DOM globals LAW A refuses in code (measured on comment- and string-stripped source). */
const DOM_USE = /\b(window|document|navigator|localStorage|sessionStorage)\s*[.[(]/;

/** Strips comments and string/template literals so prose cannot trip the DOM scan. */
export function stripNonCode(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/`(?:[^`\\]|\\.)*`/g, '""')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, '""');
}

/** Every import/export-from specifier in a TS source. */
export function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:^|\n)\s*(?:import|export)[^;'"]*?from\s*"([^"]+)"|import\s*\(\s*"([^"]+)"\s*\)/g)]
    .map((m) => m[1] ?? m[2]!)
    .filter(Boolean);
}

/** Resolves a specifier to a repo-relative .ts file, or null for a package/builtin. */
function resolveInternal(fromFile: string, spec: string, root: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(root, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.join(path.dirname(path.join(root, fromFile)), spec);
  else return null;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (existsSync(candidate)) return path.relative(root, candidate);
  }
  return null;
}

export type PurityFinding = { file: string; law: "A" | "B"; detail: string };

export function walkCore(root: string, listDir: (dir: string) => string[]): {
  closure: string[];
  findings: PurityFinding[];
} {
  const queue: string[] = [...CORE_ENTRY_FILES];
  for (const dir of CORE_ENTRY_DIRS) {
    for (const file of listDir(path.join(root, dir))) {
      if (file.endsWith(".ts") && !file.endsWith(".test.ts")) queue.push(path.join(dir, file));
    }
  }
  const seen = new Set<string>();
  const findings: PurityFinding[] = [];
  const nodeExcepted = new Set(NODE_IMPORT_EXCEPTIONS.map((e) => e.file));

  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(path.join(root, file), "utf8");
    const code = stripNonCode(source);

    if (/^\s*"use client"/.test(source) || code.includes('"use client"')) {
      findings.push({ file, law: "A", detail: "marks a client boundary" });
    }
    const domHit = code.match(DOM_USE);
    if (domHit) findings.push({ file, law: "A", detail: `touches DOM global \`${domHit[1]}\`` });

    for (const spec of importSpecifiers(source)) {
      if (FRAMEWORK_SPECIFIER.test(spec)) {
        findings.push({ file, law: "A", detail: `imports framework module "${spec}"` });
      }
      if (spec.startsWith("node:") && !nodeExcepted.has(file)) {
        findings.push({ file, law: "B", detail: `imports "${spec}" without a declared exception` });
      }
      const internal = resolveInternal(file, spec, root);
      if (internal && !internal.endsWith(".test.ts")) queue.push(internal);
    }
  }
  return { closure: [...seen].sort(), findings };
}
