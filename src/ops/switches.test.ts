import { describe, expect, it } from "vitest";
import {
  ALL_CLEAR,
  canSend,
  isPracticePaused,
  type OpsSwitches,
  setKillSwitch,
  setPracticePaused,
} from "@/ops/switches";

const P = "prac-1";
const Q = "prac-2";

describe("ops switches", () => {
  it("all-clear permits sending for any practice", () => {
    expect(canSend(ALL_CLEAR, P)).toBe(true);
  });

  it("the kill switch halts every practice", () => {
    const s = setKillSwitch(ALL_CLEAR, true);
    expect(canSend(s, P)).toBe(false);
    expect(canSend(s, Q)).toBe(false);
  });

  it("a per-practice pause halts only that practice", () => {
    const s = setPracticePaused(ALL_CLEAR, P, true);
    expect(canSend(s, P)).toBe(false);
    expect(canSend(s, Q)).toBe(true);
    expect(isPracticePaused(s, P)).toBe(true);
    expect(isPracticePaused(s, Q)).toBe(false);
  });

  it("pausing is idempotent and unpausing reverses it", () => {
    let s = setPracticePaused(ALL_CLEAR, P, true);
    s = setPracticePaused(s, P, true);
    expect(s.pausedPracticeIds).toEqual([P]);
    s = setPracticePaused(s, P, false);
    expect(s.pausedPracticeIds).toEqual([]);
    expect(canSend(s, P)).toBe(true);
  });

  it("the kill switch overrides an un-paused practice", () => {
    const s = setKillSwitch(setPracticePaused(ALL_CLEAR, P, false), true);
    expect(canSend(s, P)).toBe(false);
  });

  it("pure updates never mutate the input", () => {
    const frozen: OpsSwitches = Object.freeze({ killSwitch: false, pausedPracticeIds: [] });
    expect(() => setKillSwitch(frozen, true)).not.toThrow();
    expect(() => setPracticePaused(frozen, P, true)).not.toThrow();
    expect(frozen.killSwitch).toBe(false);
    expect(frozen.pausedPracticeIds).toEqual([]);
  });
});
