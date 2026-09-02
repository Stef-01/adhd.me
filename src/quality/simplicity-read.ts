// U15 (R0): the reader behind the simplicity laws — files measured and blocks compared, nothing
// decided. `simplicity.ts` owns every verdict.
//
// The duplicate detector is the only non-obvious thing here, so it says what it does:
//   * It NORMALISES before comparing — leading indentation collapsed, trailing whitespace gone,
//     blank lines and comment-only lines dropped. Two blocks that differ only in how deep they sit
//     are the same block, and a copy somebody reindented is the copy this is looking for.
//   * It compares WINDOWS OF TWELVE normalised lines by hash, across `src/` and `app/` together,
//     because the copies worth finding are the ones that crossed a directory.
//   * It reports the FIRST window of each file pair only. A 40-line copy produces 29 overlapping
//     windows, and a finding list that says the same thing 29 times is a list nobody reads.
//   * A file is never compared with itself. Repetition inside one file is a different law (a
//     table, usually) and this detector would drown a data file in findings for being a table.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { lineCount, walk } from "./size-census-read.ts";

const TS = /\.(ts|tsx)$/;
const TEST = /\.test\.tsx?$/;

/** Every product and law file, test files excluded — the population all three laws measure. */
export function simplicityFiles(root = process.cwd()): string[] {
  return [...walk("app", root), ...walk("src", root)].filter((f) => TS.test(f) && !TEST.test(f));
}

/** `file -> wc -l lines`, for the file-size law. */
export function fileLengths(files: readonly string[], root = process.cwd()): Record<string, number> {
  const out: Record<string, number> = {};
  for (const file of files) out[file] = lineCount(readFileSync(path.join(root, file), "utf8"));
  return out;
}

/** A line stripped of everything that is formatting rather than code. */
function normalise(line: string): string {
  return line.trim().replace(/\s+/g, " ");
}

function isCode(line: string): boolean {
  const t = line.trim();
  if (t.length === 0) return false;
  return !(t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t === "*/");
}

export interface DuplicateBlock {
  readonly left: string;
  /** 1-based line in `left` where the window starts. */
  readonly leftAt: number;
  readonly right: string;
  readonly rightAt: number;
  readonly lines: number;
}

/**
 * Copied blocks of at least `window` normalised lines, across the given files.
 *
 * One finding per file pair — see the header. Deterministic: files are walked in sorted order and
 * the first window of a pair wins, so the same tree always produces the same list in the same
 * order (which `order-independence.ts` cares about and a reviewer diffing two runs cares about).
 */
export function duplicateBlocks(files: readonly string[], window: number, root = process.cwd()): DuplicateBlock[] {
  const seen = new Map<string, { file: string; at: number }>();
  const pairs = new Set<string>();
  const out: DuplicateBlock[] = [];
  for (const file of [...files].sort()) {
    const raw = readFileSync(path.join(root, file), "utf8").split("\n");
    // Keep each kept line's original 1-based number, so a finding points at the real file.
    const kept: { text: string; at: number }[] = [];
    raw.forEach((line, index) => {
      if (isCode(line)) kept.push({ text: normalise(line), at: index + 1 });
    });
    for (let i = 0; i + window <= kept.length; i += 1) {
      const slice = kept.slice(i, i + window);
      const hash = createHash("sha1").update(slice.map((l) => l.text).join("\n")).digest("hex");
      const before = seen.get(hash);
      if (before === undefined) {
        seen.set(hash, { file, at: slice[0]!.at });
        continue;
      }
      if (before.file === file) continue;
      const pair = [before.file, file].sort().join(" | ");
      if (pairs.has(pair)) continue;
      pairs.add(pair);
      out.push({ left: before.file, leftAt: before.at, right: file, rightAt: slice[0]!.at, lines: window });
    }
  }
  return out;
}
