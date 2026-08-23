// A guard against the file-sync duplicates that keep re-breaking the census gate.
//
// WHY THIS EXISTS, NAMED SO THE NEXT PERSON DOES NOT HAVE TO REDISCOVER IT. When this repo lives in
// an iCloud- or Dropbox-synced folder, the sync tool resolves conflicts by leaving a COPY beside the
// original: `model.ts` becomes `model 2.ts`, `precision.test.ts` becomes `precision.test 3.ts`, and
// whole directories become `skills 2/`. Those phantom files land in `src/`, and the module-census
// gates (`W200` cdss-boundary, `W230` capacity-lane privacy) walk the filesystem and count every
// `.ts` as a module that must be declared — so each duplicate reads as an UNDECLARED MODULE. The
// build goes red with a census error that looks like a declaration bug and is really a sync artifact.
// It happened once and cost a long diagnosis; this test turns the next occurrence into one line.
//
// The real fix is to move the repo out of the synced folder (see the message below). This is the
// backstop for until that happens, and for any machine where it has not.
import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const SKIP = new Set(["node_modules", ".next", ".git"]);

/**
 * The name a file-sync tool leaves on a conflict copy: a SPACE, then a number, at the end of the
 * base name — `foo 2.ts`, `foo.test 3.ts`, `bar 2` (a directory). The leading space is the whole
 * signature: this tree is kebab-case throughout, so no real file or directory contains one.
 */
const SYNC_DUPE = / \d+(\.[^.]+)?$/;

function findDupes(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (SYNC_DUPE.test(entry.name)) out.push(path.relative(ROOT, full));
    if (entry.isDirectory()) findDupes(full, out);
  }
  return out;
}

describe("the tree carries no file-sync duplicates", () => {
  it("has no ' 2' / ' 3' sync-conflict copies (the census-gate breaker)", () => {
    const dupes = findDupes(ROOT).sort();
    expect(
      dupes,
      "File-sync duplicate files/dirs are present — they will break the W200/W230 census. Delete them:\n" +
        dupes.map((d) => `  ${d}`).join("\n") +
        "\n\nOne-liner: find . -not -path './node_modules/*' -not -path './.next/*' -not -path './.git/*' " +
        "\\( -name '* [0-9].*' -o -name '* [0-9]' \\) -exec rm -rf {} +\n" +
        "ROOT CAUSE: this repo is in an iCloud/Dropbox-synced folder. Move it out to stop the recurrence.",
    ).toEqual([]);
  });
});
