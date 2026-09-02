// U14 (R0): the reader behind the size census — the tree measured, nothing decided.
//
// `size-census.ts` owns the register and every verdict; this module only reads files and counts.
// It is the numbers §1 and §2.5 of `docs/ONE-YEAR-BUILD-PLAN.md` were read by hand on the day
// the plan was laid, written down as code so they can be re-derived rather than believed. Each
// measure says exactly what it counts, because a number nobody can re-derive is a claim.
//
// LINES ARE `wc -l` LINES — newline characters — so a figure here matches what a shell reports and
// what the plan quoted. TEST FILES are `*.test.ts(x)`, `e2e/*.spec.ts` and `e2e/support`; the
// product and law trees exclude them, the test trees are them. Comments are counted with the
// code they explain: a law that measured "lines without prose" would reward deleting the reasons.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { deadClasses, styledClasses } from "../design/dead-css.ts";

// `app/` and `src/` are TypeScript trees; `globals.css` is measured on its own below, as §1 does.
const TS = /\.(ts|tsx)$/;
const SCRIPT = /\.(ts|tsx|mts|mjs|js)$/;
const TEST = /\.test\.tsx?$/;

/** Every file under `dir` (relative paths, sorted), skipping build output and dependencies. */
export function walk(dir: string, root = process.cwd()): string[] {
  const out: string[] = [];
  const visit = (rel: string): void => {
    for (const entry of readdirSync(path.join(root, rel), { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(child);
      else out.push(child);
    }
  };
  if (statSync(path.join(root, dir), { throwIfNoEntry: false })?.isDirectory()) visit(dir);
  return out.sort();
}

export function lineCount(text: string): number {
  return (text.match(/\n/g) ?? []).length;
}

function read(file: string, root: string): string {
  return readFileSync(path.join(root, file), "utf8");
}

function sum(files: string[], root: string): number {
  return files.reduce((n, f) => n + lineCount(read(f, root)), 0);
}

const isTs = (f: string): boolean => TS.test(f);
const isScript = (f: string): boolean => SCRIPT.test(f);
const isTest = (f: string): boolean => TEST.test(f);

/**
 * Import specifiers a module names: `import … from`, `export … from`, `import("…")`. Comments
 * are stripped first so prose cannot create an edge (O200's lesson, applied to the graph).
 */
export function importSpecifiers(source: string): string[] {
  // Line comments first: a `/*` quoted inside one (this file's own header has `e2e/*.spec.ts`)
  // must not open a block that swallows the imports below it.
  const code = source.replace(/(^|[^:])\/\/[^\n]*/g, "$1 ").replace(/\/\*[\s\S]*?\*\//g, " ");
  const out: string[] = [];
  for (const m of code.matchAll(/(?:import|export)\s[^'"`;]*?\sfrom\s*["']([^"']+)["']/g)) out.push(m[1]!);
  for (const m of code.matchAll(/(?:^|[^\w.])import\s*\(\s*["']([^"']+)["']\s*\)/g)) out.push(m[1]!);
  for (const m of code.matchAll(/(?:^|[^\w.])import\s*["']([^"']+)["']/g)) out.push(m[1]!);
  return out;
}

/** Resolves one specifier from `from` to a file in `files`, or `undefined` for a package. */
export function resolveImport(from: string, spec: string, files: ReadonlySet<string>): string | undefined {
  let base: string;
  if (spec.startsWith("@/")) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith(".")) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return undefined;
  const candidates = [base, ...[".ts", ".tsx", ".mts", ".js", ".mjs"].map((e) => base + e)];
  for (const ext of [".ts", ".tsx"]) candidates.push(`${base}/index${ext}`);
  return candidates.find((c) => files.has(c));
}

/** `from → [to]` over the given files: the module graph, packages left out. */
export function importGraph(files: string[], root: string): Map<string, string[]> {
  const set = new Set(files);
  const graph = new Map<string, string[]>();
  for (const file of files) {
    const targets = new Set<string>();
    for (const spec of importSpecifiers(read(file, root))) {
      const to = resolveImport(file, spec, set);
      if (to !== undefined && to !== file) targets.add(to);
    }
    graph.set(file, [...targets]);
  }
  return graph;
}

/** Everything reachable from `roots` through `graph`, roots included. */
export function closure(roots: Iterable<string>, graph: ReadonlyMap<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length > 0) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const to of graph.get(file) ?? []) if (!seen.has(to)) stack.push(to);
  }
  return seen;
}

/**
 * Files whose size, not their code, is their content: the compliance corpus and the rosters.
 * §2.5 pins these "separately" — the largest-file floor is over everything else.
 */
export const DATA_FILES: readonly string[] = [
  "src/matching/corpus.ts",
  "src/demo/clinicians.ts",
  "src/demo/roster.ts",
  "src/demo/synthetic-roster.ts",
];

export type Census = Readonly<Record<string, number>>;

/** Every number the register pins, measured from `root`. */
export function measureTree(root = process.cwd()): Census {
  const app = walk("app", root).filter(isTs);
  const src = walk("src", root).filter(isTs);
  const e2e = walk("e2e", root).filter(isScript);
  const scripts = walk("scripts", root).filter(isScript);

  const appProduct = app.filter((f) => !isTest(f));
  const srcModules = src.filter((f) => !isTest(f));
  const vitest = [...app, ...src].filter(isTest);
  const specs = e2e.filter((f) => /^e2e\/[^/]+\.spec\.ts$/.test(f));
  const support = e2e.filter((f) => f.startsWith("e2e/support/"));

  // The product's import closure: every non-test file under app/ is a root — Next reaches them
  // by convention, not by import.
  const graph = importGraph([...appProduct, ...srcModules], root);
  const reached = closure(appProduct, graph);
  const reachedSrc = srcModules.filter((f) => reached.has(f));
  const unreachedSrc = srcModules.filter((f) => !reached.has(f));
  // Held only by tests: no product or law module names it — its importers, if any, are tests.
  const importers = new Map<string, Set<string>>();
  for (const [from, tos] of graph) for (const to of tos) (importers.get(to) ?? importers.set(to, new Set()).get(to)!).add(from);
  const testHeld = unreachedSrc.filter((f) => (importers.get(f)?.size ?? 0) === 0);
  const singleImporter = srcModules.filter((f) => importers.get(f)?.size === 1);

  const css = read("app/globals.css", root);
  const masked = css.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));
  const ruleBlocks = [...masked.matchAll(/(^|[{}])([^{}@]+?)\{/g)].length;
  const productSource = [...appProduct, ...srcModules].map((f) => read(f, root)).join("\n");
  const classNameAttrs = (productSource.match(/className\s*=/g) ?? []).length;

  const consoleFiles = appProduct.filter((f) => f.startsWith("app/console/"));
  const actionFiles = appProduct.filter((f) => f.endsWith("/actions.ts"));
  const useClient = [...appProduct, ...srcModules].filter((f) => /^\s*["']use client["']/m.test(read(f, root).slice(0, 400)));
  const gotoCalls = specs.reduce((n, f) => n + (read(f, root).match(/\bpage\.goto\(/g) ?? []).length, 0);
  const nonData = [...appProduct, ...srcModules].filter((f) => !DATA_FILES.includes(f));
  const largest = (files: string[]): number => Math.max(0, ...files.map((f) => lineCount(read(f, root))));

  // A store is a module named for being one: `<area>/store.ts` or `<area>/<thing>-store.ts`. The
  // plan's 21 was a hand count over a looser idea (resetters and file-backed state included); this
  // is the re-derivable rule, and U19's adapters are what lower it.
  const storeModules = srcModules.filter((f) => /(^|[/-])store\.ts$/.test(f));

  return {
    "app-files": appProduct.length,
    "app-lines": sum(appProduct, root),
    "app-console-pages": consoleFiles.filter((f) => /\/page\.tsx$/.test(f)).length,
    "app-console-lines": sum(consoleFiles, root),
    "actions-files": actionFiles.length,
    "actions-lines": sum(actionFiles, root),
    "mock-routes": appProduct.filter((f) => /^app\/api\/mock\/.*\/route\.ts$/.test(f)).length,
    "src-modules": srcModules.length,
    "src-lines": sum(srcModules, root),
    "src-reached-modules": reachedSrc.length,
    "src-reached-lines": sum(reachedSrc, root),
    "src-unreached-modules": unreachedSrc.length,
    "src-unreached-lines": sum(unreachedSrc, root),
    "src-test-held-modules": testHeld.length,
    "src-single-importer-modules": singleImporter.length,
    "store-modules": storeModules.length,
    "use-client-files": useClient.length,
    "largest-file-lines": largest(nonData),
    "largest-data-file-lines": largest([...DATA_FILES]),
    "css-lines": lineCount(css),
    "css-rule-blocks": ruleBlocks,
    "css-styled-classes": styledClasses(css).size,
    "css-dead-classes": deadClasses(css, productSource).length,
    "classname-attributes": classNameAttrs,
    "vitest-files": vitest.length,
    "vitest-lines": sum(vitest, root),
    "e2e-spec-files": specs.length,
    "e2e-spec-lines": sum(specs, root),
    "e2e-support-lines": sum(support, root),
    "e2e-goto-calls": gotoCalls,
    "scripts-lines": sum(scripts, root),
  };
}
