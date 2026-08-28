// O214: the gate line's green must account for every test in the suite it claims to have run.
//
// AR14 put the verdict where every firing reads it. This asks whether the verdict is TRUE. The
// two fixtures below are not invented shapes — they are the real gate lines of O211 (which was
// wrong) and O213 (which was right), so the check is pinned against the incident that earned it.
//
// THE LIVE MEASUREMENT IS NOT HERE, ON PURPOSE. Reading the suite's real size means spawning
// Playwright, and vitest runs files in parallel workers beside timing-sensitive tests that measure
// CPU cost against a fixed ratio. A gate check must not add load to a run that times things, so the
// measurement lives in `scripts/gate-accounting.mts` and runs sequentially in `pnpm verify`, the
// same shape as audit:gate and perf:gate. What stays here is the decision logic those scripts call,
// which is pure and fast.

import { describe, expect, it } from "vitest";
import { e2eAccountingGuard, parseE2eClaim, parseGateState } from "./gate-state";

// O211's line, verbatim in the shape that matters: it reported 340 + 2 = 342 against a suite of
// 344, and the two it did not account for were exactly the two that were failing.
const O211_LINE =
  "`gate: green @ 07edbef (2026-08-27T21:40Z) — pnpm verify 298 files / 4398 tests (13 skipped), " +
  "build, audit PASS (2 accepted, 0 unaccepted), perf gate PASS (51 routes, heaviest /finder 655 KB); " +
  "full pnpm e2e green (340 passed, 2 skipped, 16.6m). O211 done`";

// O213's line: the same suite, fully accounted for.
const O213_LINE =
  "`gate: green @ 4e958ee (2026-08-27T23:05Z) — pnpm verify 298 files / 4398 tests (13 skipped), " +
  "build, audit PASS (2 accepted, 0 unaccepted), perf gate PASS (51 routes); " +
  "full pnpm e2e green (342 passed, 2 skipped, 19.2m, exit code 0 read from the command itself). O213 done`";

describe("O214 the figures are read from the e2e claim and not from the nearest number", () => {
  it("anchors on the e2e clause, never on the vitest figures beside it", () => {
    // The note carries "4398 tests (13 skipped)" from vitest and "2 accepted, 0 unaccepted" from
    // the audit gate. A loose match would read one of those and the check would be worse than
    // absent — it would look like coverage while measuring nothing.
    const claim = parseE2eClaim(parseGateState(O211_LINE).note);
    expect(claim).toEqual({ passed: 340, skipped: 2 });
  });

  it("reads a claim with no skipped count as zero skipped", () => {
    expect(parseE2eClaim("full pnpm e2e green (344 passed, 20.1m)")).toEqual({
      passed: 344,
      skipped: 0,
    });
  });

  it("returns null when there is no e2e claim at all, so the guard can fail closed on it", () => {
    expect(parseE2eClaim("pnpm verify green, build, audit PASS")).toBeNull();
  });
});

describe("O214 a green gate line must account for the whole suite", () => {
  it("REFUSES O211's real line, which is the incident this check exists for", () => {
    const refusal = e2eAccountingGuard(parseGateState(O211_LINE), 344);
    expect(refusal, "the check that would not have caught O211 is not worth having").not.toBeNull();
    expect(refusal).toContain("only 342");
    expect(refusal).toContain("344");
    // The refusal must send the reader to the cause, not just to the discrepancy.
    expect(refusal).toContain("tail");
  });

  it("accepts O213's real line, so the check is not simply always-refusing", () => {
    expect(e2eAccountingGuard(parseGateState(O213_LINE), 344)).toBeNull();
  });

  it("refuses a claim LARGER than the suite — a line copied off a different tree", () => {
    const refusal = e2eAccountingGuard(parseGateState(O213_LINE), 300);
    expect(refusal).toContain("different tree");
  });

  it("fails closed on a green line whose figures cannot be read", () => {
    // Same reasoning parseGateState already gives for a malformed line: if dropping the figures
    // were tolerated, dropping the figures would be the way past the check.
    const noFigures =
      "`gate: green @ abc1234 (2026-08-27T00:00Z) — everything passed, trust me, it was all fine`";
    expect(e2eAccountingGuard(parseGateState(noFigures), 344)).toContain("no readable e2e figures");
  });

  it("says nothing about a red line, because claims already block on those", () => {
    const red = "`gate: red @ abc1234 (2026-08-27T00:00Z) — e2e/network.spec.ts:63 fails on the declaration`";
    expect(e2eAccountingGuard(parseGateState(red), 344)).toBeNull();
  });
});
