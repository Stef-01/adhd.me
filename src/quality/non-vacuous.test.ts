// O196: the census that keeps the vacuity sweep from rotting into a one-off.
//
// The sweep set out to fix every loop that asserted over an imported product register with nothing
// stopping it running over an empty one. It fixed 13 — the ones whose subject is a compliance
// property — and MEASURED the rest rather than guessing at it: about 151 in total, after the scan's
// own regex bug was found and corrected (see `non-vacuous.ts`). The remainder is a pinned ratchet.
//
// The scan lives here rather than in a script so it runs every time, in three directions: the
// remainder may not rise, a `LEGITIMATELY_EMPTY` entry describing a test that no longer exists
// fails because a stale exemption reads as coverage, and the scan itself is driven on a planted
// fixture so a clean census cannot mean a broken scanner.
//
// WHY THIS SCANS SOURCE. The property is about what the test FILE says, not about what any run
// happens to do: a loop can iterate a full register today and an empty one after a founder gate is
// answered, and the guarantee has to hold across both. Source is also the only place the
// distinction lives — `eachOf(...)` versus a bare `for…of` is the declaration.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEGITIMATELY_EMPTY, UNGUARDED_REMAINDER, eachOf, tally } from "./non-vacuous";

function unitTestFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...unitTestFiles(full));
    else if (entry.name.endsWith(".test.ts")) files.push(full);
  }
  return files.sort();
}

