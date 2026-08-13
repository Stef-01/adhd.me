// W107: which npm packages a request-serving path can reach.
//
// The audit allowlist accepts two `image-size` advisories on one argument: `pptxgenjs` runs at
// build time to generate our own deck from our own assets, and is "absent from the deployed
// app". That argument is the whole acceptance — if it stops being true, the gate is passing on
// a claim rather than a fact.
//
// Nothing checked it, and the review that produced this module found the sibling case already
// broken: `app/console/results/page.tsx` imported `DEFAULT_REPORT_OPTIONS` — three plain
// numbers — from `src/report/weekly.ts`, which imports `docx` at module scope. A server
// component was loading a document library to read a constant. Benign today because `docx`
// carries no advisory; not benign as a pattern, because it is exactly the reasoning the
// acceptance depends on, applied to the package next door.
//
// Note what did NOT catch it: `next build` succeeds either way, because a dev dependency is
// installed in the build environment. A green build is not evidence that a build-time package
// stayed out of the bundle.
//
// The walk is deliberately static and syntactic. It follows `import`/`export … from` in
// first-party files only, which is what this tree uses; it does not resolve dynamic imports or
// re-export chains through node_modules, and it does not need to — the question is whether OUR
// route code names a module that names a banned package.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// W165: two fixes to a scanner that was reading prose as code.
//
// `[^;=]`, not `[^;]`: the original spanned statements, so `export const X: Record<A, string> =
// {` plus a later `from "..."` matched as one "import". No genuine import contains `=` (this
// tree uses no `import x = require(...)`), while every accidental cross-statement match does.
//
// And comments are STRIPPED before scanning. This tree is heavily commented and the word "from"
// is ordinary English — a doc comment ending "...delete it from" was enough to start a match
// that ran into the next string literal. Both bugs produce the same two harms: a nonsense entry
// in the package set, and — the one that matters — a CONSUMED region, since `exec` advances
// past the whole match, so a real import sitting inside it is never seen. A control whose job
// is to prove something is unreachable must not be able to miss an import.
const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s[^;=]*?from\s*["']([^"']+)["']/g;

/** A real module specifier: no whitespace, no braces. Junk cannot survive this. */
const SPECIFIER_RE = /^[^\s{}()<>=,;"']+$/;

/**
 * Remove comments so prose cannot be mistaken for code.
 *
 * Replaces each comment with an equal number of newlines rather than deleting it, so nothing
 * downstream depends on offsets shifting.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead: string) => lead);
}
const BARE_IMPORT_RE = /(?:^|\n)\s*import\s*["']([^"']+)["']/g;
const CANDIDATE_EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function specifiersIn(rawSource: string): string[] {
  const source = stripComments(rawSource);
  const found: string[] = [];
  for (const re of [IMPORT_RE, BARE_IMPORT_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      const specifier = match[1];
      // Anything that is not specifier-shaped is a scanner artefact, not a dependency.
      if (specifier && SPECIFIER_RE.test(specifier)) found.push(specifier);
    }
  }
  return found;
}

/** Resolve a first-party specifier to a file, or null when it is an npm package. */
function resolveFirstParty(specifier: string, fromFile: string, root: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = join(root, "src", specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else return null;

  for (const ext of ["", ...CANDIDATE_EXTS]) {
    const candidate = `${base}${ext}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function entryPoints(appDir: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry) && !entry.includes(".test.")) {
        // Everything under app/ is request-serving: pages, layouts, route handlers, server
        // actions and the components they pull in. No allow-list of filenames — a new kind of
        // entry point should be covered the day it lands, not the day someone remembers.
        found.push(full);
      }
    }
  };
  walk(appDir);
  return found;
}

export interface ReachResult {
  /** First-party files reachable from `app/`, as repo-relative paths. */
  files: string[];
  /** npm package names those files import, deduplicated. */
  packages: string[];
}

/** Every first-party module and npm package reachable from a request-serving path. */
export function reachableFromApp(root: string): ReachResult {
  const seen = new Set<string>();
  const packages = new Set<string>();
  const queue = entryPoints(join(root, "app"));
  for (const file of queue) seen.add(file);

  while (queue.length > 0) {
    const file = queue.shift()!;
    let source: string;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    for (const specifier of specifiersIn(source)) {
      const resolved = resolveFirstParty(specifier, file, root);
      if (resolved === null) {
        if (specifier.startsWith("node:")) continue;
        // Scoped packages keep their scope; deep imports are attributed to their package.
        const parts = specifier.split("/");
        packages.add(specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!);
        continue;
      }
      if (!seen.has(resolved)) {
        seen.add(resolved);
        queue.push(resolved);
      }
    }
  }

  // Posix separators on every platform, matching how callers and tests name files.
  const rel = (p: string) => p.slice(root.length + 1).replaceAll("\\", "/");
  return {
    files: [...seen].map(rel).sort(),
    packages: [...packages].sort(),
  };
}
