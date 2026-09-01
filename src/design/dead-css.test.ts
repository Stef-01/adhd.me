// O200: the census that stops dead CSS coming back.
//
// Both directions, W102's shape: a class styled but never produced fails, and an exception naming a
// class the sheet no longer styles fails too, because a stale exception reads as a decision somebody
// made recently. Plus the AR lane's mutation probe — the classifier is driven on a planted fixture,
// so a clean census cannot mean a broken scanner.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEAD_CSS_EXCEPTIONS,
  classNamePrefixes,
  deadClasses,
  stripComments,
  styledClasses,
} from "./dead-css";

const CSS = () => readFileSync("app/globals.css", "utf8");

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) files.push(full);
  }
  return files.sort();
}

// Node's directory walk replaces the former Unix `find | grep` pipeline. Besides working on
// Windows, it avoids shell quoting becoming part of a CSS-census test's correctness boundary.
const SOURCE = () =>
  [...sourceFiles("app"), ...sourceFiles("src")]
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

describe("O200 the stylesheet styles only markup that exists", () => {
  it("styles no class the application can never produce", () => {
    const declared = new Set(DEAD_CSS_EXCEPTIONS.map((e) => e.className));
    const dead = deadClasses(CSS(), SOURCE()).filter((c) => !declared.has(c));
    expect(
      dead,
      `these classes are styled but nothing renders them. Delete the rule — or, if the selector ` +
        `shares a rule with a live one, delete just that selector from the list. If a class really ` +
        `is applied from outside this tree's source, add it to DEAD_CSS_EXCEPTIONS with the reason.`,
    ).toEqual([]);
  });

  it("keeps a real population, so a passing census is not an empty one", () => {
    // The failure this lane keeps finding: a sweep that goes quietly green because it stopped
    // measuring. If the selector scan broke, "no dead classes" would be perfectly true and worthless.
    expect(styledClasses(CSS()).size, "no styled classes found — the scanner sees nothing").toBeGreaterThan(400);
    expect(SOURCE().length, "no source read").toBeGreaterThan(100_000);
  });

  it("credits a class built from a template, and only inside a className", () => {
    // The correction that took this from 122 false positives to a real number. `seq-w-${i}` builds a
    // live class; `iv-${code}` builds an INTERVAL ID and must not vouch for `.iv-often`.
    const prefixes = classNamePrefixes(SOURCE());
    expect(prefixes).toContain("seq-w-");
    expect(prefixes).not.toContain("iv-");
    expect(prefixes).not.toContain("row-");
    expect(deadClasses(".seq-w-3 { color: red; }", "const a = <b className={`seq-w-${i}`} />")).toEqual([]);
    expect(deadClasses(".iv-often { color: red; }", "const id = `iv-${code}`;")).toEqual(["iv-often"]);
  });

  it("does not let prose vouch for code", () => {
    // THE SCANNER FORGAVE ITSELF ON ITS FIRST RUN. `dead-css.ts`'s own header names
    // `.match-portrait`, `.portrait-nav` and `.cv2-coming-grid` as examples of dead code, and that
    // made all three look alive — the census reported 89 where the unit had measured 92. It is
    // O199's scanner bug in the mirror: that one read a CSS comment as a rule.
    expect(stripComments("// .ghost is gone\nconst a = 1;")).not.toContain("ghost");
    expect(stripComments("/* .ghost is gone */ const a = 1;")).not.toContain("ghost");
    expect(deadClasses(".ghost { color: red; }", "// we deleted .ghost last year")).toEqual([".ghost".slice(1)]);
    // A URL's `//` is not a comment, and treating it as one would silently truncate real code.
    expect(stripComments('const u = "https://example.com/x"; const b = 2;')).toContain("example");
  });

  it("would catch a newly dead class, so a clean census means something", () => {
    expect(deadClasses(".a { color: red; }", 'x = "a"')).toEqual([]);
    expect(deadClasses(".a { color: red; }", 'x = "b"')).toEqual(["a"]);
  });

  it("declares no exception for a class the sheet no longer styles", () => {
    const styled = styledClasses(CSS());
    for (const entry of DEAD_CSS_EXCEPTIONS) {
      expect(styled.has(entry.className), `${entry.className} is excepted but no longer styled`).toBe(true);
      expect(entry.why.length, `${entry.className} is excepted without an argument`).toBeGreaterThan(80);
    }
  });
});
