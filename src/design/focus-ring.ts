// AR23: the visible ring's static law — outline suppression without a replacement is a build
// failure.
//
// The DYNAMIC half already exists and stays where it is: keyboard-focus.spec.ts (O147/O175)
// tab-walks every public and console route with real Tab presses, asserting reachability and a
// visible indicator on whatever element holds focus. What no check asserted was the source-level
// law the taste register states ("never `outline: none` without a replacement"): nothing
// stopped a rule or a class string from suppressing the ring and shipping.
//
// Measured at claim time: globals.css carries ZERO real suppression sites (its one textual
// match is the comment stating this law), and components carry exactly three tailwind
// `focus:outline-none` sites — the demo CTA and the console field/button styles — each pairing
// its suppression with `focus:ring` in the SAME class string. Those numbers are pinned; a
// suppression whose replacement is not in the same string or rule block fails with the file
// named.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** globals.css `outline: none|0` DECLARATIONS (comments excluded) — pinned at zero. */
export const CSS_SUPPRESSION_SITES = 0;

/** Component `focus:outline-none` sites, per file — every one must pair a ring in-string. */
export const COMPONENT_SUPPRESSION_SITES: ReadonlyArray<{ readonly file: string; readonly sites: number }> = [
  { file: "app/console/ui.tsx", sites: 2 },
  { file: "app/demo/page.tsx", sites: 1 },
];

/** CSS declarations suppressing the outline, comment lines excluded. */
export function cssSuppressions(css: string): Array<{ line: number }> {
  const out: Array<{ line: number }> = [];
  css.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("*") || trimmed.startsWith("/*") || trimmed.startsWith("//")) return;
    if (/outline:\s*(none|0)\s*[;}!]/.test(line)) out.push({ line: index + 1 });
  });
  return out;
}

/**
 * Every `outline-none` occurrence in a component source, with whether the SAME string literal
 * carries a focus ring. The string literal is the right scope: a class list is one styling
 * decision, and a ring declared three files away is exactly the "replacement" this law refuses
 * to accept on faith.
 */
export function componentSuppressions(source: string): Array<{ line: number; replaced: boolean }> {
  const out: Array<{ line: number; replaced: boolean }> = [];
  source.split("\n").forEach((line, index) => {
    if (!line.includes("outline-none")) return;
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
    out.push({ line: index + 1, replaced: /focus(-visible)?:ring/.test(line) });
  });
  return out;
}

export function walkComponents(repoRoot: string): Array<{ file: string; source: string }> {
  const out: Array<{ file: string; source: string }> = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) {
        out.push({ file: path.relative(repoRoot, full).replaceAll(path.sep, "/"), source: readFileSync(full, "utf8") });
      }
    }
  };
  walk(path.join(repoRoot, "app"));
  return out;
}
