// §93 haptics: short patterns on a hit, a miss and the end; nothing when the setting is off or the
// device cannot buzz. The renderer hands the navigator in, so the rule is held here without a browser.
import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { haptic, HAPTIC_PATTERNS, type HapticMoment } from "./haptics";

const MOMENTS: readonly HapticMoment[] = ["hit", "miss", "end"];

describe("haptics (§93)", () => {
  it("never buzzes when the setting is off, whatever the device can do", () => {
    const calls: (number | number[])[] = [];
    for (const m of eachOf(MOMENTS, "moments")) expect(haptic(m, false, { vibrate: (p) => { calls.push(p); return true; } })).toBe(false);
    expect(calls).toEqual([]);
  });

  it("never buzzes on a device without vibrate, and never throws when vibrate does", () => {
    for (const m of eachOf(MOMENTS, "moments")) {
      expect(haptic(m, true, {})).toBe(false);
      expect(haptic(m, true, undefined)).toBe(false);
      expect(haptic(m, true, { vibrate: () => { throw new Error("denied"); } })).toBe(false);
    }
  });

  it("buzzes the moment's pattern when on: short, distinct, over within a beat", () => {
    const calls: (number | number[])[] = [];
    const device = { vibrate: (p: number | number[]) => { calls.push(p); return true; } };
    for (const m of eachOf(MOMENTS, "moments")) expect(haptic(m, true, device)).toBe(true);
    expect(calls).toEqual(MOMENTS.map((m) => [...HAPTIC_PATTERNS[m]]));
    for (const m of MOMENTS) {
      const total = HAPTIC_PATTERNS[m].reduce((a, b) => a + b, 0);
      expect(total, m).toBeLessThanOrEqual(250);
      for (const ms of HAPTIC_PATTERNS[m]) expect(ms, m).toBeLessThanOrEqual(80);
    }
    expect(new Set(MOMENTS.map((m) => HAPTIC_PATTERNS[m].join(","))).size).toBe(MOMENTS.length);
  });
});