/** Every `it` block in the unit suite that loops over an IMPORTED value and asserts inside it. */
function unguardedRegisterLoops(): string[] {
  // A direct tree walk keeps the census host-independent. The old shell `find` invocation
  // silently returned no files on Windows, turning a non-vacuity law into an unrunnable test.
  const files = unitTestFiles(path.resolve("src"));
  const found: string[] = [];

  for (const file of files) {
    const repoFile = path.relative(process.cwd(), file).replaceAll(path.sep, "/");
    const src = readFileSync(file, "utf8");
    const imported = new Set<string>();
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
      for (const raw of m[1]!.split(",")) {
        const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
        if (name) imported.add(name);
      }
    }

    const lines = src.split("\n");
    const starts: number[] = [];
    lines.forEach((line, i) => {
      if (/^\s*it(\.\w+)?\(/.test(line)) starts.push(i);
    });

    for (let s = 0; s < starts.length; s += 1) {
      const from = starts[s]!;
      const to = s + 1 < starts.length ? starts[s + 1]! : lines.length;
      const block = lines.slice(from, to).join("\n");
      if (!block.includes("expect(")) continue;

      const captured = [
        ...[...block.matchAll(/for\s*\(\s*const\s+\w+\s+of\s+([A-Za-z_$][\w$.]*(?:\([^)]*\))*)/g)].map((m) => m[1]!),
        ...[...block.matchAll(/([A-Za-z_$][\w$.]*)\s*\.forEach\(/g)].map((m) => m[1]!),
      ];

      // O209: THE SCAN DID NOT RECOGNISE ITS OWN GUARD, and had overstated the debt by 10 since the
      // day it landed. The capture above swallows a call, so `for (const x of eachOf(REG, "…"))`
      // captures `eachOf(REG, "…"` — whose ROOT is `eachOf`. In any file that uses the guard, that
      // root is an imported name, so the site counted as a register loop; the `wrapped` check below
      // then looked for `eachOf(eachOf(…` and never found it. A correctly guarded site read as
      // unguarded.
      //
      // Ten sites were miscounted, and they were the ones O196 was proudest of — its DONE row names
      // the W55 provenance intervals and the sitemap-to-census trace among the 13 it guarded "by
      // stakes", and both were being reported back as debt.
      //
      // A collection that begins `eachOf(` is guarded BY CONSTRUCTION: the helper throws on empty.
      // So it is removed from the register-loop list rather than tested against the string check,
      // which is what the string check was trying and failing to express.
      const looped = captured.filter((x) => !x.startsWith("eachOf("));
      // Only loops whose ROOT identifier is imported: a literal array written in the test cannot
      // go empty by any product state, and 484 of the suite's 527 loop blocks are exactly that.
      const overRegister = looped.filter((x) => imported.has(x.split(/[.(]/)[0]!));
      if (overRegister.length === 0) continue;

      // Guarded if every register loop in the block goes through `eachOf`, or the block counts
      // what it actually asserted (`tally`), or an assertion sits outside every loop.
      const wrapped = overRegister.every((x) => block.includes(`eachOf(${x}`));
      const counts = block.includes("tally()") && block.includes(".count()");
      const loopIndents = [...block.matchAll(/^([ \t]*)(for\s*\(|.*\.forEach\()/gm)].map((m) => m[1]!.length);
      const outside =
        loopIndents.length > 0 &&
        [...block.matchAll(/^([ \t]*)expect\(/gm)].some((m) => m[1]!.length <= Math.min(...loopIndents));
      if (wrapped || counts || outside) continue;

      // The opening quote decides the closing one. A non-greedy `["'`](.*?)["'`]` truncates every
      // title containing an apostrophe — which is how `treats 'derived' as a reviewed answer`
      // became `treats ` and a register entry keyed on the full title stopped matching anything.
      const title =
        /it(?:\.\w+)?\(\s*(["'`])((?:\\.|(?!\1).)*)\1/.exec(lines[from]!)?.[2] ?? "(untitled)";
      found.push(`${repoFile} :: ${title}`);
    }
  }
  return found.sort();
}

describe("O196 no assertion runs over an empty register without saying so", () => {
  it("never lets the unguarded remainder rise, and notices when it falls", () => {
    // A RATCHET, NOT A ZERO, and the number is honest about why. O196 guarded 13 sites by stakes —
    // provenance, the advice linter, the directory renderer, the finder's patient-visible labels —
    // out of a population the scan first reported as 23 and, once its own regex bug was fixed, as
    // about 151. Hand-classifying the rest is real work and not one unit's worth; wrapping them
    // mechanically would be worse, because a `.filter(...)` forced non-empty asserts a false thing.
    //
    // So this fails in BOTH directions. A new unguarded loop pushes the count above the pin and
    // fails. Paying one down pushes it below and ALSO fails, because the pin must be lowered in the
    // commit that earned it — otherwise the debt quietly stops being debt and nobody records that
    // it shrank.
    const declared = new Set(LEGITIMATELY_EMPTY.map((e) => `${e.file} :: ${e.test}`));
    const undeclared = unguardedRegisterLoops().filter((site) => !declared.has(site));
    expect(
      undeclared.length,
      undeclared.length > UNGUARDED_REMAINDER
        ? `a new loop asserts over an imported register with nothing stopping it running over an ` +
          `empty one. Wrap it in eachOf(), count with tally(), or declare it in LEGITIMATELY_EMPTY.`
        : `the remainder fell to ${undeclared.length} — lower UNGUARDED_REMAINDER in the commit ` +
          `that earned it, so the debt's size stays a measured fact rather than a stale number.`,
    ).toBe(UNGUARDED_REMAINDER);
  });

  it("declares nothing that has moved on, because a stale exemption reads as coverage", () => {
    // The other direction, W102's shape. If a declared test is renamed, deleted, or given a guard,
    // its entry stops describing anything and must go — otherwise the register slowly becomes a
    // list of reassurances about tests nobody has.
    const live = new Set(unguardedRegisterLoops());
    for (const entry of eachOf(LEGITIMATELY_EMPTY, "the legitimately-empty register")) {
      expect(
        live.has(`${entry.file} :: ${entry.test}`),
        `${entry.file} :: "${entry.test}" is declared legitimately empty but no longer matches an ` +
          `unguarded register loop — it was renamed, removed, or guarded. Delete the entry.`,
      ).toBe(true);
    }
  });

  it("makes every exemption argue itself rather than assert itself", () => {
    for (const entry of LEGITIMATELY_EMPTY) {
      // "This one is fine" is not a reason. An exemption that cannot say why emptiness is CORRECT
      // is an eachOf() waiting to be written.
      expect(entry.why.length, `${entry.test} is exempted without an argument`).toBeGreaterThan(120);
      expect(entry.file.startsWith("src/")).toBe(true);
    }
  });

  it("would catch a new unguarded loop, so a clean census means something", () => {
    // Non-vacuity for the census itself — the scan is only worth its result if it can still find
    // the shape it was built for. Driven on a fixture rather than the tree, so it cannot pass by
    // the tree happening to be clean.
    const planted = [
      'import { SOME_REGISTER } from "@/somewhere";',
      'it("asserts over whatever is there", () => {',
      "  for (const x of SOME_REGISTER) {",
      "    expect(x.ok).toBe(true);",
      "  }",
      "});",
    ].join("\n");
    // The same predicate the scan uses, applied to the fixture: imported root, loop, inner-only
    // assertion, no eachOf and no tally.
    const imported = new Set(["SOME_REGISTER"]);
    const looped = [...planted.matchAll(/for\s*\(\s*const\s+\w+\s+of\s+([A-Za-z_$][\w$.]*(?:\([^)]*\))*)/g)].map((m) => m[1]!);
    expect(looped.some((x) => imported.has(x.split(/[.(]/)[0]!))).toBe(true);
    expect(planted.includes("eachOf(")).toBe(false);
    expect(planted.includes("tally()")).toBe(false);
  });

  it("recognises its own guard, which it did not for the first thirteen units of its life", () => {
    // O209's regression pin. The scan captures the expression after `of`, and that capture swallows
    // a call — so a guarded loop presented as `eachOf(REG, "…")` used to be counted as a register
    // loop rooted at `eachOf`, and then failed the `eachOf(<collection>` string check it could never
    // satisfy. Ten real sites were reported as debt because of it, including the W55 provenance
    // intervals and the sitemap-to-census trace that O196 guarded by stakes.
    //
    // Driven on fixtures rather than the tree, so this cannot pass by the tree happening to be
    // clean, and stated in BOTH directions: the guard is credited, and an unguarded sibling in the
    // same shape is still caught.
    const guarded = [
      'import { eachOf } from "@/quality/non-vacuous";',
      'import { SOME_REGISTER } from "@/somewhere";',
      'it("asserts over a guarded register", () => {',
      '  for (const x of eachOf(SOME_REGISTER, "the register")) {',
      "    expect(x.ok).toBe(true);",
      "  }",
      "});",
    ].join("\n");
    const bare = guarded.replace('eachOf(SOME_REGISTER, "the register")', "SOME_REGISTER");

    // The predicate the scan uses, applied to both fixtures.
    const capture = (src: string) =>
      [...src.matchAll(/for\s*\(\s*const\s+\w+\s+of\s+([A-Za-z_$][\w$.]*(?:\([^)]*\))*)/g)].map((m) => m[1]!);

    // The bug, preserved as a fact: the raw capture DOES root at `eachOf`, which is why filtering
    // on the prefix is the fix rather than tightening the regex.
    expect(capture(guarded)[0]).toMatch(/^eachOf\(/);
    expect(capture(guarded).filter((x) => !x.startsWith("eachOf("))).toEqual([]);
    expect(capture(bare).filter((x) => !x.startsWith("eachOf("))).toEqual(["SOME_REGISTER"]);
  });

  it("eachOf refuses an empty collection and passes a populated one straight through", () => {
    expect(() => eachOf([], "a register with nothing in it")).toThrow(/non-vacuity/);
    expect(() => eachOf([], "a register with nothing in it")).toThrow(/LEGITIMATELY_EMPTY/);
    const items = [1, 2, 3];
    expect(eachOf(items, "three things")).toBe(items);
  });

  it("tally counts only what the body actually reached", () => {
    const t = tally();
    expect(t.count()).toBe(0);
    for (const n of [1, 2, 3, 4]) if (n % 2 === 0) t.saw();
    expect(t.count()).toBe(2);
  });
});
