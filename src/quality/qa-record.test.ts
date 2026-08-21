// W210 (O143): the design record is evidence, so a test run may not rewrite it.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..");
const E2E = path.join(ROOT, "e2e");

/** Every `path: "qa/…"` a spec hands to Playwright's screenshot(). */
function capturePathsInSpecs(): { spec: string; target: string }[] {
  return readdirSync(E2E)
    .filter((name) => name.endsWith(".spec.ts"))
    .flatMap((name) => {
      const text = readFileSync(path.join(E2E, name), "utf8");
      return [...text.matchAll(/path:\s*"(qa\/[^"]+)"/g)].map((m) => ({ spec: `e2e/${name}`, target: m[1]! }));
    });
}

describe("the qa/ design record", () => {
  /**
   * WHY THIS EXISTS, AND WHY IT IS A TEST RATHER THAN A NOTE.
   *
   * `docs/DESIGN-QA.md` cites captures in unit-named `qa/` directories as the evidence for what a
   * unit found — "the same three rows before and after a clarifier answer", and so on. Forty-two
   * of those exact paths were also being written by `e2e/*.spec.ts`, so every run of the suite
   * re-rendered the record under whatever CSS was current. It was not theoretical: O52's BEFORE
   * frame had been rewritten in eleven later commits by units with nothing to do with it, and 26
   * captures across 17 units were unfaithful to the runs that recorded them. A before/after pair
   * where both frames are "after" proves nothing, and nothing in the tree said so.
   *
   * Captures a run produces go to `qa/_runs/` (gitignored). Captures a UNIT records stay put and
   * are written deliberately, by `scripts/qa-capture.mjs` at the time the unit measures something.
   * The difference is the whole point: one is a by-product, the other is testimony.
   */
  it("is never written by a test run", () => {
    const offenders = capturePathsInSpecs()
      .filter(({ target }) => !target.startsWith("qa/_runs/"))
      .map(({ spec, target }) => `${spec} writes ${target}`);
    expect(offenders).toEqual([]);
  });

  /**
   * Non-vacuity. The check above passes trivially if the specs stop taking screenshots at all, so
   * pin that they still do — the redirect was meant to move the captures, not end them.
   */
  it("still has runs producing captures, just somewhere harmless", () => {
    expect(capturePathsInSpecs().length).toBeGreaterThan(30);
  });
});
