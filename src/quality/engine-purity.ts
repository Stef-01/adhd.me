// O221 (STANDALONE-APP-PLAN.md Phase 2): the engine seam, made law. O222 rebuilt the scanner on
// `src/security/reachability.ts`'s hardened one instead of a fresh copy — the review found the
// copy was the pre-hardening version (it scanned raw source, missed single-quoted and bare
// side-effect imports, and its comment-stripper ate `https://` URLs), and W165's fixes exist
// precisely so the next scanner does not relearn them.
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

import { readFileSync } from "node:fs";
import path from "node:path";
import { resolveFirstParty, specifiersIn, stripComments } from "@/security/reachability";

/** Stable repository path for comparisons and declared registers, independent of host OS. */
function repoPath(value: string): string {
  return value.replaceAll(path.sep, "/");
}

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

/** Comments away first (reachability's hardened stripper — the `[^:]` guard keeps a URL's `//`
 * intact inside code), then string and template literals masked, so neither prose nor data can
 * trip — or hide — the DOM scan. */
export function stripNonCode(source: string): string {
  return stripComments(source)
    .replace(/`(?:[^`\\]|\\.)*`/g, '""')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, '""');
}

export type PurityFinding = { file: string; law: "A" | "B"; detail: string };

export function walkCore(root: string, listDir: (dir: string) => string[]): {
  closure: string[];
  findings: PurityFinding[];
} {
  const queue: string[] = [...CORE_ENTRY_FILES];
  for (const dir of CORE_ENTRY_DIRS) {
    for (const file of listDir(path.join(root, dir))) {
      if (file.endsWith(".ts") && !file.endsWith(".test.ts")) queue.push(repoPath(path.join(dir, file)));
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

    if (/^\s*["']use client["']/.test(source)) {
      findings.push({ file, law: "A", detail: "marks a client boundary" });
    }
    const domHit = code.match(DOM_USE);
    if (domHit) findings.push({ file, law: "A", detail: `touches DOM global \`${domHit[1]}\`` });

    for (const spec of specifiersIn(source)) {
      if (FRAMEWORK_SPECIFIER.test(spec)) {
        findings.push({ file, law: "A", detail: `imports framework module "${spec}"` });
      }
      if (spec.startsWith("node:") && !nodeExcepted.has(file)) {
        findings.push({ file, law: "B", detail: `imports "${spec}" without a declared exception` });
      }
      const resolved = resolveFirstParty(spec, path.join(root, file), root);
      if (resolved) {
        const internal = repoPath(path.relative(root, resolved));
        if (!internal.endsWith(".test.ts")) queue.push(internal);
      }
    }
  }
  return { closure: [...seen].sort(), findings };
}
