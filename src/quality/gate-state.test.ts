// AR14: the gate-state line parses, the guard blocks on red, and O173's real five-unit window
// is the regression pin — replayed against this machinery, it collapses to one blocked claim.
import { describe, expect, it } from "vitest";
import { GateStateError, claimGuard, currentGateState, parseGateState } from "./gate-state";

describe("AR14 the real ledger's gate line", () => {
  it("parses, and today it is green with the figures", () => {
    const state = currentGateState();
    expect(state.status).toBe("green");
    expect(state.sha).toMatch(/^[0-9a-f]{7,40}$/);
    expect(state.note.length).toBeGreaterThan(20);
  });

  it("green passes the claim guard", () => {
    expect(claimGuard(currentGateState())).toBeNull();
  });
});

describe("AR14 the parser refuses every unreadable shape — unreadable and red must fail alike", () => {
  it("refuses a ledger with no gate line", () => {
    expect(() => parseGateState("# ledger\nno line here")).toThrow(GateStateError);
    expect(() => parseGateState("# ledger")).toThrow(/no `gate: …` line/);
  });

  it("refuses two gate lines — the state must have one home", () => {
    const two = "`gate: green @ abcdef1 (t) — fine and long enough`\n`gate: green @ abcdef2 (t) — also fine here`";
    expect(() => parseGateState(two)).toThrow(/2 gate lines/);
  });

  it("refuses a malformed sha and a missing note", () => {
    expect(() => parseGateState("`gate: green @ ZZZ (t) — note long enough here`")).toThrow(GateStateError);
    expect(() => parseGateState("`gate: red @ abcdef1 (t) — `")).toThrow(/carries no note/);
  });

  it("refuses a red state that waves at the failure instead of naming it", () => {
    expect(() => parseGateState("`gate: red @ abcdef1 (t) — see CI`")).toThrow(/name the failing check/);
  });
});

describe("AR14 O173's five-unit window, replayed", () => {
  /**
   * The real incident, from O173's ledger row: the gate went red at O167 (run 474; the last
   * green was run 473 at O167's claim) on exactly one named test, and O168, O169, O170 and
   * O171 each claimed, built and pushed while it stayed red. Under AR14, the state O167's
   * gate run would have written blocks every one of those claims with the failure named —
   * the window that was five units wide collapses to one blocked claim and a fix.
   */
  const RED_AT_O167 =
    "`gate: red @ 0939530 (2026-08-21T14:44Z) — e2e/landing.spec.ts:74 › the storybook's copy is legible with JavaScript disabled: getByText('Why we founded ADHD.ME') expected 1, received 0 (272 passed, 1 failed)`";

  it("blocks each of the four claims the real window let through, naming the real test", () => {
    const state = parseGateState(RED_AT_O167);
    for (const wouldBeClaim of ["O168", "O169", "O170", "O171"]) {
      const refusal = claimGuard(state);
      expect(refusal, `${wouldBeClaim} would have been claimed onto a red base`).not.toBeNull();
      expect(refusal).toContain("landing.spec.ts:74");
      expect(refusal).toContain("0939530");
      expect(refusal).toContain("Fixing this IS the firing's unit");
    }
  });

  it("unblocks only when a gate run comes back green — O172's fix, in this machinery", () => {
    const afterFix = parseGateState(
      "`gate: green @ 41f9e38 (2026-08-21T16:10Z) — pnpm verify green; e2e landing.spec.ts fixed, full suite green`",
    );
    expect(claimGuard(afterFix)).toBeNull();
  });
});
