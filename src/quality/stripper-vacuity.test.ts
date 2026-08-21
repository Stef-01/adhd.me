// Y5-2 (W256): the four source scans that passed on an empty string, and why there is no general
// control here.
//
// THE FINDING. Twelve-plus files in this tree read their own source and strip comments first, so a
// rule is not matched by the sentence describing it. Four of them never checked that the stripper
// left anything behind — and a stripper that removes too much makes every `not.toContain`
// downstream pass on an empty string. Demonstrated during W256 by replacing
// `src/verticals/model.test.ts`'s stripper with one returning "": all 21 tests in that file passed,
// including the one W157's row calls load-bearing for the G5 boundary. All four are fixed, and this
// file is the regression guard for those four.
//
// AND WHY IT IS ONLY THOSE FOUR. The obvious move is a general register — discover every file that
// scans stripped source, require each to check its stripper. I wrote it, and it flagged four
// files that were all fine: `interop/fhir.test.ts` checks with `toContain("export function
// appointmentToFhir")` and no message at all, `capacity/coupling.test.ts` checks a COUNTER
// (`walked > 200`) rather than the stripped text, and two modules assert non-vacuity from their
// companion test files. The detector was matching assertion MESSAGES, which is a proxy, and every
// proxy in this session has been wrong in the direction its author was not facing.
//
// The next move would have been to widen the pattern until it went green. **That is tuning a
// regex until it agrees with me**, which is the failure this tree names in W153, W168 and W228, and
// a register tuned that way reports coverage it does not have. So there is no general control here,
// deliberately, and this comment is the record of the attempt rather than a silence where one
// would have gone.
//
// WHAT THE REAL FIX IS, since it is worth naming rather than leaving as "somebody should".
// Detecting the check is the wrong shape. ONE SHARED HELPER that strips and throws when it strips
// everything makes the failure impossible instead of detectable — W254's `codeOf` is already that
// helper, in one file. Consolidating twelve implementations onto it is a unit with twelve call
// sites to convert and a helper whose own test proves it throws. Recorded in AUDIT-Y5.md.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..");

/**
 * The four scans W256 found unchecked, with the string each must still assert it found.
 *
 * Named individually rather than discovered, because discovery is what failed above. A list of
 * four is honest about its own scope in a way a register that silently misses cases is not.
 */
const FIXED: readonly { file: string; asserts: string }[] = [
  { file: "src/verticals/model.test.ts", asserts: "the stripper removed the code too" },
  { file: "src/engine/arm-stability.test.ts", asserts: "the stripper removed the code too" },
  { file: "src/matching/explain.test.ts", asserts: "the stripper removed the code too" },
  { file: "src/quality/landing-motion.test.ts", asserts: "the stripper emptied the source" },
];

describe("Y5-2 the four scans that passed on an empty string still check their stripper", () => {
  it("keeps the check in every one of them", () => {
    for (const { file, asserts } of FIXED) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      expect(source, `${file} lost its stripper check — its scan can go vacuous again`).toContain(
        asserts,
      );
    }
  });

  it("shows why an unchecked stripper is dangerous rather than untidy", () => {
    // The mechanism in one line: an empty haystack satisfies every negative assertion. This is why
    // the failure is silent — the guard does not error, it reports success.
    const stripped = "";
    for (const banned of ["signedOffBy", "revokedAt", "contentHash"]) {
      expect(stripped).not.toContain(banned);
    }
    expect(stripped.length).toBe(0);
  });

  it("names the consolidation that would end the class, so it is not lost", () => {
    // W254's `codeOf` throws when it strips everything. A helper that cannot return nothing makes
    // the check unnecessary rather than checkable, which is the difference between a register and
    // a design. Pinned so the reference survives an edit to that file.
    const scopes = readFileSync(path.join(ROOT, "src/platform/scopes.test.ts"), "utf8");
    expect(scopes, "the shared checked stripper this class should consolidate onto has gone").toContain(
      "the stripper emptied",
    );
    expect(scopes).toContain("function codeOf");
  });
});
